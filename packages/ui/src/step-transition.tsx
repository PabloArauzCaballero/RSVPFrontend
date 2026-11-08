import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { MOTION, useReducedMotion } from './motion';
import { VIEW_BASE, revealStyle, useReveal } from './motion-reveal';

export type StepDirection = 'forward' | 'back';

export interface StepTransitionProps {
  /** Current step (1-based). Changing it swaps the content with a slide in the direction of travel. */
  step: number;
  /** Force the direction; by default it follows the numbers (higher = forward). */
  direction?: StepDirection;
  /** Translated name of the current step, e.g. "Paso 2 de 3: Fecha". Read when focus moves to the new step. */
  announce?: string;
  children?: ReactNode;
}

interface PanelProps { dir: StepDirection | 'none'; announce?: string; children?: ReactNode }

function Panel({ dir, announce, children }: PanelProps) {
  const reduced = useReducedMotion();
  const entered = useReveal(true, reduced);
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dir !== 'none') node.current?.focus({ preventScroll: true });
  }, [dir]);
  const style = dir === 'none'
    ? { ...VIEW_BASE, outline: 'none' }
    : { ...VIEW_BASE, outline: 'none', ...revealStyle({ entered, reduced, from: dir === 'forward' ? 'right' : 'left', distance: MOTION.stepDistance, durationMs: MOTION.stepMs, exitMs: 0 }) };
  return createElement('div', { ref: node, tabIndex: -1, role: announce ? 'group' : undefined, 'aria-label': announce, 'data-step-direction': dir, style }, children);
}

/**
 * The 3-step flow: the new step slides in from the side you are heading to (forward from the right, back from the left,
 * 24 px, 240 ms, strong ease-out) while fading in; the old step is replaced at once (leaving is faster than arriving).
 * The first step is never animated. On every change focus moves to the step (a labelled group, so the screen reader reads
 * `announce`) instead of being lost when the pressed button disappears. Under Reduce Motion the step just swaps.
 */
export function StepTransition({ step, direction, announce, children }: StepTransitionProps) {
  const [track, setTrack] = useState<{ step: number; dir: StepDirection | 'none' }>({ step, dir: 'none' });
  let current = track;
  if (track.step !== step) {
    current = { step, dir: direction ?? (step > track.step ? 'forward' : 'back') };
    setTrack(current);
  }
  return <Panel key={step} dir={current.dir} announce={announce}>{children}</Panel>;
}
