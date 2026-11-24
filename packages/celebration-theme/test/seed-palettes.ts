/**
 * The 16 seeded templates (BE `seeds/templates/data/*.json` on `chore/deploy-contabo-coolify`, copied 2026-11-24): key, name,
 * layout and palette, the inputs the invitation art is measured against. If a seed changes, copy it again here.
 */
import type { LayoutId, Palette } from "../src/types.js";

export interface SeedTemplate { readonly key: string; readonly name: string; readonly layout: LayoutId; readonly palette: Palette }

export const SEED_TEMPLATES: readonly SeedTemplate[] = [
  { key: "clasico-marfil", name: "Clásico marfil", layout: "classic", palette: { canvas: "#FBF7F0", surface: "#FFFFFF", text: "#2B2622", accent: "#7A5230", muted: "#665C52" } },
  { key: "minimalista", name: "Minimalista", layout: "minimal", palette: { canvas: "#FFFFFF", surface: "#F6F6F3", text: "#1C1C1A", accent: "#2F5D50", muted: "#5C5C57" } },
  { key: "editorial", name: "Editorial", layout: "editorial", palette: { canvas: "#F4EFE9", surface: "#FFFFFF", text: "#211D1A", accent: "#9C3526", muted: "#675C55" } },
  { key: "festivo", name: "Festivo", layout: "festive", palette: { canvas: "#FFF5FA", surface: "#FFFFFF", text: "#2B1730", accent: "#B3134F", muted: "#6A506E" } },
  { key: "corporativo", name: "Corporativo", layout: "corporate", palette: { canvas: "#F5F7FA", surface: "#FFFFFF", text: "#14202B", accent: "#1F5FAD", muted: "#4F5C68" } },
  { key: "jardin-botanico", name: "Jardín botánico", layout: "classic", palette: { canvas: "#F5F8F2", surface: "#FFFFFF", text: "#222B25", accent: "#386247", muted: "#58645B" } },
  { key: "rosa-antiguo", name: "Rosa antiguo", layout: "classic", palette: { canvas: "#FBF3F2", surface: "#FFFFFF", text: "#2D2224", accent: "#9A3F55", muted: "#695A5D" } },
  { key: "cielo-bautizo", name: "Cielo de bautizo", layout: "classic", palette: { canvas: "#F2F7FC", surface: "#FFFFFF", text: "#1F2933", accent: "#2F5F94", muted: "#55626F" } },
  { key: "arena-terracota", name: "Arena y terracota", layout: "minimal", palette: { canvas: "#FAF6F0", surface: "#F2EBE0", text: "#2A231D", accent: "#A2431F", muted: "#615548" } },
  { key: "editorial-granate", name: "Editorial granate", layout: "editorial", palette: { canvas: "#F3F0EB", surface: "#FFFFFF", text: "#161412", accent: "#8A2638", muted: "#625A55" } },
  { key: "editorial-oliva", name: "Editorial oliva", layout: "editorial", palette: { canvas: "#F5F4EC", surface: "#FFFFFF", text: "#1D2119", accent: "#5B6B1F", muted: "#5D6155" } },
  { key: "pinata", name: "Piñata", layout: "festive", palette: { canvas: "#FFF8E6", surface: "#FFFFFF", text: "#2E2012", accent: "#C2330F", muted: "#6B5640" } },
  { key: "fiesta-lila", name: "Fiesta lila", layout: "festive", palette: { canvas: "#F8F4FF", surface: "#FFFFFF", text: "#241A36", accent: "#6A3BBF", muted: "#625774" } },
  { key: "menta-infantil", name: "Menta infantil", layout: "festive", palette: { canvas: "#F0FAF6", surface: "#FFFFFF", text: "#14302A", accent: "#0C7566", muted: "#4C6A63" } },
  { key: "corporativo-grafito", name: "Corporativo grafito", layout: "corporate", palette: { canvas: "#F4F5F6", surface: "#FFFFFF", text: "#17191C", accent: "#0B6E6A", muted: "#50565C" } },
  { key: "gala-dorada", name: "Gala dorada", layout: "corporate", palette: { canvas: "#F8F6F0", surface: "#FFFFFF", text: "#1D1B16", accent: "#7A5A0E", muted: "#5E5848" } },
];
