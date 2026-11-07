import Svg, { Path } from 'react-native-svg';
import { ILLUSTRATIONS, ILLUSTRATION_COLORS, ILLUSTRATION_SIZES, ILLUSTRATION_STROKE, ILLUSTRATION_VIEWBOX, isFillLayer } from './illustrations';
import type { IllustrationProps } from './illustration';

/** Native: the same shapes as the web illustration, drawn with react-native-svg. */
export function Illustration({ name, tone = 'brand', size = 'md', label }: IllustrationProps) {
  const palette = ILLUSTRATION_COLORS[tone];
  const px = typeof size === 'number' ? size : ILLUSTRATION_SIZES[size];
  const a11y = label ? { accessibilityRole: 'image' as const, accessibilityLabel: label } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Svg {...a11y} viewBox={`0 0 ${ILLUSTRATION_VIEWBOX} ${ILLUSTRATION_VIEWBOX}`} width={px} height={px}>
      {ILLUSTRATIONS[name].map((shape, index) => isFillLayer(shape.layer)
        ? <Path key={index} d={shape.d} fill={palette[shape.layer]} />
        : <Path key={index} d={shape.d} fill="none" stroke={palette[shape.layer]} strokeWidth={ILLUSTRATION_STROKE} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
  );
}
