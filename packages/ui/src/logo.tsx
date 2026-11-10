import { createElement } from 'react';
import { colors, ink, logo } from '@rsvp/design-tokens';
import { useTheme } from './theme';

/** `auto` follows the colour scheme (ink on light, the dark scheme's text colour on dark); `ink` and `onDark` force one. */
export type LogoTone = 'auto' | 'ink' | 'onDark';
export interface LogoProps {
  /** `wordmark` is the symbol plus "DOne"; `mark` is the symbol alone (app icon, avatar, compact bars). */
  variant?: 'wordmark' | 'mark';
  /** Mark and word are one colour: ink on light grounds, light ink on dark ones. Default `auto`. */
  tone?: LogoTone;
  /** Rendered height in px; the width follows the artwork's ratio. */
  height?: number;
  label?: string;
  decorative?: boolean;
}

export const LOGO_TONES: Record<Exclude<LogoTone, 'auto'>, { mark: string; word: string }> = {
  ink: { mark: ink, word: ink },
  onDark: { mark: colors.dark.text, word: colors.dark.text }
};

/** Resolves `auto` against the active scheme. */
export function useLogoColors(tone: LogoTone): { mark: string; word: string } {
  const { scheme } = useTheme();
  return LOGO_TONES[tone === 'auto' ? (scheme === 'dark' ? 'onDark' : 'ink') : tone];
}

const [, , wordW, wordH] = logo.viewBox.split(' ').map(Number) as [number, number, number, number];
export const LOGO_VIEWBOX = { width: wordW, height: wordH } as const;
const MARK_RATIO = 86 / 100;

/** Web and tests: the real DOne artwork as inline SVG. Native replaces this file (`logo.native.tsx`) with the react-native-svg version of the same artwork. */
export function Logo({ variant = 'wordmark', tone = 'auto', height = 28, label = 'DOne', decorative = false }: LogoProps) {
  const colors = useLogoColors(tone);
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
  if (variant === 'mark') {
    return createElement('svg', { viewBox: '0 0 86 100', height, width: Math.round(height * MARK_RATIO), style: { display: 'block', flexShrink: 0 }, ...a11y },
      createElement('path', { fill: colors.mark, d: logo.symbol }));
  }
  return createElement('svg', { viewBox: logo.viewBox, height, width: Math.round((height * wordW) / wordH), style: { display: 'block', flexShrink: 0 }, ...a11y },
    createElement('path', { fill: colors.mark, d: logo.mark }),
    createElement('path', { fill: colors.word, d: logo.word }));
}
