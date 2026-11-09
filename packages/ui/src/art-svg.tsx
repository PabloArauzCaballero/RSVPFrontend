import { createElement, type CSSProperties } from 'react';
import { ILLUSTRATION_STROKE, isFillLayer, type IllustrationColors, type Shape } from './illustrations';

export interface ArtSvgProps {
  shapes: readonly Shape[];
  /** Colour per layer, from `illustrationColors`. */
  colors: IllustrationColors;
  viewWidth: number;
  viewHeight: number;
  width?: number | string;
  height?: number | string;
    label?: string;
  dataName?: string;
  style?: CSSProperties;
}

/** Web and tests: layered shapes as inline SVG, coloured by layer. Native replaces this file (`art-svg.native.tsx`). */
export function ArtSvg({ shapes, colors: palette, viewWidth, viewHeight, width, height, label, dataName, style }: ArtSvgProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  return createElement('svg', {
    viewBox: `0 0 ${viewWidth} ${viewHeight}`, width, height, preserveAspectRatio: 'xMidYMid meet', 'data-illustration': dataName,
    style: { display: 'block', flexShrink: 0, ...style }, ...a11y
  }, shapes.map((shape, index) => isFillLayer(shape.layer)
    ? createElement('path', { key: index, d: shape.d, fill: palette[shape.layer], fillOpacity: shape.o, ...(shape.layer === 'soft' ? { stroke: palette.softEdge, strokeWidth: 1.25, strokeOpacity: 0.55 } : null) })
    : createElement('path', { key: index, d: shape.d, fill: 'none', stroke: palette[shape.layer], strokeWidth: shape.w ?? ILLUSTRATION_STROKE, strokeOpacity: shape.o, strokeLinecap: 'round', strokeLinejoin: 'round' })));
}
