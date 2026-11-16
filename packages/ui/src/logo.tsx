import { createElement } from 'react';
import { logo } from '@rsvp/design-tokens';
import { LOGO_VIEWBOX, useLogoColors, type LogoProps } from './logo-shared';

export { LOGO_TONES, LOGO_VIEWBOX, useLogoColors, type LogoProps, type LogoTone } from './logo-shared';

const MARK_RATIO = 86 / 100;

/** Web and tests: the real DOne artwork as inline SVG. Native replaces this file (`logo.native.tsx`) with the react-native-svg version of the same artwork. */
export function Logo({ variant = 'wordmark', tone = 'auto', height = 28, label = 'DOne', decorative = false }: LogoProps) {
  const colors = useLogoColors(tone);
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
  if (variant === 'mark') {
    return createElement('svg', { viewBox: '0 0 86 100', height, width: Math.round(height * MARK_RATIO), style: { display: 'block', flexShrink: 0 }, ...a11y },
      createElement('path', { fill: colors.mark, d: logo.symbol }));
  }
  return createElement('svg', { viewBox: logo.viewBox, height, width: Math.round((height * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height), style: { display: 'block', flexShrink: 0 }, ...a11y },
    createElement('path', { fill: colors.mark, d: logo.mark }),
    createElement('path', { fill: colors.word, d: logo.word }));
}
