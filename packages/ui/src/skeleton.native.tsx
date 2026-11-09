import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { EASE, MOTION, useReducedMotion } from './motion';
import { SkeletonRow } from './skeleton-shapes';
import { useTheme } from './theme';
import type { SkeletonListProps } from './skeleton';

export { Skeleton, SkeletonRow, type SkeletonProps, type SkeletonRowProps } from './skeleton-shapes';

const IN_OUT = Easing.bezier(EASE.inOut[0], EASE.inOut[1], EASE.inOut[2], EASE.inOut[3]);

/** Native: one opacity pulse on the whole group with the native driver; stops on unmount and under Reduce Motion. */
export function SkeletonList({ count = 5, row, label, children }: SkeletonListProps) {
  const reduced = useReducedMotion();
  const { strings } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) { pulse.setValue(1); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: MOTION.skeletonLow, duration: MOTION.skeletonMs, easing: IN_OUT, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: MOTION.skeletonMs, easing: IN_OUT, useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label ?? strings.loading} accessibilityState={{ busy: true }} importantForAccessibility="yes">
      <Animated.View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ opacity: pulse }}>
        {children ?? Array.from({ length: count }, (_, index) => <SkeletonRow key={index} {...row} />)}
      </Animated.View>
    </View>
  );
}
