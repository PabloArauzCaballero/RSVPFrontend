import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { PURCHASE_STORE_KEY, usePurchasePrompt, type PurchasePrompt, type PurchasePromptEnv } from "@rsvp/query-hooks";
import { readLocal, writeLocal } from "../platform/local-store";

/**
 * R5 · «¿Compraste …?» in the app. The attempts are device-local and never leave it (PF-1): the device store (`readLocal`/`writeLocal`: SecureStore on
 * iOS and Android, localStorage on the web build, both guarded) is read once into memory, so the shared logic stays synchronous.
 * «Back from the provider» is `AppState` going from `background` to `active` (react-native-web maps it to `visibilitychange`); the web build also
 * listens to `pageshow`, because a page restored from the back-forward cache fires no AppState change.
 */
type Listener = () => void;

/** Calls `listener` when the app comes back from the background. `inactive` (the system sheet that asks «open in WhatsApp?») is not leaving. */
export function subscribeReturn(listener: Listener, appState: Pick<typeof AppState, "addEventListener"> = AppState): () => void {
  let left = false;
  const subscription = appState.addEventListener("change", (state) => {
    if (state === "background") left = true;
    else if (state === "active" && left) { left = false; listener(); }
  });
  const onPageShow = (event: Event): void => { if ((event as PageTransitionEvent).persisted) listener(); };
  const target = Platform.OS === "web" ? (globalThis as { addEventListener?: (type: string, listener: (event: Event) => void) => void; removeEventListener?: (type: string, listener: (event: Event) => void) => void }) : undefined;
  target?.addEventListener?.("pageshow", onPageShow);
  return () => { subscription.remove(); target?.removeEventListener?.("pageshow", onPageShow); };
}

/** The prompt of the guest's list; it starts once the stored attempts have been read. `enabled` is false while the list is not on screen yet. */
export function useGuestPurchasePrompt(enabled: boolean): PurchasePrompt {
  const memory = useRef<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let alive = true;
    void readLocal(PURCHASE_STORE_KEY).then((value) => { if (alive) { memory.current = value; setHydrated(true); } });
    return () => { alive = false; };
  }, []);
  const env = useMemo<PurchasePromptEnv>(() => ({
    store: { read: () => memory.current, write: (value) => { memory.current = value; void writeLocal(PURCHASE_STORE_KEY, value); } },
    onReturn: (listener) => subscribeReturn(listener)
  }), []);
  return usePurchasePrompt(env, enabled && hydrated);
}
