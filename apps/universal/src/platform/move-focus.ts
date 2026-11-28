import type { Text, View } from "react-native";

/**
 * Puts keyboard and screen-reader focus on a node the person has just been taken to (web). A heading is not focusable by itself, so it
 * gets `tabindex="-1"`: reachable by this call, never an extra stop of the Tab order. Native: `move-focus.native.ts`.
 */
export function moveFocus(node: View | Text | null): void {
  const element = node as unknown as HTMLElement | null;
  if (!element || typeof element.focus !== "function") return;
  if (element.tabIndex < 0 && !element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  element.focus();
}
