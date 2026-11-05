'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createImpressionBatcher, recordImpressions } from '../lib/impressions';
import { createGuestClient } from '../lib/guest-client';

/** Wraps a results list: each `[data-listing-id]` child that becomes visible (half of it, for a moment) counts as one impression. */
export function ImpressionTracker({ surface, children }: { readonly surface: string; readonly children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const client = createGuestClient();
    const batcher = createImpressionBatcher((body) => recordImpressions(client, body), surface);
    const timers = new Map<Element, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset['listingId'];
        if (!id) continue;
        if (entry.isIntersecting) timers.set(entry.target, window.setTimeout(() => { batcher.seen(id); observer.unobserve(entry.target); }, 250));
        else { window.clearTimeout(timers.get(entry.target)); timers.delete(entry.target); }
      }
    }, { threshold: 0.5 });
    element.querySelectorAll('[data-listing-id]').forEach((node) => observer.observe(node));
    const onHide = () => { void batcher.flush(); };
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); timers.forEach((id) => window.clearTimeout(id)); observer.disconnect(); void batcher.flush(); };
  }, [surface]);
  return <div ref={root}>{children}</div>;
}
