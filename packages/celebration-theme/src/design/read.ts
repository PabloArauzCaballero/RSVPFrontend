/**
 * Reading a design document v2 at the edge of the renderers (F4 b). The public page must never break because a row is
 * malformed (the same rule as v1: unknown values degrade to the safe defaults), so `readDesign` checks the structure the
 * renderers rely on and answers `null` for anything else; the caller then falls back to the neutral template. The full
 * schema is the backend's job (`validate_theme`); this is the minimum a renderer needs not to throw.
 */
import type { LayoutSpec } from "../types.js";
import { familyById } from "./catalog.js";
import type { ColourScheme, DesignDocumentV2, DesignFont, DesignPalette, PaletteRole } from "./types.js";

const ROLES: readonly PaletteRole[] = ["canvas", "surface", "text", "muted", "accent", "accentFill", "onAccent", "line"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isPalette = (value: unknown): value is DesignPalette => isRecord(value) && ROLES.every((role) => typeof value[role] === "string" && HEX.test(value[role] as string));
const isFont = (value: unknown): value is DesignFont => isRecord(value) && typeof value["family"] === "string" && Array.isArray(value["weights"]) && value["weights"].every((weight) => Number.isInteger(weight));

/** True for a theme that declares itself a design document v2 (the integer 2, as the backend decides it). */
export function isDesignV2(value: unknown): boolean {
  return isRecord(value) && typeof value["schemaVersion"] === "number" && value["schemaVersion"] === 2;
}

/** The document when it has the structure the renderers read; null otherwise. Never throws. */
export function readDesign(value: unknown): DesignDocumentV2 | null {
  if (!isDesignV2(value) || !isRecord(value)) return null;
  const tokens = value["tokens"];
  if (!isRecord(tokens) || !Array.isArray(value["pages"]) || !Array.isArray(value["blocks"])) return null;
  const palettes = tokens["palettes"];
  const typography = tokens["typography"];
  const spacing = tokens["spacing"];
  const radii = tokens["radii"];
  if (!isRecord(palettes) || !isPalette(palettes["light"]) || !isPalette(palettes["dark"])) return null;
  if (!isRecord(typography) || !isFont(typography["heading"]) || !isFont(typography["body"]) || !isRecord(typography["scale"])) return null;
  if (!isRecord(spacing) || typeof spacing["section"] !== "number" || typeof spacing["contentMaxWidth"] !== "number" || typeof spacing["unit"] !== "number") return null;
  if (!isRecord(radii) || typeof radii["sm"] !== "number" || typeof radii["md"] !== "number" || typeof radii["lg"] !== "number") return null;
  const pagesOk = value["pages"].every((page) => isRecord(page) && typeof page["id"] === "string" && (page["kind"] === "cover" || page["kind"] === "section") && isRecord(page["canvases"]) && isRecord(page["canvases"]["mobile"]) && Array.isArray(page["canvases"]["mobile"]["elements"]));
  const blocksOk = value["blocks"].every((block) => isRecord(block) && typeof block["id"] === "string" && typeof block["type"] === "string" && isRecord(block["config"]));
  return pagesOk && blocksOk ? (value as unknown as DesignDocumentV2) : null;
}

export const designPalette = (document: DesignDocumentV2, scheme: ColourScheme): DesignPalette => document.tokens.palettes[scheme];

/** The CSS font stack of a catalogue family: its name first, then the generic fallback the catalogue declares. */
export function fontStack(font: DesignFont): string {
  const family = familyById(font.family);
  return family ? `'${family.family}', ${family.fallback}` : "Georgia, serif";
}

const GOOGLE_FONTS = "https://fonts.googleapis.com/css2";

/**
 * The Google Fonts stylesheet with exactly the weights the document lists (PL-M10), one request for heading, body and the
 * optional monogram. Roman styles only: an italic is not requested because not every catalogue family has one, and one
 * unsupported axis makes Google answer for none of them.
 */
export function designFontStylesheet(document: DesignDocumentV2): string | undefined {
  const { heading, body, monogram } = document.tokens.typography;
  const wanted = new Map<string, Set<number>>();
  for (const font of [heading, body, ...(monogram ? [monogram] : [])]) {
    const family = familyById(font.family);
    if (!family) continue;
    const weights = wanted.get(family.family) ?? new Set<number>();
    for (const weight of font.weights) if (family.weights.includes(weight)) weights.add(weight);
    wanted.set(family.family, weights);
  }
  if (!wanted.size) return undefined;
  const query = [...wanted].map(([family, weights]) => {
    const list = [...weights].sort((a, b) => a - b);
    const axis = list.length === 1 && list[0] === 400 ? "" : `:wght@${list.join(";")}`;
    return `family=${encodeURIComponent(family).replaceAll("%20", "+")}${axis}`;
  }).join("&");
  return `${GOOGLE_FONTS}?${query}&display=swap`;
}

/** The layout spec a v2 document asks for: the data of its cover variant, overridden by the tokens the document sets itself. */
export function designLayout(document: DesignDocumentV2, base: LayoutSpec): LayoutSpec {
  const { spacing, radii, typography, ornament } = document.tokens;
  return {
    ...base,
    headingScale: typography.scale.ratio,
    radius: radii.md,
    sectionGap: spacing.section,
    maxWidth: spacing.contentMaxWidth,
    divider: ornament === "flourish" ? "ornament" : ornament === "rule" ? "line" : "none"
  };
}
