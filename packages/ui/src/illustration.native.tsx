import { ArtSvg } from './art-svg';
import { ILLUSTRATIONS, ILLUSTRATION_SIZES, ILLUSTRATION_VIEWBOX, resolveTone } from './illustrations';
import type { IllustrationProps } from './illustration';
import { useTheme } from './theme';

/** Native: the same shapes as the web illustration, drawn with react-native-svg. */
export function Illustration({ name, tone = 'brand', size = 'md', label }: IllustrationProps) {
  const { scheme } = useTheme();
  const px = typeof size === 'number' ? size : ILLUSTRATION_SIZES[size];
  return <ArtSvg shapes={ILLUSTRATIONS[name]} tone={resolveTone(tone, scheme)} viewWidth={ILLUSTRATION_VIEWBOX} viewHeight={ILLUSTRATION_VIEWBOX} width={px} height={px} label={label} />;
}
