import { createElement, useId } from 'react';
import { ILLUSTRATION_COLORS, resolveTone, type IllustrationTone } from './illustrations';
import { WEAVE_OPACITY, WEAVE_SHAPES, WEAVE_TILE } from './brand-art';
import { useTheme } from './theme';

export interface WeavePatternProps {
  /** `onBrand` over the blue, `onDark` over the night, `brand`/`night` over light grounds; `auto` follows the colour scheme. */
  tone?: IllustrationTone;
  /** Size of one tile in px (the tile is 48 units; the default is 1:1). */
  tile?: number;
}

/**
 * The woven texture: stepped rhombi in a hairline stroke, tiled with an SVG `<pattern>`. It fills its parent
 * (absolutely positioned, behind the content), never takes the pointer and is hidden from assistive technology.
 * Web and tests; native has its own file.
 */
export function WeavePattern({ tone = 'auto', tile = WEAVE_TILE }: WeavePatternProps) {
  const { scheme } = useTheme();
  const resolved = resolveTone(tone, scheme);
  const palette = ILLUSTRATION_COLORS[resolved];
  const id = `weave-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const tiles = WEAVE_SHAPES.map((shape, index) => createElement('path', shape.layer === 'solid'
    ? { key: index, d: shape.d, fill: palette.line }
    : { key: index, d: shape.d, fill: 'none', stroke: palette.line, strokeWidth: shape.w, strokeLinejoin: 'miter' }));
  return createElement('svg', { 'aria-hidden': true, focusable: 'false', 'data-weave': resolved, width: '100%', height: '100%', style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' } },
    createElement('defs', null, createElement('pattern', { id, width: tile, height: tile, viewBox: `0 0 ${WEAVE_TILE} ${WEAVE_TILE}`, patternUnits: 'userSpaceOnUse' }, ...tiles)),
    createElement('rect', { width: '100%', height: '100%', fill: `url(#${id})`, opacity: WEAVE_OPACITY[resolved] }));
}
