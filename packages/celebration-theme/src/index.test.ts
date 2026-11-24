import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { accentFill, COMPONENT_CONTRAST, compatibleTemplates, contrastRatio, COVER_WASH, darkBackdrops, fontStylesheet, inkOnAccent, LAYOUT_IDS, LAYOUTS, paletteFor, RSVP_WASH, TEXT_CONTRAST, themeFromTemplate, themeVariables, FALLBACK_TEMPLATE, type Palette } from "./index.js";
import { TEMPLATES, WEDDING_SECTIONS } from "../test/fixtures.js";
import seeded from "../test/seeded-palettes.json";

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

  it("sections the event type does not enable are dropped; enabled ones the template omits are hidden, not lost", () => {
    const corporate = themeFromTemplate(TEMPLATES[4], ["story", "schedule", "venues", "faq"]);
    expect(corporate.sections).toEqual(["schedule", "venues", "faq"]);
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
    expect(theme.sections).toEqual(["story"]);
    expect(themeFromTemplate(null, ["faq"]).sections).toEqual(["faq"]);
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

const SEEDED_PALETTES: readonly (readonly [string, Palette])[] = seeded.templates.map((template) => [template.key, template.palette]);
const themeOf = (palette: Palette) => ({ ...themeFromTemplate(null, []), palette });

/** Light-scheme fill and ink the 16 seeds had before the dark-contrast work (b62081b). Light must never move. */
const LIGHT_FILLS: Readonly<Record<string, { readonly fill: string; readonly ink: string }>> = {
  "clasico-marfil": {
    "fill": "#7A5230",
    "ink": "#FFFFFF"
  },
  "minimalista": {
    "fill": "#2F5D50",
    "ink": "#F6F6F3"
  },
  "editorial": {
    "fill": "#9C3526",
    "ink": "#FFFFFF"
  },
  "festivo": {
    "fill": "#B3134F",
    "ink": "#FFFFFF"
  },
  "corporativo": {
    "fill": "#1F5FAD",
    "ink": "#FFFFFF"
  },
  "jardin-botanico": {
    "fill": "#386247",
    "ink": "#FFFFFF"
  },
  "rosa-antiguo": {
    "fill": "#9A3F55",
    "ink": "#FFFFFF"
  },
  "cielo-bautizo": {
    "fill": "#2F5F94",
    "ink": "#FFFFFF"
  },
  "arena-terracota": {
    "fill": "#A2431F",
    "ink": "#F2EBE0"
  },
  "editorial-granate": {
    "fill": "#8A2638",
    "ink": "#FFFFFF"
  },
  "editorial-oliva": {
    "fill": "#5B6B1F",
    "ink": "#FFFFFF"
  },
  "pinata": {
    "fill": "#C2330F",
    "ink": "#FFFFFF"
  },
  "fiesta-lila": {
    "fill": "#6A3BBF",
    "ink": "#FFFFFF"
  },
  "menta-infantil": {
    "fill": "#0C7566",
    "ink": "#FFFFFF"
  },
  "corporativo-grafito": {
    "fill": "#0B6E6A",
    "ink": "#FFFFFF"
  },
  "gala-dorada": {
    "fill": "#7A5A0E",
    "ink": "#FFFFFF"
  }
};

/** Hue in degrees (0-360) of a #RRGGBB colour. */
function hue(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255) as [number, number, number];
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  if (delta === 0) return 0;
  const sector = max === red ? ((green - blue) / delta + 6) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return sector * 60;
}
const hueDistance = (first: string, second: string) => { const gap = Math.abs(hue(first) - hue(second)); return Math.min(gap, 360 - gap); };

describe("palette fixture", () => {
  it("is a literal copy of the 16 seeds of RSVPBackend, with its origin", () => {
    expect(seeded._origin.repo).toBe("PabloArauzCaballero/RSVPBackend");
    expect(seeded._origin.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(seeded.templates).toHaveLength(16);
    expect(new Set(seeded.templates.map((template) => template.key)).size).toBe(16);
    for (const template of seeded.templates) {
      expect(template.file).toMatch(/^\d{3}-[a-z-]+\.json$/);
      expect(Object.keys(template.palette).sort()).toEqual(["accent", "canvas", "muted", "surface", "text"]);
      for (const colour of Object.values(template.palette)) expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(Object.keys(LIGHT_FILLS).sort()).toEqual(seeded.templates.map((template) => template.key).sort());
  });
});

describe("contrastRatio", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#767676", "#FFFFFF")).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio("#336699", "#336699")).toBe(1);
  });
});

describe("template colours read in both schemes (WCAG AA)", () => {
  it.each(SEEDED_PALETTES)("%s · dark accent reads on the dark canvas, the surface and the accent washes, with the same hue", (_key, palette) => {
    const dark = paletteFor(themeOf(palette), "dark");
    expect(darkBackdrops(dark.accent)).toHaveLength(6);
    for (const background of darkBackdrops(dark.accent)) expect(contrastRatio(dark.accent, background)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio(dark.text, dark.canvas)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio(dark.muted, dark.surface)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(hueDistance(dark.accent, palette.accent)).toBeLessThanOrEqual(2);
  });

  it.each(SEEDED_PALETTES)("%s · dark fill reads as a shape (3:1) on canvas and surface, keeps the hue, and its ink and the white cover text read", (_key, palette) => {
    const dark = paletteFor(themeOf(palette), "dark");
    const { fill, ink } = accentFill(themeOf(palette), "dark");
    expect(contrastRatio(fill, dark.canvas)).toBeGreaterThanOrEqual(COMPONENT_CONTRAST);
    expect(contrastRatio(fill, dark.surface)).toBeGreaterThanOrEqual(COMPONENT_CONTRAST);
    expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio("#FFFFFF", fill)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(hueDistance(fill, palette.accent)).toBeLessThanOrEqual(2);
  });

  it.each(SEEDED_PALETTES)("%s · light fill and ink are exactly what the seed had before, so light looks the same", (key, palette) => {
    expect(accentFill(themeOf(palette), "light")).toEqual(LIGHT_FILLS[key]);
    expect(contrastRatio(accentFill(themeOf(palette), "light").ink, palette.accent)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });

  it.each(SEEDED_PALETTES)("%s · white cover text over an accent band without photo (editorial) reads in light", (_key, palette) => {
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

  it("falls back to white or black ink when neither the surface, canvas nor text reach AA", () => {
    const palette = { canvas: "#808080", surface: "#888888", text: "#777777", accent: "#F0F0F0", muted: "#666666" };
    expect(inkOnAccent(palette)).toBe("#000000");
    expect(inkOnAccent({ canvas: "#202020", surface: "#202020", text: "#303030", accent: "#101010" })).toBe("#FFFFFF");
  });

  it("falls back to the dark text colour when no lightening of a colour can read (no accent, or an invalid one)", () => {
    const dark = paletteFor({ ...themeFromTemplate(null, []), palette: { ...FALLBACK_TEMPLATE.theme.palette, accent: "not-a-colour" } }, "dark");
    expect(dark.accent).toBe(paletteFor(themeFromTemplate(null, []), "dark").text);
  });

  it("themeVariables computes the fill once and exposes it with its ink", () => {
    const theme = themeOf(SEEDED_PALETTES[4]![1]);
    const dark = themeVariables(theme, "dark");
    expect(dark["--celebration-accent-fill"]).toBe(accentFill(theme, "dark").fill);
    expect(dark["--celebration-on-accent"]).toBe(accentFill(theme, "dark").ink);
  });
});

describe("styles.css and native styles keep the contract the theme assumes", () => {
  const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
  const native = readFileSync(join(process.cwd(), "src/native.tsx"), "utf8");
  const FLOOR_PX = 13;
  const ROOT_PX = 16;

  it("no font-size in styles.css falls below 13 px (rem values at 16 px; clamp() minimums included)", () => {
    const sizes = [...css.matchAll(/font-size:\s*([^;}]+)[;}]/g)].flatMap((match) => [...match[1]!.matchAll(/(-?\d*\.?\d+)(rem|em|px)/g)].map((value) => ({ rule: match[0], px: Number(value[1]) * (value[2] === "px" ? 1 : ROOT_PX) })));
    expect(sizes.length).toBeGreaterThan(10);
    expect(sizes.filter((size) => size.px < FLOOR_PX)).toEqual([]);
  });

  it("no fontSize in native.tsx falls below 13 px", () => {
    const sizes = [...native.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
    expect(sizes.length).toBeGreaterThan(5);
    expect(sizes.filter((size) => size < FLOOR_PX)).toEqual([]);
  });

  it("the washes the theme validates against are the ones the stylesheet paints", () => {
    expect(css).toContain(`color-mix(in srgb, var(--celebration-accent) ${COVER_WASH * 100}%, transparent)`);
    expect(css).toMatch(new RegExp(String.raw`data-section="rsvp"\][^}]*color-mix\(in srgb, var\(--celebration-accent\) ${RSVP_WASH * 100}%, var\(--celebration-surface\)\)`));
  });

  it("the reply button has hover and press states that move only transform, and only when motion is allowed", () => {
    expect(css).toMatch(/prefers-reduced-motion: no-preference\) \{[^@]*\.celebration-cta:hover \{ transform:[^}]+\}[^@]*\.celebration-cta:active \{ transform: scale\(\.98\); \}/);
  });
});
