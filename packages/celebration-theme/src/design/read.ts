/**
 * Reading a design document v2 at the edge of the renderers (F4 b). The public page must never break because a row is
 * malformed (the same rule as v1: unknown values degrade to the safe defaults), so `readDesign` checks the structure the
 * renderers rely on and answers `null` for anything else; the caller then falls back to the neutral template. The full
 * schema is the backend's job (`validate_theme`); this is the minimum a renderer needs not to throw.
 */
import type { LayoutSpec } from "../types.js";
import { familyById } from "./catalog.js";
import type { ColourScheme, DesignBox, DesignCanvas, DesignDocumentV2, DesignElement, DesignFont, DesignLink, DesignPage, DesignPalette, DesignTypographyOverride, PaletteRole } from "./types.js";

const ROLES: readonly PaletteRole[] = ["canvas", "surface", "text", "muted", "accent", "accentFill", "onAccent", "line"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isPalette = (value: unknown): value is DesignPalette => isRecord(value) && ROLES.every((role) => typeof value[role] === "string" && HEX.test(value[role] as string));
const isFont = (value: unknown): value is DesignFont => isRecord(value) && typeof value["family"] === "string" && Array.isArray(value["weights"]) && value["weights"].every((weight) => Number.isInteger(weight));

/** True for a theme that declares itself a design document v2 (the integer 2, as the backend decides it). */
export function isDesignV2(value: unknown): boolean {
  return isRecord(value) && typeof value["schemaVersion"] === "number" && value["schemaVersion"] === 2;
}

const num = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const int = (value: unknown, min: number, max: number): value is number => num(value, min, max) && Number.isInteger(value);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T => typeof value === "string" && (allowed as readonly string[]).includes(value);
const BOX_SIDES = ["top", "right", "bottom", "left"] as const;

/** A box of four sides in 0..256 px, or nothing: a malformed one is dropped, never half read. */
function box(value: unknown): DesignBox | undefined {
  if (!isRecord(value) || !BOX_SIDES.every((side) => int(value[side], 0, 256))) return undefined;
  return { top: value["top"] as number, right: value["right"] as number, bottom: value["bottom"] as number, left: value["left"] as number };
}

function typographyOf(value: unknown): DesignTypographyOverride | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string | number> = {};
  if (oneOf(value["role"], ["heading", "body", "monogram"] as const)) out["role"] = value["role"];
  if (int(value["size"], 13, 160)) out["size"] = value["size"];
  if (int(value["weight"], 100, 900)) out["weight"] = value["weight"];
  if (oneOf(value["align"], ["start", "center", "end", "justify"] as const)) out["align"] = value["align"];
  if (num(value["lineHeight"], 1, 2.5)) out["lineHeight"] = value["lineHeight"];
  if (num(value["letterSpacing"], -0.05, 0.5)) out["letterSpacing"] = value["letterSpacing"];
  if (oneOf(value["transform"], ["none", "uppercase", "lowercase", "capitalize"] as const)) out["transform"] = value["transform"];
  if (oneOf(value["colour"], ROLES)) out["colour"] = value["colour"];
  return out as DesignTypographyOverride;
}

function linkOf(value: unknown): DesignLink | undefined {
  if (!isRecord(value)) return undefined;
  switch (value["kind"]) {
    case "gifts": case "rsvp": return { kind: value["kind"] };
    case "section": return typeof value["section"] === "string" ? { kind: "section", section: value["section"] } : undefined;
    case "listing": return typeof value["listingId"] === "string" ? { kind: "listing", listingId: value["listingId"] } : undefined;
    case "url": return typeof value["href"] === "string" && /^https:\/\/[^\s]+$/.test(value["href"]) ? { kind: "url", href: value["href"] } : undefined;
    default: return undefined;
  }
}

/**
 * An element as the renderer may trust it: position and size are finite integers in the contract's range or the element is
 * dropped (a `null` in the list, a string where a number goes); every optional style field is kept only when it has the contract's
 * type and range, so nothing that is not a number or one of the contract's enums can reach a CSS value (defence in depth: the
 * backend validates the same ranges before a document is stored).
 */
function elementOf(value: unknown): DesignElement | null {
  if (!isRecord(value) || typeof value["id"] !== "string" || typeof value["block"] !== "string" || value["visible"] !== true && value["visible"] !== false) return null;
  if (!int(value["x"], 0, 999) || !int(value["y"], 0, 999) || !int(value["w"], 1, 999) || !int(value["h"], 1, 999)) return null;
  const border = value["border"];
  const animation = value["animation"];
  const background = value["background"];
  const padding = box(value["padding"]);
  const margin = box(value["margin"]);
  const typography = typographyOf(value["typography"]);
  const link = linkOf(value["link"]);
  return {
    id: value["id"], block: value["block"], x: value["x"], y: value["y"], w: value["w"], h: value["h"], visible: value["visible"],
    ...(num(value["rotation"], -180, 180) ? { rotation: value["rotation"] } : {}),
    ...(int(value["z"], -100, 100) ? { z: value["z"] } : {}),
    ...(padding ? { padding } : {}), ...(margin ? { margin } : {}),
    ...(int(value["radius"], 0, 999) ? { radius: value["radius"] } : {}),
    ...(num(value["opacity"], 0, 1) ? { opacity: value["opacity"] } : {}),
    ...(isRecord(border) && int(border["width"], 0, 16) && oneOf(border["style"], ["solid", "dashed", "dotted"] as const) && oneOf(border["colour"], ROLES) ? { border: { width: border["width"], style: border["style"], colour: border["colour"] } } : {}),
    ...(isRecord(background) && background["kind"] === "colour" && oneOf(background["role"], ROLES) ? { background: { kind: "colour" as const, role: background["role"] } } : {}),
    ...(typography ? { typography } : {}),
    ...(isRecord(animation) && oneOf(animation["entrance"], ["none", "fade", "rise", "scale", "draw", "envelope"] as const)
      ? { animation: { entrance: animation["entrance"], ...(int(animation["delayMs"], 0, 5000) ? { delayMs: animation["delayMs"] } : {}), ...(int(animation["durationMs"], 100, 3000) ? { durationMs: animation["durationMs"] } : {}) } } : {}),
    ...(link ? { link } : {})
  };
}

function canvasOf(value: unknown): DesignCanvas | null {
  if (!isRecord(value) || !oneOf(value["mode"], ["flow", "free"] as const) || !int(value["columns"], 2, 24) || !int(value["rowHeight"], 4, 64) || !Array.isArray(value["elements"])) return null;
  const elements = value["elements"].flatMap((item) => { const element = elementOf(item); return element ? [element] : []; });
  return { mode: value["mode"], columns: value["columns"], rowHeight: value["rowHeight"], elements };
}

function pageOf(value: unknown): DesignPage | null {
  if (!isRecord(value) || typeof value["id"] !== "string" || !oneOf(value["kind"], ["cover", "section"] as const) || !isRecord(value["canvases"])) return null;
  const mobile = canvasOf(value["canvases"]["mobile"]);
  if (!mobile) return null;
  const desktop = value["canvases"]["desktop"] === undefined ? null : canvasOf(value["canvases"]["desktop"]);
  const background = value["background"];
  return {
    id: value["id"], kind: value["kind"], ...(typeof value["section"] === "string" ? { section: value["section"] } : {}),
    style: oneOf(value["style"], ["plain", "cards", "bands"] as const) ? value["style"] : "plain",
    ...(isRecord(background) && background["kind"] === "colour" && oneOf(background["role"], ROLES) ? { background: { kind: "colour" as const, role: background["role"] } } : isRecord(background) && background["kind"] === "illustration" && typeof background["illustrationId"] === "string" ? { background: { kind: "illustration" as const, illustrationId: background["illustrationId"] } } : {}),
    canvases: { mobile, ...(desktop ? { desktop } : {}) }
  };
}

/** The document when it has the structure and ranges the renderers read; null otherwise. Never throws. */
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
  if (!num(typography["scale"]["base"], 14, 20) || !num(typography["scale"]["ratio"], 1, 1.6)) return null;
  if (!isRecord(spacing) || !int(spacing["section"], 0, 256) || !int(spacing["contentMaxWidth"], 320, 1600) || !(spacing["unit"] === 4 || spacing["unit"] === 8)) return null;
  if (!isRecord(radii) || !int(radii["sm"], 0, 64) || !int(radii["md"], 0, 64) || !int(radii["lg"], 0, 64)) return null;
  const pages = value["pages"].map(pageOf);
  if (pages.some((page) => page === null)) return null;
  const blocksOk = value["blocks"].every((block) => isRecord(block) && typeof block["id"] === "string" && typeof block["type"] === "string" && isRecord(block["config"]));
  if (!blocksOk) return null;
  return { ...(value as unknown as DesignDocumentV2), pages: pages as DesignPage[] };
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
