export const colors = {
  light: {
    canvas: '#FFFBFF', surface: '#FFFFFF', surfaceMuted: '#F4F1F8',
    text: '#1D1B20', textMuted: '#625B71', primary: '#6750A4',
    onPrimary: '#FFFFFF', primaryMuted: '#E9DDFF', border: '#CAC4D0',
    danger: '#BA1A1A', onDanger: '#FFFFFF', success: '#146C43', warning: '#7A5800'
  },
  dark: {
    canvas: '#141218', surface: '#1D1B20', surfaceMuted: '#211F26',
    text: '#E6E0E9', textMuted: '#CAC4D0', primary: '#D0BCFF',
    onPrimary: '#381E72', primaryMuted: '#4F378B', border: '#938F99',
    danger: '#FFB4AB', onDanger: '#690005', success: '#6DDBA0', warning: '#F5C051'
  }
} as const;

export type ColorTheme = keyof typeof colors;
export type ColorToken = keyof typeof colors.light;
