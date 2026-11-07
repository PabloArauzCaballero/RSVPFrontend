import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export { MOTION } from './motion';

/** Native: `AccessibilityInfo.isReduceMotionEnabled` plus the change event. Until it answers, motion stays off (safe default). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; subscription.remove(); };
  }, []);
  return reduced;
}
