import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { GALLERY, NOW, t, VIEW } from "../../test/fixtures.js";
import { CelebrationRenderer, contrastRatio, fontStylesheet, giftsPath, themeFromTemplate } from "../index.js";
import { EXTRA_TEMPLATES, EXTRA_TEMPLATE_IDS, extraTemplate, type ExtraName } from "./documents/extra.js";
import { designPalette, readDesign } from "./read.js";
import type { DesignDocumentV2, PaletteRole } from "./types.js";

afterEach(cleanup);

// Decision 6 · the six extra templates (two each for Otros, Despedida and Pedida) as design documents v2. What must hold for each: it reads, both palettes pass AA, the gifts button is
// there and goes nowhere but /c/{slug}/regalos, the personality is its own (cover composition, dark palette) and the rules of F4 hold.
const NAMES = Object.keys(EXTRA_TEMPLATES) as ExtraName[];
const SECTIONS = [...VIEW.enabledSections];
const html = (name: ExtraName, extra: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}): string =>
  renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(extraTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" {...extra} />);
const design = (name: ExtraName): DesignDocumentV2 => readDesign(extraTemplate(name).theme) as DesignDocumentV2;
const hue = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (!delta) return 0;
  const h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (h * 60 + 360) % 360;
};

describe("the six extra templates as documents v2", () => {
  it("has the six templates, each with the deterministic id of its v1 seed", () => {
    expect(NAMES).toHaveLength(6);
    expect(new Set(Object.values(EXTRA_TEMPLATE_IDS)).size).toBe(6);
    for (const name of NAMES) expect(EXTRA_TEMPLATES[name].key).toBe(name);
  });

  it.each(NAMES)("%s: the renderer reads it and its theme keeps what the v1 consumers read", (name) => {
    const template = extraTemplate(name);
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
    const signature = (name: ExtraName): string => JSON.stringify(design(name).pages[0]?.canvases, (key, value: unknown) => (["id", "animation"].includes(key) ? undefined : value));
    expect(new Set(NAMES.map(signature)).size).toBe(6);
    expect(new Set(NAMES.map((name) => design(name).tokens.palettes.dark.canvas)).size).toBe(6);
    expect(new Set(NAMES.map((name) => design(name).tokens.palettes.light.accent)).size).toBe(6);
  });

  it.each(NAMES)("%s: fonts load with exactly the weights of the document, no italic axis and no weight 800", (name) => {
    const theme = themeFromTemplate(extraTemplate(name), SECTIONS);
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
    render(<CelebrationRenderer theme={themeFromTemplate(extraTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const partners = document.querySelectorAll('a[data-link-kind="partner"]');
    // Only the templates whose sections place recommendations have a provider on the page to link.
    const places = (extraTemplate(name).sectionOrder as readonly string[]).includes("recommendations");
    expect(partners).toHaveLength(places ? 1 : 0);
    if (places) expect(partners[0]?.getAttribute("href")).toBe("/r/listing-42");
  });

  it.each(NAMES)("%s: one h1 with the names, the date in the celebration's zone and the venue, in es-BO and en-US", (name) => {
    render(<CelebrationRenderer theme={themeFromTemplate(extraTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1")?.textContent).toBe("Ana y Luis");
    expect(document.body.textContent).toContain("sábado, 19 de diciembre de 2026");
    cleanup();
    render(<CelebrationRenderer theme={themeFromTemplate(extraTemplate(name), SECTIONS)} view={{ ...VIEW, locale: "en-US" }} t={t} now={NOW} />);
    expect(document.body.textContent).toContain("Saturday, December 19, 2026");
  });

  it.each(NAMES)("%s: draws with and without a cover photo, never a gradient, uppercase or Spanish text baked into the document", (name) => {
    const withPhoto = html(name);
    const bare = html(name, { gallery: [] });
    expect(withPhoto).toContain('data-has-image="true"');
    expect(bare).toContain('data-has-image="false"');
    expect(withPhoto).not.toMatch(/gradient/);
    const text = JSON.stringify(extraTemplate(name).theme);
    for (const block of design(name).blocks) expect(["heading", "text", "quote", "button"]).not.toContain(block.type);
    expect(text).not.toMatch(/uppercase/);
  });

  it.each(NAMES)("%s: every animation is inside the contract and none loops", (name) => {
    const allowed = ["none", "fade", "rise", "scale", "draw", "envelope"];
    for (const page of design(name).pages) for (const canvas of Object.values(page.canvases)) for (const item of canvas.elements) if (item.animation) expect(allowed).toContain(item.animation.entrance);
  });

  it.each(NAMES)("%s: the web view of the app (the native reader was retired in F6 b) draws the gifts button too", (name) => {
    const { container } = render(<CelebrationRenderer theme={themeFromTemplate(extraTemplate(name), SECTIONS)} view={VIEW} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" />);
    expect(container.querySelector('a[data-action="gifts"]')).not.toBeNull();
  });

  it("each template has its own type pair, spacing and ornament choice, and none uses a retired family", () => {
    const tokens = (name: ExtraName) => design(name).tokens;
    const pair = (name: ExtraName): string => `${tokens(name).typography.heading.family}/${tokens(name).typography.body.family}`;
    expect(new Set(NAMES.map(pair)).size).toBe(6);
    expect(new Set(NAMES.map((name) => `${tokens(name).spacing.section}/${tokens(name).spacing.contentMaxWidth}/${JSON.stringify(tokens(name).radii)}`)).size).toBeGreaterThanOrEqual(5);
    for (const name of NAMES) {
      for (const role of ["heading", "body"] as const) expect(["poppins", "ibm-plex-sans", "ibm-plex-serif", "inter"]).not.toContain(tokens(name).typography[role].family);
    }
  });

  it("no cover text size is below 13 px, and the scale base keeps body text at 16", () => {
    for (const name of NAMES) {
      expect(design(name).tokens.typography.scale.base, name).toBeGreaterThanOrEqual(16);
      for (const page of design(name).pages) for (const canvas of Object.values(page.canvases)) for (const item of canvas.elements) {
        if (item.typography?.size !== undefined) expect(item.typography.size, `${name} ${item.id}`).toBeGreaterThanOrEqual(13);
      }
    }
  });

  it("the cover composition differs between the two templates of the same event type", () => {
    const signature = (name: ExtraName): string => JSON.stringify(design(name).pages[0]?.canvases.mobile, (key, value: unknown) => (["id", "animation"].includes(key) ? undefined : value));
    for (const [first, second] of [["otros-rumbo", "otros-mesa"], ["despedida-disco", "despedida-esmoquin"], ["pedida-solitario", "pedida-rosa"]] as const) {
      expect(signature(first)).not.toBe(signature(second));
      expect(design(first).tokens.palettes.light.accent).not.toBe(design(second).tokens.palettes.light.accent);
      expect(extraTemplate(first).eventTypeTags).toEqual(extraTemplate(second).eventTypeTags);
    }
  });

  it("each one carries at least two library drawings, tinted with the accent", () => {
    for (const name of NAMES) {
      const art = design(name).blocks.filter((block) => block.type === "illustration");
      expect(art.length, name).toBeGreaterThanOrEqual(2);
      for (const block of art) expect(block.config["tint"]).toBe("accent");
    }
  });
});
