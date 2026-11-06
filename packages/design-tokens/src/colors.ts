/**
 * DOne palette (Brand Kit v3): electric blue on a near-black night blue. One blue, amber only
 * for "maybe" and notices. Proportion: 45 light, 30 night, 20 blue, 5 amber.
 * `fieldBorder` is the outline of inputs (3:1 against the surface, WCAG 1.4.11); `border` is only for decorative dividers.
 * Contrast (WCAG): white on azul 6.7:1, white on noche 18.5:1, cielo on noche 8.0:1, noche on ambar 10.1:1.
 */
export const colors = {
  light: {
    canvas: '#F6F7FB', surface: '#FFFFFF', surfaceMuted: '#E9EDFF',
    text: '#0A1033', textMuted: '#5A6380', primary: '#1F3BFF',
    onPrimary: '#FFFFFF', primaryMuted: '#E9EDFF', border: '#DFE3F0', fieldBorder: '#858FB5',
    accent: '#FFB020', onAccent: '#0A1033', accentMuted: '#FFEFC9',
    danger: '#B3261E', onDanger: '#FFFFFF', success: '#146C43', warning: '#7A5800'
  },
  dark: {
    canvas: '#0A1033', surface: '#141C4D', surfaceMuted: '#1B2560',
    text: '#FFFFFF', textMuted: '#A9B3D6', primary: '#8FA6FF',
    onPrimary: '#0A1033', primaryMuted: '#222C66', border: '#263070', fieldBorder: '#6571B5',
    accent: '#FFB020', onAccent: '#0A1033', accentMuted: '#5C4300',
    danger: '#FFB4AB', onDanger: '#690005', success: '#6DDBA0', warning: '#F5C051'
  }
} as const;

/** Named brand colours, straight from the kit. */
export const brand = {
  azul: '#1F3BFF', azulOsc: '#172DCC', azulCl: '#4A63FF', noche: '#0A1033', medianoche: '#141C4D',
  cielo: '#8FA6FF', bruma: '#E9EDFF', nube: '#F6F7FB', pizarra: '#5A6380', niebla: '#A9B3D6', linea: '#DFE3F0', ambar: '#FFB020'
} as const;
/** Deep night used for committed hero, footer and brand regions (same in light and dark). */
export const night = brand.noche;
/** Readable text on the night ground (same in light and dark). */
export const onNight = '#FFFFFF';
/** Tints for success and error notices on light surfaces. */
export const notice = { dangerBg: '#FDECEA', successBg: '#E6F4EA' } as const;

export type ColorTheme = keyof typeof colors;
export type ColorToken = keyof typeof colors.light;
