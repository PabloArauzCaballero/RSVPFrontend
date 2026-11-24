/** The design document v2 as the converter produces it. The JSON Schema of the contract is the source of truth;
 *  these types cover the parts the conversion and the warnings read or write. */
export type PaletteRole = "canvas" | "surface" | "text" | "muted" | "accent" | "accentFill" | "onAccent" | "line";
export type DesignPalette = Readonly<Record<PaletteRole, string>>;
export type ColourScheme = "light" | "dark";

export interface DesignFont {
  readonly family: string;
  readonly weights: readonly number[];
}

export interface DesignElement {
  readonly id: string;
  readonly block: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly visible: boolean;
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
