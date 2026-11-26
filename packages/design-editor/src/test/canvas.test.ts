import { describe, expect, it } from "vitest";
import { addBlock, canRemove, clampToCanvas, createDesktopCanvas, DEFAULT_ROWS, GRID, makeFree, MAX_Z, PALETTE, placeElement, removeElement, reorderLayer, rotateElement, setElementBox } from "../model/canvas.js";
import { giftsIssues, giftsPlacement } from "../model/guards.js";
import { documentOf, editorReducer, initialEditorState } from "../model/state.js";
import { patchElement, type DocumentOp } from "../model/ops.js";
import { fixture } from "./fixture.js";

const doc0 = () => fixture();
const giftsPage = (doc = doc0()) => giftsPlacement(doc)?.page.id ?? "";
const freeGifts = () => makeFree(giftsPage(), "mobile")(doc0());
const elementIn = (doc: ReturnType<typeof doc0>, id: string, canvas: "mobile" | "desktop" = "mobile") => doc.pages.flatMap((page) => page.canvases[canvas]?.elements ?? []).find((element) => element.id === id);

describe("clampToCanvas", () => {
  it("keeps boxes inside the columns and the 4000 px height, at least 1×1", () => {
    expect(clampToCanvas({ x: 3, y: 0, w: 4, h: 6 }, GRID.mobile)).toEqual({ x: 0, y: 0, w: 4, h: 6 });
    expect(clampToCanvas({ x: -5, y: -2, w: 0, h: 0 }, GRID.mobile)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(clampToCanvas({ x: 9, y: 9999, w: 2, h: 10 }, GRID.mobile)).toEqual({ x: 2, y: 490, w: 2, h: 10 });
    expect(clampToCanvas({ x: 1.6, y: 1.4, w: 2.2, h: 3.5 }, GRID.mobile)).toMatchObject({ x: 2, y: 1, w: 2, h: 4 });
  });
});

describe("free canvas", () => {
  it("turns a flow canvas into a free one: full width, default heights, stacked in order, gifts still valid", () => {
    const doc = freeGifts();
    const page = doc.pages.find((candidate) => candidate.id === giftsPage(doc));
    expect(page?.canvases.mobile.mode).toBe("free");
    const element = page?.canvases.mobile.elements[0];
    expect(element).toMatchObject({ x: 0, y: 0, w: 4, h: DEFAULT_ROWS["giftsCta"] });
    expect(giftsIssues(doc)).toEqual([]);
    expect(makeFree(giftsPage(), "mobile")(doc)).toBe(doc);
    expect(makeFree("nope", "mobile")(doc0())).toEqual(doc0());
  });

  it("the desktop canvas is created from mobile, scaled ×3 to 12 columns, once", () => {
    const base = freeGifts();
    const doc = createDesktopCanvas(giftsPage())(base);
    const desktop = doc.pages.find((page) => page.id === giftsPage())?.canvases.desktop;
    expect(desktop).toMatchObject({ columns: 12, mode: "free" });
    expect(desktop?.elements[0]).toMatchObject({ x: 0, w: 12 });
    expect(giftsIssues(doc)).toEqual([]);
    expect(createDesktopCanvas(giftsPage())(doc)).toBe(doc);
  });

  it("moves and resizes by grid units, clamped, without touching the other elements", () => {
    const doc = freeGifts();
    const id = giftsPlacement(doc)?.element.id ?? "";
    const moved = placeElement("mobile", id, { x: 1, y: 7, w: 3 })(doc);
    expect(elementIn(moved, id)).toMatchObject({ x: 1, y: 7, w: 3 });
    expect(elementIn(placeElement("mobile", id, { x: 9 })(doc), id)).toMatchObject({ x: 0 });
    expect(placeElement("mobile", id, { x: 0 })(doc)).toBe(doc);
    expect(placeElement("mobile", "nope", { x: 1 })(doc)).toBe(doc);
    expect(placeElement("desktop", id, { x: 1 })(doc)).toBe(doc);
  });

  it("rotates in 5° steps within ±180; the gifts block refuses to rotate", () => {
    const doc = freeGifts();
    const other = doc.pages.find((page) => page.id !== giftsPage())?.canvases.mobile.elements[0]?.id ?? "";
    expect(elementIn(rotateElement("mobile", other, 12)(doc), other)?.rotation).toBe(10);
    expect(elementIn(rotateElement("mobile", other, 400)(doc), other)?.rotation).toBe(180);
    expect(rotateElement("mobile", other, 0)(doc)).toBe(doc);
    const id = giftsPlacement(doc)?.element.id ?? "";
    const state = editorReducer(initialEditorState(doc), { type: "edit", op: rotateElement("mobile", id, 15), at: 0 });
    expect(state.refusal?.[0]?.code).toBe("GIFTS_BLOCK_LOCKED");
    expect(documentOf(state)).toBe(doc);
  });

  it("z-order sends to front or back within ±100", () => {
    const doc = freeGifts();
    const page = doc.pages[1];
    const ids = page?.canvases.mobile.elements.map((element) => element.id) ?? [];
    const withTwo = addBlock(page?.id ?? "", "text", { text: "x" })(doc);
    const two = withTwo.pages[1]?.canvases.mobile.elements.map((element) => element.id) ?? [];
    expect(two.length).toBe(ids.length + 1);
    const last = two.at(-1) ?? "";
    const front = reorderLayer("mobile", ids[0] ?? "", "front")(withTwo);
    expect(elementIn(front, ids[0] ?? "")?.z).toBe(1);
    const back = reorderLayer("mobile", last, "back")(front);
    expect(elementIn(back, last)?.z).toBe(-1);
    expect(reorderLayer("mobile", ids[0] ?? "", "front")(front)).toBe(front);
    let tall = withTwo;
    for (let step = 0; step < MAX_Z + 5; step += 1) tall = reorderLayer("mobile", last, "front")(reorderLayer("mobile", ids[0] ?? "", "front")(tall));
    expect(Math.max(...(tall.pages[1]?.canvases.mobile.elements.map((element) => element.z ?? 0) ?? []))).toBeLessThanOrEqual(MAX_Z);
  });

  it("padding and margin snap to 4 px, at most 256", () => {
    const doc = freeGifts();
    const id = giftsPlacement(doc)?.element.id ?? "";
    const padded = setElementBox("mobile", id, "padding", "left", 11)(doc);
    expect(elementIn(padded, id)?.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 12 });
    expect(elementIn(setElementBox("mobile", id, "margin", "top", 9999)(doc), id)?.margin?.top).toBe(256);
    expect(setElementBox("mobile", id, "padding", "left", 0)(doc)).toBe(doc);
    expect(setElementBox("mobile", id, "padding", "left", 12)(padded)).toBe(padded);
    expect(setElementBox("mobile", "nope", "padding", "left", 4)(doc)).toBe(doc);
  });
});

describe("palette: adding and removing components", () => {
  it("every palette component is added at the bottom of the page, in both canvases, with unique ids", () => {
    let doc = createDesktopCanvas(giftsPage())(freeGifts());
    const pageId = giftsPage();
    for (const entry of PALETTE) doc = addBlock(pageId, entry.type, entry.config)(doc);
    const page = doc.pages.find((candidate) => candidate.id === pageId);
    expect(page?.canvases.mobile.elements).toHaveLength(1 + PALETTE.length);
    expect(page?.canvases.desktop?.elements).toHaveLength(1 + PALETTE.length);
    const ids = page?.canvases.mobile.elements.map((element) => element.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    const added = page?.canvases.mobile.elements.at(-1);
    expect((added?.y ?? 0)).toBeGreaterThan(0);
    expect(doc.blocks).toHaveLength(fixture().blocks.length + PALETTE.length);
    expect(giftsIssues(doc)).toEqual([]);
    expect(addBlock("nope", "text", {})(doc)).toBe(doc);
  });

  it("removes an element from both canvases and its block; the gifts and cover elements cannot be removed", () => {
    let doc = createDesktopCanvas(giftsPage())(freeGifts());
    doc = addBlock(giftsPage(), "text", { text: "x" })(doc);
    const added = doc.pages.find((page) => page.id === giftsPage())?.canvases.mobile.elements.at(-1)?.id ?? "";
    expect(canRemove(doc, added)).toBe(true);
    const removed = removeElement(added)(doc);
    expect(elementIn(removed, added)).toBeUndefined();
    expect(elementIn(removed, added, "desktop")).toBeUndefined();
    expect(removed.blocks).toHaveLength(fixture().blocks.length);
    expect(removeElement("nope")(doc)).toBe(doc);
    const giftsId = giftsPlacement(doc)?.element.id ?? "";
    expect(canRemove(doc, giftsId)).toBe(false);
    expect(canRemove(doc, doc.pages[0]?.canvases.mobile.elements[0]?.id ?? "")).toBe(false);
    expect(canRemove(doc, "nope")).toBe(false);
    const state = editorReducer(initialEditorState(doc), { type: "edit", op: removeElement(giftsId), at: 0 });
    expect(state.refusal?.map((issue) => issue.code)).toContain("GIFTS_BLOCK_REQUIRED");
  });

  it("every gesture that covers, shrinks, pads or rotates the gifts button is refused by the editor with its reason and leaves the document as it was (P22)", () => {
    const doc = addBlock(giftsPage(), "text", { text: "x" })(freeGifts());
    const placement = giftsPlacement(doc);
    if (!placement) throw new Error("fixture without gifts button");
    const giftsId = placement.element.id;
    const covering = doc.pages.find((page) => page.id === giftsPage())?.canvases.mobile.elements.at(-1)?.id ?? "";
    const refuses = (op: DocumentOp, code: string, from = doc) => {
      const state = editorReducer(initialEditorState(from), { type: "edit", op, at: 0 });
      expect(state.refusal?.map((issue) => issue.code)).toContain(code);
      expect(documentOf(state)).toBe(from);
      expect(state.revision).toBe(0);
    };
    // another element dropped over the button (it is added below it, then dragged up)
    expect(giftsIssues(doc)).toEqual([]);
    refuses(placeElement("mobile", covering, { y: 0 }), "GIFTS_BLOCK_COVERED");
    refuses(placeElement("mobile", covering, { y: 0, h: 6 }), "GIFTS_BLOCK_COVERED");
    // the layer: a neighbour sent in front of it, or the button sent behind a neighbour that overlaps it
    const overlapping = placeElement("mobile", covering, { y: 0 })(doc);
    const behind = patchElement("mobile", covering, { z: -1 })(overlapping);
    expect(giftsIssues(behind)).toEqual([]);
    refuses(reorderLayer("mobile", giftsId, "back"), "GIFTS_BLOCK_COVERED", behind);
    refuses(reorderLayer("mobile", covering, "front"), "GIFTS_BLOCK_COVERED", behind);
    // size, padding and rotation of the button itself
    refuses(placeElement("mobile", giftsId, { h: 1 }), "GIFTS_BLOCK_TOO_SMALL");
    refuses(setElementBox("mobile", giftsId, "padding", "top", 8), "GIFTS_BLOCK_TOO_SMALL");
    refuses(rotateElement("mobile", giftsId, 15), "GIFTS_BLOCK_LOCKED");
  });
});
