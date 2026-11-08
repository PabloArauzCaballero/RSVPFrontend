import { useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { EASE, MIN_TARGET, MOTION, useReducedMotion } from './motion';
import type { PressFeedbackProps } from './press-feedback';

const OUT = Easing.bezier(EASE.out[0], EASE.out[1], EASE.out[2], EASE.out[3]);

/**
 * Native: scale 0.97 with `Animated` on the native driver; the scale sits on an inner view so the 44 pt hit area is intact.
 * Press-in animates from the current value, so a quick second tap never jumps. Reduce Motion dims instead of scaling.
 */
export function PressFeedback({ children, style, minTarget = true, accessibilityRole = 'button', onPressIn, onPressOut, disabled, ...rest }: PressFeedbackProps) {
  const reduced = useReducedMotion();
  const level = useRef(new Animated.Value(0)).current;
  const to = (value: number, duration: number): void => { Animated.timing(level, { toValue: value, duration, easing: OUT, useNativeDriver: true }).start(); };
  const scale = level.interpolate({ inputRange: [0, 1], outputRange: [1, MOTION.pressScale] });
  const opacity = level.interpolate({ inputRange: [0, 1], outputRange: [1, MOTION.pressReducedOpacity] });
  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPressIn={(event) => { if (!disabled) to(1, MOTION.pressInMs); onPressIn?.(event); }}
      onPressOut={(event) => { to(0, MOTION.pressOutMs); onPressOut?.(event); }}
      style={[minTarget ? { minWidth: MIN_TARGET, minHeight: MIN_TARGET } : null, style]}
    >
      <Animated.View style={[{ flexGrow: 1 }, reduced ? { opacity } : { transform: [{ scale }] }]}>
        <View style={{ flexGrow: 1, justifyContent: 'center' }}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}
