import Svg, { Path } from 'react-native-svg';
import { ILLUSTRATION_COLORS, ILLUSTRATION_STROKE, isFillLayer } from './illustrations';
import type { ArtSvgProps } from './art-svg';

/** Native: the same layered shapes as the web SVG, drawn with react-native-svg. */
export function ArtSvg({ shapes, tone, viewWidth, viewHeight, width, height, slice = false, label }: ArtSvgProps) {
  const palette = ILLUSTRATION_COLORS[tone];
  const a11y = label ? { accessibilityRole: 'image' as const, accessibilityLabel: label } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Svg {...a11y} viewBox={`0 0 ${viewWidth} ${viewHeight}`} width={width} height={height} preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMid meet'}>
      {shapes.map((shape, index) => isFillLayer(shape.layer)
        ? <Path key={index} d={shape.d} fill={palette[shape.layer]} fillOpacity={shape.o} />
        : <Path key={index} d={shape.d} fill="none" stroke={palette[shape.layer]} strokeWidth={shape.w ?? ILLUSTRATION_STROKE} strokeOpacity={shape.o} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
  );
}
