"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { answerAttempt, recordAttempt, takeDue, type PurchaseAnswer, type PurchaseAttempt, type PurchaseStore } from "./purchase-attempts.js";

/** R5 · the React side of «¿Compraste?» (see `purchase-attempts.ts`). Its own client module: the barrel is also read by server components of the public site. */
/** What a surface gives the hook: the storage, and a way to hear that the guest came back from the provider (web: visibilitychange; app: AppState). */
export interface PurchasePromptEnv {
  readonly store: PurchaseStore;
  /** Calls `listener` when the guest returns to the list after leaving it. Returns the unsubscribe. */
  readonly onReturn: (listener: () => void) => () => void;
  readonly now?: () => number;
}

export interface PurchasePrompt {
  /** The cards to show, by gift id. */
  readonly asking: ReadonlyMap<string, PurchaseAttempt>;
  /** Call when the guest taps a provider button, before leaving. */
  readonly record: (input: { readonly giftItemId: string; readonly destination: string; readonly units: number }) => void;
  readonly answer: (giftItemId: string, answer: PurchaseAnswer) => PurchaseAttempt | undefined;
}

/** `enabled` is false until the list is ready (a card needs its gift on screen); reminders are only consumed once the list can show them. */
export function usePurchasePrompt(env: PurchasePromptEnv, enabled: boolean): PurchasePrompt {
  const [asking, setAsking] = useState<ReadonlyMap<string, PurchaseAttempt>>(new Map());
  // The cards on screen are also kept in a ref: an answer reads the attempt from here, because a reminder is already consumed in the store.
  const shown = useRef(new Map<string, PurchaseAttempt>());
  const envRef = useRef(env);
  envRef.current = env;
  const clock = useCallback((): number => (envRef.current.now ?? Date.now)(), []);
  const merge = useCallback((due: readonly PurchaseAttempt[]) => {
    if (due.length === 0) return;
    for (const a of due) shown.current.set(a.giftItemId, a);
    setAsking(new Map(shown.current));
  }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    merge(takeDue(envRef.current.store, "open", clock()));
    return envRef.current.onReturn(() => merge(takeDue(envRef.current.store, "return", clock())));
  }, [enabled, merge, clock]);
  const record = useCallback((input: { readonly giftItemId: string; readonly destination: string; readonly units: number }) => recordAttempt(envRef.current.store, input, clock()), [clock]);
  const answer = useCallback((giftItemId: string, value: PurchaseAnswer): PurchaseAttempt | undefined => {
    const attempt = shown.current.get(giftItemId);
    if (!attempt) return undefined;
    shown.current.delete(giftItemId);
    setAsking(new Map(shown.current));
    answerAttempt(envRef.current.store, attempt, value, clock());
    return attempt;
  }, [clock]);
  return useMemo(() => ({ asking, record, answer }), [asking, record, answer]);
}
