import { useEffect, useRef, type ReactNode } from "react";
import { AccessibilityInfo, Platform, findNodeHandle, Text } from "react-native";
import { useStyles } from "../../ui";

/**
 * The heading of a step. When the step changes the person's focus would stay on a button that no longer exists: this moves it to the new
 * heading (web: a programmatic focus on a heading that is not in the tab order; native: the screen reader's focus), so the new step is announced.
 */
export function StepHeading({ children, focusOnMount, testID }: { readonly children: string; /** False for the first step of the assistant: the screen already handles its own title. */ readonly focusOnMount: boolean; readonly testID?: string }): ReactNode {
  const styles = useStyles();
  const ref = useRef<Text>(null);
  useEffect(() => {
    if (!focusOnMount) return;
    const node = ref.current;
    if (!node) return;
    if (Platform.OS === "web") (node as unknown as { focus?: () => void }).focus?.();
    else { const handle = findNodeHandle(node); if (handle) AccessibilityInfo.setAccessibilityFocus(handle); }
  }, [focusOnMount]);
  return <Text ref={ref} accessibilityRole="header" aria-level={2} tabIndex={-1} {...(testID ? { testID } : {})} style={[styles.subtitle, { outlineStyle: "none" } as object]}>{children}</Text>;
}
