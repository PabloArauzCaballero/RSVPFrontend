import { createElement, useEffect, useRef, useState } from 'react';
import { CHECK_LENGTH, CHECK_PATH, CHECK_STROKE, CHECK_TONES, CHECK_VIEWBOX, type CheckTone } from './check-geometry';
import { MOTION, useReducedMotion } from './motion';

export interface CheckMarkProps {
  size?: number;
  tone?: CheckTone;
  /** The tick is drawn when this is true (and again each time it goes false → true). `false` shows it still, already drawn. */
  play?: boolean;
  /** Accessible name; without it the tick is decorative (`aria-hidden`) and the text next to it carries the meaning. */
  label?: string;
  onDone?: () => void;
}

/**
 * The check of the D, drawn with an animated stroke (`stroke-dashoffset`, ~360 ms, ease-out, once). With
 * `prefers-reduced-motion` it appears already drawn. Web and tests; native has its own file.
 */
export function CheckMark({ size = 48, tone = 'brand', play = true, label, onDone }: CheckMarkProps) {
  const reduced = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  const still = !play || reduced;
  const [drawn, setDrawn] = useState(still);
  useEffect(() => {
    if (still) { setDrawn(true); return undefined; }
    setDrawn(false);
    let frame = 0;
    const first = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setDrawn(true)); });
    const timer = setTimeout(() => done.current?.(), MOTION.checkMs);
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [still]);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' };
  return createElement('svg', { viewBox: `0 0 ${CHECK_VIEWBOX} ${CHECK_VIEWBOX}`, width: size, height: size, 'data-check': drawn ? 'drawn' : 'drawing', style: { display: 'block', flexShrink: 0 }, ...a11y },
    createElement('path', {
      d: CHECK_PATH, fill: 'none', stroke: CHECK_TONES[tone], strokeWidth: CHECK_STROKE, strokeLinecap: 'round', strokeLinejoin: 'round',
      strokeDasharray: CHECK_LENGTH, strokeDashoffset: drawn ? 0 : CHECK_LENGTH,
      style: still ? undefined : { transition: `stroke-dashoffset ${MOTION.checkMs}ms cubic-bezier(0.22, 1, 0.36, 1)` }
    }));
}
