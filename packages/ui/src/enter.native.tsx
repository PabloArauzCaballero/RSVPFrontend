import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import { EASE, MOTION, offsetFor, useReducedMotion } from './motion';
import type { EnterProps } from './enter';

const OUT = Easing.bezier(EASE.out[0], EASE.out[1], EASE.out[2], EASE.out[3]);

/**
 * Native: the same entrance with `Animated` and the native driver (transform + opacity only, so it keeps running while
 * JS is busy). Static with Reduce Motion. The system answer is cached app-wide, so only the first frames after launch are still.
 */
export function Enter({ children, from = 'down', delay = 0, durationMs = MOTION.enterMs, distance = MOTION.enterDistance, play = true, grow = false, testID, onDone }: EnterProps): ReactNode {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced && play ? 1 : 0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (reduced) { progress.setValue(play ? 1 : 0); return undefined; }
    const run = Animated.timing(progress, { toValue: play ? 1 : 0, duration: play ? durationMs : MOTION.exitMs, delay: play ? delay : 0, easing: OUT, useNativeDriver: true });
    run.start(({ finished }) => { if (finished && play) done.current?.(); });
    return () => run.stop();
  }, [reduced, play, delay, durationMs, progress]);
  const { x, y } = offsetFor(reduced ? 'none' : from, distance);
  return (
    <Animated.View
      testID={testID}
      style={[
        grow ? { flexGrow: 1 } : null,
        { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [x, 0] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }
      ]}
    >
      {children}
    </Animated.View>
  );
}

export const FadeSlide = Enter;
