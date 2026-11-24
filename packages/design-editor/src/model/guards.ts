import type { design } from "@rsvp/celebration-theme";

type Doc = design.DesignDocumentV2;
type Element = design.DesignElement;
type Canvas = design.DesignCanvas;

/** P22. Mirror of the gifts-block rules of the backend validator (design/rules.py); the server stays the authority. */
export type GiftsIssueCode =
  | "GIFTS_BLOCK_REQUIRED" | "GIFTS_BLOCK_LOCKED" | "GIFTS_BLOCK_HIDDEN" | "GIFTS_BLOCK_OUT_OF_CANVAS" | "GIFTS_BLOCK_TOO_SMALL";

export interface GiftsIssue { readonly code: GiftsIssueCode; readonly canvas?: "mobile" | "desktop" }

/** Touch target floor and the reference widths the validator uses to turn grid units into px. */
export const MIN_TARGET_PX = 44;
export const REFERENCE_WIDTH = { mobile: 320, desktop: 768 } as const;
export const MAX_CANVAS_HEIGHT_PX = 4000;

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

/**
 * Everything that would make the backend answer 422 for the gifts block, computed on the client so the editor can refuse
 * the gesture instead of letting the host find out when saving. Returns [] when the block is fine.
 */
export function giftsIssues(doc: Doc): GiftsIssue[] {
  const block = giftsBlock(doc);
  if (!block || block.required !== true) return [{ code: "GIFTS_BLOCK_REQUIRED" }];
  const placement = giftsPlacement(doc);
  if (!placement) return [{ code: "GIFTS_BLOCK_REQUIRED" }];
  const issues: GiftsIssue[] = [];
  for (const [name, canvas] of canvasesOf(placement.page)) {
    const element = canvas.elements.find((candidate) => candidate.block === block.id);
    if (!element) { issues.push({ code: "GIFTS_BLOCK_REQUIRED", canvas: name }); continue; }
    if (element.link !== undefined || (element.rotation ?? 0) !== 0) issues.push({ code: "GIFTS_BLOCK_LOCKED", canvas: name });
    if (!element.visible || (element.opacity ?? 1) < 1) issues.push({ code: "GIFTS_BLOCK_HIDDEN", canvas: name });
    if (element.x + element.w > canvas.columns || (element.y + element.h) * canvas.rowHeight > MAX_CANVAS_HEIGHT_PX) issues.push({ code: "GIFTS_BLOCK_OUT_OF_CANVAS", canvas: name });
    const size = sizePx(element, canvas, name, doc.tokens.spacing.contentMaxWidth);
    if (size.width < MIN_TARGET_PX || size.height < MIN_TARGET_PX) issues.push({ code: "GIFTS_BLOCK_TOO_SMALL", canvas: name });
  }
  return issues;
}
