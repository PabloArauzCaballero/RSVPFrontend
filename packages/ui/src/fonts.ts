import { Platform } from 'react-native';

/**
 * Single source of the font stacks (minimalist system). Web names the loaded faces with safe fallbacks (loaded in
 * `apps/universal/app/+html.tsx`); native uses the platform face until the fonts are bundled with expo-font:
 * `undefined` keeps the system sans, the serif and mono fall back to the platform's own.
 * Usage: `fontFamily: fonts.display` for titles, `fonts.sans` for UI/body, `fonts.mono` for codes and metadata.
 */
export const fonts = {
  sans: Platform.select<string | undefined>({
    web: "'Geist', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif",
    default: undefined
  }),
  display: Platform.select<string | undefined>({
    web: "'Newsreader', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
    ios: 'Georgia',
    android: 'serif',
    default: undefined
  }),
  mono: Platform.select<string | undefined>({
    web: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    ios: 'Menlo',
    android: 'monospace',
    default: undefined
  })
};
