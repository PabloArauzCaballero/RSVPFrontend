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
  /** Move focus to the screen's level-1 heading when this mounts after a navigation (default true). */
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

/**
 * Moves keyboard and screen-reader focus to `node` without scrolling. A heading gets `tabindex="-1"` so it can take focus
 * without entering the tab order. Returns the node it moved to, or `null` when there is nothing to focus. (`announce` is
 * for native only, kept so the call site is identical.)
 */
export function moveScreenFocus(node: unknown, _announce?: string): unknown {
  if (!(node instanceof HTMLElement)) return null;
  if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
  node.focus({ preventScroll: true });
  return node;
}

/** True when the element focus was moved to has left the page and took focus with it (nobody chose another place). */
export function screenFocusWasLost(node: unknown): boolean {
  return node instanceof HTMLElement && !node.isConnected && (document.activeElement === null || document.activeElement === document.body);
}

/**
 * The heading of the screen `start` belongs to: the one in its nearest ancestor that has a heading. Never the first heading
 * of the document: a navigator keeps earlier screens mounted and hidden, and theirs come first.
 */
function ownHeading(start: HTMLElement | null): HTMLElement | null {
  for (let node = start?.parentElement; node; node = node.parentElement) {
    const heading = node.querySelector<HTMLElement>(HEADING);
    if (heading) return heading;
  }
  return null;
}

function Panel({ groupKey, focusHeading, resetScroll, children }: Omit<ScreenTransitionProps, 'routeKey'>) {
  const reduced = useReducedMotion();
  const [change] = useState(() => peekScreenChange(groupKey));
  const entered = useReveal(!change.initial, reduced);
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!change.initial) {
      if (resetScroll !== false) scrollToTop(node.current);
      if (focusHeading !== false) moveScreenFocus(ownHeading(node.current));
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
 * rise between destinations), puts scroll back at the top and moves focus to the level-1 heading of its own screen, so
 * keyboard and screen reader users land where a sighted user looks. A host that decides focus itself (the app's `Screen`,
 * which follows the navigator's focus, not this mount) passes `focusHeading={false}`. The very first screen of the session is left alone: no animation and no
 * focus theft. Under Reduce Motion the content is there at once, but scroll and focus still move.
 */
export function ScreenTransition({ routeKey, ...rest }: ScreenTransitionProps) {
  return <Panel key={routeKey} {...rest} />;
}
