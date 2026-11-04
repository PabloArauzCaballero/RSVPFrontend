/**
 * One family: Plus Jakarta Sans (Brand Kit v3). Web loads it from Google Fonts. Native keeps the
 * platform font until the face is bundled with expo-font (see docs/progress/DECISIONS.md).
 */
export const typography = {
  fontFamily: { sans: 'Plus Jakarta Sans', display: 'Plus Jakarta Sans' },
  fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 32, '3xl': 56 },
  lineHeight: { xs: 16, sm: 20, base: 25, lg: 28, xl: 28, '2xl': 38, '3xl': 58 },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' }
} as const;
