import { createElement } from 'react';
import { CHECK_GROUND_R, CHECK_STROKE, CHECK_VIEWBOX } from './check-geometry';
import { useTheme } from './theme';

export { NOTICE_GLYPHS, type NoticeMarkProps, type NoticeMarkTone } from './notice-glyphs';
import { NOTICE_GLYPHS, type NoticeMarkProps } from './notice-glyphs';

/**
 * Icon of an error or information notice. Same grammar as the success check (a disc and a round-capped ink stroke, 24 px beside text), so every
 * notice pairs one drawn icon with its words. Decorative: the notice text carries the meaning. Web and tests; native has its own file.
 */
export function NoticeMark({ tone = 'error', size = 24 }: NoticeMarkProps) {
  const { palette } = useTheme();
  const ink = tone === 'error' ? palette.danger : palette.text;
  const glyph = NOTICE_GLYPHS[tone];
  return createElement('svg', { viewBox: `0 0 ${CHECK_VIEWBOX} ${CHECK_VIEWBOX}`, width: size, height: size, 'aria-hidden': true, focusable: 'false', 'data-notice-mark': tone, style: { display: 'block', flexShrink: 0 } },
    createElement('circle', { key: 'ground', cx: 24, cy: 24, r: CHECK_GROUND_R, fill: palette.surface, stroke: ink, strokeWidth: 2 }),
    createElement('path', { key: 'stem', d: glyph.stem, fill: 'none', stroke: ink, strokeWidth: CHECK_STROKE, strokeLinecap: 'round' }),
    createElement('circle', { key: 'dot', cx: glyph.dot[0], cy: glyph.dot[1], r: CHECK_STROKE / 2, fill: ink }));
}
