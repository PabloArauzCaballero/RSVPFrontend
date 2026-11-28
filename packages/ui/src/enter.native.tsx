import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import { EASE, MOTION, offsetFor, useReducedMotion } from './motion';
import type { EnterProps } from './enter';

/**
 * Extra time past the animation's own end before the entrance is forced to its final state. The native driver is the only thing that
 * moves `opacity`, and when it never starts or never reports back (MV-B1: step 3 of the phone flow stayed at opacity 0) nothing on the
 * JS side noticed. This timer runs on the JS clock, so the content is visible whatever the driver did.
 */
export const ENTER_SETTLE_MARGIN_MS = 250;

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
  // Once an entrance is over the view is rendered with plain final props (no animated node attached), so its visibility no longer
  // depends on the native driver having delivered the last frame.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (reduced) { progress.setValue(play ? 1 : 0); return undefined; }
    let over = false;
    const settle = (): void => {
      if (over || !play) return;
      over = true;
      progress.setValue(1);
      setSettled(true);
      done.current?.();
    };
    const run = Animated.timing(progress, { toValue: play ? 1 : 0, duration: play ? durationMs : MOTION.exitMs, delay: play ? delay : 0, easing: OUT, useNativeDriver: true });
    run.start(({ finished }) => { if (finished) settle(); });
    const guard = play ? setTimeout(settle, delay + durationMs + ENTER_SETTLE_MARGIN_MS) : undefined;
    return () => { over = true; if (guard !== undefined) clearTimeout(guard); run.stop(); };
  }, [reduced, play, delay, durationMs, progress]);
  const { x, y } = offsetFor(reduced ? 'none' : from, distance);
  return (
    <Animated.View
      testID={testID}
      style={[
        grow ? { flexGrow: 1 } : null,
        settled && play ? { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }] } : { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [x, 0] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }
      ]}
    >
      {children}
    </Animated.View>
  );
}

export const FadeSlide = Enter;
