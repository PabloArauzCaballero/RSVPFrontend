import { describe, expect, it } from "vitest";
import { compatibleTemplates, fontStylesheet, LAYOUT_IDS, LAYOUTS, paletteFor, themeFromTemplate, themeVariables, FALLBACK_TEMPLATE } from "./index.js";
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

  it("REQ-F09-04 · the palette becomes CSS variables, with a dark variant keeping the accent", () => {
    const theme = themeFromTemplate(TEMPLATES[0], WEDDING_SECTIONS);
    expect(themeVariables(theme)["--celebration-canvas"]).toBe("#FFFBF4");
    expect(themeVariables(theme)["--celebration-max-width"]).toBe("720px");
    const dark = paletteFor(theme, "dark");
    expect(dark.accent).toBe("#865E36");
    expect(dark.canvas).not.toBe(theme.palette.canvas);
  });

  it("loads only the web fonts the theme names", () => {
    expect(fontStylesheet(themeFromTemplate(TEMPLATES[0], []))).toBe("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&display=swap");
    expect(fontStylesheet(themeFromTemplate(FALLBACK_TEMPLATE, []))).toBeUndefined();
  });
});
