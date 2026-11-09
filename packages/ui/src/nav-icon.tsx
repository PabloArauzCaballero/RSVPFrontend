import { createElement } from 'react';
import { NAV_ICONS, NAV_ICON_STROKE } from './nav-icon-shapes';

export interface NavIconProps {
  /** Destination key (`home`, `guests`, `overview`, `review`, …). Unknown keys draw nothing. */
  name: string;
  size?: number;
  /** Stroke colour: the text colour of the item it sits in. */
  color: string;
}

/** Navigation icon, drawn in one stroke style. Decorative: the label next to it names the destination. Web and tests; native has its own file. */
export function NavIcon({ name, size = 20, color }: NavIconProps) {
  const shapes = NAV_ICONS[name];
  if (!shapes) return null;
  return createElement('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', 'aria-hidden': true, focusable: 'false', 'data-nav-icon': name, style: { display: 'block', flexShrink: 0 } },
    ...shapes.map((shape, index) => {
      const common = { key: index, stroke: color, strokeWidth: NAV_ICON_STROKE, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
      if (shape.t === 'path') return createElement('path', { ...common, d: shape.d });
      if (shape.t === 'circle') return createElement('circle', { ...common, cx: shape.cx, cy: shape.cy, r: shape.r });
      return createElement('rect', { ...common, x: shape.x, y: shape.y, width: shape.w, height: shape.h, rx: shape.rx });
    }));
}
