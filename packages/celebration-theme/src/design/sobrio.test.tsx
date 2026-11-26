import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { GALLERY, NOW, t, VIEW } from "../../test/fixtures.js";
import { CelebrationRenderer, contrastRatio, fontStylesheet, giftsPath, themeFromTemplate } from "../index.js";
import { CelebrationNativeRenderer } from "../native.js";
import { SOBRIO_TEMPLATES, SOBRIO_TEMPLATE_IDS, sobrioTemplate, type SobrioName } from "./documents/sobrio.js";
import { designPalette, readDesign } from "./read.js";
import type { DesignDocumentV2, PaletteRole } from "./types.js";

afterEach(cleanup);

// F4 c4 · the sober group as design documents v2. What must hold for each: it reads, both palettes pass AA, the gifts button is
// there and goes nowhere but /c/{slug}/regalos, the personality is its own (cover composition, dark palette) and the rules of F4 hold.
const NAMES = Object.keys(SOBRIO_TEMPLATES) as SobrioName[];
const SECTIONS = [...VIEW.enabledSections];
const html = (name: SobrioName, extra: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}): string =>
  renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(sobrioTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" {...extra} />);
const design = (name: SobrioName): DesignDocumentV2 => readDesign(sobrioTemplate(name).theme) as DesignDocumentV2;
const hue = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (!delta) return 0;
  const h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (h * 60 + 360) % 360;
};

describe("the sober group as documents v2", () => {
  it("has the seven templates, each with the deterministic id of its v1 seed", () => {
    expect(NAMES).toHaveLength(7);
    expect(new Set(Object.values(SOBRIO_TEMPLATE_IDS)).size).toBe(7);
    for (const name of NAMES) expect(SOBRIO_TEMPLATES[name].key).toBe(name);
  });

  it.each(NAMES)("%s: the renderer reads it and its theme keeps what the v1 consumers read", (name) => {
    const template = sobrioTemplate(name);
    expect(readDesign(template.theme)).not.toBeNull();
    const theme = themeFromTemplate(template, SECTIONS);
    expect(theme.palette.accent).toBe(design(name).tokens.palettes.light.accent);
    expect(theme.sections.at(-1)).toBe("rsvp");
    expect(theme.sections).toContain("gifts");
  });

  it.each(NAMES)("%s: every text pair of both palettes reaches AA and every control pair 3:1", (name) => {
    for (const scheme of ["light", "dark"] as const) {
      const p = designPalette(design(name), scheme);
      const at = (foreground: PaletteRole, background: PaletteRole): number => contrastRatio(p[foreground], p[background]);
      for (const [foreground, background] of [["text", "canvas"], ["text", "surface"], ["muted", "canvas"], ["muted", "surface"], ["accent", "canvas"], ["accent", "surface"], ["onAccent", "accentFill"]] as const) {
        expect(at(foreground, background), `${name} ${scheme} ${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const [foreground, background] of [["accentFill", "canvas"], ["line", "canvas"], ["line", "surface"]] as const) {
        expect(at(foreground, background), `${name} ${scheme} ${foreground}/${background}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it.each(NAMES)("%s: no yellow in the accent, the fill or the line, in either palette (rule 4)", (name) => {
    for (const scheme of ["light", "dark"] as const) {
      const p = designPalette(design(name), scheme);
      for (const role of ["accent", "accentFill", "line"] as const) {
        const h = hue(p[role]);
        expect(h < 40 || h > 70, `${name} ${scheme} ${role} hue ${h.toFixed(0)}`).toBe(true);
      }
    }
  });

  it.each(NAMES)("%s: has its own dark palette, not the light one inverted by a rule and not the neutral dark of v1", (name) => {
    const { light, dark } = design(name).tokens.palettes;
    expect(dark.canvas).not.toBe(light.canvas);
    expect(dark.canvas).not.toBe("#141218");
    expect(dark.accent).not.toBe(light.accent);
  });

  it("each template has its own cover composition and its own dark canvas", () => {
    const signature = (name: SobrioName): string => JSON.stringify(design(name).pages[0]?.canvases, (key, value: unknown) => (["id", "animation"].includes(key) ? undefined : value));
    expect(new Set(NAMES.map(signature)).size).toBe(7);
    expect(new Set(NAMES.map((name) => design(name).tokens.palettes.dark.canvas)).size).toBe(7);
    expect(new Set(NAMES.map((name) => design(name).tokens.palettes.light.accent)).size).toBe(7);
  });

  it.each(NAMES)("%s: fonts load with exactly the weights of the document, no italic axis and no weight 800", (name) => {
    const theme = themeFromTemplate(sobrioTemplate(name), SECTIONS);
    const sheet = fontStylesheet(theme) as string;
    expect(sheet.startsWith("https://fonts.googleapis.com/css2?")).toBe(true);
    expect(sheet).not.toContain("ital");
    expect(sheet).not.toContain("800");
    for (const weight of design(name).tokens.typography.heading.weights) expect(sheet).toContain(String(weight));
  });

  it.each(NAMES)("%s: P22 · the gifts button is always /c/{slug}/regalos without a token, with or without gifts content", (name) => {
    const links = [...html(name).matchAll(/<a [^>]*data-action="gifts"[^>]*>/g)].map((match) => match[0]);
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toContain(`href="${giftsPath("ana-y-luis")}"`);
      expect(link).not.toMatch(/token|credential|\?/);
    }
    for (const status of ["EMPTY", "CLOSED"] as const) expect(html(name, { giftsStatus: status })).toContain('data-action="gifts"');
    const doc = design(name);
    const gifts = doc.blocks.filter((block) => block.type === "giftsCta");
    expect(gifts).toHaveLength(1);
    expect(gifts[0]?.required).toBe(true);
  });

  it.each(NAMES)("%s: the partner recommendation goes through /r/{listingId}", (name) => {
    render(<CelebrationRenderer theme={themeFromTemplate(sobrioTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const partners = document.querySelectorAll('a[data-link-kind="partner"]');
    // Minimalista keeps the sections of its v1 seed, which place no recommendations: there is no provider on its page to link.
    const places = (sobrioTemplate(name).sectionOrder as readonly string[]).includes("recommendations");
    expect(partners).toHaveLength(places ? 1 : 0);
    if (places) expect(partners[0]?.getAttribute("href")).toBe("/r/listing-42");
  });

  it.each(NAMES)("%s: one h1 with the names, the date in the celebration's zone and the venue, in es-BO and en-US", (name) => {
    render(<CelebrationRenderer theme={themeFromTemplate(sobrioTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1")?.textContent).toBe("Ana y Luis");
    expect(document.body.textContent).toContain("sábado, 19 de diciembre de 2026");
    cleanup();
    render(<CelebrationRenderer theme={themeFromTemplate(sobrioTemplate(name), SECTIONS)} view={{ ...VIEW, locale: "en-US" }} t={t} now={NOW} />);
    expect(document.body.textContent).toContain("Saturday, December 19, 2026");
  });

  it.each(NAMES)("%s: draws with and without a cover photo, never a gradient, uppercase or Spanish text baked into the document", (name) => {
    const withPhoto = html(name);
    const bare = html(name, { gallery: [] });
    expect(withPhoto).toContain('data-has-image="true"');
    expect(bare).toContain('data-has-image="false"');
    expect(withPhoto).not.toMatch(/gradient/);
    const text = JSON.stringify(sobrioTemplate(name).theme);
    for (const block of design(name).blocks) expect(["heading", "text", "quote", "button"]).not.toContain(block.type);
    expect(text).not.toMatch(/uppercase/);
  });

  it.each(NAMES)("%s: every animation is inside the contract and none loops", (name) => {
    const allowed = ["none", "fade", "rise", "scale", "draw", "envelope"];
    for (const page of design(name).pages) for (const canvas of Object.values(page.canvases)) for (const item of canvas.elements) if (item.animation) expect(allowed).toContain(item.animation.entrance);
  });

  it.each(NAMES)("%s: the native reader draws it too", (name) => {
    const { getByTestId } = render(<CelebrationNativeRenderer theme={themeFromTemplate(sobrioTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    expect(getByTestId("celebration-gifts-cta")).toBeTruthy();
  });

  it("Minimalista: type and one line, a single object on the cover and no ornament set", () => {
    const doc = design("minimalista");
    for (const canvas of Object.values(doc.pages[0]?.canvases ?? {})) expect(canvas.elements.filter((item) => item.block !== "cover")).toHaveLength(1);
    expect(doc.tokens.ornament).toBe("none");
    expect(doc.blocks.filter((block) => block.type === "illustration")).toHaveLength(1);
  });

  it("the agenda of Corporativo grafito comes first and is numbered; Corporativo keeps the timeline", () => {
    expect(firstSection("corporativo-grafito")).toBe("schedule");
    const display = (name: SobrioName): unknown => design(name).blocks.find((block) => block.id === "schedule")?.config["display"];
    expect(display("corporativo-grafito")).toBe("list");
    expect(display("corporativo")).toBe("timeline");
  });
});

const firstSection = (name: SobrioName): string | undefined => sectionsOf(name)[0];
const sectionsOf = (name: SobrioName): readonly string[] => sobrioTemplate(name).sectionOrder as readonly string[];
