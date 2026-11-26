/**
 * The dark palette of a template exactly as phase 0 composes it (`paletteFor(theme, "dark")` in FE branch
 * `fix/plantillas-fase0-contraste-oscuro`, `src/theme.ts`): the neutral dark surfaces and the template accent lightened, hue
 * kept, until it reads at 4.5:1 on both. That branch is not in this one's base yet, so the constants and the search are copied
 * here and `art-palette.test.ts` pins their result. When the branch lands, delete this file and import `paletteFor`.
 */
import { channels, contrastRatio, toHex } from "../src/art/contrast.js";
import type { Palette } from "../src/types.js";

export const DARK_CANVAS = "#141218";
export const DARK_SURFACE = "#1E1C22";
export const DARK_TEXT = "#ECE6EE";
export const DARK_MUTED = "#B9B1BF";
const TEXT_CONTRAST = 4.5;
const LIGHTEN_STEPS = 20;

function towardWhite(hex: string, amount: number): string {
  const rgb = channels(hex);
  return rgb ? toHex(rgb.map((channel) => channel + (255 - channel) * amount) as [number, number, number]) : hex;
}

export function darkAccent(accent: string): string {
  for (let step = 0; step <= LIGHTEN_STEPS; step += 1) {
    const candidate = towardWhite(accent, step / LIGHTEN_STEPS);
    if (contrastRatio(candidate, DARK_CANVAS) >= TEXT_CONTRAST && contrastRatio(candidate, DARK_SURFACE) >= TEXT_CONTRAST) return candidate;
  }
  return DARK_TEXT;
}

export function darkPaletteOf(palette: Palette): Palette {
  return { canvas: DARK_CANVAS, surface: DARK_SURFACE, text: DARK_TEXT, muted: DARK_MUTED, accent: darkAccent(palette.accent) };
}
