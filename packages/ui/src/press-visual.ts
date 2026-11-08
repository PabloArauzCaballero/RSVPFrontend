import { createContext } from 'react';
import type { ViewStyle } from 'react-native';
import { MOTION, cssEase } from './motion';

/** Where a `Button` sits on a wide screen: at the start of its row (default) or centred (EmptyState and Celebrate set it). */
export const ButtonAlignContext = createContext<'start' | 'center'>('start');

/**
 * Visual of a pressed control: scales to 0.97 (dims to 0.72 under Reduce Motion). Apply it to an inner view so the
 * pressable area keeps its size. `transition*` is web-only and ignored by native views.
 */
export function pressVisual(active: boolean, reduced: boolean): ViewStyle {
  if (reduced) return { opacity: active ? MOTION.pressReducedOpacity : 1 };
  return { transform: active ? `scale(${MOTION.pressScale})` : 'none', transitionProperty: 'transform', transitionDuration: `${active ? MOTION.pressInMs : MOTION.pressOutMs}ms`, transitionTimingFunction: cssEase('out') } as unknown as ViewStyle;
}
