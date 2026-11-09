import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { NAV_ICONS, NAV_ICON_STROKE } from './nav-icon-shapes';
import type { NavIconProps } from './nav-icon';

/** Native: the same shapes with `react-native-svg`. */
export function NavIcon({ name, size = 20, color }: NavIconProps) {
  const shapes = NAV_ICONS[name];
  if (!shapes) return null;
  const common = { stroke: color, strokeWidth: NAV_ICON_STROKE, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" viewBox="0 0 24 24" width={size} height={size}>
      {shapes.map((shape, index) => shape.t === 'path' ? <Path key={index} {...common} d={shape.d} /> : shape.t === 'circle' ? <Circle key={index} {...common} cx={shape.cx} cy={shape.cy} r={shape.r} /> : <Rect key={index} {...common} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} />)}
    </Svg>
  );
}
