import type { ToneName } from '@rsvp/design-tokens';
import { ArtSvg } from './art-svg';
import { ILLUSTRATIONS, ILLUSTRATION_GROUPS, ILLUSTRATION_PASTEL, ILLUSTRATION_SIZES, ILLUSTRATION_VIEWBOX, illustrationColors, resolveTone, type IllustrationName, type IllustrationTone } from './illustrations';
import { useTheme } from './theme';

export interface IllustrationProps {
  name: IllustrationName;
  /** Ink on a light ground (`ink`), light ink on a dark one (`onDark`); `auto` (default) follows the colour scheme. */
  tone?: IllustrationTone;
  /** Overrides the pastel of the single offset shape; by default it comes from the illustration's group. */
  pastel?: ToneName;
  size?: keyof typeof ILLUSTRATION_SIZES | number;
  /** Illustrations are decorative by default (`aria-hidden`); give a `label` only when the picture carries meaning the text does not. */
  label?: string;
}

/** Web and tests: inline SVG. Native replaces this file (`illustration.native.tsx`) with the react-native-svg version of the same shapes. */
export function Illustration({ name, tone = 'auto', pastel, size = 'md', label }: IllustrationProps) {
  const { scheme } = useTheme();
  const px = typeof size === 'number' ? size : ILLUSTRATION_SIZES[size];
  const colors = illustrationColors(resolveTone(tone, scheme), pastel ?? ILLUSTRATION_PASTEL[ILLUSTRATION_GROUPS[name]]);
  return <ArtSvg shapes={ILLUSTRATIONS[name]} colors={colors} viewWidth={ILLUSTRATION_VIEWBOX} viewHeight={ILLUSTRATION_VIEWBOX} width={px} height={px} label={label} dataName={name} />;
}
