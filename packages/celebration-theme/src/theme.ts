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

/** Dark variant of any template: neutral dark surfaces, the template's own accent. */
export function paletteFor(theme: CelebrationTheme, scheme: ColorScheme): Palette {
  return scheme === "dark" ? { canvas: DARK_CANVAS, surface: DARK_SURFACE, text: DARK_TEXT, muted: DARK_MUTED, accent: theme.palette.accent } : theme.palette;
}

/** The palette as CSS custom properties for the web renderer (REQ-F09-04). */
export function themeVariables(theme: CelebrationTheme, scheme: ColorScheme = "light"): CssVariables {
  const layout = layoutOf(theme);
  const palette = paletteFor(theme, scheme);
  return {
    "--celebration-canvas": palette.canvas,
    "--celebration-surface": palette.surface,
    "--celebration-text": palette.text,
    "--celebration-accent": palette.accent,
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
