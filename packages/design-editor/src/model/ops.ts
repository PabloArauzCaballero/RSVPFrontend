import { design } from "@rsvp/celebration-theme";

type Doc = design.DesignDocumentV2;
type Element = design.DesignElement;
type Page = design.DesignPage;
type CanvasName = "mobile" | "desktop";
type Scheme = design.ColourScheme;

/** An operation is a pure function of the document. The reducer runs it and refuses a result that breaks the gifts block. */
export type DocumentOp = (doc: Doc) => Doc;

const HEX = /^#[0-9a-fA-F]{6}$/;

function mapPages(doc: Doc, change: (page: Page) => Page): Doc {
  return { ...doc, pages: doc.pages.map(change) };
}

function mapElements(doc: Doc, canvas: CanvasName, elementId: string, change: (element: Element) => Element): Doc {
  return mapPages(doc, (page) => {
    const grid = page.canvases[canvas];
    if (!grid?.elements.some((element) => element.id === elementId)) return page;
    const next = { ...grid, elements: grid.elements.map((element) => (element.id === elementId ? change(element) : element)) };
    return { ...page, canvases: { ...page.canvases, [canvas]: next } };
  });
}

/** A colour of one palette role, in the light or the dark palette (P8). Anything that is not #RRGGBB is ignored. */
export const setPaletteColour = (scheme: Scheme, role: design.PaletteRole, hex: string): DocumentOp => (doc) => {
  if (!HEX.test(hex)) return doc;
  const value = design.normalise(hex);
  if (doc.tokens.palettes[scheme][role] === value) return doc;
  return { ...doc, tokens: { ...doc.tokens, palettes: { ...doc.tokens.palettes, [scheme]: { ...doc.tokens.palettes[scheme], [role]: value } } } };
};

/** The curated catalogue only (P11). Weights are the ones the family offers, nearest to the ones already in use. */
export const setFontFamily = (role: "heading" | "body" | "monogram", familyId: string): DocumentOp => (doc) => {
  const family = design.familyById(familyId);
  if (!family) return doc;
  const current = doc.tokens.typography[role];
  const wanted = current?.weights ?? [400];
  const weights = [...new Set(wanted.map((weight) => family.weights.reduce((best, candidate) => (Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best))))];
  return { ...doc, tokens: { ...doc.tokens, typography: { ...doc.tokens.typography, [role]: { family: family.id, weights } } } };
};

/** Preset spacing (Basic mode): the section gap and the content width, both on the 4 px grid. */
export const setSpacing = (patch: Partial<Pick<Doc["tokens"]["spacing"], "section" | "contentMaxWidth">>): DocumentOp => (doc) => ({
  ...doc, tokens: { ...doc.tokens, spacing: { ...doc.tokens.spacing, ...patch } }
});

/** A block's own configuration; the type of a block never changes. */
export const setBlockConfig = (blockId: string, patch: Readonly<Record<string, unknown>>): DocumentOp => (doc) => {
  if (!doc.blocks.some((block) => block.id === blockId)) return doc;
  return { ...doc, blocks: doc.blocks.map((block) => (block.id === blockId ? { ...block, config: { ...block.config, ...patch } } : block)) };
};

/** Any layout property of one element in one canvas (position, size, padding, border…). `id`, `block` and `visible` are not patched here. */
export const patchElement = (canvas: CanvasName, elementId: string, patch: Partial<Omit<Element, "id" | "block" | "visible">>): DocumentOp => (doc) =>
  mapElements(doc, canvas, elementId, (element) => ({ ...element, ...patch }));

/** Shows or hides an element in one canvas. The gifts block refuses it through the reducer's guard. */
export const setElementVisible = (canvas: CanvasName, elementId: string, visible: boolean): DocumentOp => (doc) =>
  mapElements(doc, canvas, elementId, (element) => (element.visible === visible ? element : { ...element, visible }));

/** A section on or off in both canvases (Basic mode). The cover page has no switch. */
export const setSectionVisible = (section: string, visible: boolean): DocumentOp => (doc) =>
  mapPages(doc, (page) => {
    if (page.kind !== "section" || page.section !== section) return page;
    const turn = (grid: design.DesignCanvas): design.DesignCanvas => ({ ...grid, elements: grid.elements.map((element) => (element.visible === visible ? element : { ...element, visible })) });
    return { ...page, canvases: { mobile: turn(page.canvases.mobile), ...(page.canvases.desktop ? { desktop: turn(page.canvases.desktop) } : {}) } };
  });

/** The order of the section pages (Basic mode); the cover stays first and unknown ids are ignored. */
export const setSectionOrder = (order: readonly string[]): DocumentOp => (doc) => {
  const cover = doc.pages.filter((page) => page.kind === "cover");
  const sections = doc.pages.filter((page) => page.kind === "section");
  const rank = (page: Page): number => { const at = order.indexOf(page.section ?? ""); return at === -1 ? order.length : at; };
  const sorted = [...sections].sort((first, second) => rank(first) - rank(second));
  return sorted.every((page, index) => page === sections[index]) ? doc : { ...doc, pages: [...cover, ...sorted] };
};

export const setCustomCode = (patch: Partial<Doc["custom"]>): DocumentOp => (doc) => ({ ...doc, custom: { ...doc.custom, ...patch } });

/** Sections a host can switch on and off: every section page except the one holding the gifts button. */
export function switchableSections(doc: Doc, giftsPageId: string | undefined): string[] {
  return doc.pages.filter((page) => page.kind === "section" && page.id !== giftsPageId && page.section !== undefined).map((page) => page.section ?? "");
}
