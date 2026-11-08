import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export { MOTION, EASE, MIN_TARGET, cssEase, offsetFor, staggerDelay, type EaseName, type MotionDirection } from './motion';

let known: boolean | undefined;
let started = false;
const listeners = new Set<(reduced: boolean) => void>();

function publish(reduced: boolean): void {
  known = reduced;
  listeners.forEach((listener) => listener(reduced));
}

/** Asks the system once (at import) and follows changes for the life of the app, so later mounts know the answer at first render. */
function start(): void {
  if (started) return;
  started = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(publish).catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
}
start();

/**
 * Native: `AccessibilityInfo.isReduceMotionEnabled` plus the change event, cached app-wide. Until the system has answered
 * (only the very first frames after launch) motion stays off, which is the safe default; every later mount already knows.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(known ?? true);
  useEffect(() => {
    start();
    listeners.add(setReduced);
    if (known !== undefined) setReduced(known);
    return () => { listeners.delete(setReduced); };
  }, []);
  return reduced;
}
