import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CHECK_LENGTH, CHECK_PATH, CHECK_STROKE, CHECK_TONES, CHECK_VIEWBOX } from './check-geometry';
import { MOTION, useReducedMotion } from './motion';
import type { CheckMarkProps } from './check-mark';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Native: the same tick drawn with `Animated` on `strokeDashoffset` (the JS driver: SVG props are not native-driven). Static with Reduce Motion. */
export function CheckMark({ size = 48, tone = 'brand', play = true, label, onDone }: CheckMarkProps) {
  const reduced = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  const still = !play || reduced;
  const offset = useRef(new Animated.Value(still ? 0 : CHECK_LENGTH)).current;
  useEffect(() => {
    if (still) { offset.setValue(0); return undefined; }
    offset.setValue(CHECK_LENGTH);
    const run = Animated.timing(offset, { toValue: 0, duration: MOTION.checkMs, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    run.start(({ finished }) => { if (finished) done.current?.(); });
    return () => run.stop();
  }, [still, offset]);
  const a11y = label ? { accessibilityRole: 'image' as const, accessibilityLabel: label } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Svg {...a11y} viewBox={`0 0 ${CHECK_VIEWBOX} ${CHECK_VIEWBOX}`} width={size} height={size}>
      <AnimatedPath d={CHECK_PATH} fill="none" stroke={CHECK_TONES[tone]} strokeWidth={CHECK_STROKE} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[CHECK_LENGTH, CHECK_LENGTH]} strokeDashoffset={offset} />
    </Svg>
  );
}
