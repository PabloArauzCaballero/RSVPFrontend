import type { design } from "@rsvp/celebration-theme";
import { describe, expect, it } from "vitest";
import {
  canMask, COVER_VARIANTS, coverVariantOf, coverVeilOf, elementAnimationOf, elementAnimationsFor, elementFrameOf, elementMaskOf, MASKS, pageAnimationOf, setCoverVariant, setCoverVeil, setElementAnimation, setElementFrame,
  setElementMask, setPageAnimation, setVideoPoster, videoPosterOf
} from "../model/fidelity.js";
import { giftsBlock, giftsIssues } from "../model/guards.js";
import { applyTemplateDocument, type DocumentOp, patchElement, setBlockConfig, setCoverPhoto } from "../model/ops.js";
import { addBlock, placeElement } from "../model/canvas.js";
import { documentOf, editorReducer, initialEditorState } from "../model/state.js";
import { fixture } from "./fixture.js";

type Doc = design.DesignDocumentV2;
const MEDIA = "0b9f6f4e-2d6c-4c0e-9a56-3f4d0f1f7a11";
const OTHER = "6d1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b";

/** A document with one block of every type the controls care about, placed on the cover. */
function withBlocks(): Doc {
  let doc = fixture();
  const cover = doc.pages.find((page) => page.kind === "cover")?.id ?? "";
  for (const [type, config] of [["image", { mediaId: MEDIA }], ["video", { provider: "youtube", videoId: "abc" }], ["heading", { text: "Hola" }], ["map", {}]] as const) doc = addBlock(cover, type, config)(doc);
  return doc;
}
const elementOfBlock = (doc: Doc, type: string): design.DesignElement => {
  const id = doc.blocks.find((block) => block.type === type)?.id;
  const found = doc.pages.flatMap((page) => page.canvases.mobile.elements).find((element) => element.block === id);
  if (!found) throw new Error(`no ${type}`);
  return found;
};
const withCoverPhoto = (doc: Doc): Doc => setCoverPhoto(MEDIA)(doc);

describe("cover variant", () => {
  it("offers the nine variants and writes only those", () => {
    expect(COVER_VARIANTS).toHaveLength(9);
    const doc = fixture();
    for (const variant of COVER_VARIANTS) expect(coverVariantOf(setCoverVariant(variant)(doc))).toBe(variant);
    for (const hostile of ["hologram", "", "__proto__", 7, null, { toString: "arch" }]) expect(setCoverVariant(hostile as never)(doc)).toBe(doc);
  });

  it("keeps the rest of the cover configuration and the other blocks", () => {
    const doc = setBlockConfig("cover", { envelope: true })(fixture());
    const coverId = doc.blocks.find((block) => block.type === "cover")?.id ?? "";
    const after = setCoverVariant("poster")(setBlockConfig(coverId, { envelope: true })(fixture()));
    expect(after.blocks.find((block) => block.id === coverId)?.config).toMatchObject({ variant: "poster", envelope: true });
    expect(after.blocks.length).toBe(doc.blocks.length);
  });
});

describe("page animation", () => {
  it("sets a named animation on a cover or a section page and clears it", () => {
    const doc = fixture();
    const [cover, section] = [doc.pages[0] as design.DesignPage, doc.pages.find((page) => page.kind === "section") as design.DesignPage];
    for (const name of ["aparecer", "revelar-telon", "abrir-puertas"] as const) {
      expect(pageAnimationOf(setPageAnimation(cover.id, name)(doc).pages[0] as design.DesignPage)).toBe(name);
      const next = setPageAnimation(section.id, name)(doc);
      expect(pageAnimationOf(next.pages.find((page) => page.id === section.id) as design.DesignPage)).toBe(name);
    }
    const named = setPageAnimation(cover.id, "abrir-puertas")(doc);
    expect((named.pages[0] as { animation?: unknown }).animation).toEqual({ entrance: "none", name: "abrir-puertas" });
    expect(setPageAnimation(cover.id, null)(named).pages[0]).not.toHaveProperty("animation");
    expect(setPageAnimation(cover.id, null)(doc)).toBe(doc);
  });

  it("refuses mecerse on a page, hostile names and unknown pages", () => {
    const doc = fixture();
    const id = doc.pages[0]?.id ?? "";
    for (const hostile of ["mecerse", "girar", "", "constructor", 3]) expect(setPageAnimation(id, hostile as never)(doc)).toBe(doc);
    expect(setPageAnimation("no-such-page", "aparecer")(doc)).toBe(doc);
  });
});

describe("element animation", () => {
  it("writes a name with entrance none and no duration, and keeps the delay", () => {
    const doc = withBlocks();
    const image = elementOfBlock(doc, "image");
    const legacy = patchElement("mobile", image.id, { animation: { entrance: "rise", delayMs: 120, durationMs: 500 } })(doc);
    const named = setElementAnimation("mobile", image.id, "mecerse")(legacy);
    const animation = (elementOfBlock(named, "image") as { animation?: unknown }).animation;
    expect(animation).toEqual({ entrance: "none", name: "mecerse", delayMs: 120 });
    expect(elementAnimationOf(elementOfBlock(named, "image"))).toBe("mecerse");
  });

  it("removes the name and leaves nothing when only a bare entrance would remain", () => {
    const doc = withBlocks();
    const image = elementOfBlock(doc, "image");
    const named = setElementAnimation("mobile", image.id, "aparecer")(doc);
    expect(elementOfBlock(setElementAnimation("mobile", image.id, null)(named), "image")).not.toHaveProperty("animation");
    const delayed = patchElement("mobile", image.id, { animation: { entrance: "none", delayMs: 80 } })(doc);
    expect(setElementAnimation("mobile", image.id, null)(delayed)).toBe(delayed);
    const both = setElementAnimation("mobile", image.id, "aparecer")(delayed);
    expect((elementOfBlock(setElementAnimation("mobile", image.id, null)(both), "image") as { animation?: unknown }).animation).toEqual({ entrance: "none", delayMs: 80 });
  });

  it("never offers or writes a named animation on the gifts and reply buttons (PL-164-1), nor a page-only animation anywhere", () => {
    const doc = withBlocks();
    const gifts = elementOfBlock(doc, "giftsCta");
    expect(elementAnimationsFor(doc, gifts)).toEqual([]);
    expect(elementAnimationsFor(doc, elementOfBlock(doc, "image"))).toEqual(["aparecer", "mecerse", "revelar-telon"]);
    for (const name of ["mecerse", "aparecer", "revelar-telon"] as const) expect(setElementAnimation("mobile", gifts.id, name)(doc)).toBe(doc);
    expect(setElementAnimation("mobile", elementOfBlock(doc, "image").id, "revelar-telon")(doc)).not.toBe(doc);
    for (const hostile of ["abrir-puertas", "fade", "", "__proto__"]) expect(setElementAnimation("mobile", elementOfBlock(doc, "image").id, hostile as never)(doc)).toBe(doc);
  });

  it("reads a hostile stored name as none", () => {
    const doc = withBlocks();
    const image = elementOfBlock(doc, "image");
    const hostile = patchElement("mobile", image.id, { animation: { entrance: "none", name: "explotar" } as never })(doc);
    expect(elementAnimationOf(elementOfBlock(hostile, "image"))).toBeNull();
  });
});

describe("mask", () => {
  it("offers the six masks only on maskable blocks", () => {
    const doc = withBlocks();
    for (const type of ["image", "video", "map"]) expect(canMask(doc, elementOfBlock(doc, type))).toBe(true);
    for (const type of ["heading", "giftsCta", "rsvpCta"]) {
      const element = doc.blocks.some((block) => block.type === type) ? elementOfBlock(doc, type) : undefined;
      if (element) expect(canMask(doc, element)).toBe(false);
    }
    const image = elementOfBlock(doc, "image");
    for (const mask of MASKS) expect(elementMaskOf(elementOfBlock(setElementMask("mobile", image.id, mask)(doc), "image"))).toBe(mask);
    expect(MASKS).toHaveLength(6);
  });

  it("refuses a mask on text blocks and on the protected buttons, and any value outside the list", () => {
    const doc = withBlocks();
    for (const type of ["heading", "giftsCta"]) expect(setElementMask("mobile", elementOfBlock(doc, type).id, "arch")(doc)).toBe(doc);
    const image = elementOfBlock(doc, "image");
    for (const hostile of ["triangle", "", "clip-path: none", "constructor", 1]) expect(setElementMask("mobile", image.id, hostile as never)(doc)).toBe(doc);
  });

  it("removes the mask with null and does not touch other fields", () => {
    const doc = withBlocks();
    const image = elementOfBlock(doc, "image");
    const masked = setElementMask("mobile", image.id, "circle")(doc);
    expect(elementOfBlock(setElementMask("mobile", image.id, null)(masked), "image")).toEqual(image);
    expect(setElementMask("mobile", image.id, null)(doc)).toBe(doc);
  });
});

describe("frame", () => {
  it("sets a style and a palette colour, and removes it", () => {
    const doc = withBlocks();
    const image = elementOfBlock(doc, "image");
    const framed = setElementFrame("mobile", image.id, { style: "deco", colour: "accent" })(doc);
    expect(elementFrameOf(elementOfBlock(framed, "image"))).toEqual({ style: "deco", colour: "accent" });
    expect(setElementFrame("mobile", image.id, { style: "deco", colour: "accent" })(framed)).toBe(framed);
    expect(elementOfBlock(setElementFrame("mobile", image.id, null)(framed), "image")).toEqual(image);
  });

  it("refuses the protected buttons and hostile styles or colours", () => {
    const doc = withBlocks();
    const gifts = elementOfBlock(doc, "giftsCta");
    expect(setElementFrame("mobile", gifts.id, { style: "double", colour: "accent" })(doc)).toBe(doc);
    const image = elementOfBlock(doc, "image");
    for (const hostile of [{ style: "dotted", colour: "accent" }, { style: "double", colour: "#ff0000" }, { style: "double", colour: "red" }, { style: "", colour: "" }, { style: "double", colour: "__proto__" }]) {
      expect(setElementFrame("mobile", image.id, hostile as never)(doc)).toBe(doc);
    }
  });
});

describe("cover veil", () => {
  it("is null without a cover photo, graded and explicit for a first photo chosen here, and even when a saved document says nothing (PL-FE145-1)", () => {
    const doc = fixture();
    expect(coverVeilOf(doc)).toBeNull();
    expect(setCoverVeil("even")(doc)).toBe(doc);
    expect(coverVeilOf(withCoverPhoto(doc))).toBe("graded");
    expect(withCoverPhoto(doc).pages[0]?.background).toMatchObject({ veil: "graded" });
    const saved = withCoverPhoto(doc);
    const legacy = { ...saved, pages: saved.pages.map((page) => (page.kind === "cover" ? { ...page, background: { kind: "media", mediaId: MEDIA, fit: "cover" } } : page)) } as Doc;
    expect(coverVeilOf(legacy)).toBe("even");
  });

  it("switches to even and back; both are always written explicitly", () => {
    const photo = withCoverPhoto(fixture());
    const even = setCoverVeil("even")(photo);
    expect(coverVeilOf(even)).toBe("even");
    expect((even.pages[0]?.background as { veil?: string }).veil).toBe("even");
    const back = setCoverVeil("graded")(even);
    expect(coverVeilOf(back)).toBe("graded");
    expect(back.pages[0]?.background).toMatchObject({ veil: "graded" });
    expect(back).toEqual(photo);
    for (const hostile of ["uniform", "", "Graded", null]) expect(setCoverVeil(hostile as never)(even)).toBe(even);
  });

  it("survives choosing another photo and is dropped with the photo", () => {
    const even = setCoverVeil("even")(withCoverPhoto(fixture()));
    const another = setCoverPhoto(OTHER)(even);
    expect(coverVeilOf(another)).toBe("even");
    expect(another.pages[0]?.background).toMatchObject({ mediaId: OTHER, veil: "even" });
    expect(coverVeilOf(setCoverPhoto(null)(even))).toBeNull();
  });
});

describe("video poster", () => {
  it("picks a photo of the celebration and goes back to the provider thumbnail", () => {
    const doc = withBlocks();
    const id = doc.blocks.find((block) => block.type === "video")?.id ?? "";
    expect(videoPosterOf(doc, id)).toBeNull();
    const picked = setVideoPoster(id, MEDIA)(doc);
    expect(videoPosterOf(picked, id)).toBe(MEDIA);
    expect(picked.blocks.find((block) => block.id === id)?.config).toMatchObject({ provider: "youtube", videoId: "abc", posterMediaId: MEDIA });
    const cleared = setVideoPoster(id, null)(picked);
    expect(cleared.blocks.find((block) => block.id === id)?.config).toEqual({ provider: "youtube", videoId: "abc" });
    expect(setVideoPoster(id, null)(doc)).toBe(doc);
  });

  it("ignores hostile ids and blocks that are not videos", () => {
    const doc = withBlocks();
    const id = doc.blocks.find((block) => block.type === "video")?.id ?? "";
    for (const hostile of ["not-a-uuid", "", "https://evil.example/x.jpg", "../../etc/passwd", "0b9f6f4e-2d6c-4c0e-9a56-3f4d0f1f7a1"]) expect(setVideoPoster(id, hostile)(doc)).toBe(doc);
    expect(setVideoPoster(doc.blocks.find((block) => block.type === "image")?.id ?? "", MEDIA)(doc)).toBe(doc);
    const hostileStored = setBlockConfig(id, { posterMediaId: "javascript:alert(1)" })(doc);
    expect(videoPosterOf(hostileStored, id)).toBeNull();
  });
});

describe("round trip through the editor", () => {
  it("keeps the new fields while other things are edited, and undo/redo brings them back one by one", () => {
    let doc = withCoverPhoto(withBlocks());
    const image = elementOfBlock(doc, "image");
    const videoId = doc.blocks.find((block) => block.type === "video")?.id ?? "";
    let state = initialEditorState(doc);
    const edit = (op: DocumentOp, at: number): void => { state = editorReducer(state, { type: "edit", op, at }); };
    edit(setCoverVariant("deco"), 1000);
    edit(setPageAnimation(doc.pages[0]?.id ?? "", "abrir-puertas"), 2000);
    edit(setElementMask("mobile", image.id, "arch"), 3000);
    edit(setElementFrame("mobile", image.id, { style: "double", colour: "line" }), 4000);
    edit(setElementAnimation("mobile", image.id, "mecerse"), 5000);
    edit(setCoverVeil("even"), 6000);
    edit(setVideoPoster(videoId, MEDIA), 7000);
    // Other edits must not lose any of it.
    edit(patchElement("mobile", image.id, { z: 3, radius: 8 }), 8000);
    edit(placeElement("mobile", image.id, { x: 1 }), 9000);
    edit(setCoverPhoto(OTHER), 10000);
    edit(setBlockConfig(videoId, { videoId: "xyz" }), 11000);
    doc = documentOf(state);
    const element = elementOfBlock(doc, "image");
    expect([coverVariantOf(doc), pageAnimationOf(doc.pages[0] as design.DesignPage), elementMaskOf(element), elementFrameOf(element), elementAnimationOf(element), coverVeilOf(doc), videoPosterOf(doc, videoId)])
      .toEqual(["deco", "abrir-puertas", "arch", { style: "double", colour: "line" }, "mecerse", "even", MEDIA]);
    expect(giftsIssues(doc)).toEqual([]);
    // The document survives a JSON round trip (what the autosaver sends and the server returns).
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
    // Undo walks back and redo returns, without ever losing the fields that were not undone.
    state = editorReducer(state, { type: "undo" });
    expect(videoPosterOf(documentOf(state), videoId)).toBe(MEDIA);
    for (let step = 0; step < 20; step += 1) state = editorReducer(state, { type: "undo" });
    expect(coverVariantOf(documentOf(state))).toBe(coverVariantOf(fixture()));
    expect(elementMaskOf(elementOfBlock(documentOf(state), "image"))).toBeNull();
    for (let step = 0; step < 20; step += 1) state = editorReducer(state, { type: "redo" });
    expect(documentOf(state)).toEqual(doc);
  });

  it("picking another template replaces the design (the new template's own values win) and keeps the host's code", () => {
    const base = setCoverVariant("poster")(fixture());
    const incoming = fixture("clasico-marfil");
    const next = applyTemplateDocument(incoming)(base);
    expect(coverVariantOf(next)).toBe(coverVariantOf(incoming));
    expect(next.custom).toEqual(base.custom);
  });

  it("a document that arrives with hostile values is read as having none, and editing another field does not launder them into valid ones", () => {
    const doc = withBlocks();
    const image = elementOfBlock(doc, "image");
    const hostile = patchElement("mobile", image.id, { mask: "triangle", frame: { style: "zigzag", colour: "pink" } } as never)(doc);
    const element = elementOfBlock(hostile, "image");
    expect(elementMaskOf(element)).toBeNull();
    expect(elementFrameOf(element)).toBeNull();
    // Setting a valid value replaces it; removing clears the stored hostile one too.
    expect(elementMaskOf(elementOfBlock(setElementMask("mobile", image.id, "stamp")(hostile), "image"))).toBe("stamp");
    expect(elementOfBlock(setElementMask("mobile", image.id, null)(hostile), "image")).not.toHaveProperty("mask");
    expect(elementOfBlock(setElementFrame("mobile", image.id, null)(hostile), "image")).not.toHaveProperty("frame");
  });

  it("does not disturb the gifts block", () => {
    const doc = withBlocks();
    const gifts = giftsBlock(doc);
    const after = setElementAnimation("mobile", elementOfBlock(doc, "giftsCta").id, "aparecer")(setCoverVariant("hanging")(doc));
    expect(giftsBlock(after)).toEqual(gifts);
    expect(giftsIssues(after)).toEqual([]);
  });
});
