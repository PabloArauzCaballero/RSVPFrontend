import { design } from "@rsvp/celebration-theme";
import { describe, expect, it } from "vitest";
import { giftsBlock, giftsIssues, giftsPlacement, isGiftsElement } from "../model/guards.js";
import { COALESCE_WINDOW_MS, HISTORY_LIMIT, record, redo, startHistory, undo } from "../model/history.js";
import { patchElement, setBlockConfig, setCustomCode, setElementVisible, setFontFamily, setPaletteColour, setSectionOrder, setSectionVisible, setSpacing, switchableSections } from "../model/ops.js";
import { canRedo, canUndo, documentOf, editorReducer, initialEditorState } from "../model/state.js";
import { fixture, GOLDENS } from "./fixture.js";

describe("history", () => {
  it("records, undoes and redoes; a new edit drops the redo branch", () => {
    let history = startHistory(1);
    history = record(history, 2, null, 0); history = record(history, 3, null, 0);
    expect(history.past).toEqual([1, 2]);
    history = undo(history); expect(history.present).toBe(2);
    history = redo(history); expect(history.present).toBe(3);
    history = undo(undo(history)); expect(history.present).toBe(1);
    history = record(history, 9, null, 0);
    expect(history.future).toEqual([]);
    expect(undo(startHistory(1)).present).toBe(1);
    expect(redo(startHistory(1)).present).toBe(1);
  });

  it("merges edits of the same key inside the window and splits them outside it or on another key", () => {
    let history = startHistory("a");
    history = record(history, "b", "type", 0); history = record(history, "c", "type", 400);
    expect(history.past).toEqual(["a"]);
    history = record(history, "d", "type", 400 + COALESCE_WINDOW_MS + 1);
    expect(history.past).toEqual(["a", "c"]);
    history = record(history, "e", "other", history.lastAt + 1);
    expect(history.past).toEqual(["a", "c", "d"]);
  });

  it("ignores an identical value and caps the past", () => {
    const history = startHistory(0);
    expect(record(history, 0, null, 0)).toBe(history);
    let long = history;
    for (let step = 1; step <= HISTORY_LIMIT + 20; step += 1) long = record(long, step, null, 0);
    expect(long.past).toHaveLength(HISTORY_LIMIT);
    expect(long.past[0]).toBe(20);
  });
});

describe("gifts block guards (P22)", () => {
  it("every golden satisfies them", () => {
    for (const golden of GOLDENS) expect(giftsIssues(golden.v2), golden.key).toEqual([]);
  });

  it("finds the block, its page and the element in each canvas", () => {
    const doc = fixture();
    const block = giftsBlock(doc);
    expect(block?.required).toBe(true);
    const placement = giftsPlacement(doc);
    expect(placement?.element.block).toBe(block?.id);
    expect(isGiftsElement(doc, placement?.element.id ?? "")).toBe(true);
    expect(isGiftsElement(doc, "nope")).toBe(false);
  });

  it("reports each way to break it", () => {
    const doc = fixture();
    const placement = giftsPlacement(doc)?.element;
    const id = placement?.id ?? "";
    const codes = (next: design.DesignDocumentV2): string[] => giftsIssues(next).map((issue) => issue.code);
    expect(codes(setElementVisible("mobile", id, false)(doc))).toContain("GIFTS_BLOCK_HIDDEN");
    expect(codes(patchElement("mobile", id, { opacity: 0.5 })(doc))).toContain("GIFTS_BLOCK_HIDDEN");
    expect(codes(patchElement("mobile", id, { rotation: 5 })(doc))).toContain("GIFTS_BLOCK_LOCKED");
    expect(codes(patchElement("mobile", id, { link: { kind: "url", href: "https://x.example" } })(doc))).toContain("GIFTS_BLOCK_LOCKED");
    expect(codes(patchElement("mobile", id, { x: 3, w: 4 })(doc))).toContain("GIFTS_BLOCK_OUT_OF_CANVAS");
    expect(codes(patchElement("mobile", id, { y: 999, h: 999 })(doc))).toContain("GIFTS_BLOCK_OUT_OF_CANVAS");
    expect(codes(patchElement("mobile", id, { h: 1 })(doc))).toContain("GIFTS_BLOCK_TOO_SMALL");
    expect(codes({ ...doc, blocks: doc.blocks.filter((block) => block.type !== "giftsCta") })).toEqual(["GIFTS_BLOCK_REQUIRED"]);
    expect(codes({ ...doc, blocks: doc.blocks.map((block) => (block.type === "giftsCta" ? { ...block, required: undefined } : block)) as unknown as design.DesignDocumentV2["blocks"] })).toEqual(["GIFTS_BLOCK_REQUIRED"]);
    expect(codes({ ...doc, pages: doc.pages.map((page) => ({ ...page, canvases: { mobile: { ...page.canvases.mobile, elements: page.canvases.mobile.elements.filter((element) => element.id !== id) } } })) })).toEqual(["GIFTS_BLOCK_REQUIRED"]);
  });
});

describe("gifts block guards: useful height and label size (mirror of rules.py)", () => {
  const setup = () => {
    const doc = fixture();
    const placement = giftsPlacement(doc);
    const element = placement?.element;
    if (!placement || !element) throw new Error("no gifts element");
    const codes = (next: design.DesignDocumentV2): string[] => giftsIssues(next).map((issue) => issue.code);
    return { doc, id: element.id, rowHeight: placement.page.canvases.mobile.rowHeight, h: element.h, codes, pageId: placement.page.id };
  };

  // The fixture button is 4 columns (320 px) wide and h 6 x rowHeight 8 = 48 px tall; every figure below is a literal on the 8 px grid.
  const pad = (top: number, bottom: number) => ({ top, right: 0, bottom, left: 0 });
  const border = (width: number) => ({ width, colour: "accent", style: "solid" }) as never;

  it("44 px of useful height exactly is fine; one more px of top padding, bottom padding or border makes it too small", () => {
    const { doc, id, codes } = setup();
    // h 8 = 64 px box; padding 8 + 8 and a 2 px border (4 px) leave exactly 44 px.
    const box = patchElement("mobile", id, { h: 8 })(doc);
    expect(codes(patchElement("mobile", id, { padding: pad(8, 8), border: border(2) })(box))).not.toContain("GIFTS_BLOCK_TOO_SMALL");
    expect(codes(patchElement("mobile", id, { padding: pad(16, 8), border: border(2) })(box))).toContain("GIFTS_BLOCK_TOO_SMALL");
    expect(codes(patchElement("mobile", id, { padding: pad(8, 16), border: border(2) })(box))).toContain("GIFTS_BLOCK_TOO_SMALL");
    expect(codes(patchElement("mobile", id, { padding: pad(0, 24) })(box))).toContain("GIFTS_BLOCK_TOO_SMALL");
    expect(codes(patchElement("mobile", id, { padding: pad(8, 8), border: border(4) })(box))).toContain("GIFTS_BLOCK_TOO_SMALL");
  });

  it("a rotated button is measured by its bounding box, as the validator does (and is locked anyway)", () => {
    const { doc, id, codes } = setup();
    // 2 columns x 48 px = 160 x 48 px; turned 90 degrees its box is 48 x 160, so 16 px of padding leaves 144 px, not 32.
    const turned = patchElement("mobile", id, { w: 2, rotation: 90, padding: pad(8, 8) })(doc);
    expect(codes(turned)).toContain("GIFTS_BLOCK_LOCKED");
    expect(codes(turned)).not.toContain("GIFTS_BLOCK_TOO_SMALL");
  });

  it("a label over 32 px, or whose line does not fit the useful height, is too large; the default line height is 1.25", () => {
    const { doc, id, codes } = setup();
    const size = (value: number, lineHeight?: number) => ({ typography: lineHeight === undefined ? { size: value } : { size: value, lineHeight } });
    expect(codes(patchElement("mobile", id, size(33))(patchElement("mobile", id, { h: 10 })(doc)))).toContain("GIFTS_BLOCK_TEXT_TOO_LARGE");
    // 48 px of useful height: a line of exactly 48 px (32 x 1.5) fits, 56 px (32 x 1.75) does not.
    expect(codes(patchElement("mobile", id, size(32, 1.5))(doc))).not.toContain("GIFTS_BLOCK_TEXT_TOO_LARGE");
    expect(codes(patchElement("mobile", id, size(32, 1.75))(doc))).toContain("GIFTS_BLOCK_TEXT_TOO_LARGE");
    // h 5 = 40 px and a 2 px border leave 36 px: 29 x 1.25 = 36.25 does not fit, 28 x 1.25 = 35 does (1.2 would let 29 through).
    const snug = patchElement("mobile", id, { h: 5, border: border(2) })(doc);
    expect(codes(patchElement("mobile", id, size(29))(snug))).toContain("GIFTS_BLOCK_TEXT_TOO_LARGE");
    expect(codes(patchElement("mobile", id, size(28))(snug))).not.toContain("GIFTS_BLOCK_TEXT_TOO_LARGE");
    expect(codes(patchElement("mobile", id, size(32))(patchElement("mobile", id, { h: 10 })(doc)))).not.toContain("GIFTS_BLOCK_TEXT_TOO_LARGE");
    expect(codes(patchElement("mobile", id, size(32, 4))(patchElement("mobile", id, { h: 10 })(doc)))).toContain("GIFTS_BLOCK_TEXT_TOO_LARGE");
  });

  it("every page that places the button is checked, not only the first", () => {
    const { doc, id, codes } = setup();
    const first = doc.pages.find((page) => page.canvases.mobile.elements.some((element) => element.id === id));
    if (!first) throw new Error("no page");
    const copy = structuredClone(first);
    const element = copy.canvases.mobile.elements.find((candidate) => candidate.id === id);
    if (!element) throw new Error("no element");
    const second: design.DesignPage = { ...copy, id: "page-two", canvases: { mobile: { ...copy.canvases.mobile, elements: [{ ...element, id: "gifts-two", typography: { size: 40 } }] } } };
    const twoPages = { ...doc, pages: [...doc.pages, second] };
    expect(giftsIssues(twoPages).some((issue) => issue.code === "GIFTS_BLOCK_TEXT_TOO_LARGE")).toBe(true);
    expect(codes(doc)).toEqual([]);
  });
});

describe("gifts block guards: covered and contrast (mirror of the server rules)", () => {
  const codes = (doc: design.DesignDocumentV2): string[] => giftsIssues(doc).map((issue) => issue.code);
  const setStyle = (doc: design.DesignDocumentV2, style: string): design.DesignDocumentV2 => ({ ...doc, blocks: doc.blocks.map((block) => (block.type === "giftsCta" ? { ...block, config: { ...block.config, style } } : block)) });
  const setAccent = (doc: design.DesignDocumentV2, scheme: "light" | "dark", accent: string): design.DesignDocumentV2 => setPaletteColour(scheme, "accent", accent)(doc);

  /** The gifts page with a second element in its mobile canvas (the fixture's pages hold one element each). */
  const withNeighbour = (patch: Partial<design.DesignElement>, giftsPatch: Partial<design.DesignElement> = {}, before = false): design.DesignDocumentV2 => {
    const doc = fixture();
    const placement = giftsPlacement(doc);
    const gifts = placement?.element;
    const blockId = doc.blocks.find((block) => block.type !== "giftsCta")?.id ?? "";
    const neighbour: design.DesignElement = { id: "el-neighbour", block: blockId, x: gifts?.x ?? 0, y: gifts?.y ?? 0, w: gifts?.w ?? 1, h: gifts?.h ?? 1, visible: true, ...patch };
    const pageId = placement?.page.id;
    return {
      ...doc,
      pages: doc.pages.map((page) => {
        if (page.id !== pageId) return page;
        const mobile = page.canvases.mobile;
        const own = mobile.elements.map((element) => (element.id === gifts?.id ? { ...element, ...giftsPatch } : element));
        return { ...page, canvases: { ...page.canvases, mobile: { ...mobile, elements: before ? [neighbour, ...own] : [...own, neighbour] } } };
      })
    };
  };

  it("a visible element laid over the button covers it: by z, or by order at equal z; below it, hidden or beside it does not", () => {
    expect(codes(withNeighbour({}))).toContain("GIFTS_BLOCK_COVERED");
    expect(codes(withNeighbour({}, {}, true))).not.toContain("GIFTS_BLOCK_COVERED");
    expect(codes(withNeighbour({ z: 5 }, {}, true))).toContain("GIFTS_BLOCK_COVERED");
    expect(codes(withNeighbour({ z: 5 }, { z: 9 }))).not.toContain("GIFTS_BLOCK_COVERED");
    expect(codes(withNeighbour({ z: -1 }))).not.toContain("GIFTS_BLOCK_COVERED");
    expect(codes(withNeighbour({ visible: false }))).not.toContain("GIFTS_BLOCK_COVERED");
    const gifts = giftsPlacement(fixture())?.element;
    expect(codes(withNeighbour({ y: (gifts?.y ?? 0) + (gifts?.h ?? 1) }))).not.toContain("GIFTS_BLOCK_COVERED");
    const state = editorReducer(initialEditorState(fixture()), { type: "edit", op: () => withNeighbour({}), at: 0 });
    expect(state.refusal?.map((issue) => issue.code)).toContain("GIFTS_BLOCK_COVERED");
  });

  it("a rotated element is measured by its bounding box", () => {
    const gifts = giftsPlacement(fixture())?.element;
    const below = { x: gifts?.x ?? 0, y: (gifts?.y ?? 0) + (gifts?.h ?? 1), w: 4, h: 1 };
    expect(codes(withNeighbour(below))).not.toContain("GIFTS_BLOCK_COVERED");
    expect(codes(withNeighbour({ ...below, y: below.y - 1, rotation: 45, z: 5 }))).toContain("GIFTS_BLOCK_COVERED");
    expect(codes(withNeighbour({ ...below, rotation: 45, z: 5 }))).toContain("GIFTS_BLOCK_COVERED");
  });

  it("an accent that breaks the outline button's text or contour is refused in the palette that carries it; solid is unaffected", () => {
    const doc = fixture();
    const canvas = doc.tokens.palettes.light.canvas;
    const outline = setStyle(doc, "outline");
    expect(codes(outline)).toEqual([]);
    expect(codes(setAccent(outline, "light", canvas))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    expect(codes(setAccent(outline, "dark", outline.tokens.palettes.dark.canvas))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    expect(codes(setAccent(doc, "light", canvas))).toEqual([]);
    expect(codes(setAccent(setStyle(doc, "link"), "light", canvas))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    const state = editorReducer(initialEditorState(setStyle(doc, "outline")), { type: "edit", op: setPaletteColour("light", "accent", canvas), at: 0 });
    expect(state.refusal?.map((issue) => issue.code)).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    expect(state.revision).toBe(0);
  });

  it("the contour of the button, its own colours and a picture behind it are read like the server does", () => {
    const doc = fixture();
    const id = giftsPlacement(doc)?.element.id ?? "";
    const border = (colour: design.PaletteRole): design.DesignDocumentV2 => patchElement("mobile", id, { border: { width: 1, style: "solid", colour } })(doc);
    expect(codes(border("text"))).toEqual([]);
    expect(codes(border("surface"))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    expect(codes(patchElement("mobile", id, { border: { width: 0, style: "solid", colour: "surface" } })(doc))).toEqual([]);
    expect(codes(patchElement("mobile", id, { typography: { colour: "canvas" } })(doc))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    expect(codes(patchElement("mobile", id, { background: { kind: "colour", role: "text" }, typography: { colour: "canvas" } })(doc))).toEqual([]);
    expect(codes(patchElement("mobile", id, { background: { kind: "media", mediaId: "11111111-1111-4111-8111-111111111111", fit: "cover" } })(doc))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    expect(codes(patchElement("mobile", id, { background: { kind: "illustration", illustrationId: "x" } })(doc))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    const onImagePage = (style: string): design.DesignDocumentV2 => {
      const placed = setStyle(doc, style);
      const pageId = giftsPlacement(placed)?.page.id;
      return { ...placed, pages: placed.pages.map((page) => (page.id === pageId ? { ...page, background: { kind: "media" as const, mediaId: "11111111-1111-4111-8111-111111111111", fit: "cover" as const } } : page)) };
    };
    expect(codes(onImagePage("solid"))).toEqual([]);
    expect(codes(onImagePage("link"))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    expect(codes(onImagePage("outline"))).toContain("GIFTS_BLOCK_LOW_CONTRAST");
    const solidBordered = patchElement("mobile", id, { border: { width: 2, style: "solid", colour: "accent" } })(onImagePage("solid"));
    expect(codes(solidBordered)).toContain("GIFTS_BLOCK_LOW_CONTRAST");
  });
});

describe("document operations", () => {
  it("sets a palette colour in the light or dark palette and ignores bad hex", () => {
    const doc = fixture();
    const next = setPaletteColour("dark", "accent", "#abcdef")(doc);
    expect(next.tokens.palettes.dark.accent).toBe("#ABCDEF");
    expect(next.tokens.palettes.light).toBe(doc.tokens.palettes.light);
    expect(setPaletteColour("dark", "accent", "red")(doc)).toBe(doc);
    expect(setPaletteColour("light", "text", doc.tokens.palettes.light.text)(doc)).toBe(doc);
  });

  it("changes a font only to a catalogue family, snapping the weights to ones it has", () => {
    const doc = fixture();
    const next = setFontFamily("heading", "dm-serif-display")(doc);
    expect(next.tokens.typography.heading).toEqual({ family: "dm-serif-display", weights: [400] });
    expect(setFontFamily("heading", "comic-sans")(doc)).toBe(doc);
    expect(setFontFamily("monogram", "great-vibes")(doc).tokens.typography.monogram).toEqual({ family: "great-vibes", weights: [400] });
  });

  it("applies spacing presets, block config and custom code", () => {
    const doc = fixture();
    expect(setSpacing({ section: 64 })(doc).tokens.spacing.section).toBe(64);
    const heading = doc.blocks.find((block) => block.type === "giftsCta");
    expect(setBlockConfig(heading?.id ?? "", { label: "Ver regalos" })(doc).blocks.find((block) => block.id === heading?.id)?.config).toMatchObject({ label: "Ver regalos" });
    expect(setBlockConfig("missing", { a: 1 })(doc)).toBe(doc);
    expect(setCustomCode({ css: "p{color:red}" })(doc).custom.css).toBe("p{color:red}");
  });

  it("turns sections on and off in both canvases and reorders them keeping the cover first", () => {
    const doc = fixture();
    const off = setSectionVisible("faq", false)(doc);
    const page = off.pages.find((candidate) => candidate.section === "faq");
    expect(page?.canvases.mobile.elements.every((element) => !element.visible)).toBe(true);
    expect(setSectionVisible("faq", true)(doc).pages).toEqual(doc.pages);
    const order = ["gallery", "story"];
    const sorted = setSectionOrder(order)(doc);
    expect(sorted.pages[0]?.kind).toBe("cover");
    const sections = sorted.pages.filter((candidate) => candidate.kind === "section").map((candidate) => candidate.section);
    expect(sections.slice(0, 2)).toEqual(["gallery", "story"]);
    expect(setSectionOrder(doc.pages.filter((p) => p.kind === "section").map((p) => p.section ?? ""))(doc)).toBe(doc);
  });

  it("lists switchable sections without the page holding the gifts button", () => {
    const doc = fixture();
    const placement = giftsPlacement(doc);
    const list = switchableSections(doc, placement?.page.id);
    expect(list).not.toContain(placement?.page.section ?? "?");
    expect(list.length).toBe(doc.pages.length - 2);
  });

  it("the converter output round-trips through the dark scheme", () => {
    expect(design.contrastWarnings(fixture())).toEqual([]);
  });
});

describe("editor reducer", () => {
  const at = 0;
  it("edits, undoes, redoes and bumps the revision on every change of the document", () => {
    let state = initialEditorState(fixture());
    expect(canUndo(state)).toBe(false);
    state = editorReducer(state, { type: "edit", op: setPaletteColour("light", "accent", "#112233"), at });
    expect(state.revision).toBe(1);
    expect(documentOf(state).tokens.palettes.light.accent).toBe("#112233");
    expect(canUndo(state)).toBe(true);
    state = editorReducer(state, { type: "undo" });
    expect(state.revision).toBe(2);
    expect(canRedo(state)).toBe(true);
    state = editorReducer(state, { type: "redo" });
    expect(documentOf(state).tokens.palettes.light.accent).toBe("#112233");
    expect(editorReducer(state, { type: "redo" })).toBe(state);
    expect(editorReducer(initialEditorState(fixture()), { type: "undo" }).revision).toBe(0);
  });

  it("a no-op edit changes nothing", () => {
    const state = initialEditorState(fixture());
    expect(editorReducer(state, { type: "edit", op: (doc) => doc, at })).toBe(state);
  });

  it("refuses a gesture that would hide, rotate or remove the gifts block, and says why", () => {
    const state = initialEditorState(fixture());
    const id = giftsPlacement(documentOf(state))?.element.id ?? "";
    const hidden = editorReducer(state, { type: "edit", op: setElementVisible("mobile", id, false), at });
    expect(documentOf(hidden)).toBe(documentOf(state));
    expect(hidden.revision).toBe(0);
    expect(hidden.refusal?.map((issue) => issue.code)).toContain("GIFTS_BLOCK_HIDDEN");
    expect(editorReducer(hidden, { type: "dismissRefusal" }).refusal).toBeNull();
    expect(editorReducer(state, { type: "dismissRefusal" })).toBe(state);
    const turned = editorReducer(state, { type: "edit", op: patchElement("mobile", id, { rotation: 10 }), at });
    expect(turned.refusal?.[0]?.code).toBe("GIFTS_BLOCK_LOCKED");
    const removed = editorReducer(state, { type: "edit", op: (doc) => ({ ...doc, blocks: doc.blocks.filter((block) => block.type !== "giftsCta") }), at });
    expect(removed.refusal?.[0]?.code).toBe("GIFTS_BLOCK_REQUIRED");
    // moving and resizing within the canvas is allowed
    const moved = editorReducer(state, { type: "edit", op: patchElement("mobile", id, { y: 3 }), at });
    expect(moved.refusal).toBeNull();
    expect(moved.revision).toBe(1);
  });

  it("does not freeze a document that arrived already broken, only refuses new breakage", () => {
    const broken = fixture();
    const id = giftsPlacement(broken)?.element.id ?? "";
    const arrived = setElementVisible("mobile", id, false)(broken);
    const state = initialEditorState(arrived);
    const edited = editorReducer(state, { type: "edit", op: setPaletteColour("light", "accent", "#111111"), at });
    expect(edited.revision).toBe(1);
    expect(edited.refusal).toBeNull();
  });

  it("keeps mode, canvas and selection; Basic mode clears the selection; load resets history but keeps the view", () => {
    let state = initialEditorState(fixture());
    state = editorReducer(state, { type: "setMode", mode: "advanced" });
    state = editorReducer(state, { type: "setCanvas", canvas: "desktop" });
    state = editorReducer(state, { type: "select", id: "el-cover" });
    expect(state).toMatchObject({ mode: "advanced", canvas: "desktop", selection: "el-cover" });
    expect(editorReducer(state, { type: "setMode", mode: "basic" }).selection).toBeNull();
    const loaded = editorReducer(editorReducer(state, { type: "edit", op: setSpacing({ section: 64 }), at }), { type: "load", document: fixture("minimalista") });
    expect(loaded).toMatchObject({ mode: "advanced", canvas: "desktop", selection: null, revision: 0 });
    expect(canUndo(loaded)).toBe(false);
  });

  it("coalesces typing into one undo step", () => {
    let state = initialEditorState(fixture());
    const key = "palette:light:accent";
    state = editorReducer(state, { type: "edit", op: setPaletteColour("light", "accent", "#111111"), key, at: 0 });
    state = editorReducer(state, { type: "edit", op: setPaletteColour("light", "accent", "#222222"), key, at: 300 });
    state = editorReducer(state, { type: "undo" });
    expect(documentOf(state).tokens.palettes.light.accent).toBe(fixture().tokens.palettes.light.accent);
  });
});
