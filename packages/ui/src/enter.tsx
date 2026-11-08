import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { MOTION, useReducedMotion, type MotionDirection } from './motion';
import { VIEW_BASE, revealStyle, useReveal } from './motion-reveal';

export interface EnterProps {
  children?: ReactNode;
  /** Where it comes from. `down` (default) rises 8 px; `none` is a pure fade. */
  from?: MotionDirection;
  /** Wait before entering, in ms (Stagger sets it). */
  delay?: number;
  durationMs?: number;
  distance?: number;
  /** `true` (default) shows it; flipping to `false` retargets from the current position and leaves faster than it entered. */
  play?: boolean;
  /** Fills the free space of a flex parent, like `flex: 1`. */
  grow?: boolean;
  testID?: string;
  /** Called once the entrance has finished (never under Reduce Motion: there is nothing to wait for). */
  onDone?: () => void;
}

/**
 * Entrance with direction (opacity + transform only, ~220 ms, strong ease-out, once). Web draws it with a CSS transition,
 * so it is interruptible; under `prefers-reduced-motion` the content is in its final state on the first paint.
 * Reading order never changes: the content is in the DOM from the first frame.
 */
export function Enter({ children, from = 'down', delay = 0, durationMs = MOTION.enterMs, distance = MOTION.enterDistance, play = true, grow = false, testID, onDone }: EnterProps) {
  const reduced = useReducedMotion();
  const entered = useReveal(play, reduced);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (reduced || !entered) return undefined;
    const timer = setTimeout(() => done.current?.(), delay + durationMs);
    return () => clearTimeout(timer);
  }, [reduced, entered, delay, durationMs]);
  const style: CSSProperties = { ...VIEW_BASE, ...(grow ? { flexGrow: 1 } : null), ...revealStyle({ entered, reduced, from, distance, durationMs, delayMs: delay }) };
  return createElement('div', { style, 'data-testid': testID, 'data-enter': entered ? 'in' : 'out' }, children);
}

/** Same thing, named for what it looks like. */
export const FadeSlide = Enter;
