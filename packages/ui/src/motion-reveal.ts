import { useEffect, useState, type CSSProperties } from 'react';
import { MOTION, cssEase, offsetFor, type MotionDirection } from './motion';

/** Web only. Shared by Enter, StepTransition and ScreenTransition: the CSS of an element that is "in" or "out". */
export interface RevealOptions {
  entered: boolean;
  reduced: boolean;
  from?: MotionDirection;
  distance?: number;
  durationMs?: number;
  exitMs?: number;
  delayMs?: number;
}

/** Layout the same way a React Native `View` lays out on web, so wrapping children does not change the flow. */
export const VIEW_BASE: CSSProperties = { display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative', minWidth: 0, minHeight: 0, boxSizing: 'border-box' };

/**
 * `transform: none` (not `translate(0)`) once entered, so a settled element creates no containing block for
 * fixed/absolute descendants. Only transform and opacity change: no layout shift, compositor friendly.
 * Under Reduce Motion there is no transition at all: the final state is applied at once.
 */
export function revealStyle({ entered, reduced, from = 'down', distance = MOTION.enterDistance, durationMs = MOTION.enterMs, exitMs = MOTION.exitMs, delayMs = 0 }: RevealOptions): CSSProperties {
  const { x, y } = offsetFor(reduced ? 'none' : from, distance);
  const style: CSSProperties = {
    opacity: entered ? 1 : 0,
    transform: entered || (x === 0 && y === 0) ? 'none' : `translate(${x}px, ${y}px)`
  };
  if (!reduced) {
    const ms = entered ? durationMs : exitMs;
    const ease = cssEase('out');
    style.transition = `opacity ${ms}ms ${ease}, transform ${ms}ms ${ease}`;
    if (entered && delayMs > 0) style.transitionDelay = `${delayMs}ms`;
  }
  return style;
}

/**
 * Drives `entered`. Starts hidden, flips after two frames so the browser paints the hidden state first (a CSS transition
 * needs a "before"); a timer covers hidden tabs where animation frames do not run. Turning `play` off retargets
 * immediately from wherever the element is (transitions are interruptible; keyframes would restart).
 */
export function useReveal(play: boolean, reduced: boolean): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (reduced) return undefined;
    if (!play) { setShown(false); return undefined; }
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)); });
    const fallback = setTimeout(() => setShown(true), 80);
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(fallback); };
  }, [play, reduced]);
  return reduced ? play : shown;
}
