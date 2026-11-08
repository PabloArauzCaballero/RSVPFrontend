import Svg, { Circle, Path } from 'react-native-svg';
import { CHECK_GROUND_R, CHECK_STROKE, CHECK_VIEWBOX } from './check-geometry';
import { NOTICE_GLYPHS, type NoticeMarkProps } from './notice-mark';
import { useTheme } from './theme';

/** Native: the same disc, stem and dot as the web icon, with `react-native-svg`. */
export function NoticeMark({ tone = 'error', size = 24 }: NoticeMarkProps) {
  const { palette } = useTheme();
  const ink = tone === 'error' ? palette.danger : palette.text;
  const glyph = NOTICE_GLYPHS[tone];
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" viewBox={`0 0 ${CHECK_VIEWBOX} ${CHECK_VIEWBOX}`} width={size} height={size}>
      <Circle cx={24} cy={24} r={CHECK_GROUND_R} fill={palette.surface} stroke={ink} strokeWidth={2} />
      <Path d={glyph.stem} fill="none" stroke={ink} strokeWidth={CHECK_STROKE} strokeLinecap="round" />
      <Circle cx={glyph.dot[0]} cy={glyph.dot[1]} r={CHECK_STROKE / 2} fill={ink} />
    </Svg>
  );
}
