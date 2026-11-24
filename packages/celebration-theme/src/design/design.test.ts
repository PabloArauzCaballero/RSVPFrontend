import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FONT_FAMILIES, FONT_PRECONNECT } from "./catalog.js";
import { contrastRatio, darkAccent, inkOnAccent, mix, nearestPassing, normalise, TEXT_CONTRAST } from "./colour.js";
import { convertV1ToV2, convertV2ToV1, DesignConversionError, familyFor, kebab, pickWeights } from "./convert.js";
import type { DesignDocumentV2, DesignWarning, V1Template } from "./types.js";
import { contrastWarnings } from "./warnings.js";

interface Golden { readonly key: string; readonly v1: V1Template; readonly v2: DesignDocumentV2; readonly warnings: readonly DesignWarning[] }
interface WarningGolden { readonly key: string; readonly palettes: DesignDocumentV2["tokens"]["palettes"]; readonly warnings: readonly DesignWarning[] }
interface Spec {
  readonly components: { readonly schemas: { readonly DesignDocumentV2: Record<string, unknown>; readonly FontFamilyId: Record<string, unknown> } };
}

// The spec is the copy vendored byte for byte from the backend commit pinned in backend.lock.json (never edited here).
const specPath = join(dirname(fileURLToPath(import.meta.url)), "../../../contracts/specs/template-media.openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8")) as Spec;
const goldens = spec.components.schemas.DesignDocumentV2["x-rsvp-v1-goldens"] as readonly Golden[];
const warningGoldens = spec.components.schemas.DesignDocumentV2["x-rsvp-warning-goldens"] as readonly WarningGolden[];
const catalogue = spec.components.schemas.FontFamilyId["x-rsvp-font-catalog"] as { readonly families: readonly Record<string, unknown>[]; readonly preconnect: readonly Record<string, unknown>[] };

describe("design colour maths: same vectors as BE ColourTests", () => {
  it("darkAccent and inkOnAccent give the values of theme.ts (phase 0)", () => {
    const vectors: readonly (readonly [string, string, string, string])[] = [
      ["#7A5230", "#A2866E", "#ECE6EE", "#FFFFFF"], ["#800020", "#B97384", "#ECE6EE", "#FFFFFF"], ["#3F4A2F", "#828978", "#ECE6EE", "#FFFFFF"],
      ["#2F5D50", "#6D8E85", "#ECE6EE", "#FFFFFF"], ["#FF8A3D", "#FF8A3D", "#1E1C22", "#2B2622"]
    ];
    for (const [accent, dark, onDark, onLight] of vectors) {
      expect(darkAccent(accent)).toBe(dark);
      expect(inkOnAccent("#1E1C22", "#141218", "#ECE6EE", accent)).toBe(onDark);
      expect(inkOnAccent("#FFFFFF", "#FBF7F0", "#2B2622", accent)).toBe(onLight);
    }
    expect(contrastRatio("#7A5230", "#FFFFFF")).toBeCloseTo(6.82458, 5);
  });

  it("WCAG references, normalise and mix", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 10);
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    expect(normalise("#abc")).toBe("#AABBCC");
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("the nearest passing tone always passes", () => {
    for (const foreground of ["#E8E0D0", "#808080", "#7A5230", "#00FF00", "#FFFFFF"])
      for (const background of ["#FFFFFF", "#000000", "#808080", "#141218", "#FBF7F0"])
        expect(contrastRatio(nearestPassing(foreground, background), background)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });
});

describe("v1 → v2 golden corpus carried by the contract", () => {
  it("covers the sixteen seeded templates", () => {
    expect(goldens).toHaveLength(16);
    expect(new Set(goldens.map((golden) => golden.key)).size).toBe(16);
  });

  it("convertV1ToV2 reproduces every golden exactly", () => {
    for (const golden of goldens) expect(convertV1ToV2(golden.v1.theme, golden.v1.layout, golden.v1.sectionOrder), golden.key).toEqual(golden.v2);
  });

  it("contrastWarnings reproduces every golden's warnings", () => {
    for (const golden of goldens) expect(contrastWarnings(golden.v2), golden.key).toEqual(golden.warnings);
  });

  it("nothing is lost converting back", () => {
    for (const golden of goldens) {
      const back = convertV2ToV1(golden.v2);
      expect(back.layout).toBe(golden.v1.layout);
      expect(back.sectionOrder).toEqual(golden.v1.sectionOrder);
      expect(back.theme.typography).toEqual(golden.v1.theme.typography);
      expect(back.theme.sectionStyle).toBe(golden.v1.theme.sectionStyle);
      expect(back.theme.palette).toEqual(Object.fromEntries(Object.entries(golden.v1.theme.palette).map(([key, value]) => [key, normalise(value)])));
    }
  });

  it("is deterministic: the same input gives the same bytes", () => {
    for (const golden of goldens) {
      const first = JSON.stringify(convertV1ToV2(golden.v1.theme, golden.v1.layout, golden.v1.sectionOrder));
      const second = JSON.stringify(convertV1ToV2(structuredClone(golden.v1.theme), golden.v1.layout, [...golden.v1.sectionOrder]));
      expect(second).toBe(first);
    }
  });

  it("the gifts button is a 44 px tap target in every golden (P22)", () => {
    for (const golden of goldens) {
      const gifts = golden.v2.pages.find((entry) => entry.section === "gifts")?.canvases.mobile;
      expect(gifts?.elements[0]?.h, golden.key).toBe(6);
      expect((gifts?.elements[0]?.h ?? 0) * (gifts?.rowHeight ?? 0), golden.key).toBeGreaterThanOrEqual(44);
    }
  });

  it("every converted document has exactly one gifts block and reads as AA in dark", () => {
    for (const golden of goldens) {
      expect(golden.v2.blocks.filter((block) => block.type === "giftsCta"), golden.key).toHaveLength(1);
      expect(golden.v2.pages.map((entry) => entry.section)).toContain("gifts");
      const dark = golden.v2.tokens.palettes.dark;
      expect(contrastRatio(dark.accent, dark.canvas)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      expect(contrastRatio(dark.accent, dark.surface)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      expect(contrastRatio(dark.onAccent, dark.accentFill)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      expect(golden.warnings).toEqual([]);
    }
  });

  it("templates without a gifts section get one right before rsvp, and origin keeps the v1 order", () => {
    const corporate = goldens.find((golden) => golden.key === "corporativo");
    expect(corporate?.v1.sectionOrder).not.toContain("gifts");
    expect(corporate?.v2.pages.slice(-2).map((entry) => entry.section)).toEqual(["gifts", "rsvp"]);
    expect(corporate?.v2.origin?.sectionOrder).not.toContain("gifts");
  });
});

describe("font catalogue mirror and family mapping", () => {
  it("FONT_FAMILIES is exactly the catalogue of the contract", () => {
    expect(FONT_FAMILIES.map((family) => ({ ...family, weights: [...family.weights] }))).toEqual(catalogue.families);
  });

  it("maps retired and unknown families like the backend", () => {
    expect(familyFor("'Inter', Arial, sans-serif", "body")).toBe("geist");
    expect(familyFor("Georgia, serif", "heading")).toBe("lora");
    expect(familyFor("Arial, sans-serif", "body")).toBe("source-sans-3");
    expect(familyFor("'Cormorant Garamond', Georgia, serif", "heading")).toBe("cormorant-garamond");
    expect(familyFor("'Fredoka', 'Trebuchet MS', sans-serif", "heading")).toBe("fredoka");
  });

  it("picks the nearest available weights and kebab-cases ids", () => {
    expect(pickWeights([400], [500, 600])).toEqual([400]);
    expect(pickWeights([300, 400, 500, 600, 700], [500, 600])).toEqual([500, 600]);
    expect(pickWeights([400, 700], [400, 600])).toEqual([400, 700]);
    expect(kebab("dressCode")).toBe("dress-code");
    expect(kebab("story")).toBe("story");
  });

  it("rejects what it cannot convert instead of guessing", () => {
    const golden = goldens[0] as Golden;
    expect(() => convertV1ToV2(golden.v1.theme, "brutalist", [])).toThrow("Unknown layout");
    expect(() => convertV1ToV2(golden.v1.theme, "classic", ["music"])).toThrow("Unknown section");
    expect(() => convertV2ToV1({ ...golden.v2, origin: undefined })).toThrow("origin");
  });

  it("reads the lookup tables by own key only: prototype names are refused like the backend does (N7)", () => {
    const golden = goldens[0] as Golden;
    for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", ""]) {
      expect(() => convertV1ToV2(golden.v1.theme, name, golden.v1.sectionOrder), `layout ${name}`).toThrow(DesignConversionError);
      expect(() => convertV1ToV2(golden.v1.theme, golden.v1.layout, [name]), `section ${name}`).toThrow(DesignConversionError);
    }
    const layout = (() => { try { convertV1ToV2(golden.v1.theme, "constructor", []); } catch (error) { return error as DesignConversionError; } return undefined; })();
    expect(layout?.code).toBe("INVALID_LAYOUT");
    const section = (() => { try { convertV1ToV2(golden.v1.theme, "classic", ["toString"]); } catch (error) { return error as DesignConversionError; } return undefined; })();
    expect(section?.code).toBe("INVALID_SECTIONS");
    // A font stack that names a prototype key falls back to the catalogue instead of reading Object.prototype.
    for (const stack of ["constructor, serif", "'__proto__', sans-serif", "toString", "hasOwnProperty, Georgia, serif"]) expect(["lora", "source-sans-3"]).toContain(familyFor(stack, "body"));
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("the preconnect origins are the contract's (PL-M10)", () => {
    expect(FONT_PRECONNECT.map((origin) => ({ ...origin }))).toEqual(catalogue.preconnect);
  });
});

describe("synthetic low-contrast goldens carried by the contract (R6)", () => {
  it("there are five and contrastWarnings reproduces every one, ratios and suggestions included", () => {
    expect(warningGoldens).toHaveLength(5);
    for (const golden of warningGoldens) {
      expect(golden.warnings.length, golden.key).toBeGreaterThan(0);
      expect(contrastWarnings({ tokens: { palettes: golden.palettes } as DesignDocumentV2["tokens"] }), golden.key).toEqual(golden.warnings);
    }
  });

  it("they cover light, dark, the 4.5:1 boundary and a palette no tone can fix", () => {
    const byKey = new Map(warningGoldens.map((golden) => [golden.key, golden]));
    expect(new Set(byKey.get("claro-pasteles")?.warnings.map((warning) => warning.scheme))).toEqual(new Set(["light"]));
    expect(new Set(byKey.get("oscuro-apagado")?.warnings.map((warning) => warning.scheme))).toEqual(new Set(["dark"]));
    expect(byKey.get("limite-4-5")?.warnings.map((warning) => warning.ratio)).toEqual([4.48, 4.48]);
    expect(new Set(byKey.get("ambos-bajos")?.warnings.map((warning) => warning.scheme))).toEqual(new Set(["light", "dark"]));
    expect(byKey.get("sin-salida-gris")?.warnings.some((warning) => warning.suggestion === "#131313")).toBe(true);
  });
});

describe("contrast warnings (P19)", () => {
  it("a low-contrast pair is a warning with a passing suggestion, never an error", () => {
    const golden = goldens[0] as Golden;
    const document: DesignDocumentV2 = {
      ...golden.v2,
      tokens: { ...golden.v2.tokens, palettes: { ...golden.v2.tokens.palettes, light: { ...golden.v2.tokens.palettes.light, accent: "#E8E0D0" } } }
    };
    const warning = contrastWarnings(document).find((item) => item.scheme === "light" && item.foreground === "accent" && item.background === "canvas");
    expect(warning?.ratio).toBeLessThan(TEXT_CONTRAST);
    expect(contrastRatio(warning?.suggestion ?? "", document.tokens.palettes.light.canvas)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });
});
