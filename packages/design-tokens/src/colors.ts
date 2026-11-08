/**
 * DOne palette, minimalist system (skill `minimalist-ui`): warm monochrome with scarce, washed-out pastels.
 * Colour carries meaning only (a reply state, an error, a notice); everything else is ink on bone.
 * `fieldBorder` is the outline of inputs (3:1 against the surface, WCAG 1.4.11); `border` is only for decorative dividers.
 * Verified pair by pair in `contrast.test.ts`.
 */
export const colors = {
  light: {
    canvas: '#F7F6F3', surface: '#FFFFFF', surfaceMuted: '#F1EFEA',
    text: '#111111', textMuted: '#6A6965', primary: '#111111',
    onPrimary: '#FFFFFF', primaryMuted: '#EFEDE8', border: '#EAEAEA', fieldBorder: '#85847F',
    accent: '#FBF3DB', onAccent: '#5E4000', accentMuted: '#F6EBC8',
    danger: '#9F2F2D', onDanger: '#FFFFFF', success: '#346538', warning: '#7A5200',
    dangerBg: '#FDEBEC', successBg: '#EDF3EC', scrim: 'rgba(17,17,17,0.5)'
  },
  dark: {
    canvas: '#151514', surface: '#1E1E1C', surfaceMuted: '#272725',
    text: '#EDECE8', textMuted: '#A3A29D', primary: '#EDECE8',
    onPrimary: '#111111', primaryMuted: '#2C2C2A', border: '#333331', fieldBorder: '#7A7974',
    accent: '#E6C66B', onAccent: '#2A2000', accentMuted: '#3A3012',
    danger: '#F2B8B5', onDanger: '#3A0B0A', success: '#9ED6A3', warning: '#E6C66B',
    dangerBg: '#3A1D1D', successBg: '#1B2E1F', scrim: 'rgba(0,0,0,0.7)'
  }
} as const;

/** The two anchor neutrals, for the few places that need them outside a scheme (the app icon, print, e-mail). */
export const ink = '#111111';
export const bone = '#F7F6F3';

/**
 * Washed-out pastel pairs (background + the readable text that goes on it) for tags, status pills and icon grounds.
 * The only place hue appears besides danger/success text.
 */
export const tones = {
  light: {
    red: { bg: '#FDEBEC', fg: '#9F2F2D' },
    blue: { bg: '#E1F3FE', fg: '#1F6C9F' },
    green: { bg: '#EDF3EC', fg: '#346538' },
    yellow: { bg: '#FBF3DB', fg: '#7A5200' },
    gray: { bg: '#F1EFEA', fg: '#5F5E5A' }
  },
  dark: {
    red: { bg: '#3A1D1D', fg: '#F7C9C6' },
    blue: { bg: '#14293A', fg: '#A9D4F0' },
    green: { bg: '#1B2E1F', fg: '#BFE3C3' },
    yellow: { bg: '#3A3012', fg: '#F0D88A' },
    gray: { bg: '#272725', fg: '#A3A29D' }
  }
} as const;

/**
 * RSVP status pills per scheme. The word always carries the state; the dot repeats it and is never the only cue.
 */
export const chips = {
  light: {
    yes: { bg: tones.light.green.bg, fg: tones.light.green.fg, dot: '#346538' },
    maybe: { bg: tones.light.yellow.bg, fg: tones.light.yellow.fg, dot: '#956400' },
    wait: { bg: tones.light.gray.bg, fg: tones.light.gray.fg, dot: '#A3A29D', border: '#EAEAEA' },
    no: { bg: tones.light.red.bg, fg: tones.light.red.fg, dot: '#9F2F2D' }
  },
  dark: {
    yes: { bg: tones.dark.green.bg, fg: tones.dark.green.fg, dot: '#9ED6A3' },
    maybe: { bg: tones.dark.yellow.bg, fg: tones.dark.yellow.fg, dot: '#E6C66B' },
    wait: { bg: tones.dark.gray.bg, fg: tones.dark.gray.fg, dot: '#7A7974', border: '#333331' },
    no: { bg: tones.dark.red.bg, fg: tones.dark.red.fg, dot: '#F2B8B5' }
  }
} as const;

/**
 * Avatar grounds: calm neutrals and one blue, never green, yellow or red. Those three already mean "confirmed", "maybe" and
 * "not attending" in every list that shows an avatar next to a reply pill, so a person's initials must not borrow them.
 */
export const avatars = {
  light: [tones.light.blue, tones.light.gray, { bg: '#EAE6DB', fg: '#4A463B' }, { bg: '#E4E8EE', fg: '#3B4452' }],
  dark: [tones.dark.blue, tones.dark.gray, { bg: '#2F2C25', fg: '#D9D3C3' }, { bg: '#252A33', fg: '#C9D2E0' }]
} as const;

export type ColorTheme = keyof typeof colors;
export type ColorToken = keyof typeof colors.light;
export type ToneName = keyof typeof tones.light;
