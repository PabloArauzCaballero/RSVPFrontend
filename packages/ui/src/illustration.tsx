import { createElement } from 'react';
import { ILLUSTRATIONS, ILLUSTRATION_COLORS, ILLUSTRATION_SIZES, ILLUSTRATION_STROKE, ILLUSTRATION_VIEWBOX, isFillLayer, type IllustrationName, type IllustrationTone } from './illustrations';

export interface IllustrationProps {
  name: IllustrationName;
  /** `brand` blue lines on a light ground, `night` for quieter spots, `onDark` over the night ground. */
  tone?: IllustrationTone;
  size?: keyof typeof ILLUSTRATION_SIZES | number;
  /** Illustrations are decorative by default (`aria-hidden`); give a `label` only when the picture carries meaning the text does not. */
  label?: string;
}

/** Web and tests: inline SVG. Native replaces this file (`illustration.native.tsx`) with the react-native-svg version of the same shapes. */
export function Illustration({ name, tone = 'brand', size = 'md', label }: IllustrationProps) {
  const palette = ILLUSTRATION_COLORS[tone];
  const px = typeof size === 'number' ? size : ILLUSTRATION_SIZES[size];
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  return createElement('svg', { viewBox: `0 0 ${ILLUSTRATION_VIEWBOX} ${ILLUSTRATION_VIEWBOX}`, width: px, height: px, 'data-illustration': name, style: { display: 'block', flexShrink: 0 }, ...a11y },
    ILLUSTRATIONS[name].map((shape, index) => isFillLayer(shape.layer)
      ? createElement('path', { key: index, d: shape.d, fill: palette[shape.layer] })
      : createElement('path', { key: index, d: shape.d, fill: 'none', stroke: palette[shape.layer], strokeWidth: ILLUSTRATION_STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' })));
}
