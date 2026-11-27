import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

/** The part of React Native's AppState this module needs (tests pass a fake). */
export interface AppStateSource {
  readonly addEventListener: (type: "change", listener: (state: AppStateStatus) => void) => { readonly remove: () => void };
}

/** The app counts as focused while it is `active`; going to the background or back from it calls `handleFocus`. Returns the unsubscribe. */
export function subscribeAppStateFocus(handleFocus: (focused: boolean) => void, source: AppStateSource = AppState): () => void {
  const subscription = source.addEventListener("change", (state) => handleFocus(state === "active"));
  return () => subscription.remove();
}

/**
 * On iOS and Android React Query has no window focus, so a query that refetches «on focus» (the lead context of a member's gift list,
 * which expires in 300 s and whose poll pauses in the background) never would. This feeds its focusManager from AppState.
 * On web the default (visibilitychange) is kept.
 */
export function useAppStateFocus(): void {
  useEffect(() => {
    if (Platform.OS === "web") return;
    focusManager.setEventListener((handleFocus) => subscribeAppStateFocus(handleFocus));
  }, []);
}
