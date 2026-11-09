import { Platform } from 'react-native';

/**
 * Single source of the font stacks (minimalist system). Web names the loaded faces with safe fallbacks (loaded in
 * `apps/universal/app/+html.tsx`); native uses the platform face until the fonts are bundled with expo-font:
 * `undefined` keeps the system sans, mono falls back to the platform's own.
 * Usage: `fontFamily: fonts.display` for titles, `fonts.sans` for UI/body, `fonts.mono` for codes and metadata.
 */
export const fonts = {
  sans: Platform.select<string | undefined>({
    web: "'Geist', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif",
    default: undefined
  }),
  /** Titles use the same sans as the interface (tight tracking and weight do the work): one family, no serif. */
  display: Platform.select<string | undefined>({
    web: "'Geist', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif",
    default: undefined
  }),
  mono: Platform.select<string | undefined>({
    web: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    ios: 'Menlo',
    android: 'monospace',
    default: undefined
  })
};
