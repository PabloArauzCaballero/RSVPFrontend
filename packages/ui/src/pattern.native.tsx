import { useId } from 'react';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { ILLUSTRATION_COLORS, resolveTone } from './illustrations';
import { WEAVE_OPACITY, WEAVE_SHAPES, WEAVE_TILE } from './brand-art';
import type { WeavePatternProps } from './pattern';
import { useTheme } from './theme';

/** Native: the same woven tile, drawn with a react-native-svg `<Pattern>`. */
export function WeavePattern({ tone = 'auto', tile = WEAVE_TILE }: WeavePatternProps) {
  const { scheme } = useTheme();
  const resolved = resolveTone(tone, scheme);
  const palette = ILLUSTRATION_COLORS[resolved];
  const id = `weave-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Defs>
        <Pattern id={id} width={tile} height={tile} viewBox={`0 0 ${WEAVE_TILE} ${WEAVE_TILE}`} patternUnits="userSpaceOnUse">
          {WEAVE_SHAPES.map((shape, index) => shape.layer === 'solid'
            ? <Path key={index} d={shape.d} fill={palette.line} />
            : <Path key={index} d={shape.d} fill="none" stroke={palette.line} strokeWidth={shape.w} strokeLinejoin="miter" />)}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={WEAVE_OPACITY[resolved]} />
    </Svg>
  );
}
