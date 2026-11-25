/**
 * WCAG colour maths. A faithful copy of contrastRatio, towardWhite (mix), darkAccent and inkOnAccent from theme.ts of
 * branch fix/plantillas-fase0-contraste-oscuro, and the mirror of BE templates_app/design/colour.py. The v1 → v2
 * converter derives the dark palette with it on both sides, and the shared golden corpus proves they agree.
 */
export const DARK_CANVAS = "#141218";
export const DARK_SURFACE = "#1E1C22";
export const DARK_TEXT = "#ECE6EE";
export const DARK_MUTED = "#B9B1BF";
/** WCAG 2.x minimum for body text. */
export const TEXT_CONTRAST = 4.5;
export const WHITE = "#FFFFFF";
export const BLACK = "#000000";
const CHANNEL = 255;
const LIGHTEN_STEPS = 20;
const HEX = /^#?([0-9a-f]{6})$/i;
const SHORT_HEX = /^#([0-9a-f]{3})$/i;

type Rgb = readonly [number, number, number];

/** #fff → #FFFFFF, #7a5230 → #7A5230. */
export function normalise(hex: string): string {
  const short = SHORT_HEX.exec(hex.trim());
  if (short?.[1]) return `#${[...short[1]].map((digit) => digit + digit).join("").toUpperCase()}`;
  return hex.trim().toUpperCase();
}

function channels(hex: string): Rgb | null {
  const match = HEX.exec(hex.trim());
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & CHANNEL, (value >> 8) & CHANNEL, value & CHANNEL];
}

function toHex([red, green, blue]: Rgb): string {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function luminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0;
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / CHANNEL;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as unknown as Rgb;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two #RRGGBB colours (1 to 21). */
export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a) as unknown as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Moves `hex` towards `target` by `amount` (0 to 1), channel by channel. theme.ts towardWhite is mix(x, WHITE, a). */
export function mix(hex: string, target: string, amount: number): string {
  const rgb = channels(hex);
  const goal = channels(target);
  if (!rgb || !goal) return hex;
  return toHex(rgb.map((channel, index) => channel + ((goal[index] ?? channel) - channel) * amount) as unknown as Rgb);
}

/** The accent lightened in steps of 1/20 towards white until it reads as text on both dark backgrounds. */
export function darkAccent(accent: string): string {
  for (let step = 0; step <= LIGHTEN_STEPS; step += 1) {
    const candidate = mix(accent, WHITE, step / LIGHTEN_STEPS);
    if (contrastRatio(candidate, DARK_CANVAS) >= TEXT_CONTRAST && contrastRatio(candidate, DARK_SURFACE) >= TEXT_CONTRAST) return candidate;
  }
  return DARK_TEXT;
}

/** Ink for text set on an accent fill: the palette's surface, canvas or text when it reaches AA, else white or black. */
export function inkOnAccent(surface: string, canvas: string, text: string, accent: string): string {
  const candidates = [surface, canvas, text, WHITE, BLACK];
  return candidates.find((candidate) => contrastRatio(candidate, accent) >= TEXT_CONTRAST)
    ?? candidates.reduce((best, candidate) => (contrastRatio(candidate, accent) > contrastRatio(best, accent) ? candidate : best));
}

/**
 * P19 suggestion: the closest tone of `foreground` (towards black or white, whichever passes in fewer steps) that reaches
 * `minimum` on `background`. Black or white always reach 4.5 on one side, so a suggestion always exists.
 */
export function nearestPassing(foreground: string, background: string, minimum: number = TEXT_CONTRAST): string {
  const targets = luminance(background) > 0.18 ? [BLACK, WHITE] : [WHITE, BLACK];
  for (let step = 0; step <= LIGHTEN_STEPS; step += 1) {
    for (const target of targets) {
      const candidate = mix(foreground, target, step / LIGHTEN_STEPS);
      if (contrastRatio(candidate, background) >= minimum) return candidate;
    }
  }
  return contrastRatio(BLACK, background) >= contrastRatio(WHITE, background) ? BLACK : WHITE;
}

const SCRIM_STEP = 0.05;
const SCRIM_MAX = 0.8;

/**
 * F6 (P3): the lightest veil, in steps of .05 up to the contract's .8, that keeps `text` at AA over ANY picture. (The muted ink cannot be guaranteed by a veil
 * alone, since its contrast with the canvas is already close to 4.5; on a picture the renderer sets it to the text colour instead.) The veil is
 * the canvas colour at that opacity; the worst pictures are pure black and pure white, and every other pixel lies between them, so the
 * luminance range of the veiled picture is the one between those two. The text passes when its luminance is outside that range with
 * the contrast on the nearer end, never inside it (there the contrast would fall to 1).
 */
export function requiredScrim(palette: { readonly canvas: string; readonly text: string }): number {
  const ranged = (veil: number, ink: string): number => {
    const low = luminance(mix(BLACK, palette.canvas, veil));
    const high = luminance(mix(WHITE, palette.canvas, veil));
    const lum = luminance(ink);
    if (lum >= low && lum <= high) return 1;
    const far = lum > high ? low : high;
    const near = lum > high ? high : low;
    return Math.min((Math.max(lum, near) + 0.05) / (Math.min(lum, near) + 0.05), (Math.max(lum, far) + 0.05) / (Math.min(lum, far) + 0.05));
  };
  for (let step = 0; step * SCRIM_STEP <= SCRIM_MAX + 1e-9; step += 1) {
    const veil = Math.min(SCRIM_MAX, step * SCRIM_STEP);
    if (ranged(veil, palette.text) >= TEXT_CONTRAST) return Number(veil.toFixed(2));
  }
  return SCRIM_MAX;
}
