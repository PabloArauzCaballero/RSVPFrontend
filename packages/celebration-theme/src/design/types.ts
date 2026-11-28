/** The design document v2 as the converter produces it. The JSON Schema of the contract is the source of truth;
 *  these types cover the parts the conversion and the warnings read or write. */
export type PaletteRole = "canvas" | "surface" | "text" | "muted" | "accent" | "accentFill" | "onAccent" | "line";
export type DesignPalette = Readonly<Record<PaletteRole, string>>;
export type ColourScheme = "light" | "dark";

export interface DesignFont {
  readonly family: string;
  readonly weights: readonly number[];
}

export interface DesignBox { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number }
export interface DesignBorder { readonly width: number; readonly style: "solid" | "dashed" | "dotted"; readonly colour: PaletteRole }
export type DesignBackground =
  | { readonly kind: "colour"; readonly role: PaletteRole }
  | { readonly kind: "media"; readonly mediaId: string; readonly fit: "cover" | "contain"; readonly scrim?: number; readonly veil?: DesignVeil }
  | { readonly kind: "illustration"; readonly illustrationId: string };
export interface DesignTypographyOverride {
  readonly role?: "heading" | "body" | "monogram";
  readonly size?: number;
  readonly weight?: number;
  readonly align?: "start" | "center" | "end" | "justify";
  readonly lineHeight?: number;
  readonly letterSpacing?: number;
  readonly transform?: "none" | "uppercase" | "lowercase" | "capitalize";
  readonly colour?: PaletteRole;
}
export type DesignEntrance = "none" | "fade" | "rise" | "scale" | "draw" | "envelope";
/** Contract 1.8.0 (fidelity): the veil of a photo background. `even` (what an absent value means: every document saved before 1.8.0 keeps its uniform veil) is one veil over the whole photo; `graded` (explicit) is strong behind the text and light elsewhere. */
export type DesignVeil = "graded" | "even";
export const DESIGN_VEILS: readonly DesignVeil[] = ["graded", "even"];
/** Curated named animations. The renderer owns their duration and easing; every one is off under `prefers-reduced-motion`. */
export type AnimationName = "aparecer" | "mecerse" | "revelar-telon" | "abrir-puertas";
export const ANIMATION_NAMES: readonly AnimationName[] = ["aparecer", "mecerse", "revelar-telon", "abrir-puertas"];
/** Named animations a page can play; the others are for elements (`mecerse`) or pages only (`abrir-puertas`, `revelar-telon`). */
export const PAGE_ANIMATIONS: readonly AnimationName[] = ["aparecer", "revelar-telon", "abrir-puertas"];
export const ELEMENT_ANIMATIONS: readonly AnimationName[] = ["aparecer", "mecerse", "revelar-telon"];
export type DesignMask = "arch" | "deco-doors" | "chamfer" | "circle" | "rounded" | "stamp";
export const DESIGN_MASKS: readonly DesignMask[] = ["arch", "deco-doors", "chamfer", "circle", "rounded", "stamp"];
/** Blocks a mask can cut: the ones without text (the contract refuses it elsewhere). */
export const MASKABLE_BLOCKS: readonly string[] = ["image", "gallery", "illustration", "monogram", "ornament", "video", "map"];
export type DesignFrameStyle = "double" | "deco" | "hairline";
export const DESIGN_FRAME_STYLES: readonly DesignFrameStyle[] = ["double", "deco", "hairline"];
export interface DesignFrame { readonly style: DesignFrameStyle; readonly colour: PaletteRole }
export interface DesignAnimation { readonly entrance: DesignEntrance; readonly delayMs?: number; readonly durationMs?: number; readonly name?: AnimationName }
export type DesignLink =
  | { readonly kind: "url"; readonly href: string }
  | { readonly kind: "section"; readonly section: string }
  | { readonly kind: "gifts" }
  | { readonly kind: "rsvp" }
  | { readonly kind: "listing"; readonly listingId: string };

export interface DesignElement {
  readonly id: string;
  readonly block: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly visible: boolean;
  readonly rotation?: number;
  readonly z?: number;
  readonly padding?: DesignBox;
  readonly margin?: DesignBox;
  readonly radius?: number;
  readonly border?: DesignBorder;
  readonly background?: DesignBackground;
  readonly opacity?: number;
  readonly typography?: DesignTypographyOverride;
  readonly animation?: DesignAnimation;
  readonly link?: DesignLink;
  /** Contract 1.8.0: the shape the element is clipped to, and the frame drawn around it. Never on the gifts and reply buttons. */
  readonly mask?: DesignMask;
  readonly frame?: DesignFrame;
}

export interface DesignCanvas {
  readonly mode: "flow" | "free";
  readonly columns: number;
  readonly rowHeight: number;
  readonly elements: readonly DesignElement[];
}

export interface DesignPage {
  readonly id: string;
  readonly kind: "cover" | "section";
  readonly section?: string;
  readonly style: string;
  readonly background?: DesignBackground;
  /** Contract 1.8.0: how the page enters (`aparecer`, `revelar-telon` or `abrir-puertas`). */
  readonly animation?: DesignAnimation;
  readonly canvases: { readonly mobile: DesignCanvas; readonly desktop?: DesignCanvas };
}

export interface DesignBlock {
  readonly id: string;
  readonly type: string;
  readonly required?: true;
  readonly config: Readonly<Record<string, unknown>>;
}

export interface DesignDocumentV2 {
  readonly schemaVersion: 2;
  readonly tokens: {
    readonly palettes: { readonly light: DesignPalette; readonly dark: DesignPalette };
    readonly typography: {
      readonly heading: DesignFont;
      readonly body: DesignFont;
      readonly monogram?: DesignFont;
      readonly scale: { readonly base: number; readonly ratio: number };
    };
    readonly spacing: { readonly unit: 4 | 8; readonly section: number; readonly contentMaxWidth: number };
    readonly radii: { readonly sm: number; readonly md: number; readonly lg: number };
    readonly ornament: string;
    readonly illustrationSet: string;
  };
  readonly pages: readonly DesignPage[];
  readonly blocks: readonly DesignBlock[];
  readonly custom: { readonly html: string; readonly css: string };
  readonly origin?: {
    readonly schemaVersion: 1;
    readonly layout: string;
    readonly sectionOrder: readonly string[];
    readonly typography: { readonly heading: string; readonly body: string };
  };
}

export interface DesignWarning {
  readonly code: "LOW_CONTRAST";
  readonly scheme: ColourScheme;
  readonly foreground: PaletteRole;
  readonly background: PaletteRole;
  readonly ratio: number;
  readonly minimum: number;
  readonly suggestion: string;
}

/** What the converter needs from a v1 template. */
export interface V1Template {
  readonly theme: {
    readonly palette: Readonly<Record<"canvas" | "surface" | "text" | "accent" | "muted", string>>;
    readonly typography: { readonly heading: string; readonly body: string };
    readonly sectionStyle: string;
  };
  readonly layout: string;
  readonly sectionOrder: readonly string[];
}
