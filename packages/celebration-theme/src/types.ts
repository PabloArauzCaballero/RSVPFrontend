/**
 * The theme contract. A template is a row in template_db (Template/Media Service); this
 * package turns that row into a rendered site without one component per template.
 * Document for template authors: packages/celebration-theme/THEMES.md.
 */

export const SECTION_IDS = ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations", "gifts", "rsvp"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const LAYOUT_IDS = ["classic", "minimal", "editorial", "festive", "corporate"] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const SECTION_STYLES = ["plain", "cards", "bands"] as const;
export type SectionStyle = (typeof SECTION_STYLES)[number];

export interface Palette {
  readonly canvas: string;
  readonly surface: string;
  readonly text: string;
  readonly accent: string;
  readonly muted: string;
}

export interface Typography {
  readonly heading: string;
  readonly body: string;
}

/** Exactly what GET /media/templates/{id} returns. */
export interface TemplateDocument {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly status?: string;
  readonly eventTypeTags: readonly string[];
  readonly layout: LayoutId;
  readonly theme: { readonly palette: Palette; readonly typography: Typography; readonly sectionStyle: SectionStyle };
  readonly sectionOrder: readonly SectionId[];
  readonly version?: number;
}

/** The theme as the renderers consume it, already reconciled with the event type. */
export interface CelebrationTheme {
  readonly id: string;
  readonly name: string;
  readonly layout: LayoutId;
  readonly palette: Palette;
  readonly typography: Typography;
  readonly sectionStyle: SectionStyle;
  /** Sections the template places, in its order, limited to what the event type enables. */
  readonly sections: readonly SectionId[];
  /** Enabled by the event type but not placed by this template: hidden, never deleted. */
  readonly hiddenSections: readonly SectionId[];
}

/** How a layout arranges the page. Layouts are data too. */
export interface LayoutSpec {
  readonly id: LayoutId;
  readonly hero: "centered" | "split" | "overlay" | "banner" | "compact";
  readonly align: "center" | "start";
  readonly headingCase: "none" | "uppercase";
  readonly headingScale: number;
  readonly radius: number;
  readonly sectionGap: number;
  readonly maxWidth: number;
  readonly divider: "none" | "line" | "ornament";
  readonly imageTreatment: "natural" | "rounded" | "framed";
}

export type Translate = (key: string, values?: Readonly<Record<string, string | number>>) => string;

export interface LocalDateTime {
  readonly date: string;
  readonly time: string;
  readonly timeZone: string;
  readonly utcOffset: string;
}
