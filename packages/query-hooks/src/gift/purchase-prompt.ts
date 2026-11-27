import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * R5 · «¿Compraste …?» (plan 5.7). The guest taps «Ver en la tienda» or «Pedir por WhatsApp», leaves, and when they come back the card of that gift
 * asks Sí / Todavía no / No. «Todavía no» leaves one reminder that shows ONCE the next time the list opens; «No» closes it.
 *
 * It is local state, by gift id and one attempt each, and it never leaves the device: no request, no log, no guest data (PF-1). Storage may be
 * missing or blocked (private mode), so every read and write is guarded and the list works the same without it.
 */
export const PURCHASE_STORE_KEY = "rsvp.gift.purchase.v1";
/** An attempt older than this is forgotten: the guest is not asked about a click from two weeks ago. */
export const ATTEMPT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
/** A list never keeps more attempts than a guest can hold reservations of; the oldest are dropped. */
const MAX_ATTEMPTS = 50;

/** Where the attempts live: one string, so the app (memory), the web (localStorage) and tests share the logic. */
export interface PurchaseStore { readonly read: () => string | null; readonly write: (value: string) => void }

export type AttemptPhase = "away" | "reminder" | "closed";
export interface PurchaseAttempt {
  readonly giftItemId: string;
  /** The button the guest used (a destination of the provider), kept for the card's wording. */
  readonly destination: string;
  /** The units the guest meant to buy: pre-fills the reservation form on «Sí». */
  readonly units: number;
  readonly at: number;
  readonly phase: AttemptPhase;
}
export type PurchaseAnswer = "yes" | "later" | "no";
export type PromptTrigger = "return" | "open";

const PHASES: readonly AttemptPhase[] = ["away", "reminder", "closed"];

function parse(raw: string | null, now: number): Record<string, PurchaseAttempt> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const kept: Record<string, PurchaseAttempt> = {};
    for (const [id, entry] of Object.entries(value)) {
      const e = entry as Partial<PurchaseAttempt> | null;
      if (!e || e.giftItemId !== id || typeof e.destination !== "string" || typeof e.units !== "number" || typeof e.at !== "number" || !PHASES.includes(e.phase as AttemptPhase)) continue;
      if (now - e.at > ATTEMPT_TTL_MS || e.phase === "closed") continue;
      kept[id] = { giftItemId: id, destination: e.destination, units: Math.max(1, Math.trunc(e.units)), at: e.at, phase: e.phase as AttemptPhase };
    }
    return kept;
  } catch { return {}; }
}

function persist(store: PurchaseStore, attempts: Record<string, PurchaseAttempt>): void {
  const newest = Object.values(attempts).sort((a, b) => b.at - a.at).slice(0, MAX_ATTEMPTS);
  try { store.write(JSON.stringify(Object.fromEntries(newest.map((a) => [a.giftItemId, a])))); } catch { /* storage blocked or full: the card just will not come back */ }
}

export function readAttempts(store: PurchaseStore, now: number): Record<string, PurchaseAttempt> {
  let raw: string | null = null;
  try { raw = store.read(); } catch { raw = null; }
  return parse(raw, now);
}

/** The guest tapped a provider button for this gift: it becomes the only attempt of that gift, waiting for them to come back. */
export function recordAttempt(store: PurchaseStore, input: { readonly giftItemId: string; readonly destination: string; readonly units: number }, now: number): void {
  const attempts = readAttempts(store, now);
  attempts[input.giftItemId] = { giftItemId: input.giftItemId, destination: input.destination, units: Math.max(1, Math.trunc(input.units)), at: now, phase: "away" };
  persist(store, attempts);
}

/**
 * The attempts that ask now. Coming back from the provider asks for the ones still `away`. Opening the list asks for those and, once, for the
 * reminders; asking a reminder consumes it (it is saved as closed), so «Todavía no» twice never nags.
 */
export function takeDue(store: PurchaseStore, trigger: PromptTrigger, now: number): PurchaseAttempt[] {
  const attempts = readAttempts(store, now);
  const due = Object.values(attempts).filter((a) => a.phase === "away" || (trigger === "open" && a.phase === "reminder"));
  if (due.some((a) => a.phase === "reminder")) {
    for (const a of due) if (a.phase === "reminder") attempts[a.giftItemId] = { ...a, phase: "closed" };
    persist(store, attempts);
  }
  return due;
}

/** Sí and No end the attempt; «Todavía no» keeps one reminder, unless this card already was the reminder. */
export function answerAttempt(store: PurchaseStore, attempt: PurchaseAttempt, answer: PurchaseAnswer, now: number): void {
  const attempts = readAttempts(store, now);
  if (answer === "later" && attempt.phase === "away") attempts[attempt.giftItemId] = { ...attempt, phase: "reminder" };
  else delete attempts[attempt.giftItemId];
  persist(store, attempts);
}

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
