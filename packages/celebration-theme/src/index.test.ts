import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { accentFill, COMPONENT_CONTRAST, compatibleTemplates, contrastRatio, COVER_WASH, darkBackdrops, fontStylesheet, inkOnAccent, LAYOUT_IDS, LAYOUTS, paletteFor, RSVP_WASH, TEXT_CONTRAST, themeFromTemplate, themeVariables, withGifts, FALLBACK_TEMPLATE, type Palette } from "./index.js";
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

const SEEDED_PALETTES: readonly (readonly [string, Palette])[] = seeded.templates.map((template) => [template.key, template.palette]);
const themeOf = (palette: Palette) => ({ ...themeFromTemplate(null, []), palette });

/** Light-scheme fill and ink of the 36 seeds after the F4 redesign (computed by accentFill on each light palette; light accents already read, so the fill is the accent itself). */
const LIGHT_FILLS: Readonly<Record<string, { readonly fill: string; readonly ink: string }>> = {
  "clasico-marfil": {
    "fill": "#7A5230",
    "ink": "#FFFEFA"
  },
  "minimalista": {
    "fill": "#2F5D50",
    "ink": "#FAFAF7"
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
    "ink": "#FFFFFF"
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
    "fill": "#7B2A3C",
    "ink": "#FFFFFF"
  },
  "cumpleanos-adulto": {
    "fill": "#1D5C73",
    "ink": "#FFFFFF"
  },
  "fiesta-patronal": {
    "fill": "#8E2D6B",
    "ink": "#FFFFFF"
  },
  "inauguracion": {
    "fill": "#B03F00",
    "ink": "#FFFFFF"
  },
  "pedida-de-mano": {
    "fill": "#5B4B8A",
    "ink": "#FFFFFF"
  },
  "despedida": {
    "fill": "#0B6B8A",
    "ink": "#FFFFFF"
  },
  "bodas-de-oro": {
    "fill": "#8A4A1E",
    "ink": "#FFFEFA"
  },
  "bodas-de-plata": {
    "fill": "#3E5C76",
    "ink": "#FFFFFF"
  },
  "reencuentro": {
    "fill": "#9A3412",
    "ink": "#FFFFFF"
  },
  "fiesta-tematica": {
    "fill": "#2F4FBF",
    "ink": "#FFFFFF"
  },
  "fin-de-ano": {
    "fill": "#1F3A6B",
    "ink": "#FFFFFF"
  },
  "otros-evento": {
    "fill": "#4F5D95",
    "ink": "#FFFFFF"
  },
  "graduacion": {
    "fill": "#1E3A8A",
    "ink": "#FFFFFF"
  },
  "baby-shower": {
    "fill": "#A3406F",
    "ink": "#FFFFFF"
  },
  "primera-comunion": {
    "fill": "#3C6E8F",
    "ink": "#FFFFFF"
  },
  "otros-rumbo": {
    "fill": "#0B5F7A",
    "ink": "#FFFFFF"
  },
  "otros-mesa": {
    "fill": "#1F6B4A",
    "ink": "#FFFEFA"
  },
  "despedida-disco": {
    "fill": "#8E1F8F",
    "ink": "#FFFFFF"
  },
  "despedida-esmoquin": {
    "fill": "#B4262A",
    "ink": "#FFFFFF"
  },
  "pedida-solitario": {
    "fill": "#1D5E91",
    "ink": "#FFFFFF"
  },
  "pedida-rosa": {
    "fill": "#A82E58",
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
  it("is a literal copy of the 36 seeds of RSVPBackend, with its origin", () => {
    expect(seeded._origin.repo).toBe("PabloArauzCaballero/RSVPBackend");
    expect(seeded._origin.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(seeded.templates).toHaveLength(36);
    expect(new Set(seeded.templates.map((template) => template.key)).size).toBe(36);
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

  it.each(SEEDED_PALETTES)("%s · dark fill reads as a shape (3:1) on canvas, surface and the accent washes (RSVP block, cover), keeps the hue, and its ink and the white cover text read", (_key, palette) => {
    const dark = paletteFor(themeOf(palette), "dark");
    const { fill, ink } = accentFill(themeOf(palette), "dark");
    expect(contrastRatio(fill, dark.canvas)).toBeGreaterThanOrEqual(COMPONENT_CONTRAST);
    expect(contrastRatio(fill, dark.surface)).toBeGreaterThanOrEqual(COMPONENT_CONTRAST);
    for (const background of darkBackdrops(dark.accent)) expect(contrastRatio(fill, background)).toBeGreaterThanOrEqual(COMPONENT_CONTRAST);
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

describe("styles.css keeps the contract the theme assumes", () => {
  const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
  const FLOOR_PX = 13;
  const ROOT_PX = 16;

  it("no font-size in styles.css falls below 13 px (rem values at 16 px; clamp() minimums included)", () => {
    const sizes = [...css.matchAll(/font-size:\s*([^;}]+)[;}]/g)].flatMap((match) => [...match[1]!.matchAll(/(-?\d*\.?\d+)(rem|em|px)/g)].map((value) => ({ rule: match[0], px: Number(value[1]) * (value[2] === "px" ? 1 : ROOT_PX) })));
    expect(sizes.length).toBeGreaterThan(10);
    expect(sizes.filter((size) => size.px < FLOOR_PX)).toEqual([]);
  });

  it("F4 (PL-A3, PL-M6, PL-M8) · the stylesheet paints no gradient and no saturated cover block; the reply tint is the one the theme validates against", () => {
    expect(css).not.toMatch(/linear-gradient|radial-gradient/);
    expect(css).not.toContain(`color-mix(in srgb, var(--celebration-accent) ${COVER_WASH * 100}%, transparent)`);
    expect(css).toMatch(new RegExp(String.raw`data-section="rsvp"\][^}]*color-mix\(in srgb, var\(--celebration-accent\) ${RSVP_WASH * 100}%, var\(--celebration-surface\)\)`));
  });

  it("the reply button presses with scale(.98) (DESIGN.md) and hovers only where hover exists, both only when motion is allowed", () => {
    expect(css).toMatch(/prefers-reduced-motion: no-preference\) \{[^@]*\.celebration-cta:active \{ transform: scale\(\.98\); \}/);
    expect(css).toMatch(/@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{\s*\.celebration-cta:hover \{ transform: scale\(1\.02\); \}/);
    expect(css).not.toContain("translateY(-1px)");
  });

  /** Specificity (ids, classes/attributes/pseudo-classes, elements) of one selector, enough for the selectors this stylesheet writes. */
  const specificity = (selector: string): [number, number, number] => {
    const bare = selector.replace(/::?[a-z-]+\([^)]*\)/g, (pseudo) => (/^:(?:not|is|where)/.test(pseudo) ? "" : ":x")).replace(/\[[^\]]*\]/g, ".a");
    return [(bare.match(/#[\w-]+/g) ?? []).length, (bare.match(/\.[\w-]+|:[a-z-]+/g) ?? []).filter((part) => !part.startsWith("::")).length, (bare.match(/(?:^|[\s>+~])[a-z][\w-]*/g) ?? []).length];
  };
  const rules = [...css.matchAll(/(^|\n)([^@/\n{}][^{}\n]*)\{([^}]*)\}/g)].map((match, index) => ({ index, selector: match[2]!.trim(), body: match[3]! }));
  const winsOver = (first: [number, number, number], second: [number, number, number]) => first[0] - second[0] || first[1] - second[1] || first[2] - second[2];

  it("PL-114-V1 · in bands the reply's tint beats the alternate-band rule whatever the section's parity (same specificity, declared later)", () => {
    const alternate = rules.find((rule) => rule.selector.includes('[data-section-style="bands"]') && rule.selector.includes(":nth-child(even)") && /background/.test(rule.body));
    const reply = rules.find((rule) => rule.selector.includes('[data-section-style="bands"]') && rule.selector.includes('[data-section="rsvp"]') && /background:\s*color-mix/.test(rule.body));
    expect(alternate).toBeTruthy();
    expect(reply).toBeTruthy();
    expect(winsOver(specificity(reply!.selector), specificity(alternate!.selector))).toBeGreaterThanOrEqual(0);
    expect(reply!.index).toBeGreaterThan(alternate!.index);
    expect(reply!.body).toContain(`color-mix(in srgb, var(--celebration-accent) ${RSVP_WASH * 100}%, var(--celebration-surface))`);
  });

  it("the adaptive reply button stacks its faces in one cell and only hides the one that does not show", () => {
    expect(css).toMatch(/\.celebration-cta\[data-credential\] \{[^}]*display: inline-grid/);
    expect(css).toMatch(/\.celebration-cta-face \{[^}]*grid-area: 1 \/ 1/);
    expect(css).toMatch(/data-credential="absent"\] \.celebration-cta-face\[data-face="confirm"\][^{]*data-credential="present"\] \.celebration-cta-face\[data-face="find"\] \{ visibility: hidden; \}/);
  });

  it("the button has no second :focus-visible rule for the button (the shared link ring covers it)", () => {
    expect(css).not.toMatch(/\.celebration-cta:focus-visible/);
    expect(css).toMatch(/\.celebration a:focus-visible/);
  });

  it("pressing with a mouse wins over hovering: :hover:active keeps scale(.98), inside the same hover and motion media query", () => {
    expect(css).toMatch(/@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{[^@]*\.celebration-cta:hover:active \{ transform: scale\(\.98\); \}/);
  });
});

describe("PL-134-R2-M1 · the app's entry (`./model`) carries no renderer and no CSS parser", () => {
  it("none of its modules, followed through their imports, reaches the renderer, the sections or postcss", async () => {
    const { existsSync, readFileSync } = await import("node:fs");
    const { dirname, join, resolve } = await import("node:path");
    const seen = new Set<string>();
    const visit = (file: string): void => {
      if (seen.has(file)) return;
      seen.add(file);
      for (const match of readFileSync(file, "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
        const target = match[1] as string;
        if (!target.startsWith(".")) { expect(["postcss", "postcss-selector-parser", "postcss-value-parser"]).not.toContain(target); continue; }
        const base = resolve(dirname(file), target.replace(/\.js$/, ""));
        const found = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find(existsSync);
        if (found) visit(found);
      }
    };
    visit(join(process.cwd(), "src/model.ts"));
    const names = [...seen].map((file) => file.replace(`${process.cwd()}/src/`, ""));
    expect(names.filter((name) => /^(renderer|custom\/|sections\/|design\/render|theme-context|media\/components)/.test(name))).toEqual([]);
    expect(names.length).toBeGreaterThan(5);
  });
});
