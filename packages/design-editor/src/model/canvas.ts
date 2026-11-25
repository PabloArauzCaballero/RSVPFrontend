import type { design } from "@rsvp/celebration-theme";
import { isGiftsElement } from "./guards.js";
import type { DocumentOp } from "./ops.js";

type Doc = design.DesignDocumentV2;
type Element = design.DesignElement;
type Canvas = design.DesignCanvas;
type CanvasName = "mobile" | "desktop";

/** Grid of each canvas (P9): 4 columns on mobile, 12 on desktop; rows of 8 px. */
export const GRID = { mobile: { columns: 4, rowHeight: 8 }, desktop: { columns: 12, rowHeight: 8 } } as const;
/** Width in px at which the editor draws each canvas. The grid units, not these pixels, are what the document stores. */
export const STAGE_WIDTH = { mobile: 360, desktop: 960 } as const;
export const MAX_Z = 100;
export const MAX_ROWS = 500;

/** Rows a block takes when its canvas turns free (flow canvases size themselves; a free one needs a height). */
export const DEFAULT_ROWS: Readonly<Record<string, number>> = {
  cover: 48, giftsCta: 6, rsvpCta: 6, heading: 6, text: 12, story: 24, image: 30, imageText: 30, gallery: 30, schedule: 30, venues: 30, countdown: 8,
  dressCode: 16, faq: 24, recommendations: 24, illustration: 16, monogram: 12, ornament: 4, spacer: 4, button: 6, quote: 12, weddingParty: 24, video: 24, music: 8, map: 24, html: 16
};

/**
 * Components the host can add from the palette: the ones that need no uploaded media or celebration data to exist.
 * `textField` names the config field that carries the visible default text; the UI fills it from the catalogue (`palette.default.<type>`) so it follows the editor's language.
 */
export const PALETTE: readonly { readonly type: string; readonly config: Readonly<Record<string, unknown>>; readonly textField?: string }[] = [
  { type: "heading", config: { level: 2 }, textField: "text" },
  { type: "text", config: {}, textField: "text" },
  { type: "quote", config: {}, textField: "text" },
  { type: "button", config: { style: "outline" }, textField: "label" },
  { type: "countdown", config: { precision: "days" } },
  { type: "ornament", config: { ornament: "rule" } },
  { type: "spacer", config: {} },
  { type: "html", config: {} }
];

const rowsOf = (type: string): number => DEFAULT_ROWS[type] ?? 12;

function blockType(doc: Doc, element: Element): string {
  return doc.blocks.find((block) => block.id === element.block)?.type ?? "";
}

function mapPage(doc: Doc, pageId: string, change: (page: design.DesignPage) => design.DesignPage): Doc {
  let changed = false;
  const pages = doc.pages.map((page) => {
    if (page.id !== pageId) return page;
    const next = change(page);
    if (next !== page) changed = true;
    return next;
  });
  return changed ? { ...doc, pages } : doc;
}

const bottomOf = (grid: Canvas): number => grid.elements.reduce((max, element) => Math.max(max, element.y + element.h), 0);

/** Keeps an element inside its canvas: at least 1 column wide, never past the last column or row. */
export function clampToCanvas<T extends Pick<Element, "x" | "y" | "w" | "h">>(box: T, grid: Pick<Canvas, "columns" | "rowHeight">): T {
  const w = Math.min(Math.max(1, Math.round(box.w)), grid.columns);
  const x = Math.min(Math.max(0, Math.round(box.x)), grid.columns - w);
  const h = Math.min(Math.max(1, Math.round(box.h)), MAX_ROWS);
  const y = Math.min(Math.max(0, Math.round(box.y)), Math.floor(4000 / grid.rowHeight) - h);
  return { ...box, x, y, w, h };
}

/** Flow → free: every element keeps its order, takes the full width and a default height, stacked with a one-row gap. */
export const makeFree = (pageId: string, canvas: CanvasName): DocumentOp => (doc) => mapPage(doc, pageId, (page) => {
  const grid = page.canvases[canvas];
  if (!grid || grid.mode === "free") return page;
  let y = 0;
  const elements = [...grid.elements].sort((a, b) => a.y - b.y).map((element) => {
    const h = rowsOf(blockType(doc, element));
    const placed = { ...element, x: 0, w: grid.columns, y, h };
    y += h + 1;
    return placed;
  });
  return { ...page, canvases: { ...page.canvases, [canvas]: { ...grid, mode: "free" as const, elements } } };
});

/** P9: the desktop canvas inherits the mobile one, scaled to 12 columns, until the host edits it. */
export const createDesktopCanvas = (pageId: string): DocumentOp => (doc) => mapPage(doc, pageId, (page) => {
  if (page.canvases.desktop) return page;
  const mobile = page.canvases.mobile;
  const factor = GRID.desktop.columns / mobile.columns;
  const elements = mobile.elements.map((element) => clampToCanvas({ ...element, x: element.x * factor, w: element.w * factor }, GRID.desktop));
  return { ...page, canvases: { ...page.canvases, desktop: { mode: mobile.mode, columns: GRID.desktop.columns, rowHeight: mobile.rowHeight, elements } } };
});

let counter = 0;
const nextId = (prefix: string, used: ReadonlySet<string>): string => {
  for (;;) { counter += 1; const id = `${prefix}-${Date.now().toString(36)}${counter}`; if (!used.has(id)) return id; }
};

/** Adds a component at the bottom of a page, in every canvas the page has (the desktop one scaled to its columns). */
export const addBlock = (pageId: string, type: string, config: Readonly<Record<string, unknown>>): DocumentOp => (doc) => {
  const page = doc.pages.find((candidate) => candidate.id === pageId);
  if (!page || doc.blocks.length >= 300) return doc;
  const blockId = nextId(`b-${type}`, new Set(doc.blocks.map((block) => block.id)));
  const elementId = nextId(`el-${type}`, new Set(doc.pages.flatMap((candidate) => [candidate.canvases.mobile, candidate.canvases.desktop].flatMap((grid) => grid?.elements.map((element) => element.id) ?? []))));
  const rows = rowsOf(type);
  const place = (grid: Canvas): Canvas => ({ ...grid, elements: [...grid.elements, clampToCanvas({ id: elementId, block: blockId, x: 0, y: bottomOf(grid) + 1, w: grid.columns, h: rows, visible: true }, grid)] });
  const withBlock = { ...doc, blocks: [...doc.blocks, { id: blockId, type, config } as design.DesignBlock] };
  return mapPage(withBlock, pageId, (target) => ({ ...target, canvases: { mobile: place(target.canvases.mobile), ...(target.canvases.desktop ? { desktop: place(target.canvases.desktop) } : {}) } }));
};

/** Removes an element from every canvas, and its block when nothing else places it. The gifts and cover elements stay (the reducer refuses the gifts one). */
export const removeElement = (elementId: string): DocumentOp => (doc) => {
  const owners = doc.pages.flatMap((page) => [page.canvases.mobile, page.canvases.desktop].flatMap((grid) => grid?.elements.filter((element) => element.id === elementId) ?? []));
  const block = owners[0]?.block;
  if (!block) return doc;
  const pages = doc.pages.map((page) => ({
    ...page,
    canvases: {
      mobile: { ...page.canvases.mobile, elements: page.canvases.mobile.elements.filter((element) => element.id !== elementId) },
      ...(page.canvases.desktop ? { desktop: { ...page.canvases.desktop, elements: page.canvases.desktop.elements.filter((element) => element.id !== elementId) } } : {})
    }
  }));
  const stillPlaced = pages.some((page) => [page.canvases.mobile, page.canvases.desktop].some((grid) => grid?.elements.some((element) => element.block === block)));
  return { ...doc, pages, blocks: stillPlaced ? doc.blocks : doc.blocks.filter((candidate) => candidate.id !== block) };
};

export const canRemove = (doc: Doc, elementId: string): boolean => {
  if (isGiftsElement(doc, elementId)) return false;
  const type = doc.blocks.find((block) => doc.pages.some((page) => [page.canvases.mobile, page.canvases.desktop].some((grid) => grid?.elements.some((element) => element.id === elementId && element.block === block.id))))?.type;
  return type !== undefined && type !== "cover";
};

/** z-order: above or below every other element of the canvas, within the contract's ±100. */
export const reorderLayer = (canvas: CanvasName, elementId: string, direction: "front" | "back"): DocumentOp => (doc) => {
  let changed = false;
  const pages = doc.pages.map((page) => {
    const grid = page.canvases[canvas];
    const target = grid?.elements.find((element) => element.id === elementId);
    if (!grid || !target) return page;
    const others = grid.elements.filter((element) => element !== target).map((element) => element.z ?? 0);
    const z = direction === "front" ? Math.min(MAX_Z, Math.max(-MAX_Z, ...others, 0) + 1) : Math.max(-MAX_Z, Math.min(MAX_Z, ...others, 0) - 1);
    if ((target.z ?? 0) === z) return page;
    changed = true;
    return { ...page, canvases: { ...page.canvases, [canvas]: { ...grid, elements: grid.elements.map((element) => (element === target ? { ...element, z } : element)) } } };
  });
  return changed ? { ...doc, pages } : doc;
};

/** Moves and resizes one element keeping it inside its canvas. */
export const placeElement = (canvas: CanvasName, elementId: string, box: Partial<Pick<Element, "x" | "y" | "w" | "h">>): DocumentOp => (doc) => {
  let changed = false;
  const pages = doc.pages.map((page) => {
    const grid = page.canvases[canvas];
    const target = grid?.elements.find((element) => element.id === elementId);
    if (!grid || !target) return page;
    const next = clampToCanvas({ ...target, ...box }, grid);
    if (next.x === target.x && next.y === target.y && next.w === target.w && next.h === target.h) return page;
    changed = true;
    return { ...page, canvases: { ...page.canvases, [canvas]: { ...grid, elements: grid.elements.map((element) => (element === target ? { ...target, x: next.x, y: next.y, w: next.w, h: next.h } : element)) } } };
  });
  return changed ? { ...doc, pages } : doc;
};

/** Rotation in degrees, snapped to 5° and kept in [-180, 180]. */
export const rotateElement = (canvas: CanvasName, elementId: string, degrees: number): DocumentOp => (doc) => {
  const snapped = Math.max(-180, Math.min(180, Math.round(degrees / 5) * 5));
  return doc.pages.some((page) => page.canvases[canvas]?.elements.some((element) => element.id === elementId && (element.rotation ?? 0) !== snapped))
    ? { ...doc, pages: doc.pages.map((page) => {
      const grid = page.canvases[canvas];
      if (!grid?.elements.some((element) => element.id === elementId)) return page;
      return { ...page, canvases: { ...page.canvases, [canvas]: { ...grid, elements: grid.elements.map((element) => (element.id === elementId ? { ...element, rotation: snapped } : element)) } } };
    }) }
    : doc;
};

/** Padding or margin of one element, each side a multiple of 4 and at most 256. */
export const setElementBox = (canvas: CanvasName, elementId: string, which: "padding" | "margin", side: "top" | "right" | "bottom" | "left", value: number): DocumentOp => (doc) => {
  const px = Math.min(256, Math.max(0, Math.round(value / 4) * 4));
  let changed = false;
  const pages = doc.pages.map((page) => {
    const grid = page.canvases[canvas];
    const target = grid?.elements.find((element) => element.id === elementId);
    if (!grid || !target) return page;
    const box = { top: 0, right: 0, bottom: 0, left: 0, ...target[which], [side]: px };
    if (target[which]?.[side] === px || (!target[which] && px === 0)) return page;
    changed = true;
    return { ...page, canvases: { ...page.canvases, [canvas]: { ...grid, elements: grid.elements.map((element) => (element === target ? { ...target, [which]: box } : element)) } } };
  });
  return changed ? { ...doc, pages } : doc;
};
