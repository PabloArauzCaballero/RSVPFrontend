import { ArtSvg } from './art-svg';
import { ILLUSTRATIONS, ILLUSTRATION_GROUPS, ILLUSTRATION_PASTEL, ILLUSTRATION_SIZES, ILLUSTRATION_VIEWBOX, illustrationColors, resolveTone } from './illustrations';
import type { IllustrationProps } from './illustration';
import { useTheme } from './theme';

/** Native: the same shapes as the web illustration, drawn with react-native-svg. */
export function Illustration({ name, tone = 'auto', pastel, size = 'md', label }: IllustrationProps) {
  const { scheme } = useTheme();
  const px = typeof size === 'number' ? size : ILLUSTRATION_SIZES[size];
  const colors = illustrationColors(resolveTone(tone, scheme), pastel ?? ILLUSTRATION_PASTEL[ILLUSTRATION_GROUPS[name]]);
  return <ArtSvg shapes={ILLUSTRATIONS[name]} colors={colors} viewWidth={ILLUSTRATION_VIEWBOX} viewHeight={ILLUSTRATION_VIEWBOX} width={px} height={px} label={label} />;
}
