import { colors, tones } from '@rsvp/design-tokens';

/** The tick of the DOne symbol, centred in a 48-unit box. The same stroke is drawn by every check and seal. */
export const CHECK_PATH = 'M14 25.5 L21.5 33 L34 15.5';
export const CHECK_VIEWBOX = 48;
export const CHECK_STROKE = 3.5;
/** Pre-computed length of CHECK_PATH (7.5·√2 + √(12.5² + 17.5²)), used as dash length for the draw-on animation. */
export const CHECK_LENGTH = 33;
/** Radius of the pastel disc behind the tick. */
export const CHECK_GROUND_R = 22;

/**
 * Tick in ink over a pastel green disc: the meaning is the tick, the green only says "done".
 * `ink*` draws the tick in the text colour of the scheme; `success*` draws it in the green of the pastel pair. The `Light`/`Dark` suffix picks the scheme.
 */
export type CheckTone = 'inkLight' | 'inkDark' | 'successLight' | 'successDark';
export const CHECK_TONES: Record<CheckTone, { stroke: string; ground: string }> = {
  inkLight: { stroke: colors.light.text, ground: tones.light.green.bg },
  inkDark: { stroke: colors.dark.text, ground: tones.dark.green.bg },
  successLight: { stroke: tones.light.green.fg, ground: tones.light.green.bg },
  successDark: { stroke: tones.dark.green.fg, ground: tones.dark.green.bg }
};
