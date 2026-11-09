import { createElement, type ReactNode } from 'react';
import { MOTION, cssEase, useReducedMotion } from './motion';
import { VIEW_BASE } from './motion-reveal';
import { SkeletonRow, type SkeletonRowProps } from './skeleton-shapes';
import { useTheme } from './theme';

export { Skeleton, SkeletonRow, type SkeletonProps, type SkeletonRowProps } from './skeleton-shapes';

export interface SkeletonListProps {
  /** How many rows to draw (default 5). */
  count?: number;
  /** Shape of every row; pass `children` instead for a custom skeleton. */
  row?: SkeletonRowProps;
  /** Announced to screen readers; defaults to the shared `ui.loading` text of the current language. */
  label?: string;
  children?: ReactNode;
}

const CSS = `@keyframes rsvp-skeleton-pulse{from{opacity:1}to{opacity:${MOTION.skeletonLow}}}.rsvp-skeleton-pulse{animation:rsvp-skeleton-pulse ${MOTION.skeletonMs}ms ${cssEase('inOut')} infinite alternate}@media (prefers-reduced-motion:reduce){.rsvp-skeleton-pulse{animation:none}}`;
const HIDDEN_TEXT = { position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;

/**
 * Loading placeholder for a list: rows shaped like the real ones, one slow opacity pulse on the whole group (a single
 * compositor layer, not one animation per block) and a polite `status` region that says it is loading. The pulse is the only
 * loop in the product and it exists only while loading; under Reduce Motion the blocks are still.
 */
export function SkeletonList({ count = 5, row, label, children }: SkeletonListProps) {
  const reduced = useReducedMotion();
  const { strings } = useTheme();
  const text = label ?? strings.loading;
  return createElement('div', { role: 'status', 'aria-busy': true, style: VIEW_BASE, 'data-skeleton': reduced ? 'still' : 'pulse' },
    createElement('style', { href: 'rsvp-motion-skeleton', precedence: 'rsvp-motion' }, CSS),
    createElement('span', { style: HIDDEN_TEXT }, text),
    createElement('div', { className: reduced ? undefined : 'rsvp-skeleton-pulse', style: VIEW_BASE },
      children ?? Array.from({ length: count }, (_, index) => <SkeletonRow key={index} {...row} />)));
}
