import { describe, expect, it } from "vitest";
import { SEED_TEMPLATES } from "../../test/seed-palettes.js";
import { DARK_CANVAS, DARK_SURFACE, DARK_TEXT, darkAccent, darkPaletteOf } from "../../test/dark-palette.js";
import { contrastRatio, luminance } from "./contrast.js";
import { ART_FLOORS, artPalette, artVariables } from "./palette.js";
import { ART_ROLES } from "./types.js";

/**
 * Every seeded template, in its light palette and in the dark one phase 0 composes, resolves the roles of the art above the floors:
 * the disc exists on the page, the contact shadow is never the page colour (L16) nor the disc, and the secondary pieces and the
 * accent are graphical objects at 3:1 (WCAG 1.4.11) against the page, a card and the disc.
 */
const CASES = SEED_TEMPLATES.flatMap((template) => (["light", "dark"] as const).map((scheme) => ({
  name: `${template.name} · ${scheme}`, template, scheme, palette: scheme === "dark" ? darkPaletteOf(template.palette) : template.palette
})));

describe("seed palettes", () => {
  it("covers the 16 seeded templates", () => {
    expect(SEED_TEMPLATES).toHaveLength(16);
    expect(new Set(SEED_TEMPLATES.map((item) => item.key)).size).toBe(16);
  });

  it("pins the dark composition of phase 0: the accent reads as text (4.5:1) on both dark grounds", () => {
    for (const template of SEED_TEMPLATES) {
      const accent = darkAccent(template.palette.accent);
      expect(contrastRatio(accent, DARK_CANVAS), template.name).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(accent, DARK_SURFACE), template.name).toBeGreaterThanOrEqual(4.5);
    }
    expect(darkPaletteOf(SEED_TEMPLATES[0]!.palette).text).toBe(DARK_TEXT);
  });
});

describe.each(CASES)("art palette · $name", ({ palette }) => {
  const grounds = ["canvas", "surface"] as const;

  it.each(grounds)("disc, shadow, secondary and accent hold their contrast floors on the %s", (ground) => {
    const colors = artPalette(palette, ground);
    const page = [palette.canvas, palette.surface];
    for (const background of page) {
      expect(contrastRatio(colors.disc, background), "disc").toBeGreaterThanOrEqual(ART_FLOORS.discOnCanvas);
      expect(contrastRatio(colors.shadow, background), "shadow").toBeGreaterThanOrEqual(ART_FLOORS.shadowOnCanvas);
      expect(contrastRatio(colors.secondary, background), "secondary").toBeGreaterThanOrEqual(ART_FLOORS.secondaryOnCanvas);
      expect(contrastRatio(colors.accent, background), "accent").toBeGreaterThanOrEqual(ART_FLOORS.accentOnCanvas);
    }
    expect(contrastRatio(colors.shadow, colors.disc), "shadow on disc").toBeGreaterThanOrEqual(ART_FLOORS.shadowOnDisc);
    expect(contrastRatio(colors.secondary, colors.disc), "secondary on disc").toBeGreaterThanOrEqual(ART_FLOORS.secondaryOnDisc);
    expect(contrastRatio(colors.accent, colors.disc), "accent on disc").toBeGreaterThanOrEqual(ART_FLOORS.accentOnDisc);
  });

  it("L16: the shadow is never the page colour or the disc, in light and in dark", () => {
    const colors = artPalette(palette);
    expect(colors.shadow.toLowerCase()).not.toBe(palette.canvas.toLowerCase());
    expect(colors.shadow.toLowerCase()).not.toBe(palette.surface.toLowerCase());
    expect(colors.shadow.toLowerCase()).not.toBe(colors.disc.toLowerCase());
    expect(contrastRatio(colors.shadow, palette.canvas)).toBeGreaterThan(1.19);
  });

  it("the shadow is darker than the disc (a contact shadow), and the disc is a whisper next to the page", () => {
    const colors = artPalette(palette);
    expect(luminance(colors.shadow)).toBeLessThan(luminance(colors.disc));
    expect(contrastRatio(colors.disc, palette.canvas)).toBeLessThan(2.2);
  });

  it("keeps the template's own ink and cuts details out in the ground it sits on", () => {
    expect(artPalette(palette, "canvas")).toMatchObject({ ink: palette.text, cutout: palette.canvas });
    expect(artPalette(palette, "surface").cutout).toBe(palette.surface);
  });

  it("keeps the template accent whenever it already reads on the grounds and the disc", () => {
    const colors = artPalette(palette);
    const reads = [palette.canvas, palette.surface, colors.disc].every((background) => contrastRatio(palette.accent, background) >= ART_FLOORS.accentOnCanvas);
    if (reads) expect(colors.accent).toBe(palette.accent);
    else expect(colors.accent).not.toBe(palette.accent);
  });
});

describe("artVariables", () => {
  it("names one CSS variable per role", () => {
    const variables = artVariables(artPalette(SEED_TEMPLATES[0]!.palette));
    expect(Object.keys(variables).sort()).toEqual(ART_ROLES.map((role) => `--celebration-art-${role}`).sort());
  });
});
