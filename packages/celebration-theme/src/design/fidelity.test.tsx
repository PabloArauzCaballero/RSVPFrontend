import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { motion } from "@rsvp/design-tokens";
import { afterEach, describe, expect, it } from "vitest";
import { GALLERY, NOW, t, VIEW } from "../../test/fixtures.js";
import { CelebrationRenderer, giftsPath, themeFromTemplate, type GalleryImage } from "../index.js";
import { BLACK, contrastRatio, gradedVeil, GRADED_ELSEWHERE_VEIL, GRADED_TEXT_VEIL, mix, requiredScrim, WHITE } from "./colour.js";
import { designTemplate } from "./documents/index.js";
import { designPalette, readDesign } from "./read.js";
import type { DesignBlock, DesignDocumentV2, DesignElement } from "./types.js";

afterEach(cleanup);

const DOCUMENTS = join(__dirname, "documents");
const STYLES = readFileSync(join(__dirname, "../../styles.css"), "utf8");
const BG = "11111111-1111-4111-8111-111111111111";
const POSTER = "44444444-4444-4444-8444-444444444444";
const SONG = "22222222-2222-4222-8222-222222222222";
const FILES: readonly GalleryImage[] = [
  ...GALLERY,
  { id: BG, width: 1920, height: 1080, isCover: false, purpose: "background", variants: { medium: "https://media.test/bg-m.webp", webp: "https://media.test/bg.webp" } },
  { id: POSTER, width: 800, height: 450, isCover: false, purpose: "block", variants: { medium: "https://media.test/poster-m.webp", webp: "https://media.test/poster.webp" } },
  { id: SONG, width: null, height: null, isCover: false, purpose: "music", durationMs: 1000, variants: { audio: "https://media.test/song.mp3" } }
];
type Json = Record<string, unknown>;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const marfil = (): DesignDocumentV2 => clone(designTemplate("marfil").theme) as DesignDocumentV2;

/** Marfil with extra blocks on its story page; `mutate` can change the raw document before it is read. */
function documentWith(blocks: readonly { readonly block: DesignBlock; readonly element: Json }[], mutate: (doc: Json) => void = () => undefined): DesignDocumentV2 {
  const base = marfil();
  const pages = base.pages.map((page) => {
    if (page.section !== "story") return page;
    const elements = blocks.map(({ block, element }, position) => ({ id: `x-${block.id}`, block: block.id, x: 0, y: 1 + position, w: 4, h: 4, visible: true, ...element }));
    return { ...page, canvases: { ...page.canvases, mobile: { ...page.canvases.mobile, elements: [...page.canvases.mobile.elements, ...elements] } } };
  });
  const doc = { ...base, pages, blocks: [...base.blocks, ...blocks.map((item) => item.block)] } as unknown as Json;
  mutate(doc);
  return readDesign(doc) as DesignDocumentV2;
}
const draw = (design: DesignDocumentV2, props: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}) => render(
  <CelebrationRenderer theme={themeFromTemplate({ ...designTemplate("marfil"), theme: design }, VIEW.enabledSections)} view={VIEW} gallery={FILES} t={t} now={NOW} basePath="/c/ana-y-luis" {...props} />
);
const block = (id: string, type: string, config: Record<string, unknown> = {}): DesignBlock => ({ id, type, config });
const elementOf = (design: DesignDocumentV2, id: string): DesignElement | undefined => design.pages.flatMap((page) => page.canvases.mobile.elements).find((item) => item.id === id);

describe("readDesign · the fidelity fields (contract 1.8.0)", () => {
  it("a document without any of them reads exactly as before (v2 documents of 1.4.x keep working)", () => {
    // The 1.4 shape: the same document with every field of 1.8.0 taken out.
    const strip = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(strip);
      if (typeof value !== "object" || value === null) return value;
      const entries = Object.entries(value).filter(([key]) => !["mask", "frame", "veil", "name"].includes(key));
      return Object.fromEntries(entries.map(([key, item]) => [key, key === "variant" && ["arch", "hanging", "deco", "poster"].includes(String(item)) ? "classic" : strip(item)]));
    };
    const legacy = strip(designTemplate("gala").theme) as Json;
    for (const page of legacy["pages"] as Json[]) delete page["animation"];
    const read = readDesign(legacy) as DesignDocumentV2;
    expect(read).not.toBeNull();
    for (const page of read.pages) {
      expect(page.animation).toBeUndefined();
      for (const element of [...page.canvases.mobile.elements, ...(page.canvases.desktop?.elements ?? [])]) { expect(element.mask).toBeUndefined(); expect(element.frame).toBeUndefined(); expect(element.animation?.name).toBeUndefined(); }
    }
    const { container } = draw(read);
    expect(container.querySelector("[data-mask], [data-frame], [data-anim], [data-page-anim], .cdesign-doors")).toBeNull();
    expect(container.querySelector(".cdesign-cover")?.getAttribute("data-variant")).toBe("classic");
  });

  it("keeps the values of the contract and drops, one by one, whatever is outside it", () => {
    const hostile = (element: Json): DesignElement => elementOf(documentWith([{ block: block("pic", "image"), element }]), "x-pic") as DesignElement;
    expect(hostile({ mask: "arch" }).mask).toBe("arch");
    for (const mask of ["ARCH", "arch ", "star", "", 3, null, {}, "__proto__", "url(javascript:alert(1))"]) expect(hostile({ mask }).mask, String(mask)).toBeUndefined();
    expect(hostile({ frame: { style: "deco", colour: "accent" } }).frame).toEqual({ style: "deco", colour: "accent" });
    for (const frame of [{ style: "deco" }, { colour: "accent" }, { style: "dotted", colour: "accent" }, { style: "deco", colour: "red; background: url(x)" }, [], "deco", null]) expect(hostile({ frame }).frame, JSON.stringify(frame)).toBeUndefined();
    expect(hostile({ animation: { entrance: "none", name: "mecerse", delayMs: 600 } }).animation).toEqual({ entrance: "none", name: "mecerse", delayMs: 600 });
    // A name takes its duration from the renderer's tokens: a document's `durationMs` beside it is not read. A name outside the list leaves the entrance.
    expect(hostile({ animation: { entrance: "none", name: "mecerse", durationMs: 99999 } }).animation).toEqual({ entrance: "none", name: "mecerse" });
    expect(hostile({ animation: { entrance: "fade", name: "girar", durationMs: 800 } }).animation).toEqual({ entrance: "fade", durationMs: 800 });
    // `abrir-puertas` is for pages only.
    expect(hostile({ animation: { entrance: "none", name: "abrir-puertas" } }).animation).toEqual({ entrance: "none" });
  });

  it("a page keeps a named animation only from the page list (`mecerse` is for elements)", () => {
    const withPage = (animation: Json): DesignDocumentV2 => documentWith([], (doc) => { ((doc["pages"] as Json[])[0] as Json)["animation"] = animation; });
    expect(withPage({ entrance: "none", name: "abrir-puertas" }).pages[0]?.animation).toEqual({ entrance: "none", name: "abrir-puertas" });
    expect(withPage({ entrance: "none", name: "mecerse" }).pages[0]?.animation).toEqual({ entrance: "none" });
  });

  it("the veil of a picture is `graded` or `even`; anything else is read as absent (graded by default)", () => {
    const background = (veil: unknown): unknown => documentWith([], (doc) => { ((doc["pages"] as Json[])[0] as Json)["background"] = { kind: "media", mediaId: BG, fit: "cover", veil }; }).pages[0]?.background;
    expect(background("even")).toMatchObject({ veil: "even" });
    expect(background("graded")).toMatchObject({ veil: "graded" });
    for (const veil of ["EVEN", "", 1, null, "heavy"]) expect(background(veil), String(veil)).not.toHaveProperty("veil");
  });
});

describe("render · masks, frames and named animations", () => {
  it("a mask and a frame mark the element; the animation `aparecer` is the entrance `rise` and `mecerse` is its own", () => {
    const design = documentWith([
      { block: block("pic", "image"), element: { mask: "deco-doors", frame: { style: "double", colour: "accent" } } },
      { block: block("art", "illustration", { illustrationId: "pinata" }), element: { animation: { entrance: "none", name: "mecerse", delayMs: 300 } } },
      { block: block("hi", "heading", { text: "Hola" }), element: { animation: { entrance: "none", name: "aparecer" } } }
    ]);
    const { container } = draw(design);
    const pic = container.querySelector('.cdesign-el[data-block="image"]') as HTMLElement;
    expect(pic.getAttribute("data-mask")).toBe("deco-doors");
    expect(pic.getAttribute("data-frame")).toBe("double");
    expect(pic.style.getPropertyValue("--cd-frame")).toBe("var(--celebration-accent)");
    const art = container.querySelector('.cdesign-el[data-anim="mecerse"]') as HTMLElement;
    expect(art.style.getPropertyValue("--cdesign-delay")).toBe("300ms");
    // The duration is the stylesheet's token, never the document's.
    expect(art.style.getPropertyValue("--cdesign-duration")).toBe("");
    const hi = container.querySelector('.cdesign-el[data-block="heading"]') as HTMLElement;
    expect(hi.getAttribute("data-entrance")).toBe("rise");
    expect(hi.getAttribute("data-anim")).toBeNull();
  });

  it("a mask never cuts a block with text: the contract refuses it and the renderer ignores it anyway", () => {
    const { container } = draw(documentWith([{ block: block("words", "text", { text: "Un texto" }), element: { mask: "circle" } }]));
    expect(container.querySelector('.cdesign-el[data-block="text"]')?.hasAttribute("data-mask")).toBe(false);
  });

  it("P22 · the gifts and reply buttons get no mask, no frame and no named animation, whatever the document says; the dock still carries «Ver regalos»", () => {
    const decorate: Json = { mask: "circle", frame: { style: "deco", colour: "accent" }, animation: { entrance: "none", name: "mecerse" } };
    const design = documentWith([
      { block: block("gifts-hostile", "giftsCta", { style: "solid" }), element: decorate },
      { block: block("rsvp-hostile", "rsvpCta", { style: "solid" }), element: decorate }
    ]);
    const { container } = draw(design);
    const protectedBlocks = [...container.querySelectorAll(".cdesign-el.rsvp-protected")] as HTMLElement[];
    expect(protectedBlocks.length).toBeGreaterThanOrEqual(2);
    for (const element of protectedBlocks) {
      expect(element.hasAttribute("data-mask")).toBe(false);
      expect(element.hasAttribute("data-frame")).toBe(false);
      expect(element.hasAttribute("data-anim")).toBe(false);
      expect(element.hasAttribute("data-entrance")).toBe(false);
      expect(element.style.getPropertyValue("--cd-frame")).toBe("");
    }
    const dock = container.querySelector(".cdesign-dock") as HTMLElement;
    expect(dock.querySelector('a[data-action="gifts"]')?.getAttribute("href")).toBe(giftsPath("ana-y-luis"));
  });

  it("the stylesheet never reaches the protected layer: no mask, frame or animation rule can match `.rsvp-protected` or the dock", () => {
    const fidelity = STYLES.split("Contract 1.8.0 · fidelity")[1] as string;
    for (const selector of fidelity.match(/[^{}]+(?=\{)/g) ?? []) if (/data-(mask|frame|anim)/.test(selector)) expect(selector, selector).not.toMatch(/rsvp-protected|cdesign-dock/);
    // The panels of the doors sit below the protected blocks (z-index 1000) and the dock (2000), and take no click.
    const doors = /\.cdesign-doors \{[^}]*z-index: (\d+)[^}]*pointer-events: none/.exec(fidelity);
    expect(doors && Number(doors[1])).toBeLessThan(1000);
  });
});

describe("render · the three reference templates use the contract", () => {
  const draws = (name: "marfil" | "pinata" | "gala") => draw(readDesign(designTemplate(name).theme) as DesignDocumentV2);

  it("Marfil · the arch cover and the double frame; Piñata · the cover that hangs and the piñata that sways; Gala · the deco cover, the doors and the deco frame", () => {
    expect(draws("marfil").container.querySelector(".cdesign-cover")?.getAttribute("data-variant")).toBe("arch");
    expect(draws("marfil").container.querySelector('[data-frame="double"]')).not.toBeNull();
    const pinata = draws("pinata").container;
    expect(pinata.querySelector(".cdesign-cover")?.getAttribute("data-variant")).toBe("hanging");
    expect(pinata.querySelector('[data-anim="mecerse"]')).not.toBeNull();
    const gala = draws("gala").container;
    expect(gala.querySelector(".cdesign-cover")?.getAttribute("data-variant")).toBe("deco");
    expect(gala.querySelector('[data-page-kind="cover"]')?.getAttribute("data-page-anim")).toBe("abrir-puertas");
    expect(gala.querySelectorAll(".cdesign-doors .cdesign-door")).toHaveLength(2);
    expect(gala.querySelector(".cdesign-doors")?.getAttribute("aria-hidden")).toBe("true");
    expect(gala.querySelector('[data-frame="deco"]')).not.toBeNull();
  });

  it.each(["marfil", "pinata", "gala"] as const)("%s · the gifts button is still there twice and nothing decorates it", (name) => {
    const { container } = draws(name);
    const gifts = [...container.querySelectorAll('a[data-action="gifts"]')];
    expect(gifts.length).toBeGreaterThanOrEqual(2);
    for (const link of gifts) expect(link.getAttribute("href")).toBe(giftsPath("ana-y-luis"));
    expect(container.querySelector('.rsvp-protected[data-mask], .rsvp-protected[data-frame], .rsvp-protected[data-anim]')).toBeNull();
  });

  it("a page that only fades in (`aparecer`) has no doors", () => {
    const { container } = draw(documentWith([], (doc) => { ((doc["pages"] as Json[])[0] as Json)["animation"] = { entrance: "none", name: "aparecer" }; }));
    expect(container.querySelector('[data-page-kind="cover"]')?.getAttribute("data-page-anim")).toBe("aparecer");
    expect(container.querySelector(".cdesign-doors")).toBeNull();
  });

  it("a curtain (`revelar-telon`) draws one panel", () => {
    const { container } = draw(documentWith([], (doc) => { ((doc["pages"] as Json[])[0] as Json)["animation"] = { entrance: "none", name: "revelar-telon" }; }));
    expect(container.querySelectorAll('.cdesign-doors[data-kind="revelar-telon"] .cdesign-door')).toHaveLength(1);
  });
});

describe("render · the poster of a video", () => {
  const video = (config: Record<string, unknown>) => draw(documentWith([{ block: block("clip", "video", { provider: "youtube", videoId: "dQw4w9WgXcQ", ...config }), element: {} }]));

  it("shows the host's photo before any tap, and nothing of the provider", () => {
    const { container } = video({ posterMediaId: POSTER });
    const facade = container.querySelector(".celebration-embed") as HTMLElement;
    expect(facade.querySelector("img")?.getAttribute("src")).toContain("poster-m.webp");
    expect(facade.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).not.toMatch(/ytimg|youtube\.com\/vi/);
  });

  it("a poster that is not a picture of the celebration, or is a song, draws nothing (the facade stays)", () => {
    for (const posterMediaId of ["99999999-9999-4999-8999-999999999999", SONG, "not-a-uuid", 7, null]) {
      const { container, unmount } = video({ posterMediaId });
      expect(container.querySelector(".celebration-embed"), String(posterMediaId)).not.toBeNull();
      expect(container.querySelector(".celebration-embed img"), String(posterMediaId)).toBeNull();
      unmount();
    }
  });
});

describe("render · the graded veil", () => {
  const cover = (veil?: "graded" | "even", scrim?: number) => draw(documentWith([], (doc) => { ((doc["pages"] as Json[])[0] as Json)["background"] = { kind: "media", mediaId: BG, fit: "cover", ...(veil ? { veil } : {}), ...(scrim === undefined ? {} : { scrim }) }; }));

  it("is the default: light over the picture, and the page marks itself so every block of text rides on the strong level", () => {
    const { container } = cover();
    const page = container.querySelector('[data-page-kind="cover"]') as HTMLElement;
    expect(page.getAttribute("data-veil")).toBe("graded");
    const backdrop = page.querySelector(".celebration-media-backdrop") as HTMLElement;
    expect(backdrop.style.getPropertyValue("--cd-veil-l")).toBe(`${Math.round(GRADED_ELSEWHERE_VEIL * 100)}%`);
    expect(Number.parseInt(page.style.getPropertyValue("--cd-tv-l"), 10)).toBeGreaterThanOrEqual(Math.round(GRADED_TEXT_VEIL * 100));
    expect(page.querySelector('.cdesign-el[data-text]')).not.toBeNull();
  });

  it("`even` is the one uniform veil of the 1.4 documents, and marks no text panels", () => {
    const page = cover("even").container.querySelector('[data-page-kind="cover"]') as HTMLElement;
    expect(page.hasAttribute("data-veil")).toBe(false);
    expect(Number.parseInt((page.querySelector(".celebration-media-backdrop") as HTMLElement).style.getPropertyValue("--cd-veil-l"), 10)).toBeGreaterThanOrEqual(Math.round(requiredScrim(designPalette(marfil(), "light")) * 100));
  });

  it("the veil the document sets can raise either level, never lower them", () => {
    const strong = Number.parseInt((cover("graded", 0.6).container.querySelector('[data-page-kind="cover"]') as HTMLElement).style.getPropertyValue("--cd-tv-l"), 10);
    expect(strong).toBeGreaterThanOrEqual(85);
    const backdrop = cover("graded", 0.6).container.querySelector(".celebration-media-backdrop") as HTMLElement;
    expect(Number.parseInt(backdrop.style.getPropertyValue("--cd-veil-l"), 10)).toBe(60);
  });

  /**
   * Measured in the worst case, for every seeded document and both schemes: the text sits on a panel of the canvas colour at the strong level over a picture that already
   * carries the light veil, so the picture reaches it at 1 - (1 - elsewhere)(1 - text). The worst pictures are pure black and pure white (every other pixel lies between).
   */
  const SEEDED = readdirSync(DOCUMENTS).filter((file) => file.endsWith(".json")).sort();
  it("the seed set is the whole catalogue (30 documents)", () => { expect(SEEDED).toHaveLength(30); });

  it.each(SEEDED)("%s · the text reaches AA (4.5:1) over the worst picture, in light and dark, under the graded veil", (file) => {
    const entry = JSON.parse(readFileSync(join(DOCUMENTS, file), "utf8")) as { theme: unknown };
    const design = readDesign(entry.theme) as DesignDocumentV2;
    for (const scheme of ["light", "dark"] as const) {
      const palette = designPalette(design, scheme);
      for (const own of [0, 0.4, 0.8]) {
        const veil = gradedVeil(palette, own);
        const reach = 1 - (1 - veil.elsewhere) * (1 - veil.text);
        for (const picture of [BLACK, WHITE]) {
          const ratio = contrastRatio(palette.text, mix(picture, palette.canvas, reach));
          expect(ratio, `${file} ${scheme} own ${own} over ${picture}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      // The panel alone (the picture under it fully transparent) is the narrower case: still at least the veil the palette needs.
      expect(veil(palette)).toBeGreaterThanOrEqual(requiredScrim(palette));
    }
  });

  function veil(palette: { readonly canvas: string; readonly text: string }): number { return gradedVeil(palette).text; }

  it("the constants are the contract's own (`x-rsvp-veil` of the vendored Template/Media spec)", () => {
    const spec = JSON.parse(readFileSync(join(__dirname, "../../../contracts/specs/template-media.openapi.json"), "utf8")) as { components: { schemas: { DesignMediaBackground: { "x-rsvp-veil": { gradedBehindText: number; gradedElsewhere: number } } } } };
    expect(spec.components.schemas.DesignMediaBackground["x-rsvp-veil"]).toEqual({ gradedBehindText: GRADED_TEXT_VEIL, gradedElsewhere: GRADED_ELSEWHERE_VEIL });
  });
});

describe("motion · the stylesheet and the tokens", () => {
  it("mirrors the motion tokens of @rsvp/design-tokens (no screen invents its own durations)", () => {
    const read = (name: string): string => (new RegExp(`--cd-${name}: ([^;]+);`).exec(STYLES) as RegExpExecArray)[1] as string;
    expect(read("motion-appear")).toBe(`${motion.duration.appear}ms`);
    expect(read("motion-settle")).toBe(`${motion.duration.settle}ms`);
    expect(read("motion-sway")).toBe(`${motion.duration.sway}ms`);
    expect(read("motion-reveal")).toBe(`${motion.duration.reveal}ms`);
    expect(read("ease-out")).toBe(motion.easing.out);
    expect(read("ease-in-out")).toBe(motion.easing.inOut);
  });

  it("every named animation lives under `prefers-reduced-motion: no-preference` and the doors are hidden otherwise", () => {
    const fidelity = STYLES.split("Contract 1.8.0 · fidelity")[1] as string;
    const outside = fidelity.split("@media (prefers-reduced-motion: no-preference)")[0] as string;
    expect(outside).not.toMatch(/animation:|@keyframes/);
    expect(outside).toMatch(/\.cdesign-doors \{ display: none; \}/);
  });

  it("a named animation plays once and ends in the resting state (no loop, no leftover transform)", () => {
    const fidelity = STYLES.split("Contract 1.8.0 · fidelity")[1] as string;
    for (const rule of fidelity.match(/animation: cdesign-[^;]+;/g) ?? []) expect(rule, rule).not.toMatch(/infinite/);
    expect(fidelity).toMatch(/cdesign-sway var\(--cd-motion-sway\) ease-in-out var\(--cdesign-delay, 0ms\) 1 both/);
    expect(fidelity).toMatch(/100% \{ transform: rotate\(0\) \}/);
    for (const [, ms] of fidelity.matchAll(/--cd-motion-(?:sway|reveal): (\d+)ms/g)) expect(Number(ms)).toBeLessThan(2500);
  });
});
