import { useEffect, useState } from 'react';

/** Motion tokens of the "toque" (rsvp-motion-design): one celebratory animation, short, eased out, never looped. */
export const MOTION = { checkMs: 360, popMs: 260 } as const;

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
