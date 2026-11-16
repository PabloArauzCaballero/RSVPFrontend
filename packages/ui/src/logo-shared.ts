// Shared by logo.tsx (web) and logo.native.tsx; see motion-tokens.ts for why native files must not import './logo'.
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
