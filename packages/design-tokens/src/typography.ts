/**
 * Minimalist system: a sans with character for the interface (Geist) and an editorial serif for titles (Newsreader),
 * tight tracking and line-height on the serif. Web loads both from Google Fonts. Native keeps the platform fonts until
 * the faces are bundled with expo-font (see docs/progress/DECISIONS.md). Mono is for codes and metadata.
 */
export const typography = {
  fontFamily: { sans: 'Geist', display: 'Newsreader', mono: 'Geist Mono' },
  fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 22, '2xl': 34, '3xl': 56 },
  lineHeight: { xs: 16, sm: 20, base: 26, lg: 28, xl: 28, '2xl': 38, '3xl': 60 },
  letterSpacing: { display: '-0.02em', displayLarge: '-0.03em', body: '0em', label: '0.05em' },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' }
} as const;
