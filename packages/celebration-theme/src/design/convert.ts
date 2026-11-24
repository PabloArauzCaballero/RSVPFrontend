/**
 * Deterministic v1 → v2 conversion (P20) and its inverse for converted documents. Mirror, line by line, of BE
 * templates_app/design/converter.py: both run the golden corpus carried by the contract. A pure function of the v1
 * template: no clock, no randomness, no I/O.
 */
import { familyById } from "./catalog.js";
import { DARK_CANVAS, DARK_MUTED, DARK_SURFACE, DARK_TEXT, darkAccent, inkOnAccent, mix, normalise } from "./colour.js";
import type { DesignBlock, DesignDocumentV2, DesignElement, DesignFont, DesignPage, DesignPalette, V1Template } from "./types.js";

/** layout → [headingScale, radius, sectionGap, maxWidth, ornament]. Mirrors layouts/index.ts. */
const LAYOUT_TOKENS: Readonly<Record<string, readonly [number, number, number, number, string]>> = {
  classic: [1.25, 0, 48, 720, "flourish"],
  minimal: [1.1, 4, 40, 720, "rule"],
  editorial: [1.4, 0, 64, 1080, "none"],
  festive: [1.3, 20, 32, 880, "none"],
  corporate: [1.05, 8, 32, 1080, "rule"]
};
/** v1 families the curated catalogue retired (PL-A5) and the family that stands in for them. */
const RETIRED: Readonly<Record<string, string>> = { inter: "geist" };
type Role = "heading" | "body";
const GENERIC_FALLBACK: Readonly<Record<Role, Readonly<Record<"serif" | "sans", string>>>> = {
  heading: { serif: "lora", sans: "source-sans-3" },
  body: { serif: "lora", sans: "source-sans-3" }
};
const WANTED_WEIGHTS: Readonly<Record<Role, readonly number[]>> = { heading: [500, 600], body: [400, 600] };
const LINE_AMOUNT = 0.16;
const FIRST_FAMILY = /^\s*['"]?([^'",]+)['"]?/;
const MOBILE_COLUMNS = 4;
const ROW_HEIGHT = 8;

const SECTION_BLOCKS: Readonly<Record<string, readonly [string, string, Readonly<Record<string, unknown>>]>> = {
  story: ["story", "story", {}],
  schedule: ["schedule", "schedule", { display: "list" }],
  venues: ["venues", "venues", { display: "cards", mapOnTap: false }],
  gallery: ["gallery", "gallery", { display: "grid" }],
  dressCode: ["dress-code", "dressCode", { swatches: [] }],
  faq: ["faq", "faq", {}],
  recommendations: ["recommendations", "recommendations", {}],
  rsvp: ["rsvp-cta", "rsvpCta", { style: "solid" }]
};

/** dressCode → dress-code (design ids are kebab-case). */
export const kebab = (name: string): string => name.replace(/(?<!^)(?=[A-Z])/g, "-").toLowerCase();

/** Catalogue family id of the first family of a v1 CSS font stack. */
export function familyFor(stack: string, role: Role): string {
  const first = (FIRST_FAMILY.exec(stack)?.[1] ?? "").trim();
  const slug = first.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const resolved = RETIRED[slug] ?? slug;
  if (familyById(resolved)) return resolved;
  const kind = /(^|[\s,])serif\s*$/i.test(stack.trim()) && !stack.toLowerCase().includes("sans-serif") ? "serif" : "sans";
  return GENERIC_FALLBACK[role][kind];
}

/** For each wanted weight, the nearest available one (the lighter on a tie), without repeats, ascending. */
export function pickWeights(available: readonly number[], wanted: readonly number[]): number[] {
  const sorted = [...available].sort((a, b) => a - b);
  const chosen = new Set<number>();
  for (const target of wanted) {
    let best = sorted[0] as number;
    for (const weight of sorted) if (Math.abs(weight - target) < Math.abs(best - target)) best = weight;
    chosen.add(best);
  }
  return [...chosen].sort((a, b) => a - b);
}

function font(stack: string, role: Role): DesignFont {
  const family = familyFor(stack, role);
  return { family, weights: pickWeights(familyById(family)?.weights ?? [], WANTED_WEIGHTS[role]) };
}

function palette(canvas: string, surface: string, text: string, muted: string, accent: string, fill: string): DesignPalette {
  return { canvas, surface, text, muted, accent, accentFill: fill, onAccent: inkOnAccent(surface, canvas, text, fill), line: mix(canvas, text, LINE_AMOUNT) };
}

const element = (blockId: string): DesignElement => ({ id: `el-${blockId}`, block: blockId, x: 0, y: 0, w: MOBILE_COLUMNS, h: 1, visible: true });

const page = (id: string, kind: Pick<DesignPage, "kind"> & { section?: string }, style: string, blockId: string): DesignPage => ({
  id, ...kind, style, canvases: { mobile: { mode: "flow", columns: MOBILE_COLUMNS, rowHeight: ROW_HEIGHT, elements: [element(blockId)] } }
});

/** The v2 document of a v1 template. Throws for an unknown layout or section: callers validate first. */
export function convertV1ToV2(theme: V1Template["theme"], layout: string, sectionOrder: readonly string[]): DesignDocumentV2 {
  const tokens = LAYOUT_TOKENS[layout];
  if (!tokens) throw new Error(`Unknown layout ${layout}`);
  const [scale, radius, gap, width, ornament] = tokens;
  const colours = Object.fromEntries(Object.entries(theme.palette).map(([key, value]) => [key, normalise(value)])) as Record<keyof V1Template["theme"]["palette"], string>;
  const style = theme.sectionStyle;
  const light = palette(colours.canvas, colours.surface, colours.text, colours.muted, colours.accent, colours.accent);
  // Phase 0 (theme.ts): in dark the accent used as text is lightened; the fill keeps the template's own accent.
  const dark = palette(DARK_CANVAS, DARK_SURFACE, DARK_TEXT, DARK_MUTED, darkAccent(colours.accent), colours.accent);

  const order = [...sectionOrder];
  if (!order.includes("gifts")) {
    const rsvp = order.indexOf("rsvp");
    order.splice(rsvp === -1 ? order.length : rsvp, 0, "gifts");
  }
  const blocks: DesignBlock[] = [{ id: "cover", type: "cover", config: { variant: layout, envelope: false } }];
  const pages: DesignPage[] = [page("page-cover", { kind: "cover" }, style, "cover")];
  for (const section of order) {
    let blockId: string;
    if (section === "gifts") {
      blockId = "gifts-cta";
      blocks.push({ id: blockId, type: "giftsCta", required: true, config: { style: "solid" } });
    } else {
      const entry = SECTION_BLOCKS[section];
      if (!entry) throw new Error(`Unknown section ${section}`);
      blockId = entry[0];
      blocks.push({ id: blockId, type: entry[1], config: entry[2] });
    }
    pages.push(page(`page-${kebab(section)}`, { kind: "section", section }, style, blockId));
  }
  return {
    schemaVersion: 2,
    tokens: {
      palettes: { light, dark },
      typography: { heading: font(theme.typography.heading, "heading"), body: font(theme.typography.body, "body"), scale: { base: 16, ratio: scale } },
      spacing: { unit: 8, section: gap, contentMaxWidth: width },
      radii: { sm: Math.floor(radius / 2), md: radius, lg: Math.min(radius * 2, 64) },
      ornament,
      illustrationSet: "none"
    },
    pages,
    blocks,
    custom: { html: "", css: "" },
    origin: { schemaVersion: 1, layout, sectionOrder: [...sectionOrder], typography: { heading: theme.typography.heading, body: theme.typography.body } }
  };
}

/**
 * The v1 template parts of a document produced by convertV1ToV2 (it needs `origin`). Proves the conversion lost nothing:
 * palette (normalised to #RRGGBB), font stacks, section style, layout and section order come back exactly.
 */
export function convertV2ToV1(document: DesignDocumentV2): V1Template {
  const origin = document.origin;
  const first = document.pages[0];
  if (!origin || !first) throw new Error("Only documents converted from v1 carry origin");
  const light = document.tokens.palettes.light;
  return {
    theme: {
      palette: { canvas: light.canvas, surface: light.surface, text: light.text, accent: light.accent, muted: light.muted },
      typography: { ...origin.typography },
      sectionStyle: first.style
    },
    layout: origin.layout,
    sectionOrder: [...origin.sectionOrder]
  };
}
