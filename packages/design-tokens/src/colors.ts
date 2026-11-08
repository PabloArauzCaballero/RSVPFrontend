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
    onPrimary: '#FFFFFF', primaryMuted: '#E9EDFF', border: '#DFE3F0', fieldBorder: '#7F89B0',
    accent: '#FFB020', onAccent: '#0A1033', accentMuted: '#FFEFC9',
    danger: '#B3261E', onDanger: '#FFFFFF', success: '#146C43', warning: '#7A5800',
    dangerBg: '#FDECEA', successBg: '#E6F4EA', scrim: 'rgba(10,16,51,0.6)'
  },
  dark: {
    canvas: '#0E1540', surface: '#18215A', surfaceMuted: '#212C6E',
    text: '#FFFFFF', textMuted: '#B4BDDF', primary: '#8FA6FF',
    onPrimary: '#0A1033', primaryMuted: '#2A357F', border: '#2F3A80', fieldBorder: '#7380C4',
    accent: '#FFB020', onAccent: '#0A1033', accentMuted: '#5C4300',
    danger: '#FFB4AB', onDanger: '#690005', success: '#6DDBA0', warning: '#F5C051',
    dangerBg: '#40181F', successBg: '#0F3D2B', scrim: 'rgba(3,6,24,0.72)'
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
/** Light-only tints; prefer the scheme-aware `dangerBg` / `successBg` palette tokens. */
export const notice = { dangerBg: '#FDECEA', successBg: '#E6F4EA' } as const;

/**
 * RSVP status pills and avatar grounds per scheme. Dark is composed, not inverted: pills sit on a lighter night surface
 * with a sky or amber dot, so the dot and the word still carry the state (never colour alone).
 */
export const chips = {
  light: {
    yes: { bg: brand.bruma, fg: brand.azulOsc, dot: brand.azul },
    maybe: { bg: '#FFF2D6', fg: '#6B4500', dot: brand.ambar },
    wait: { bg: brand.nube, fg: brand.pizarra, dot: brand.niebla, border: brand.linea },
    no: { bg: '#ECEEF4', fg: brand.noche, dot: brand.noche }
  },
  dark: {
    yes: { bg: '#2A357F', fg: '#DDE4FF', dot: brand.cielo },
    maybe: { bg: '#4A3600', fg: '#FFD98A', dot: brand.ambar },
    wait: { bg: '#18215A', fg: '#B4BDDF', dot: brand.niebla, border: '#4A559B' },
    no: { bg: '#2B3377', fg: '#FFFFFF', dot: '#FFFFFF' }
  }
} as const;
export const avatars = {
  light: [{ bg: brand.azul, fg: '#FFFFFF' }, { bg: brand.ambar, fg: brand.noche }, { bg: brand.noche, fg: '#FFFFFF' }, { bg: brand.cielo, fg: brand.noche }],
  dark: [{ bg: brand.azulCl, fg: '#FFFFFF' }, { bg: brand.ambar, fg: brand.noche }, { bg: '#2B3377', fg: '#FFFFFF' }, { bg: brand.cielo, fg: brand.noche }]
} as const;

export type ColorTheme = keyof typeof colors;
export type ColorToken = keyof typeof colors.light;
