import { useState, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TARGET, MOTION, cssEase, useReducedMotion } from './motion';

export interface PressFeedbackProps extends Omit<PressableProps, 'children' | 'style'> {
  children?: ReactNode;
  /** Style of the outer hit area (layout: width, margin, flex...). The visual that scales sits inside it. */
  style?: StyleProp<ViewStyle>;
  /** Keep the touch target at least 44 x 44 (default). Turn off only when the child already guarantees it. */
  minTarget?: boolean;
}

/**
 * Press feedback: the content scales to 0.97 on press-in (90 ms) and returns in 160 ms, in the ease-out of the product.
 * The scale lives on an inner view, so the pressable area (44 px minimum) never shrinks. With Reduce Motion there is no
 * scale: the content dims to 0.72 instead, so the press is still seen. No hover motion (touch fires false hovers).
 */
export function PressFeedback({ children, style, minTarget = true, accessibilityRole = 'button', onPressIn, onPressOut, disabled, ...rest }: PressFeedbackProps) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const active = pressed && !disabled;
  const ms = active ? MOTION.pressInMs : MOTION.pressOutMs;
  const ease = cssEase('out');
  const inner = reduced
    ? { opacity: active ? MOTION.pressReducedOpacity : 1 }
    : { transform: active ? `scale(${MOTION.pressScale})` : 'none', transitionProperty: 'transform', transitionDuration: `${ms}ms`, transitionTimingFunction: ease };
  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPressIn={(event) => { setPressed(true); onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); onPressOut?.(event); }}
      style={[minTarget ? { minWidth: MIN_TARGET, minHeight: MIN_TARGET } : null, style]}
    >
      <View style={[{ flexGrow: 1, justifyContent: 'center' }, inner as ViewStyle]}>{children}</View>
    </Pressable>
  );
}
