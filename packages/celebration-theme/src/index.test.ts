import { describe, expect, it } from "vitest";
import { accentFill, compatibleTemplates, contrastRatio, fontStylesheet, inkOnAccent, LAYOUT_IDS, LAYOUTS, paletteFor, TEXT_CONTRAST, themeFromTemplate, themeVariables, withGifts, FALLBACK_TEMPLATE, type Palette } from "./index.js";
import { TEMPLATES, WEDDING_SECTIONS } from "../test/fixtures.js";

describe("theme as data", () => {
  it("REQ-F09-01 · five base layouts, one spec each", () => {
    expect(Object.keys(LAYOUTS).sort()).toEqual([...LAYOUT_IDS].sort());
    expect(new Set(TEMPLATES.map((template) => template.layout)).size).toBe(LAYOUT_IDS.length);
  });

  it("REQ-F09-02 · palette, typography, style and section order all come from the template row", () => {
    const theme = themeFromTemplate(TEMPLATES[2], WEDDING_SECTIONS);
    expect(theme.layout).toBe("editorial");
    expect(theme.palette.accent).toBe("#A33B2A");
    expect(theme.typography.heading).toContain("Playfair Display");
    expect(theme.sectionStyle).toBe("cards");
    expect(theme.sections[0]).toBe("gallery");
  });

  it("sections the event type does not enable are dropped; enabled ones the template omits are hidden, not lost (gifts aside, P22)", () => {
    const corporate = themeFromTemplate(TEMPLATES[4], ["story", "schedule", "venues", "faq"]);
    expect(corporate.sections).toEqual(["schedule", "venues", "faq", "gifts"]);
    expect(corporate.hiddenSections).toEqual(["story"]);
  });

  it("REQ-F09-06 · only templates sharing a tag with the event type are offered", () => {
    expect(compatibleTemplates(TEMPLATES, ["quinceanera"]).map((template) => template.name)).toEqual(["Minimalista", "Editorial", "Festivo"]);
    expect(compatibleTemplates(TEMPLATES, ["wedding"]).map((template) => template.name)).not.toContain("Festivo");
    expect(compatibleTemplates(TEMPLATES, ["unknown"])).toEqual([]);
  });

  it("malformed API values degrade to the fallback instead of breaking the page", () => {
    const broken = { ...TEMPLATES[0], layout: "brutalist", theme: { ...TEMPLATES[0].theme, sectionStyle: "zigzag" }, sectionOrder: ["story", "nope"] } as unknown as typeof TEMPLATES[0];
    const theme = themeFromTemplate(broken, ["story"]);
    expect(theme.layout).toBe(FALLBACK_TEMPLATE.layout);
    expect(theme.sectionStyle).toBe(FALLBACK_TEMPLATE.theme.sectionStyle);
    expect(theme.sections).toEqual(["story", "gifts"]);
    expect(themeFromTemplate(null, ["faq"]).sections).toEqual(["faq", "gifts"]);
  });

  it("REQ-F09-04 · the palette becomes CSS variables; light keeps the template's accent exactly", () => {
    const theme = themeFromTemplate(TEMPLATES[0], WEDDING_SECTIONS);
    expect(themeVariables(theme)["--celebration-canvas"]).toBe("#FFFBF4");
    expect(themeVariables(theme)["--celebration-max-width"]).toBe("720px");
    expect(paletteFor(theme, "light").accent).toBe("#865E36");
    const dark = paletteFor(theme, "dark");
    expect(dark.canvas).not.toBe(theme.palette.canvas);
    expect(dark.accent).not.toBe("#865E36");
  });

  it("loads only the web fonts the theme names", () => {
    expect(fontStylesheet(themeFromTemplate(TEMPLATES[0], []))).toBe("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&display=swap");
    expect(fontStylesheet(themeFromTemplate(FALLBACK_TEMPLATE, []))).toBeUndefined();
  });
});

describe("P22 · PL-A10 · the gifts section is on every invitation", () => {
  const withoutGifts = <TSection extends string>(order: readonly TSection[]): TSection[] => order.filter((section) => section !== "gifts");

  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("%s · present when the template omits it and the event type does not enable it", (_layout, template) => {
    const omitted = { ...template, sectionOrder: withoutGifts(template.sectionOrder) };
    const theme = themeFromTemplate(omitted, withoutGifts(WEDDING_SECTIONS));
    expect(theme.sections).toContain("gifts");
    expect(theme.hiddenSections).not.toContain("gifts");
    // Right before the reply when the template does not place it.
    expect(theme.sections.indexOf("gifts")).toBe(theme.sections.indexOf("rsvp") - 1);
  });

  it("a template that places gifts keeps its position; without a reply section it goes last; it is never repeated", () => {
    expect(themeFromTemplate(TEMPLATES[0], WEDDING_SECTIONS).sections).toEqual(["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]);
    expect(withGifts(["story", "faq"])).toEqual(["story", "faq", "gifts"]);
    expect(withGifts(["rsvp"])).toEqual(["gifts", "rsvp"]);
    expect(withGifts([])).toEqual(["gifts"]);
    expect(withGifts(["gifts", "story", "rsvp"])).toEqual(["gifts", "story", "rsvp"]);
    expect(themeFromTemplate(null, []).sections).toEqual(["gifts"]);
  });
});

/** The 16 palettes Template/Media seeds (RSVPBackend seeds/templates/data, 2026-11-24). */
const SEEDED_PALETTES: readonly (readonly [string, Palette])[] = [
  ["clasico-marfil", {"canvas": "#FBF7F0", "surface": "#FFFFFF", "text": "#2B2622", "accent": "#7A5230", "muted": "#665C52"}],
  ["minimalista", {"canvas": "#FFFFFF", "surface": "#F6F6F3", "text": "#1C1C1A", "accent": "#2F5D50", "muted": "#5C5C57"}],
  ["editorial", {"canvas": "#F4EFE9", "surface": "#FFFFFF", "text": "#211D1A", "accent": "#9C3526", "muted": "#675C55"}],
  ["festivo", {"canvas": "#FFF5FA", "surface": "#FFFFFF", "text": "#2B1730", "accent": "#B3134F", "muted": "#6A506E"}],
  ["corporativo", {"canvas": "#F5F7FA", "surface": "#FFFFFF", "text": "#14202B", "accent": "#1F5FAD", "muted": "#4F5C68"}],
  ["jardin-botanico", {"canvas": "#F5F8F2", "surface": "#FFFFFF", "text": "#222B25", "accent": "#386247", "muted": "#58645B"}],
  ["rosa-antiguo", {"canvas": "#FBF3F2", "surface": "#FFFFFF", "text": "#2D2224", "accent": "#9A3F55", "muted": "#695A5D"}],
  ["cielo-bautizo", {"canvas": "#F2F7FC", "surface": "#FFFFFF", "text": "#1F2933", "accent": "#2F5F94", "muted": "#55626F"}],
  ["arena-terracota", {"canvas": "#FAF6F0", "surface": "#F2EBE0", "text": "#2A231D", "accent": "#A2431F", "muted": "#615548"}],
  ["editorial-granate", {"canvas": "#F3F0EB", "surface": "#FFFFFF", "text": "#161412", "accent": "#8A2638", "muted": "#625A55"}],
  ["editorial-oliva", {"canvas": "#F5F4EC", "surface": "#FFFFFF", "text": "#1D2119", "accent": "#5B6B1F", "muted": "#5D6155"}],
  ["pinata", {"canvas": "#FFF8E6", "surface": "#FFFFFF", "text": "#2E2012", "accent": "#C2330F", "muted": "#6B5640"}],
  ["fiesta-lila", {"canvas": "#F8F4FF", "surface": "#FFFFFF", "text": "#241A36", "accent": "#6A3BBF", "muted": "#625774"}],
  ["menta-infantil", {"canvas": "#F0FAF6", "surface": "#FFFFFF", "text": "#14302A", "accent": "#0C7566", "muted": "#4C6A63"}],
  ["corporativo-grafito", {"canvas": "#F4F5F6", "surface": "#FFFFFF", "text": "#17191C", "accent": "#0B6E6A", "muted": "#50565C"}],
  ["gala-dorada", {"canvas": "#F8F6F0", "surface": "#FFFFFF", "text": "#1D1B16", "accent": "#7A5A0E", "muted": "#5E5848"}],
];

describe("template colours read in both schemes (WCAG AA)", () => {
  it.each(SEEDED_PALETTES)("%s · dark accent reads on the dark canvas and surface, with the same hue family", (_key, palette) => {
    const dark = paletteFor({ ...themeFromTemplate(null, []), palette }, "dark");
    expect(contrastRatio(dark.accent, dark.canvas)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio(dark.accent, dark.surface)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio(dark.text, dark.canvas)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio(dark.muted, dark.surface)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });

  it.each(SEEDED_PALETTES)("%s · text on an accent fill (cover band, reply button) reads in light and dark; the fill keeps the template's accent", (_key, palette) => {
    for (const scheme of ["light", "dark"] as const) {
      const { fill, ink } = accentFill({ ...themeFromTemplate(null, []), palette }, scheme);
      expect(fill).toBe(palette.accent);
      expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    }
  });

  it.each(SEEDED_PALETTES)("%s · white cover text over an accent band without photo (editorial) reads", (_key, palette) => {
    expect(contrastRatio("#FFFFFF", palette.accent)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });

  it.each(SEEDED_PALETTES)("%s · light accent and muted text read on canvas and surface", (_key, palette) => {
    for (const background of [palette.canvas, palette.surface]) {
      expect(contrastRatio(palette.accent, background)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      expect(contrastRatio(palette.muted, background)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    }
  });

  it("light mode keeps the surface as ink on the accent when it already reads, so seeded templates look the same", () => {
    const [, ivory] = SEEDED_PALETTES[0]!;
    expect(inkOnAccent(ivory)).toBe(ivory.surface);
  });
});
