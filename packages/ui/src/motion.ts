import { useEffect, useState } from 'react';

/**
 * Motion tokens of DOne (rsvp-motion-design, docs/design/motion.md). Everything animated in the product reads from
 * here: durations in milliseconds, distances in px, scales as ratios. Only `transform` and `opacity` are ever
 * animated. The check (`checkMs`, `popMs`) is the single celebratory gesture; the rest is functional motion.
 */
export const MOTION = {
  /** The check of the D draws itself (the one celebratory animation). */
  checkMs: 360,
  popMs: 260,
  /** Press feedback: instant on press-in, slightly slower release (animate-expo, emil-design-eng: 100-160 ms). */
  pressInMs: 90,
  pressOutMs: 160,
  pressScale: 0.97,
  /** With Reduce Motion the scale is replaced by this opacity so the press stays legible without movement. */
  pressReducedOpacity: 0.72,
  /** Entrances (lists, cards, the next step on Inicio): 150-250 ms, eased out; exits are faster than entrances. */
  enterMs: 220,
  exitMs: 150,
  enterDistance: 8,
  /** Steps of the 3-step flow: a direction-aware slide, the only place that moves sideways. */
  stepMs: 240,
  stepDistance: 24,
  /** Screen changes: a fade; a short rise only when the destination changes (peers never slide). */
  screenMs: 200,
  sectionMs: 140,
  screenDistance: 6,
  /** Lists: 40 ms between rows, at most 8 rows animate (320 ms of delay in total); the rest appear in place. */
  staggerMs: 40,
  staggerMax: 8,
  /** Loading skeleton: one slow opacity pulse on the whole group (the only loop, only while loading). */
  skeletonMs: 1400,
  skeletonLow: 0.55
} as const;

/** Minimum touch target in px (WCAG 2.2 AA 2.5.8 with margin; the product rule is 44). */
export const MIN_TARGET = 44;

/** Curves as cubic-bezier control points. `out` is the strong ease-out for entering/exiting; `inOut` for movement on screen. */
export const EASE = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1]
} as const;

export type EaseName = keyof typeof EASE;
export const cssEase = (name: EaseName = 'out'): string => `cubic-bezier(${EASE[name].join(', ')})`;

/** Where the element comes from: `down` rises from below, `up` descends from above, `left`/`right` slide in sideways. */
export type MotionDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export function offsetFor(direction: MotionDirection, distance: number): { x: number; y: number } {
  switch (direction) {
    case 'down': return { x: 0, y: distance };
    case 'up': return { x: 0, y: -distance };
    case 'left': return { x: -distance, y: 0 };
    case 'right': return { x: distance, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

/** Delay of the row at `index` (ms), or `undefined` when it is past the cap and should appear without animating. */
export function staggerDelay(index: number, max: number = MOTION.staggerMax, stepMs: number = MOTION.staggerMs): number | undefined {
  return index >= 0 && index < max ? index * stepMs : undefined;
}

const QUERY = '(prefers-reduced-motion: reduce)';

/** Web: reads `prefers-reduced-motion` synchronously (first paint already honours it) and follows changes. */
export function useReducedMotion(): boolean {
  const read = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
  const [reduced, setReduced] = useState(read);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(QUERY);
    const onChange = (): void => setReduced(media.matches);
    onChange();
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}
