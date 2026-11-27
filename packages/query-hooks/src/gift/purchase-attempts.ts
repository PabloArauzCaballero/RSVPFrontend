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
/** Few and recent: the whole value stays near 1.3 KB, under the 2048 B at which SecureStore warns on iOS; the oldest are dropped. */
export const MAX_ATTEMPTS = 10;

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
