/**
 * The 30 seeded templates after the F4 redesign (BE `seeds/templates/data/*.json` on `feat/plantillas-f4-semillas`, copied 2026-11-24): key, name,
 * layout and palette, the inputs the invitation art is measured against. If a seed changes, copy it again here.
 *
 * Exception, decided by Pablo (2026-11-24): the row `gala-dorada` follows the new direction «Gala art déco» (wine accent, never
 * yellow), not the BE seed `016` («Gala dorada», accent `#7A5A0E`, a mustard). The id stays `gala-dorada` because it is the seed's
 * id and the evidence file names; palette and name follow the prototype (`docs/design/prototipos-plantillas`). Copy the BE seed
 * again only once it carries the wine accent.
 */
import type { LayoutId, Palette } from "../src/types.js";

export interface SeedTemplate { readonly key: string; readonly name: string; readonly layout: LayoutId; readonly palette: Palette }

export const SEED_TEMPLATES: readonly SeedTemplate[] = [
  { key: "clasico-marfil", name: "Clásico marfil", layout: "classic", palette: { canvas: "#FBF7F0", surface: "#FFFEFA", text: "#2B2622", accent: "#7A5230", muted: "#665C52" } },
  { key: "minimalista", name: "Minimalista", layout: "minimal", palette: { canvas: "#FFFFFF", surface: "#FAFAF7", text: "#161616", accent: "#2F5D50", muted: "#5A5A56" } },
  { key: "editorial", name: "Editorial", layout: "editorial", palette: { canvas: "#F4EFE9", surface: "#FFFFFF", text: "#1F1A17", accent: "#9C3526", muted: "#5E534B" } },
  { key: "festivo", name: "Festivo", layout: "festive", palette: { canvas: "#FFF5FA", surface: "#FFFFFF", text: "#2A1520", accent: "#B3134F", muted: "#6A4A58" } },
  { key: "corporativo", name: "Corporativo", layout: "corporate", palette: { canvas: "#F5F7FA", surface: "#FFFFFF", text: "#14202E", accent: "#1F5FAD", muted: "#4B5A6B" } },
  { key: "jardin-botanico", name: "Jardín botánico", layout: "classic", palette: { canvas: "#F5F8F2", surface: "#FFFFFF", text: "#1F2A22", accent: "#386247", muted: "#556158" } },
  { key: "rosa-antiguo", name: "Rosa antiguo", layout: "classic", palette: { canvas: "#FBF3F2", surface: "#FFFFFF", text: "#2B1D20", accent: "#9A3F55", muted: "#6A5256" } },
  { key: "cielo-bautizo", name: "Cielo de bautizo", layout: "classic", palette: { canvas: "#F2F7FC", surface: "#FFFFFF", text: "#1B2733", accent: "#2F5F94", muted: "#4F6072" } },
  { key: "arena-terracota", name: "Arena y terracota", layout: "minimal", palette: { canvas: "#FAF6F0", surface: "#FFFFFF", text: "#2A211B", accent: "#A2431F", muted: "#6A5B50" } },
  { key: "editorial-granate", name: "Editorial granate", layout: "editorial", palette: { canvas: "#F3F0EB", surface: "#FFFFFF", text: "#1E1719", accent: "#8A2638", muted: "#5E5154" } },
  { key: "editorial-oliva", name: "Editorial oliva", layout: "editorial", palette: { canvas: "#F5F4EC", surface: "#FFFFFF", text: "#22241A", accent: "#5B6B1F", muted: "#585B48" } },
  { key: "pinata", name: "Piñata", layout: "festive", palette: { canvas: "#FFF9EF", surface: "#FFFFFF", text: "#2E2012", accent: "#C2330F", muted: "#6B5640" } },
  { key: "fiesta-lila", name: "Fiesta lila", layout: "festive", palette: { canvas: "#F8F4FF", surface: "#FFFFFF", text: "#22152F", accent: "#6A3BBF", muted: "#5E5070" } },
  { key: "menta-infantil", name: "Menta infantil", layout: "festive", palette: { canvas: "#F0FAF6", surface: "#FFFFFF", text: "#142822", accent: "#0C7566", muted: "#4A6158" } },
  { key: "corporativo-grafito", name: "Corporativo grafito", layout: "corporate", palette: { canvas: "#F4F5F6", surface: "#FFFFFF", text: "#17191C", accent: "#0B6E6A", muted: "#52585E" } },
  { key: "gala-dorada", name: "Gala art déco", layout: "corporate", palette: { canvas: "#F5F3EE", surface: "#FFFFFF", text: "#14130F", accent: "#7B2A3C", muted: "#57524D" } },
  { key: "cumpleanos-adulto", name: "Cumpleaños adulto", layout: "minimal", palette: { canvas: "#F7F5F0", surface: "#FFFFFF", text: "#1C1B19", accent: "#1D5C73", muted: "#55534D" } },
  { key: "fiesta-patronal", name: "Fiesta patronal", layout: "festive", palette: { canvas: "#FFF7EC", surface: "#FFFFFF", text: "#2B1622", accent: "#8E2D6B", muted: "#634854" } },
  { key: "inauguracion", name: "Inauguración", layout: "corporate", palette: { canvas: "#F8F6F3", surface: "#FFFFFF", text: "#1E1A17", accent: "#B03F00", muted: "#5C5249" } },
  { key: "pedida-de-mano", name: "Pedida de mano", layout: "classic", palette: { canvas: "#F8F5FA", surface: "#FFFFFF", text: "#251C2B", accent: "#5B4B8A", muted: "#5F5568" } },
  { key: "despedida", name: "Despedida de soltero/a", layout: "festive", palette: { canvas: "#F2FAFC", surface: "#FFFFFF", text: "#10242C", accent: "#0B6B8A", muted: "#476069" } },
  { key: "bodas-de-oro", name: "Bodas de oro", layout: "classic", palette: { canvas: "#FBF6EF", surface: "#FFFEFA", text: "#2A2019", accent: "#8A4A1E", muted: "#65584C" } },
  { key: "bodas-de-plata", name: "Bodas de plata", layout: "classic", palette: { canvas: "#F4F6F8", surface: "#FFFFFF", text: "#181D22", accent: "#3E5C76", muted: "#4E5963" } },
  { key: "reencuentro", name: "Reencuentro", layout: "editorial", palette: { canvas: "#F6F1EA", surface: "#FFFFFF", text: "#211A16", accent: "#9A3412", muted: "#5F544B" } },
  { key: "fiesta-tematica", name: "Fiesta temática", layout: "festive", palette: { canvas: "#F5F7FF", surface: "#FFFFFF", text: "#161A33", accent: "#2F4FBF", muted: "#505673" } },
  { key: "fin-de-ano", name: "Fin de año", layout: "classic", palette: { canvas: "#F3F5F9", surface: "#FFFFFF", text: "#121826", accent: "#1F3A6B", muted: "#4C5568" } },
  { key: "otros-evento", name: "Otros eventos", layout: "minimal", palette: { canvas: "#F9F9F7", surface: "#FFFFFF", text: "#1B1C1E", accent: "#4F5D95", muted: "#55575C" } },
  { key: "graduacion", name: "Graduación", layout: "corporate", palette: { canvas: "#F5F6FA", surface: "#FFFFFF", text: "#141826", accent: "#1E3A8A", muted: "#4B5169" } },
  { key: "baby-shower", name: "Baby shower", layout: "festive", palette: { canvas: "#FBF6F9", surface: "#FFFFFF", text: "#2A1B25", accent: "#A3406F", muted: "#68525E" } },
  { key: "primera-comunion", name: "Primera comunión", layout: "classic", palette: { canvas: "#F7FAFC", surface: "#FFFFFF", text: "#1A2530", accent: "#3C6E8F", muted: "#4F6070" } },
];
