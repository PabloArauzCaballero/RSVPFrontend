import { brand, colors } from '@rsvp/design-tokens';

/** The tick of the DOne symbol, centred in a 48-unit box. The same stroke is drawn by every check and seal. */
export const CHECK_PATH = 'M11 25.5 L20.5 35 L37 13';
export const CHECK_VIEWBOX = 48;
export const CHECK_STROKE = 6;
/** Pre-computed length of CHECK_PATH (9.5·√2 + √(16.5² + 22²)), used as dash length for the draw-on animation. */
export const CHECK_LENGTH = 40;

export type CheckTone = 'brand' | 'onDark' | 'white' | 'success';
export const CHECK_TONES: Record<CheckTone, string> = { brand: brand.azul, onDark: brand.cielo, white: '#FFFFFF', success: colors.light.success };
