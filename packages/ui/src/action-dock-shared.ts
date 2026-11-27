import { createContext, type ReactNode } from 'react';

/**
 * Shared by `action-dock.tsx` (web) and `action-dock.native.tsx`, and by `StickyActions`. It lives in a file without a platform
 * variant because `x.native.tsx` must never import its own base name (see `native-self-import.test.ts`).
 *
 * The problem it solves: on a phone the primary action of a form must stay at the bottom edge while the content scrolls, but
 * the screens render `StickyActions` deep inside a `ScrollView`, where nothing can be "fixed". The screen shell wraps its
 * scroll area in an `ActionDock`; a `StickyActions` that finds a dock above it publishes its bar here instead of drawing it in
 * the flow, and the dock draws it under the scroll area. No screen has to move its markup.
 */

export interface DockEntry {
  readonly id: number;
  readonly priority: number;
  readonly node: ReactNode;
}

export interface DockStore {
  /** A slot number for one `StickyActions` instance; later mounts have higher numbers. */
  claim(): number;
  /** Publishes (or replaces) the bar of a slot; the first publish fixes its place in the mount order. */
  publish(id: number, priority: number, node: ReactNode): void;
  withdraw(id: number): void;
  subscribe(listener: () => void): () => void;
  /** The bar to show right now, or null. Stable between changes (for `useSyncExternalStore`). */
  snapshot(): DockEntry | null;
}

/** Higher priority wins; among equals the most recently mounted bar (a form opened over the screen's own action) wins. */
export function pickEntry(entries: Iterable<DockEntry>): DockEntry | null {
  let best: DockEntry | null = null;
  for (const entry of entries) {
    if (best === null || entry.priority > best.priority || (entry.priority === best.priority && entry.id > best.id)) best = entry;
  }
  return best;
}

export function createDockStore(): DockStore {
  const entries = new Map<number, DockEntry>();
  const listeners = new Set<() => void>();
  let counter = 0;
  let current: DockEntry | null = null;
  const refresh = (): void => {
    const next = pickEntry(entries.values());
    if (next === current) return;
    current = next;
    listeners.forEach((listener) => listener());
  };
  return {
    claim: () => ++counter,
    publish: (id, priority, node) => { entries.set(id, { id, priority, node }); refresh(); },
    withdraw: (id) => { if (entries.delete(id)) refresh(); },
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => current
  };
}

/** Null outside an `ActionDock`: `StickyActions` then draws itself in the flow (web: sticky). */
export const ActionDockContext = createContext<DockStore | null>(null);

/**
 * How far the on-screen keyboard reaches over the bottom of the dock's box: `boxBottom` is the box's bottom edge and
 * `keyboardTop` the keyboard's top edge, both in window coordinates. Zero when the keyboard is hidden, below the box, or the
 * system already resized the window.
 */
export function keyboardOverlap(boxBottom: number, keyboardTop: number): number {
  if (!Number.isFinite(boxBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, Math.round(boxBottom - keyboardTop));
}
