import { design } from "@rsvp/celebration-theme";
import type { DocumentOp } from "./ops.js";

/**
 * Contract v2 of fidelity (Template/Media 1.8.0): cover variants, named animations, masks, frames, the veil of the cover photo and
 * the poster of a video. The value lists and types are the shared ones of `design` (`@rsvp/celebration-theme`), the same the renderer reads. Every operation is a pure function
 * that ignores a value outside its list (a hostile or stale one never reaches the document) and keeps every other field as it was.
 */
type Doc = design.DesignDocumentV2;
type Page = design.DesignPage;
type Element = design.DesignElement;
type CanvasName = "mobile" | "desktop";

export const COVER_VARIANTS = ["classic", "minimal", "editorial", "festive", "corporate", "arch", "hanging", "deco", "poster"] as const;
export type CoverVariant = (typeof COVER_VARIANTS)[number];
export const ANIMATION_NAMES = design.ANIMATION_NAMES;
export type AnimationName = design.AnimationName;
export const MASKS = design.DESIGN_MASKS;
export type DesignMask = design.DesignMask;
export const FRAME_STYLES = design.DESIGN_FRAME_STYLES;
export type FrameStyle = design.DesignFrameStyle;
export const FRAME_COLOURS = ["canvas", "surface", "text", "muted", "accent", "accentFill", "onAccent", "line"] as const satisfies readonly design.PaletteRole[];
export const VEILS = design.DESIGN_VEILS;
export type Veil = design.DesignVeil;
export interface ElementFrame { readonly style: FrameStyle; readonly colour: design.PaletteRole }

/** Animations a page can play, and the ones an element can be offered (the contract: `mecerse` only on elements, `abrir-puertas` only on pages). */
export const PAGE_ANIMATIONS = ["aparecer", "revelar-telon", "abrir-puertas"] as const satisfies readonly AnimationName[];
export const ELEMENT_ANIMATIONS = ["aparecer", "mecerse", "revelar-telon"] as const satisfies readonly AnimationName[];

/** Blocks a mask can clip (blocks with text never take one: the server answers 422 DESIGN_DECORATION_INVALID). */
export const MASKABLE_BLOCKS: ReadonlySet<string> = new Set(design.MASKABLE_BLOCKS);
/** The gifts and reply buttons: no mask, no frame, no named animation (the server answers 422 DESIGN_DECORATION_INVALID: it would move, hide or cover them). Their layer is the protected one. */
export const PROTECTED_BLOCKS: ReadonlySet<string> = new Set(["giftsCta", "rsvpCta"]);

const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What an element carries beyond the shared types (read defensively: the document may come from anywhere). */
interface FidelityElement {
  readonly mask?: unknown;
  readonly frame?: { readonly style?: unknown; readonly colour?: unknown };
  readonly animation?: { readonly entrance: design.DesignEntrance; readonly name?: unknown; readonly delayMs?: number; readonly durationMs?: number };
}
const fidelity = (element: Element): FidelityElement => element as unknown as FidelityElement;

export const blockTypeOf = (doc: Doc, element: Element): string | undefined => doc.blocks.find((block) => block.id === element.block)?.type;
export const isProtectedBlock = (doc: Doc, element: Element): boolean => PROTECTED_BLOCKS.has(blockTypeOf(doc, element) ?? "");
export const canMask = (doc: Doc, element: Element): boolean => MASKABLE_BLOCKS.has(blockTypeOf(doc, element) ?? "") && !isProtectedBlock(doc, element);
/** Animations the inspector offers for an element: none for the protected buttons (a named animation would move, hide or cover them; PL-164-1). */
export const elementAnimationsFor = (doc: Doc, element: Element): readonly AnimationName[] => (isProtectedBlock(doc, element) ? [] : ELEMENT_ANIMATIONS);

export const elementAnimationOf = (element: Element): AnimationName | null => { const name = fidelity(element).animation?.name; return oneOf(ANIMATION_NAMES, name) ? name : null; };
export const elementMaskOf = (element: Element): DesignMask | null => { const mask = fidelity(element).mask; return oneOf(MASKS, mask) ? mask : null; };
export const elementFrameOf = (element: Element): ElementFrame | null => {
  const frame = fidelity(element).frame;
  return frame && oneOf(FRAME_STYLES, frame.style) && oneOf(FRAME_COLOURS, frame.colour) ? { style: frame.style, colour: frame.colour } : null;
};

function mapElement(doc: Doc, canvas: CanvasName, elementId: string, change: (element: Element) => Element): Doc {
  let changed = false;
  const pages = doc.pages.map((page) => {
    const grid = page.canvases[canvas];
    if (!grid?.elements.some((element) => element.id === elementId)) return page;
    const elements = grid.elements.map((element) => {
      if (element.id !== elementId) return element;
      const next = change(element);
      if (next !== element) changed = true;
      return next;
    });
    return { ...page, canvases: { ...page.canvases, [canvas]: { ...grid, elements } } };
  });
  return changed ? { ...doc, pages } : doc;
}
const findElement = (doc: Doc, canvas: CanvasName, elementId: string): Element | undefined => doc.pages.flatMap((page) => page.canvases[canvas]?.elements ?? []).find((element) => element.id === elementId);

function without<T extends object>(value: T, key: string): T {
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  delete copy[key];
  return copy as T;
}

/**
 * A named animation on one element, or none (null). With a name the entrance is `none` and there is no duration (it comes from the
 * motion tokens); no name is accepted for the gifts and reply buttons (clearing one is). Anything outside the list leaves the document as it was.
 */
export const setElementAnimation = (canvas: CanvasName, elementId: string, name: AnimationName | null): DocumentOp => (doc) => {
  if (name !== null && !oneOf(ELEMENT_ANIMATIONS, name)) return doc;
  const target = findElement(doc, canvas, elementId);
  if (!target || (name !== null && isProtectedBlock(doc, target))) return doc;
  return mapElement(doc, canvas, elementId, (element) => {
    const current = fidelity(element).animation;
    if (name === null) {
      if (!current || current.name === undefined) return element;
      const rest = without(current, "name");
      const bare = rest.entrance === "none" && rest.delayMs === undefined && rest.durationMs === undefined;
      return bare ? without(element, "animation") : ({ ...element, animation: rest } as Element);
    }
    if (current?.name === name && current.entrance === "none" && current.durationMs === undefined) return element;
    return { ...element, animation: { entrance: "none", name, ...(current?.delayMs !== undefined ? { delayMs: current.delayMs } : {}) } } as Element;
  });
};

/** A mask on one element; only the blocks that can be clipped take one (never the protected buttons). */
export const setElementMask = (canvas: CanvasName, elementId: string, mask: DesignMask | null): DocumentOp => (doc) => {
  if (mask !== null && !oneOf(MASKS, mask)) return doc;
  const target = findElement(doc, canvas, elementId);
  if (!target || (mask !== null && !canMask(doc, target))) return doc;
  return mapElement(doc, canvas, elementId, (element) => {
    if (mask === null) return fidelity(element).mask === undefined ? element : without(element, "mask");
    return fidelity(element).mask === mask ? element : ({ ...element, mask } as Element);
  });
};

/** A frame (style and palette colour) on one element, or none (null). Never on the protected buttons. */
export const setElementFrame = (canvas: CanvasName, elementId: string, frame: ElementFrame | null): DocumentOp => (doc) => {
  if (frame !== null && (!oneOf(FRAME_STYLES, frame.style) || !oneOf(FRAME_COLOURS, frame.colour))) return doc;
  const target = findElement(doc, canvas, elementId);
  if (!target || (frame !== null && isProtectedBlock(doc, target))) return doc;
  return mapElement(doc, canvas, elementId, (element) => {
    if (frame === null) return fidelity(element).frame === undefined ? element : without(element, "frame");
    const current = elementFrameOf(element);
    if (current && current.style === frame.style && current.colour === frame.colour) return element;
    return { ...element, frame: { style: frame.style, colour: frame.colour } } as Element;
  });
};

/** The animation a page plays when it enters, or null. */
export const pageAnimationOf = (page: Page): AnimationName | null => { const name = (page as unknown as { animation?: { name?: unknown } }).animation?.name; return oneOf(PAGE_ANIMATIONS, name) ? name : null; };

/** The entrance of a page (cover or section): `aparecer`, `revelar-telon` or `abrir-puertas`, or none (null). `mecerse` is refused on a page. */
export const setPageAnimation = (pageId: string, name: AnimationName | null): DocumentOp => (doc) => {
  if (name !== null && !oneOf(PAGE_ANIMATIONS, name)) return doc;
  const page = doc.pages.find((candidate) => candidate.id === pageId);
  if (!page) return doc;
  const has = (page as unknown as { animation?: unknown }).animation !== undefined;
  if (name === null ? !has : pageAnimationOf(page) === name) return doc;
  return { ...doc, pages: doc.pages.map((candidate) => (candidate.id !== pageId ? candidate : name === null ? without(candidate, "animation") : ({ ...candidate, animation: { entrance: "none", name } } as Page))) };
};

const coverBlock = (doc: Doc): design.DesignBlock | undefined => doc.blocks.find((block) => block.type === "cover");
export const coverVariantOf = (doc: Doc): CoverVariant | null => { const variant = coverBlock(doc)?.config["variant"]; return oneOf(COVER_VARIANTS, variant) ? variant : null; };

/** The composition of the cover, one of the nine variants. The rest of the cover's configuration (the envelope) stays. */
export const setCoverVariant = (variant: CoverVariant): DocumentOp => (doc) => {
  const block = coverBlock(doc);
  if (!block || !oneOf(COVER_VARIANTS, variant) || block.config["variant"] === variant) return doc;
  return { ...doc, blocks: doc.blocks.map((candidate) => (candidate === block ? { ...candidate, config: { ...candidate.config, variant } } : candidate)) };
};

/** The veil of the cover photo, or null while the cover has no photo. A missing value is `even`: a document saved before 1.8.0 keeps the uniform veil it always had. */
export const coverVeilOf = (doc: Doc): Veil | null => {
  const background = doc.pages.find((page) => page.kind === "cover")?.background;
  if (background?.kind !== "media") return null;
  return (background as unknown as { veil?: unknown }).veil === "graded" ? "graded" : "even";
};

/** Graded or even, always written explicitly. Without a cover photo there is nothing to veil and nothing changes. */
export const setCoverVeil = (veil: Veil): DocumentOp => (doc) => {
  const current = coverVeilOf(doc);
  if (!oneOf(VEILS, veil) || current === null || current === veil) return doc;
  return {
    ...doc,
    pages: doc.pages.map((page) => (page.kind !== "cover" || page.background?.kind !== "media" ? page : ({ ...page, background: { ...page.background, veil } } as Page)))
  };
};

/** The photo a video block shows before it plays (a media id), or null for the provider thumbnail. */
export const videoPosterOf = (doc: Doc, blockId: string): string | null => {
  const id = doc.blocks.find((candidate) => candidate.id === blockId && candidate.type === "video")?.config["posterMediaId"];
  return typeof id === "string" && UUID.test(id) ? id : null;
};

/** Picks the photo of the celebration that covers a video, or takes it off (null) to use the provider thumbnail. A value that is not a uuid is ignored. */
export const setVideoPoster = (blockId: string, mediaId: string | null): DocumentOp => (doc) => {
  const block = doc.blocks.find((candidate) => candidate.id === blockId && candidate.type === "video");
  if (!block || (mediaId !== null && !UUID.test(mediaId))) return doc;
  if (mediaId === null) return block.config["posterMediaId"] === undefined ? doc : { ...doc, blocks: doc.blocks.map((candidate) => (candidate === block ? { ...candidate, config: without(candidate.config, "posterMediaId") } : candidate)) };
  if (block.config["posterMediaId"] === mediaId) return doc;
  return { ...doc, blocks: doc.blocks.map((candidate) => (candidate === block ? { ...candidate, config: { ...candidate.config, posterMediaId: mediaId } } : candidate)) };
};
