import { ApiError } from "@rsvp/api-client";
import type { RsvpState } from "./types.js";

/** What the guest can do next after a failed call. Derived only from the HTTP contract (401/403/404/409/422/429/5xx/network). */
export type RsvpFailure =
  | { readonly kind: "invalid" }
  | { readonly kind: "closed"; readonly deadline?: string; readonly deadlineLocal?: string; readonly timeZone?: string }
  | { readonly kind: "exists" }
  | { readonly kind: "conflict" }
  | { readonly kind: "validation"; readonly field?: string }
  | { readonly kind: "restricted" }
  | { readonly kind: "rate-limited"; readonly retryAfterSeconds?: number }
  | { readonly kind: "offline" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "unknown" };

const str = (value: unknown): string | undefined => (typeof value === "string" && value ? value : undefined);

export function classifyRsvpError(error: unknown): RsvpFailure {
  if (!(error instanceof ApiError)) return { kind: "offline" };
  const problem = error.problem;
  switch (error.status) {
    case 401: case 404: return { kind: "invalid" };
    case 403: return { kind: "restricted" };
    case 409:
      if (problem?.code === "RsvpWindowClosed") return { kind: "closed", deadline: str(problem["deadline"]), deadlineLocal: str(problem["deadlineLocal"]), timeZone: str(problem["timeZone"]) };
      return problem?.code === "RsvpAlreadyExists" ? { kind: "exists" } : { kind: "conflict" };
    case 400: case 413: case 415: case 422: return { kind: "validation", field: str(problem?.["field"]) };
    case 429: return { kind: "rate-limited", ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) };
    default: return error.status >= 500 ? { kind: "unavailable" } : { kind: "unknown" };
  }
}

/** Failures worth retrying with the same Idempotency-Key and the same draft. */
export const isRetryable = (failure: RsvpFailure): boolean => failure.kind === "offline" || failure.kind === "unavailable" || failure.kind === "rate-limited";

export type RsvpScreen = "guest" | "confirmed" | "closed";

/** The three screens a valid token can show; "invalid" and "unregistered" are decided before/without a token. */
export function rsvpScreenFor(state: RsvpState): RsvpScreen {
  if (!state.editable) return "closed";
  return state.status === "PENDING" ? "guest" : "confirmed";
}

export interface Countdown { readonly days: number; readonly hours: number; readonly minutes: number }
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Time left until the deadline (absolute instants, so the device zone does not matter); null once passed. */
export function countdownTo(deadline: string | null, now: number): Countdown | null {
  if (!deadline) return null;
  const left = Date.parse(deadline) - now;
  if (!Number.isFinite(left) || left <= 0) return null;
  return { days: Math.floor(left / DAY), hours: Math.floor((left % DAY) / HOUR), minutes: Math.floor((left % HOUR) / MINUTE) };
}

/** Fresh random key for one submit intent; reuse it for every retry of that same intent. */
export function newIdempotencyKey(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Non-reversible short fingerprint for cache keys and logs. The token itself must never be part of a
 * query key, analytics event or storage entry (REQ-F15-06 / F21-06).
 */
export function tokenFingerprint(token: string): string {
  let hash = 5381;
  for (let index = 0; index < token.length; index += 1) hash = ((hash << 5) + hash + token.charCodeAt(index)) | 0;
  return (hash >>> 0).toString(36);
}

/** Never show a whole secret on screen: `abcd…wxyz` (REQ-F16-06). */
export function maskSecret(secret: string): string {
  return secret.length <= 10 ? "•".repeat(secret.length) : `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}
