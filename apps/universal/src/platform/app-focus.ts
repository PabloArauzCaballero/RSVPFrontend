import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

/** The part of React Native's AppState this module needs (tests pass a fake). */
export interface AppStateSource {
  readonly addEventListener: (type: "change", listener: (state: AppStateStatus) => void) => { readonly remove: () => void };
}

/**
 * Only `background` is a loss of focus. iOS also reports `inactive` while the app is still on screen (Face ID, the image or document picker, the
 * notification center, an incoming call banner): counting it as a loss would refetch every query when the person comes back from the picker.
 * Coming back from `background` goes background → inactive → active; `focusManager` notifies only on a change, so the refetch happens once.
 */
const isFocused = (state: AppStateStatus): boolean => state !== "background";

/** Calls `handleFocus` as the app goes to the background or returns from it. Returns the unsubscribe. */
export function subscribeAppStateFocus(handleFocus: (focused: boolean) => void, source: AppStateSource = AppState): () => void {
  const subscription = source.addEventListener("change", (state) => handleFocus(isFocused(state)));
  return () => subscription.remove();
}

/**
 * On iOS and Android React Query has no window focus, so a query that refetches «on focus» never would. This feeds its global focusManager from
 * AppState (TanStack's recommended React Native setup): stale queries are re-read when the app returns to the foreground, and the lead context of a
 * member's gift list (300 s TTL, poll paused in the background) is renewed. The listener is removed on unmount and the manager goes back to its default.
 * On web the default (visibilitychange) is kept.
 */
export function useAppStateFocus(): void {
  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    const stop = subscribeAppStateFocus((focused) => focusManager.setFocused(focused));
    return () => { stop(); focusManager.setFocused(undefined); };
  }, []);
}
