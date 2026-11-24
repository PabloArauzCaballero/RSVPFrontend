/**
 * WCAG 2.x colour maths for the invitation art. `luminance` and `contrastRatio` are the same formulas, constants and rounding as
 * the dark-mode contrast fix of phase 0 (`theme.ts` in FE `fix/plantillas-fase0-contraste-oscuro`), so a drawing and the page text
 * are measured with one ruler. When that branch lands, `theme.ts` imports these instead of keeping its own copy.
 */
const HEX = /^#?([0-9a-f]{6})$/i;
const CHANNEL = 255;

export type Rgb = readonly [number, number, number];

export function channels(hex: string): Rgb | null {
  const match = HEX.exec(hex.trim());
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & CHANNEL, (value >> 8) & CHANNEL, value & CHANNEL];
}

export function toHex([red, green, blue]: Rgb): string {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function luminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0;
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / CHANNEL;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two #RRGGBB colours (1 to 21). */
export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Mixes `from` towards `to` by `amount` (0 keeps `from`, 1 gives `to`), channel by channel. */
export function mix(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  if (!a || !b) return from;
  const step = (start: number, end: number): number => start + (end - start) * amount;
  return toHex([step(a[0], b[0]), step(a[1], b[1]), step(a[2], b[2])]);
}
