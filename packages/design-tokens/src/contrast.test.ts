import { describe, expect, it } from 'vitest';
import { avatars, chips, colors, illustrationGrounds, illustrationTokens, tones, type ColorToken } from './colors';

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16) / 255;
const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => 0.2126 * linear(channel(hex, 1)) + 0.7152 * linear(channel(hex, 3)) + 0.0722 * linear(channel(hex, 5));
/** WCAG 2.x contrast ratio of two #RRGGBB colours. */
export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = 4.5;
const COMPONENT = 3;
type Pair = readonly [ColorToken, ColorToken, number];
// Every foreground that carries words sits on every ground it can meet; outlines of controls need 3:1 (WCAG 1.4.11).
const TEXT_GROUNDS: readonly ColorToken[] = ['canvas', 'surface', 'surfaceMuted', 'primaryMuted'];
const pairs: readonly Pair[] = [
  ...TEXT_GROUNDS.flatMap((ground): Pair[] => [['text', ground, TEXT], ['textMuted', ground, TEXT], ['primary', ground, TEXT]]),
  ['onPrimary', 'primary', TEXT], ['onDanger', 'danger', TEXT], ['onAccent', 'accent', TEXT], ['text', 'accentMuted', TEXT],
  ['danger', 'canvas', TEXT], ['danger', 'surface', TEXT], ['success', 'canvas', TEXT], ['success', 'surface', TEXT], ['warning', 'canvas', TEXT], ['warning', 'surface', TEXT],
  ['text', 'dangerBg', TEXT], ['text', 'successBg', TEXT], ['danger', 'dangerBg', TEXT], ['success', 'successBg', TEXT],
  ['fieldBorder', 'canvas', COMPONENT], ['fieldBorder', 'surface', COMPONENT], ['primary', 'surface', COMPONENT]
];

describe.each(['light', 'dark'] as const)('WCAG AA contrast, %s palette', (scheme) => {
  const palette = colors[scheme];
  it.each(pairs)('%s on %s reaches the required ratio', (fg, bg, min) => {
    expect(contrast(palette[fg], palette[bg]), `${scheme} ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
  });
  it('status pills keep readable words (the dot is redundant with the word, never the only cue)', () => {
    for (const [tone, chip] of Object.entries(chips[scheme])) expect(contrast(chip.fg, chip.bg), `${scheme} chip ${tone} text`).toBeGreaterThanOrEqual(TEXT);
  });
  it('avatar initials are readable on every ground', () => {
    for (const avatar of avatars[scheme]) expect(contrast(avatar.fg, avatar.bg)).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('dark palette is composed, not inverted', () => {
  it('stacks elevation by lighter surfaces: canvas < surface < surfaceMuted', () => {
    expect(luminance(colors.dark.canvas)).toBeLessThan(luminance(colors.dark.surface));
    expect(luminance(colors.dark.surface)).toBeLessThan(luminance(colors.dark.surfaceMuted));
  });
  it('keeps the ink as the action colour on light and its mirror (near-white) on dark', () => {
    expect(colors.light.primary).toBe('#0B0B0C');
    expect(colors.dark.primary).toBe(colors.dark.text);
  });
});

describe.each(['light', 'dark'] as const)('pastel tones, %s', (scheme) => {
  it.each(Object.entries(tones[scheme]))('%s text is readable on its ground', (_name, tone) => {
    expect(contrast(tone.fg, tone.bg)).toBeGreaterThanOrEqual(TEXT);
  });
});

// L16: the contact shadow of an illustration is a flat shape, so it only exists while it differs from what is under it. The
// floors are the light scheme's own margins (border on surfaceMuted 1.14, on the disc 1.07), which already read well; the dark
// scheme must reach them too instead of painting the shadow with the page colour (ratio 1, the shadow bit the disc).
const SHADOW_ON_GROUND = 1.1;
const SHADOW_ON_DISC = 1.05;
describe.each(['light', 'dark'] as const)('illustration contact shadow, %s (L16)', (scheme) => {
  const palette = colors[scheme];
  const shadow = palette[illustrationTokens.shadow];
  it.each(illustrationGrounds)('stands apart from the %s ground the drawing sits on', (ground) => {
    expect(shadow.toLowerCase(), `${scheme} shadow is the ${ground}`).not.toBe(palette[ground].toLowerCase());
    expect(contrast(shadow, palette[ground]), `${scheme} shadow on ${ground}`).toBeGreaterThanOrEqual(SHADOW_ON_GROUND);
  });
  it('stands apart from the stone disc it overlaps, so it never cuts the disc', () => {
    expect(contrast(shadow, palette[illustrationTokens.ground]), `${scheme} shadow on disc`).toBeGreaterThanOrEqual(SHADOW_ON_DISC);
  });
  it('the disc itself is visible on every ground', () => {
    for (const ground of illustrationGrounds) expect(contrast(palette[illustrationTokens.ground], palette[ground]), `${scheme} disc on ${ground}`).toBeGreaterThan(1);
  });
});
