import { AccessibilityInfo, findNodeHandle, type Text, type View } from "react-native";

/** Native: VoiceOver and TalkBack focus, the same contract as `move-focus.ts` on web (the pattern of `ScreenTransition` in @rsvp/ui). */
export function moveFocus(node: View | Text | null): void {
  const handle = node ? findNodeHandle(node) : null;
  if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
}
