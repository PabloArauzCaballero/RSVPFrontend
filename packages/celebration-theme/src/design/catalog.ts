/**
 * Mirror of the curated font catalogue of the design contract (Template/Media OpenAPI, DesignDocumentV2 → FontFamilyId →
 * x-rsvp-font-catalog). The converter needs the weights of each family; a test compares this list with the vendored spec,
 * so it cannot drift. Regenerate it from the spec when the contract changes the catalogue.
 */
export type FontCategory = "serif" | "sans" | "script";

export interface CatalogFamily {
  readonly id: string;
  readonly family: string;
  readonly category: FontCategory;
  readonly weights: readonly number[];
  readonly fallback: string;
}

export const FONT_FAMILIES: readonly CatalogFamily[] = [
  { id: "cormorant-garamond", family: "Cormorant Garamond", category: "serif", weights: [300, 400, 500, 600, 700], fallback: "Georgia, serif" },
  { id: "cormorant", family: "Cormorant", category: "serif", weights: [300, 400, 500, 600, 700], fallback: "Georgia, serif" },
  { id: "playfair-display", family: "Playfair Display", category: "serif", weights: [400, 500, 600, 700, 900], fallback: "Georgia, serif" },
  { id: "fraunces", family: "Fraunces", category: "serif", weights: [300, 400, 500, 600, 700, 900], fallback: "Georgia, serif" },
  { id: "lora", family: "Lora", category: "serif", weights: [400, 500, 600, 700], fallback: "Georgia, serif" },
  { id: "newsreader", family: "Newsreader", category: "serif", weights: [300, 400, 500, 600, 700], fallback: "Georgia, serif" },
  { id: "libre-baskerville", family: "Libre Baskerville", category: "serif", weights: [400, 700], fallback: "Georgia, serif" },
  { id: "eb-garamond", family: "EB Garamond", category: "serif", weights: [400, 500, 600, 700], fallback: "Georgia, serif" },
  { id: "bodoni-moda", family: "Bodoni Moda", category: "serif", weights: [400, 500, 600, 700, 900], fallback: "Georgia, serif" },
  { id: "dm-serif-display", family: "DM Serif Display", category: "serif", weights: [400], fallback: "Georgia, serif" },
  { id: "marcellus", family: "Marcellus", category: "serif", weights: [400], fallback: "Georgia, serif" },
  { id: "cinzel", family: "Cinzel", category: "serif", weights: [400, 500, 600, 700, 900], fallback: "Georgia, serif" },
  { id: "gilda-display", family: "Gilda Display", category: "serif", weights: [400], fallback: "Georgia, serif" },
  { id: "spectral", family: "Spectral", category: "serif", weights: [300, 400, 500, 600, 700], fallback: "Georgia, serif" },
  { id: "crimson-pro", family: "Crimson Pro", category: "serif", weights: [300, 400, 500, 600, 700, 900], fallback: "Georgia, serif" },
  { id: "young-serif", family: "Young Serif", category: "serif", weights: [400], fallback: "Georgia, serif" },
  { id: "source-sans-3", family: "Source Sans 3", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "dm-sans", family: "DM Sans", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "nunito", family: "Nunito", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "nunito-sans", family: "Nunito Sans", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "work-sans", family: "Work Sans", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "ibm-plex-sans", family: "IBM Plex Sans", category: "sans", weights: [300, 400, 500, 600, 700], fallback: "Arial, sans-serif" },
  { id: "poppins", family: "Poppins", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "quicksand", family: "Quicksand", category: "sans", weights: [300, 400, 500, 600, 700], fallback: "Arial, sans-serif" },
  { id: "fredoka", family: "Fredoka", category: "sans", weights: [300, 400, 500, 600, 700], fallback: "Arial, sans-serif" },
  { id: "geist", family: "Geist", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "figtree", family: "Figtree", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "manrope", family: "Manrope", category: "sans", weights: [300, 400, 500, 600, 700], fallback: "Arial, sans-serif" },
  { id: "karla", family: "Karla", category: "sans", weights: [300, 400, 500, 600, 700], fallback: "Arial, sans-serif" },
  { id: "mulish", family: "Mulish", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "jost", family: "Jost", category: "sans", weights: [300, 400, 500, 600, 700, 900], fallback: "Arial, sans-serif" },
  { id: "josefin-sans", family: "Josefin Sans", category: "sans", weights: [300, 400, 500, 600, 700], fallback: "Arial, sans-serif" },
  { id: "great-vibes", family: "Great Vibes", category: "script", weights: [400], fallback: "cursive" },
  { id: "pinyon-script", family: "Pinyon Script", category: "script", weights: [400], fallback: "cursive" },
  { id: "parisienne", family: "Parisienne", category: "script", weights: [400], fallback: "cursive" },
  { id: "dancing-script", family: "Dancing Script", category: "script", weights: [400, 500, 600, 700], fallback: "cursive" },
  { id: "allura", family: "Allura", category: "script", weights: [400], fallback: "cursive" },
  { id: "italianno", family: "Italianno", category: "script", weights: [400], fallback: "cursive" },
  { id: "alex-brush", family: "Alex Brush", category: "script", weights: [400], fallback: "cursive" }
];

const BY_ID: ReadonlyMap<string, CatalogFamily> = new Map(FONT_FAMILIES.map((family) => [family.id, family]));

export const familyById = (id: string): CatalogFamily | undefined => BY_ID.get(id);

/** Origins to preconnect before the font stylesheet (PL-M10). Mirror of `x-rsvp-font-catalog.preconnect` in the contract;
 *  the renderer emits the `<link rel="preconnect">` in F6. */
export interface FontPreconnect {
  readonly href: string;
  readonly crossorigin?: true;
}

export const FONT_PRECONNECT: readonly FontPreconnect[] = [{ href: "https://fonts.googleapis.com" }, { href: "https://fonts.gstatic.com", crossorigin: true }];
