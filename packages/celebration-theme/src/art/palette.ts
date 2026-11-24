import type { Palette } from "../types.js";
import { contrastRatio, luminance, mix } from "./contrast.js";
import { ART_ROLES, type ArtColors, type ArtRole } from "./types.js";

/**
 * Floors every resolved palette meets, pinned for the 16 seeded templates in light and dark by `test/art-palette.test.ts`.
 * - The disc only has to exist on the page (DOne's own disc is 1.07 to 1.15 on its grounds).
 * - L16: the flat contact shadow must never be the page colour, nor the disc it overlaps, or it vanishes and bites the disc.
 * - Secondary pieces and the accent are graphical objects: 3:1 against the page and the disc (WCAG 1.4.11).
 */
export const ART_FLOORS = { discOnCanvas: 1.1, shadowOnCanvas: 1.2, shadowOnDisc: 1.08, secondaryOnCanvas: 3, secondaryOnDisc: 3, accentOnCanvas: 3, accentOnDisc: 3 } as const;
const STEPS = 80;

/** The first mix of `from` towards `to` (in 1/80 steps from `start`) that satisfies `ok`, or `to` itself. */
function firstMix(from: string, to: string, ok: (candidate: string, step: number) => boolean, start = 1): { readonly color: string; readonly step: number } {
  for (let step = start; step <= STEPS; step += 1) {
    const color = mix(from, to, step / STEPS);
    if (ok(color, step)) return { color, step };
  }
  return { color: to, step: STEPS };
}

/** Grounds a drawing can sit on: the page and a card of the invitation. */
export type ArtGround = "canvas" | "surface";

/**
 * The colour of each drawing role for one template palette, already resolved for its scheme (`paletteFor(theme, scheme)`).
 * Every role is a mix of the template's own `canvas`, `surface`, `text` and `accent`, never a new hue, so a drawing belongs to
 * its invitation in light and in dark. Each floor holds on BOTH grounds, so one set of variables serves the page and its cards:
 * - `disc`: the stone disc, a whisper of ink over the grounds.
 * - `shadow`: always darker than the disc (a contact shadow), and never the page colour (L16). On a light page it is one step
 *   further towards the ink than the disc. On a dark page the page is already the darkest thing there is, so the shadow is the
 *   first step off the page and the disc sits above it.
 * - `ink`: the page text. `cutout`: the ground the drawing sits on, so details are cut out of the ink.
 * - `secondary`: the field-border step, 3:1 on the grounds and the disc.
 * - `accent`: the template accent (P4). When it is too close to a ground or the disc it is moved towards the ink, keeping its
 *   hue, until it reads at 3:1.
 */
export function artPalette(palette: Pick<Palette, "canvas" | "surface" | "text" | "accent">, ground: ArtGround = "canvas"): ArtColors {
  const { canvas, text } = palette;
  const grounds = [palette.canvas, palette.surface];
  const apart = (color: string, floor: number): boolean => grounds.every((item) => contrastRatio(color, item) >= floor);
  const darkPage = luminance(canvas) < luminance(text);
  let disc: string;
  let shadow: string;
  if (darkPage) {
    const near = firstMix(canvas, text, (color) => apart(color, ART_FLOORS.shadowOnCanvas));
    shadow = near.color;
    disc = firstMix(canvas, text, (color) => apart(color, ART_FLOORS.discOnCanvas) && contrastRatio(color, shadow) >= ART_FLOORS.shadowOnDisc, near.step + 1).color;
  } else {
    const first = firstMix(canvas, text, (color) => apart(color, ART_FLOORS.discOnCanvas));
    disc = first.color;
    shadow = firstMix(canvas, text, (color) => apart(color, ART_FLOORS.shadowOnCanvas) && contrastRatio(color, disc) >= ART_FLOORS.shadowOnDisc, first.step + 1).color;
  }
  const secondary = firstMix(canvas, text, (color) => apart(color, ART_FLOORS.secondaryOnCanvas) && contrastRatio(color, disc) >= ART_FLOORS.secondaryOnDisc).color;
  const readable = (color: string): boolean => apart(color, ART_FLOORS.accentOnCanvas) && contrastRatio(color, disc) >= ART_FLOORS.accentOnDisc;
  const accent = readable(palette.accent) ? palette.accent : firstMix(palette.accent, text, readable).color;
  return { disc, shadow, ink: text, cutout: palette[ground], secondary, accent };
}

/** CSS custom property of each role: the web renderer paints `fill="var(--celebration-art-ink)"` and so on. */
export const artVariableName = (role: ArtRole): `--celebration-art-${ArtRole}` => `--celebration-art-${role}`;

/** The roles as CSS custom properties, to set on the invitation root (F4) or on a single drawing. */
export function artVariables(colors: ArtColors): Readonly<Record<`--celebration-art-${ArtRole}`, string>> {
  return Object.fromEntries(ART_ROLES.map((role) => [artVariableName(role), colors[role]])) as Record<`--celebration-art-${ArtRole}`, string>;
}
