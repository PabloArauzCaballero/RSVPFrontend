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

/** Spacing presets of the Basic level: the gap between sections and the width of the content, both on the 4 px grid. */
export const SPACING_PRESETS = {
  compact: { section: 32, contentMaxWidth: 560 },
  normal: { section: 48, contentMaxWidth: 720 },
  airy: { section: 72, contentMaxWidth: 880 }
} as const;
export type SpacingPreset = keyof typeof SPACING_PRESETS;

export const spacingPresetOf = (doc: Doc): SpacingPreset | null => {
  const { section, contentMaxWidth } = doc.tokens.spacing;
  return (Object.keys(SPACING_PRESETS) as SpacingPreset[]).find((name) => SPACING_PRESETS[name].section === section && SPACING_PRESETS[name].contentMaxWidth === contentMaxWidth) ?? null;
};

export const applySpacingPreset = (preset: SpacingPreset): DocumentOp => setSpacing(SPACING_PRESETS[preset]);

/** Padding presets (px, multiples of 4): the same padding on every element of every canvas. */
export const PADDING_PRESETS = { none: 0, small: 8, medium: 16, large: 32 } as const;
export type PaddingPreset = keyof typeof PADDING_PRESETS;

export const applyPaddingPreset = (preset: PaddingPreset): DocumentOp => (doc) => {
  const value = PADDING_PRESETS[preset];
  const box = { top: value, right: value, bottom: value, left: value };
  let changed = false;
  const pages = doc.pages.map((page) => {
    const retouch = (grid: design.DesignCanvas): design.DesignCanvas => ({
      ...grid,
      elements: grid.elements.map((element) => {
        const current = element.padding;
        if (current && current.top === value && current.right === value && current.bottom === value && current.left === value) return element;
        if (!current && value === 0) return element;
        changed = true;
        return { ...element, padding: box };
      })
    });
    return { ...page, canvases: { mobile: retouch(page.canvases.mobile), ...(page.canvases.desktop ? { desktop: retouch(page.canvases.desktop) } : {}) } };
  });
  return changed ? { ...doc, pages } : doc;
};

/** The padding every element shares, or null when they differ (so the preset buttons show none selected). */
export function sharedPadding(doc: Doc): PaddingPreset | null {
  const values = new Set<number>();
  for (const page of doc.pages) for (const grid of [page.canvases.mobile, page.canvases.desktop]) for (const element of grid?.elements ?? []) {
    const box = element.padding;
    if (!box) values.add(0); else if (box.top === box.right && box.right === box.bottom && box.bottom === box.left) values.add(box.top); else values.add(-1);
  }
  if (values.size !== 1) return null;
  const [only] = [...values];
  return (Object.keys(PADDING_PRESETS) as PaddingPreset[]).find((name) => PADDING_PRESETS[name] === only) ?? null;
}

/**
 * Picks another template: its design replaces the layout, palettes and fonts. The host's own code (HTML/CSS) is kept and
 * the whole change is one undo step. The incoming document must already satisfy the gifts rules (the reducer refuses it if not).
 */
export const applyTemplateDocument = (incoming: Doc): DocumentOp => (doc) => ({ ...incoming, custom: doc.custom });

/** The text a block shows, for the blocks whose text the Basic level edits. */
export type TextField = { readonly blockId: string; readonly type: string; readonly field: "text" | "label" | "author"; readonly value: string };
const TEXT_FIELDS: Readonly<Record<string, readonly TextField["field"][]>> = { heading: ["text"], text: ["text"], quote: ["text", "author"], button: ["label"] };

export function editableTexts(doc: Doc): TextField[] {
  return doc.blocks.flatMap((block) => (TEXT_FIELDS[block.type] ?? []).flatMap((field) => {
    const value = block.config[field];
    return typeof value === "string" ? [{ blockId: block.id, type: block.type, field, value }] : [];
  }));
}
