import { design } from "@rsvp/celebration-theme";

type Doc = design.DesignDocumentV2;
type Element = design.DesignElement;
type Canvas = design.DesignCanvas;

/** P22. Mirror of the gifts-block rules of the backend validator (design/rules.py); the server stays the authority. */
export type GiftsIssueCode =
  | "GIFTS_BLOCK_REQUIRED" | "GIFTS_BLOCK_LOCKED" | "GIFTS_BLOCK_HIDDEN" | "GIFTS_BLOCK_OUT_OF_CANVAS" | "GIFTS_BLOCK_TOO_SMALL"
  | "GIFTS_BLOCK_TEXT_TOO_LARGE" | "GIFTS_BLOCK_COVERED" | "GIFTS_BLOCK_LOW_CONTRAST";

export interface GiftsIssue { readonly code: GiftsIssueCode; readonly canvas?: "mobile" | "desktop" }

/** Touch target floor and the reference widths the validator uses to turn grid units into px. */
export const MIN_TARGET_PX = 44;
export const REFERENCE_WIDTH = { mobile: 320, desktop: 768 } as const;
export const MAX_CANVAS_HEIGHT_PX = 4000;
/** The label is one line inside the useful height: at most 32 px, and the line (size x line height) fits what padding and border leave. */
export const GIFTS_MAX_FONT_PX = 32;
export const GIFTS_DEFAULT_LINE_HEIGHT = 1.25;
/** WCAG 1.4.11, for the contour of the button; its text reads at design.TEXT_CONTRAST (4.5:1). */
export const NON_TEXT_CONTRAST = 3;

export const GIFTS_BLOCK_TYPE = "giftsCta";

export function giftsBlock(doc: Doc): design.DesignBlock | undefined {
  return doc.blocks.find((block) => block.type === GIFTS_BLOCK_TYPE);
}

const canvasesOf = (page: design.DesignPage): readonly (readonly ["mobile" | "desktop", Canvas])[] => [
  ["mobile", page.canvases.mobile] as const,
  ...(page.canvases.desktop ? [["desktop", page.canvases.desktop] as const] : [])
];

/** The page whose mobile canvas places the gifts block, and the element that does it. */
export function giftsPlacement(doc: Doc): { readonly page: design.DesignPage; readonly element: Element } | undefined {
  const block = giftsBlock(doc);
  if (!block) return undefined;
  for (const page of doc.pages) {
    const element = page.canvases.mobile.elements.find((candidate) => candidate.block === block.id);
    if (element) return { page, element };
  }
  return undefined;
}

export const isGiftsElement = (doc: Doc, elementId: string, canvas?: "mobile" | "desktop"): boolean => {
  const block = giftsBlock(doc);
  if (!block) return false;
  return doc.pages.some((page) => canvasesOf(page).some(([name, grid]) => (canvas === undefined || canvas === name) && grid.elements.some((element) => element.id === elementId && element.block === block.id)));
};

function sizePx(element: Element, canvas: Canvas, name: "mobile" | "desktop", maxWidth: number): { readonly width: number; readonly height: number } {
  const reference = Math.min(REFERENCE_WIDTH[name], maxWidth);
  return { width: (element.w / canvas.columns) * reference, height: element.h * canvas.rowHeight };
}

type Box = readonly [left: number, top: number, right: number, bottom: number];

/** The rectangle an element covers in px; the box of a rotated element is its bounding box (as the validator computes it). */
function boxPx(element: Element, canvas: Canvas, width: number): Box {
  const column = width / canvas.columns;
  const x = element.x * column, y = element.y * canvas.rowHeight, w = element.w * column, h = element.h * canvas.rowHeight;
  const rotation = element.rotation ?? 0;
  if (rotation === 0) return [x, y, x + w, y + h];
  const sin = Math.abs(Math.sin((rotation * Math.PI) / 180)), cos = Math.abs(Math.cos((rotation * Math.PI) / 180));
  const halfW = (w * cos + h * sin) / 2, halfH = (w * sin + h * cos) / 2;
  return [x + w / 2 - halfW, y + h / 2 - halfH, x + w / 2 + halfW, y + h / 2 + halfH];
}

const intersects = (first: Box, second: Box): boolean => first[0] < second[2] && second[0] < first[2] && first[1] < second[3] && second[1] < first[3];

/** CSS stacking, as the validator reads it: a higher z paints over; at equal z the later element in the list does. */
function coveredBy(elements: readonly Element[], index: number, own: Box, canvas: Canvas, width: number): boolean {
  const element = elements[index];
  if (!element) return false;
  return elements.some((other, otherIndex) => {
    const over = (other.z ?? 0) > (element.z ?? 0) || ((other.z ?? 0) === (element.z ?? 0) && otherIndex > index);
    return otherIndex !== index && over && other.visible && intersects(own, boxPx(other, canvas, width));
  });
}

type Fill = { readonly known: boolean; readonly role: design.PaletteRole | null };
const fillOf = (background: design.DesignBackground | undefined): Fill =>
  background === undefined ? { known: true, role: null } : background.kind === "colour" ? { known: true, role: background.role } : { known: false, role: null };

/**
 * Whether the button reads in both palettes: its text at 4.5:1 over what is behind it, and its contour (an explicit border,
 * or the accent line of the outline style) at 3:1 over the page. Mirror of `_gifts_contrast` in design/rules.py. A text on an
 * image or a drawing cannot be checked, so it counts as a failure, exactly as the server does.
 */
function giftsReadable(doc: Doc, page: design.DesignPage, element: Element, style: string): boolean {
  const own = fillOf(element.background), pageFill = fillOf(page.background);
  const pageRole = pageFill.role ?? "canvas";
  const textRole = element.typography?.colour ?? (style === "solid" ? "onAccent" : "accent");
  const border = element.border;
  const contourRole = border && border.width > 0 ? border.colour : style === "outline" ? "accent" : null;
  const backdropRole = own.role ?? (style === "solid" ? "accentFill" : pageRole);
  if (!own.known || (own.role === null && style !== "solid" && !pageFill.known)) return false;
  if (contourRole !== null && !pageFill.known) return false;
  return (["light", "dark"] as const).every((scheme) => {
    const palette = doc.tokens.palettes[scheme];
    if (design.contrastRatio(palette[textRole], palette[backdropRole]) < design.TEXT_CONTRAST) return false;
    return contourRole === null || design.contrastRatio(palette[contourRole], palette[pageRole]) >= NON_TEXT_CONTRAST;
  });
}

/** Height the box loses to padding and border on top and bottom (`_vertical_inset` in rules.py). */
const verticalInset = (element: Element): number => (element.padding?.top ?? 0) + (element.padding?.bottom ?? 0) + 2 * (element.border?.width ?? 0);

/** Height left for the label once padding and border are taken out of the box (never negative). */
export const usefulHeightPx = (element: Element, canvas: Canvas): number => Math.max(0, element.h * canvas.rowHeight - verticalInset(element));

/**
 * Everything that would make the backend answer 422 for the gifts block (all of P22), computed on the client so the editor can refuse
 * the gesture instead of letting the host find out when saving. Returns [] when the block is fine.
 */
export function giftsIssues(doc: Doc): GiftsIssue[] {
  const block = giftsBlock(doc);
  if (!block || block.required !== true) return [{ code: "GIFTS_BLOCK_REQUIRED" }];
  const hosts = doc.pages.filter((page) => page.canvases.mobile.elements.some((candidate) => candidate.block === block.id));
  if (hosts.length === 0) return [{ code: "GIFTS_BLOCK_REQUIRED" }];
  const issues: GiftsIssue[] = [];
  const style = typeof block.config["style"] === "string" ? block.config["style"] : "solid";
  // Every page that places the button is checked, as the server does (a page can carry it, not only the first one).
  for (const page of hosts) {
    for (const [name, canvas] of canvasesOf(page)) {
      const index = canvas.elements.findIndex((candidate) => candidate.block === block.id);
      const element = canvas.elements[index];
      if (!element) { issues.push({ code: "GIFTS_BLOCK_REQUIRED", canvas: name }); continue; }
      if (element.link !== undefined || (element.rotation ?? 0) !== 0) issues.push({ code: "GIFTS_BLOCK_LOCKED", canvas: name });
      if (!element.visible || (element.opacity ?? 1) < 1) issues.push({ code: "GIFTS_BLOCK_HIDDEN", canvas: name });
      if (element.x + element.w > canvas.columns || (element.y + element.h) * canvas.rowHeight > MAX_CANVAS_HEIGHT_PX) issues.push({ code: "GIFTS_BLOCK_OUT_OF_CANVAS", canvas: name });
      const size = sizePx(element, canvas, name, doc.tokens.spacing.contentMaxWidth);
      const useful = usefulHeightPx(element, canvas);
      if (size.width < MIN_TARGET_PX || size.height < MIN_TARGET_PX || useful < MIN_TARGET_PX) issues.push({ code: "GIFTS_BLOCK_TOO_SMALL", canvas: name });
      const label = element.typography?.size;
      if (label !== undefined && (label > GIFTS_MAX_FONT_PX || label * (element.typography?.lineHeight || GIFTS_DEFAULT_LINE_HEIGHT) > useful)) issues.push({ code: "GIFTS_BLOCK_TEXT_TOO_LARGE", canvas: name });
      const width = Math.min(REFERENCE_WIDTH[name], doc.tokens.spacing.contentMaxWidth);
      if (coveredBy(canvas.elements, index, boxPx(element, canvas, width), canvas, width)) issues.push({ code: "GIFTS_BLOCK_COVERED", canvas: name });
      if (!giftsReadable(doc, page, element, style)) issues.push({ code: "GIFTS_BLOCK_LOW_CONTRAST", canvas: name });
    }
  }
  return issues;
}
