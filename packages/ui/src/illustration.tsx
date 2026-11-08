import { ArtSvg } from './art-svg';
import { ILLUSTRATIONS, ILLUSTRATION_SIZES, ILLUSTRATION_VIEWBOX, resolveTone, type IllustrationName, type IllustrationTone } from './illustrations';
import { useTheme } from './theme';

export interface IllustrationProps {
  name: IllustrationName;
  /** `brand` blue lines on a light ground, `night` for quieter spots, `onDark` over the night ground, `onBrand` over the blue; `auto` follows the colour scheme. */
  tone?: IllustrationTone;
  size?: keyof typeof ILLUSTRATION_SIZES | number;
  /** Illustrations are decorative by default (`aria-hidden`); give a `label` only when the picture carries meaning the text does not. */
  label?: string;
}

/** Web and tests: inline SVG. Native replaces this file (`illustration.native.tsx`) with the react-native-svg version of the same shapes. */
export function Illustration({ name, tone = 'brand', size = 'md', label }: IllustrationProps) {
  const { scheme } = useTheme();
  const px = typeof size === 'number' ? size : ILLUSTRATION_SIZES[size];
  return <ArtSvg shapes={ILLUSTRATIONS[name]} tone={resolveTone(tone, scheme)} viewWidth={ILLUSTRATION_VIEWBOX} viewHeight={ILLUSTRATION_VIEWBOX} width={px} height={px} label={label} dataName={name} />;
}
