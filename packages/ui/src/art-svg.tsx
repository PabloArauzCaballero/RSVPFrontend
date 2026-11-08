import { createElement, type CSSProperties } from 'react';
import { ILLUSTRATION_COLORS, ILLUSTRATION_STROKE, isFillLayer, type ResolvedTone, type Shape } from './illustrations';

export interface ArtSvgProps {
  shapes: readonly Shape[];
  tone: ResolvedTone;
  viewWidth: number;
  viewHeight: number;
  width?: number | string;
  height?: number | string;
  /** Fill the box and crop (covers, backdrops) instead of fitting inside it. */
  slice?: boolean;
  label?: string;
  dataName?: string;
  style?: CSSProperties;
}

/** Web and tests: layered shapes as inline SVG, coloured by tone. Native replaces this file (`art-svg.native.tsx`). */
export function ArtSvg({ shapes, tone, viewWidth, viewHeight, width, height, slice = false, label, dataName, style }: ArtSvgProps) {
  const palette = ILLUSTRATION_COLORS[tone];
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  return createElement('svg', {
    viewBox: `0 0 ${viewWidth} ${viewHeight}`, width, height, preserveAspectRatio: slice ? 'xMidYMid slice' : 'xMidYMid meet', 'data-illustration': dataName,
    style: { display: 'block', flexShrink: 0, ...style }, ...a11y
  }, shapes.map((shape, index) => isFillLayer(shape.layer)
    ? createElement('path', { key: index, d: shape.d, fill: palette[shape.layer], fillOpacity: shape.o })
    : createElement('path', { key: index, d: shape.d, fill: 'none', stroke: palette[shape.layer], strokeWidth: shape.w ?? ILLUSTRATION_STROKE, strokeOpacity: shape.o, strokeLinecap: 'round', strokeLinejoin: 'round' })));
}
