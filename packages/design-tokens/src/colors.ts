/**
 * RSVP palette: the woven stripes of a Bolivian aguayo. Wine is the committed ground colour,
 * marigold is the single warm accent. Canvas is a cool pale rose, never cream.
 * Contrast (WCAG): text on canvas 16:1, textMuted on canvas 6.4:1, onPrimary on primary 9:1, onAccent on accent 9:1.
 */
export const colors = {
  light: {
    canvas: '#FBF8FB', surface: '#FFFFFF', surfaceMuted: '#F2ECF1',
    text: '#24101F', textMuted: '#6A5566', primary: '#8C1D5A',
    onPrimary: '#FFFFFF', primaryMuted: '#F6DCE9', border: '#DCCCD7',
    accent: '#F2A900', onAccent: '#2B1400', accentMuted: '#FFE9B0',
    danger: '#B3261E', onDanger: '#FFFFFF', success: '#146C43', warning: '#7A5800'
  },
  dark: {
    canvas: '#1B0A17', surface: '#27121F', surfaceMuted: '#311A28',
    text: '#F7ECF3', textMuted: '#CDB5C6', primary: '#FF8DBE',
    onPrimary: '#4A0A2B', primaryMuted: '#6B1E47', border: '#5A3A50',
    accent: '#FFC93C', onAccent: '#2B1400', accentMuted: '#5C4300',
    danger: '#FFB4AB', onDanger: '#690005', success: '#6DDBA0', warning: '#F5C051'
  }
} as const;

/** Signature stripes, in weaving order. Used for the aguayo band on web and native. */
export const aguayo = ['#8C1D5A', '#F2A900', '#0E8A7D', '#D8452B', '#3A0D2B'] as const;
/** Deep wine used for committed hero and footer regions (same in light and dark). */
export const wine = '#3A0D2B';
/** Readable text on the wine ground (same in light and dark). */
export const onWine = '#FBEFF6';

export type ColorTheme = keyof typeof colors;
export type ColorToken = keyof typeof colors.light;
