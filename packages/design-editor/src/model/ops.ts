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

/** What the host had hidden by hand inside a section before switching it off: `canvas:elementId` keys. */
export type HiddenByHand = ReadonlySet<string>;
export const hiddenElements = (doc: Doc, section: string): HiddenByHand => {
  const keys = new Set<string>();
  for (const page of doc.pages) {
    if (page.kind !== "section" || page.section !== section) continue;
    for (const name of ["mobile", "desktop"] as const) for (const element of page.canvases[name]?.elements ?? []) if (!element.visible) keys.add(`${name}:${element.id}`);
  }
  return keys;
};

/**
 * A section on or off in both canvases (Basic mode). The cover page has no switch. Switching it on leaves hidden the elements
 * in `keepHidden` (what the host had hidden by hand in Advanced before switching the section off).
 */
export const setSectionVisible = (section: string, visible: boolean, keepHidden: HiddenByHand = new Set()): DocumentOp => (doc) =>
  mapPages(doc, (page) => {
    if (page.kind !== "section" || page.section !== section) return page;
    const turn = (grid: design.DesignCanvas, name: CanvasName): design.DesignCanvas => ({
      ...grid, elements: grid.elements.map((element) => { const shown = visible && !keepHidden.has(`${name}:${element.id}`); return element.visible === shown ? element : { ...element, visible: shown }; })
    });
    return { ...page, canvases: { mobile: turn(page.canvases.mobile, "mobile"), ...(page.canvases.desktop ? { desktop: turn(page.canvases.desktop, "desktop") } : {}) } };
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

/**
 * Padding presets (px, multiples of 4): the same padding on every element of every canvas, except the gifts button. Its box is as
 * tall as the 44 px touch target needs (P22) and padding is taken out of that height, so a preset would always be refused for it;
 * the host changes the button's own padding in the inspector, where the guard refuses what would leave it under 44 px.
 */
export const PADDING_PRESETS = { none: 0, small: 8, medium: 16, large: 32 } as const;
export type PaddingPreset = keyof typeof PADDING_PRESETS;

export const applyPaddingPreset = (preset: PaddingPreset): DocumentOp => (doc) => {
  const giftsId = doc.blocks.find((block) => block.type === "giftsCta")?.id;
  const value = PADDING_PRESETS[preset];
  const box = { top: value, right: value, bottom: value, left: value };
  let changed = false;
  const pages = doc.pages.map((page) => {
    const retouch = (grid: design.DesignCanvas): design.DesignCanvas => ({
      ...grid,
      elements: grid.elements.map((element) => {
        if (element.block === giftsId) return element;
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
  const giftsId = doc.blocks.find((block) => block.type === "giftsCta")?.id;
  for (const page of doc.pages) for (const grid of [page.canvases.mobile, page.canvases.desktop]) for (const element of grid?.elements ?? []) {
    if (element.block === giftsId) continue;
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

/**
 * The text a block shows, for the blocks whose text the Basic level edits. `optional` fields are overrides of an automatic
 * text (the gifts and confirm buttons follow their status until the host writes their own): emptying one gives the automatic
 * text back. A required field (a heading, a paragraph, a quote, a button) can never be left empty.
 */
export type TextField = { readonly blockId: string; readonly type: string; readonly field: "text" | "label" | "author"; readonly value: string; readonly optional: boolean };
export const TEXT_FIELDS: Readonly<Record<string, readonly (readonly [TextField["field"], boolean])[]>> = {
  heading: [["text", false]], text: [["text", false]], quote: [["text", false], ["author", true]], button: [["label", false]],
  giftsCta: [["label", true]], rsvpCta: [["label", true]]
};
/**
 * The most each editable text may hold, per block type and field: the `maxLength` the published contract
 * (`components.schemas.DesignBlock*` in `@rsvp/contracts` template-media) gives it. The server answers 422 to anything longer,
 * so the box stops at the limit. A test walks every editable field against the vendored contract and fails if one diverges.
 */
export const TEXT_LIMITS: Readonly<Record<string, Readonly<Partial<Record<TextField["field"], number>>>>> = {
  heading: { text: 200 }, text: { text: 5000 }, quote: { text: 1000, author: 120 }, button: { label: 60 },
  giftsCta: { label: 40 }, rsvpCta: { label: 40 }
};
/** The limit of one editable text (every field in TEXT_FIELDS has one). */
export const textLimit = (type: string, field: TextField["field"]): number => TEXT_LIMITS[type]?.[field] ?? 0;

/**
 * The texts the host can edit in the blocks the document has. A converted v1 template (convertV1ToV2) only carries the gifts
 * and confirm buttons here: the story, the programme, the questions and the venues read the celebration's own data, so they are
 * edited with the celebration and never appear in this list.
 */
export function editableTexts(doc: Doc): TextField[] {
  return doc.blocks.flatMap((block) => (TEXT_FIELDS[block.type] ?? []).flatMap(([field, optional]) => {
    const value = block.config[field];
    if (typeof value === "string") return [{ blockId: block.id, type: block.type, field, value, optional }];
    return optional && value === undefined ? [{ blockId: block.id, type: block.type, field, value: "", optional }] : [];
  }));
}

/** Writes a block's text, or removes an optional one (null) so the automatic text comes back. */
export const setBlockText = (blockId: string, field: TextField["field"], value: string | null): DocumentOp => (doc) => {
  const block = doc.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return doc;
  const { [field]: _previous, ...rest } = block.config;
  const config = value === null ? rest : { ...rest, [field]: value };
  if (value !== null && block.config[field] === value) return doc;
  if (value === null && !(field in block.config)) return doc;
  return { ...doc, blocks: doc.blocks.map((candidate) => (candidate.id === blockId ? { ...candidate, config } : candidate)) };
};

/** Block and element ids of the cover drawing the Basic level adds. */
export const COVER_DRAWING_BLOCK = "cover-drawing";
const COVER_DRAWING_ELEMENT = "el-cover-drawing";
const COVER_DRAWING_ROWS = 14;

/** The id of the drawing on the cover (an `illustration` block), or null. */
export const coverDrawingOf = (doc: Doc): string | null => {
  const id = doc.blocks.find((block) => block.id === COVER_DRAWING_BLOCK && block.type === "illustration")?.config["illustrationId"];
  return typeof id === "string" ? id : null;
};

/**
 * Puts the drawing `drawingId` (an id of the invitation drawing library, tinted with the template accent) on the cover, below its
 * other elements, or takes it off (null). Changing it keeps its place. The gifts button is never touched.
 */
export const setCoverDrawing = (drawingId: string | null): DocumentOp => (doc) => {
  const cover = doc.pages.find((page) => page.kind === "cover");
  if (!cover) return doc;
  const current = coverDrawingOf(doc);
  if (current === drawingId) return doc;
  if (drawingId === null) {
    const blocks = doc.blocks.filter((block) => block.id !== COVER_DRAWING_BLOCK);
    const strip = (grid: design.DesignCanvas | undefined): design.DesignCanvas | undefined => (grid ? { ...grid, elements: grid.elements.filter((element) => element.block !== COVER_DRAWING_BLOCK) } : grid);
    return { ...doc, blocks, pages: doc.pages.map((page) => (page.id !== cover.id ? page : { ...page, canvases: { mobile: strip(page.canvases.mobile) as design.DesignCanvas, ...(page.canvases.desktop ? { desktop: strip(page.canvases.desktop) as design.DesignCanvas } : {}) } })) };
  }
  const config = { illustrationId: drawingId, tint: "accent", drawOnEnter: true };
  if (current !== null) return { ...doc, blocks: doc.blocks.map((block) => (block.id === COVER_DRAWING_BLOCK ? { ...block, config } : block)) };
  const place = (grid: design.DesignCanvas): design.DesignCanvas => {
    const below = grid.elements.reduce((end, element) => Math.max(end, element.y + element.h), 0);
    return { ...grid, elements: [...grid.elements, { id: COVER_DRAWING_ELEMENT, block: COVER_DRAWING_BLOCK, x: 0, y: below, w: grid.columns, h: COVER_DRAWING_ROWS, visible: true }] };
  };
  return {
    ...doc,
    blocks: [...doc.blocks, { id: COVER_DRAWING_BLOCK, type: "illustration", config }],
    pages: doc.pages.map((page) => (page.id !== cover.id ? page : { ...page, canvases: { mobile: place(page.canvases.mobile), ...(page.canvases.desktop ? { desktop: place(page.canvases.desktop) } : {}) } }))
  };
};

/** The photo of the cover (the media id of its page background), or null. */
export const coverPhotoOf = (doc: Doc): string | null => {
  const background = doc.pages.find((page) => page.kind === "cover")?.background;
  return background?.kind === "media" ? background.mediaId : null;
};

/** Sets the cover photo from the media store (by id) or takes it off (null); a scrim keeps the text on top readable. */
export const setCoverPhoto = (mediaId: string | null): DocumentOp => (doc) => {
  if (coverPhotoOf(doc) === mediaId) return doc;
  return mapPages(doc, (page) => {
    if (page.kind !== "cover") return page;
    if (mediaId === null) { const { background: _removed, ...rest } = page; return rest; }
    // Changing the photo keeps the host's choice of veil (graded or even): it belongs to the cover, not to one photo. A first photo takes the graded veil of the templates, written explicitly.
    const veil = page.background?.kind === "media" ? (page.background as { veil?: unknown }).veil : undefined;
    return { ...page, background: { kind: "media", mediaId, fit: "cover", scrim: 0.35, veil: veil === "even" ? "even" : "graded" } };
  });
};

/** A photo as the background of any page (the cover has `setCoverPhoto`), or none; a scrim keeps the text on top readable. */
export const setPageBackgroundPhoto = (pageId: string, mediaId: string | null): DocumentOp => (doc) => {
  const page = doc.pages.find((candidate) => candidate.id === pageId);
  if (!page) return doc;
  const current = page.background?.kind === "media" ? page.background.mediaId : null;
  if (current === mediaId) return doc;
  return mapPages(doc, (candidate) => {
    if (candidate.id !== pageId) return candidate;
    if (mediaId === null) { const { background: _removed, ...rest } = candidate; return rest; }
    return { ...candidate, background: { kind: "media", mediaId, fit: "cover", scrim: 0.35 } };
  });
};
