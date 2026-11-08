import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { MOTION, useReducedMotion } from './motion';
import { commitScreenChange, peekScreenChange } from './motion-history';
import { VIEW_BASE, revealStyle, useReveal } from './motion-reveal';

export { resetScreenHistory } from './motion-history';

export interface ScreenTransitionProps {
  /** Identity of the screen (the current route key). A new value plays a new transition. */
  routeKey: string;
  /** Destination the screen belongs to (Inicio, Invitados...). Moving to another destination rises 6 px; sibling tabs only fade. */
  groupKey?: string;
  /** Move focus to the page's level-1 heading after navigating (default true). */
  focusHeading?: boolean;
  /** Scroll the nearest scrolled ancestor and the window back to the top after navigating (default true). */
  resetScroll?: boolean;
  /** Native only (ignored on web, kept so the call site is identical). */
  title?: string;
  children?: ReactNode;
}

const HEADING = 'h1, [role="heading"][aria-level="1"]';

/** Walks up from `start` zeroing every scrolled container, then the window. */
export function scrollToTop(start: HTMLElement | null): void {
  for (let node = start?.parentElement; node; node = node.parentElement) if (node.scrollTop > 0) node.scrollTop = 0;
  if (typeof window.scrollTo === 'function') {
    try { window.scrollTo(0, 0); } catch { /* environments without layout have nothing to scroll */ }
  }
}

function focusHeadingOf(doc: Document): void {
  const heading = doc.querySelector<HTMLElement>(HEADING);
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

function Panel({ groupKey, focusHeading, resetScroll, children }: Omit<ScreenTransitionProps, 'routeKey'>) {
  const reduced = useReducedMotion();
  const [change] = useState(() => peekScreenChange(groupKey));
  const entered = useReveal(!change.initial, reduced);
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!change.initial) {
      if (resetScroll !== false) scrollToTop(node.current);
      if (focusHeading !== false) focusHeadingOf(document);
    }
    commitScreenChange(groupKey);
  }, [change.initial, groupKey, focusHeading, resetScroll]);
  const rise = change.kind === 'screen';
  const style = change.initial
    ? { ...VIEW_BASE, flexGrow: 1 }
    : { ...VIEW_BASE, flexGrow: 1, ...revealStyle({ entered, reduced, from: rise ? 'down' : 'none', distance: MOTION.screenDistance, durationMs: rise ? MOTION.screenMs : MOTION.sectionMs }) };
  return createElement('div', { ref: node, style, 'data-screen-transition': change.initial ? 'initial' : change.kind }, children);
}

/**
 * Wraps the content of `Screen`. Every navigation fades the new content in (220 ms between sibling tabs, 360 ms with a 6 px
 * rise between destinations), puts scroll back at the top and moves focus to the level-1 heading, so keyboard and screen
 * reader users land where a sighted user looks. The very first screen of the session is left alone: no animation and no
 * focus theft. Under Reduce Motion the content is there at once, but scroll and focus still move.
 */
export function ScreenTransition({ routeKey, ...rest }: ScreenTransitionProps) {
  return <Panel key={routeKey} {...rest} />;
}
