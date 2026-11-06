import { createElement } from 'react';
import { brand, logo } from '@rsvp/design-tokens';

export type LogoTone = 'brand' | 'onDark' | 'white';
export interface LogoProps {
  /** `wordmark` is the symbol plus "DOne"; `mark` is the symbol alone (app icon, avatar, compact bars). */
  variant?: 'wordmark' | 'mark';
  /** `brand` on light grounds, `onDark` on night, `white` on the electric blue. */
  tone?: LogoTone;
  /** Rendered height in px; the width follows the artwork's ratio. */
  height?: number;
  label?: string;
  decorative?: boolean;
}

export const LOGO_TONES: Record<LogoTone, { mark: string; word: string }> = {
  brand: { mark: brand.azul, word: brand.noche },
  onDark: { mark: brand.azulCl, word: '#FFFFFF' },
  white: { mark: '#FFFFFF', word: '#FFFFFF' }
};

const [, , wordW, wordH] = logo.viewBox.split(' ').map(Number) as [number, number, number, number];
export const LOGO_VIEWBOX = { width: wordW, height: wordH } as const;
const MARK_RATIO = 86 / 100;

/** Web and tests: the real DOne artwork as inline SVG. Native replaces this file (`logo.native.tsx`) with the react-native-svg version of the same artwork. */
export function Logo({ variant = 'wordmark', tone = 'brand', height = 28, label = 'DOne', decorative = false }: LogoProps) {
  const colors = LOGO_TONES[tone];
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
  if (variant === 'mark') {
    return createElement('svg', { viewBox: '0 0 86 100', height, width: Math.round(height * MARK_RATIO), style: { display: 'block', flexShrink: 0 }, ...a11y },
      createElement('path', { fill: colors.mark, d: logo.symbol }));
  }
  return createElement('svg', { viewBox: logo.viewBox, height, width: Math.round((height * wordW) / wordH), style: { display: 'block', flexShrink: 0 }, ...a11y },
    createElement('path', { fill: colors.mark, d: logo.mark }),
    createElement('path', { fill: colors.word, d: logo.word }));
}
