import { LAYOUTS } from "./layouts/index.js";
import { LAYOUT_IDS, SECTION_IDS, SECTION_STYLES, type CelebrationTheme, type LayoutId, type LayoutSpec, type Palette, type SectionId, type SectionStyle, type TemplateDocument } from "./types.js";

/** Neutral theme used while a celebration has no template yet. */
export const FALLBACK_TEMPLATE: TemplateDocument = {
  id: "fallback",
  name: "RSVP",
  eventTypeTags: [],
  layout: "minimal",
  theme: {
    palette: { canvas: "#FFFFFF", surface: "#F7F7F5", text: "#1C1C1A", accent: "#2F5D50", muted: "#5F5F5A" },
    typography: { heading: "Georgia, serif", body: "Arial, sans-serif" },
    sectionStyle: "plain"
  },
  sectionOrder: [...SECTION_IDS]
};

const isLayout = (value: string): value is LayoutId => (LAYOUT_IDS as readonly string[]).includes(value);
const isSection = (value: string): value is SectionId => (SECTION_IDS as readonly string[]).includes(value);
const isStyle = (value: string): value is SectionStyle => (SECTION_STYLES as readonly string[]).includes(value);

/**
 * Reconciles a template with the event type: the template decides order and look; the type
 * decides which sections exist. Unknown values from the API degrade to safe defaults instead
 * of breaking the public page.
 */
export function themeFromTemplate(template: TemplateDocument | null | undefined, enabledSections: readonly string[]): CelebrationTheme {
  const source = template ?? FALLBACK_TEMPLATE;
  const enabled = enabledSections.filter(isSection);
  const order = source.sectionOrder.filter(isSection);
  return {
    id: source.id,
    name: source.name,
    layout: isLayout(source.layout) ? source.layout : FALLBACK_TEMPLATE.layout,
    palette: { ...FALLBACK_TEMPLATE.theme.palette, ...source.theme.palette },
    typography: { ...FALLBACK_TEMPLATE.theme.typography, ...source.theme.typography },
    sectionStyle: isStyle(source.theme.sectionStyle) ? source.theme.sectionStyle : FALLBACK_TEMPLATE.theme.sectionStyle,
    sections: order.filter((section) => enabled.includes(section)),
    hiddenSections: enabled.filter((section) => !order.includes(section))
  };
}

export function layoutOf(theme: CelebrationTheme): LayoutSpec {
  return LAYOUTS[theme.layout];
}

/** Only templates sharing a tag with the event type are offered (REQ-F09-06). */
export function compatibleTemplates<TTemplate extends Pick<TemplateDocument, "eventTypeTags">>(templates: readonly TTemplate[], compatibleTags: readonly string[]): TTemplate[] {
  return templates.filter((template) => template.eventTypeTags.some((tag) => compatibleTags.includes(tag)));
}

export type CssVariables = Readonly<Record<`--${string}`, string>>;
export type ColorScheme = "light" | "dark";

const DARK_CANVAS = "#141218";
const DARK_SURFACE = "#1E1C22";
const DARK_TEXT = "#ECE6EE";
const DARK_MUTED = "#B9B1BF";

/** WCAG 2.x minimum for body text; headings, links, times and the reply button use the accent as text. */
export const TEXT_CONTRAST = 4.5;
/** WCAG 1.4.11 minimum for the boundary of a control (the reply button against the page behind it). */
export const COMPONENT_CONTRAST = 3;
/**
 * Share of the accent mixed into the page behind accent text in `styles.css`: the radial wash of the cover
 * (`.celebration-hero`) and the RSVP section (`section[data-section="rsvp"]`, line 128). A test reads the
 * stylesheet and fails if either percentage drifts from these constants.
 */
export const COVER_WASH = 0.13;
export const RSVP_WASH = 0.09;
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const HEX = /^#?([0-9a-f]{6})$/i;
const CHANNEL = 255;
const LIGHTEN_STEPS = 100;

function channels(hex: string): readonly [number, number, number] | null {
  const match = HEX.exec(hex.trim());
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & CHANNEL, (value >> 8) & CHANNEL, value & CHANNEL];
}

function toHex([red, green, blue]: readonly [number, number, number]): string {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function luminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0;
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / CHANNEL;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two #RRGGBB colours (1 to 21). */
export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Mixes `hex` towards white by `amount` (0 to 1), keeping its hue. */
function towardWhite(hex: string, amount: number): string {
  const rgb = channels(hex);
  return rgb ? toHex(rgb.map((channel) => channel + (CHANNEL - channel) * amount) as [number, number, number]) : hex;
}

/** `top` over `base` at `share` opacity, in sRGB like CSS `color-mix(in srgb, top share, base)`. */
function over(top: string, base: string, share: number): string {
  const [topRgb, baseRgb] = [channels(top), channels(base)];
  return topRgb && baseRgb ? toHex(topRgb.map((channel, index) => channel * share + baseRgb[index]! * (1 - share)) as [number, number, number]) : base;
}

/**
 * The first step of lightening `colour` (towards white, same hue) that `passes`. Returns `undefined` when not even
 * white does, so the caller picks its own safe fallback.
 */
function lightenUntil(colour: string, passes: (candidate: string) => boolean): string | undefined {
  for (let step = 0; step <= LIGHTEN_STEPS; step += 1) {
    const candidate = towardWhite(colour, step / LIGHTEN_STEPS);
    if (passes(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Every dark background accent text can land on: the flat canvas and surface, and the two washes of the accent itself
 * that `styles.css` paints over them (13 % on the cover, 9 % on the RSVP block). The wash depends on the candidate, so
 * the list is computed per candidate.
 */
export function darkBackdrops(accent: string): readonly string[] {
  return [DARK_CANVAS, DARK_SURFACE, ...[COVER_WASH, RSVP_WASH].flatMap((share) => [over(accent, DARK_CANVAS, share), over(accent, DARK_SURFACE, share)])];
}

/**
 * The template's accent, lightened in small steps until it reads as text on every dark background, washes included.
 * Most seeded accents are deep (granate, oliva, azul) and fall to 2:1 on charcoal; the hue stays, so the template is
 * still recognisable.
 */
function darkAccent(accent: string): string {
  return lightenUntil(accent, (candidate) => darkBackdrops(candidate).every((background) => contrastRatio(candidate, background) >= TEXT_CONTRAST)) ?? DARK_TEXT;
}

/** Dark variant of any template, composed rather than inverted: neutral dark surfaces and the template's accent lightened to AA. */
export function paletteFor(theme: CelebrationTheme, scheme: ColorScheme): Palette {
  return scheme === "dark" ? { canvas: DARK_CANVAS, surface: DARK_SURFACE, text: DARK_TEXT, muted: DARK_MUTED, accent: darkAccent(theme.palette.accent) } : theme.palette;
}

/**
 * Ink for text set on an accent fill (the festive cover band, the reply button): the palette's own surface or text
 * when it reaches AA, otherwise white or black. In dark mode the surface is charcoal, so a band of the lightened
 * accent takes the dark ink instead of a near-invisible one.
 */
export function inkOnAccent(palette: Pick<Palette, "surface" | "canvas" | "text" | "accent">): string {
  const candidates = [palette.surface, palette.canvas, palette.text, WHITE, BLACK];
  return candidates.find((candidate) => contrastRatio(candidate, palette.accent) >= TEXT_CONTRAST)
    ?? candidates.reduce((best, candidate) => (contrastRatio(candidate, palette.accent) > contrastRatio(best, palette.accent) ? candidate : best));
}

/**
 * The accent as a fill (cover band, festive banner, reply button) and the ink set on it. In light the fill is the
 * template's own accent. In dark it is the same hue lightened just enough that the fill reads as a shape against both
 * dark backgrounds (3:1, WCAG 1.4.11), the ink on it reaches AA, and so does the white the editorial cover sets on
 * it when it has no photo.
 */
export function accentFill(theme: CelebrationTheme, scheme: ColorScheme): { readonly fill: string; readonly ink: string } {
  const palette = paletteFor(theme, scheme);
  const inkOn = (fill: string) => inkOnAccent({ ...palette, accent: fill });
  if (scheme === "light") return { fill: theme.palette.accent, ink: inkOn(theme.palette.accent) };
  const fill = lightenUntil(theme.palette.accent, (candidate) => contrastRatio(candidate, DARK_CANVAS) >= COMPONENT_CONTRAST
    && contrastRatio(candidate, DARK_SURFACE) >= COMPONENT_CONTRAST
    && contrastRatio(inkOn(candidate), candidate) >= TEXT_CONTRAST
    && contrastRatio(WHITE, candidate) >= TEXT_CONTRAST) ?? palette.accent;
  return { fill, ink: inkOn(fill) };
}

/** The palette as CSS custom properties for the web renderer (REQ-F09-04). */
export function themeVariables(theme: CelebrationTheme, scheme: ColorScheme = "light"): CssVariables {
  const layout = layoutOf(theme);
  const palette = paletteFor(theme, scheme);
  const fill = accentFill(theme, scheme);
  return {
    "--celebration-canvas": palette.canvas,
    "--celebration-surface": palette.surface,
    "--celebration-text": palette.text,
    "--celebration-accent": palette.accent,
    "--celebration-accent-fill": fill.fill,
    "--celebration-on-accent": fill.ink,
    "--celebration-muted": palette.muted,
    "--celebration-heading-font": theme.typography.heading,
    "--celebration-body-font": theme.typography.body,
    "--celebration-radius": `${layout.radius}px`,
    "--celebration-gap": `${layout.sectionGap}px`,
    "--celebration-max-width": `${layout.maxWidth}px`,
    "--celebration-heading-scale": String(layout.headingScale)
  };
}

// First family of a CSS font stack, without quotes. "'Cormorant Garamond', Georgia, serif" → "Cormorant Garamond".
// https://regex101.com/?flavor=javascript&regex=%5E%5Cs*%5B'%22%5D%3F(%5B%5E'%22%2C%5D%2B)%5B'%22%5D%3F&flags=gm&testString='Cormorant%20Garamond'%2C%20Georgia%2C%20serif%0AArial%2C%20sans-serif
const FIRST_FAMILY = /^\s*['"]?([^'",]+)['"]?/;
const GENERIC_FAMILIES: ReadonlySet<string> = new Set(["serif", "sans-serif", "monospace", "cursive", "system-ui", "Georgia", "Arial", "Trebuchet MS", "Times New Roman"]);
const GOOGLE_FONTS = "https://fonts.googleapis.com/css2";

/** Web fonts the theme needs, as one Google Fonts stylesheet URL (undefined when only system fonts are used). */
export function fontStylesheet(theme: CelebrationTheme): string | undefined {
  const families = [...new Set([theme.typography.heading, theme.typography.body].map((stack) => FIRST_FAMILY.exec(stack)?.[1]?.trim() ?? ""))]
    .filter((family) => family && !GENERIC_FAMILIES.has(family));
  if (!families.length) return undefined;
  const query = families.map((family) => `family=${encodeURIComponent(family).replaceAll("%20", "+")}:wght@400;600;700`).join("&");
  return `${GOOGLE_FONTS}?${query}&display=swap`;
}
