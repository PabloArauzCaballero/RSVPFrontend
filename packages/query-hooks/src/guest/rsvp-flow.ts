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

/*
 * The guest's answer, worded once for the app (`apps/universal/src/guest`) and the public site (`apps/seo-web/components/rsvp`).
 * Only i18n keys (`rsvp.invite.*`) and numbers live here; each surface translates and draws them, so the same answer of
 * Guest/RSVP reads the same on both.
 */

/** From this wait on (anonymous requests can be held for ~50 minutes) the guest is told minutes, never a count of seconds. */
export const GUEST_LONG_WAIT_SECONDS = 90;

/** A countdown of weeks is noise (the deadline line already says the date): it shows only in the last days. */
export const COUNTDOWN_VISIBLE_DAYS = 7;
export function nearCountdown(deadline: string | null, now: number): Countdown | null {
  const left = countdownTo(deadline, now);
  return left && left.days < COUNTDOWN_VISIBLE_DAYS ? left : null;
}

/** The contract sets no maximum of companions; this only keeps the stepper from running away. */
export const COMPANIONS_STEPPER_MAX = 20;
/** The draft keeps companions as text (what a field holds); anything that is not a whole number reads as 0. */
export function companionCount(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}
export function stepCompanions(value: string, delta: number): string {
  return String(Math.min(COMPANIONS_STEPPER_MAX, Math.max(0, companionCount(value) + delta)));
}

export type RsvpField = "status" | "requestedCompanions" | "dietaryNotes" | "message" | "name" | "email" | "consent";
const KNOWN_ISSUES = ["companions", "tooLong", "required", "email", "consent"];

/** The zod issues of `@rsvp/forms` as one i18n key per field (the first issue wins); unknown codes read as "required". */
export function rsvpIssueKeys(issues: readonly { readonly path: readonly (string | number)[]; readonly message: string }[]): Partial<Record<RsvpField, string>> {
  const keys: Partial<Record<RsvpField, string>> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]) as RsvpField;
    if (!(field in keys)) keys[field] = field === "status" ? "rsvp.invite.chooseOne" : `rsvp.invite.errors.${KNOWN_ISSUES.includes(issue.message) ? issue.message : "required"}`;
  }
  return keys;
}

/** What the guest reads after a failed send, and whether the same tap can succeed. The draft is never cleared by a failure. */
export function rsvpFailureNotice(failure: RsvpFailure): { readonly key: string; readonly params?: Readonly<Record<string, number>>; readonly retryable: boolean } {
  const retryable = failure.kind === "offline" || failure.kind === "unavailable" || failure.kind === "rate-limited" || failure.kind === "unknown";
  if (failure.kind === "rate-limited") {
    const wait = failure.retryAfterSeconds;
    if (!wait) return { key: "rsvp.invite.errors.rateLimitedNoWait", retryable };
    return wait >= GUEST_LONG_WAIT_SECONDS
      ? { key: "rsvp.invite.errors.rateLimitedMinutes", params: { minutes: Math.ceil(wait / 60) }, retryable }
      : { key: "rsvp.invite.errors.rateLimited", params: { seconds: Math.ceil(wait) }, retryable };
  }
  const keys: Partial<Record<RsvpFailure["kind"], string>> = {
    offline: "rsvp.invite.errors.offline", unavailable: "rsvp.invite.errors.unavailable", validation: "rsvp.invite.errors.validation",
    conflict: "rsvp.invite.errors.conflict", exists: "rsvp.invite.errors.conflict", restricted: "rsvp.invite.errors.restricted"
  };
  return { key: keys[failure.kind] ?? "rsvp.invite.errors.unknown", retryable };
}

/** The send button names what it will do: "I am coming", "I can't", or save an edit. */
export function rsvpSubmitKey({ busy, mode, status }: { readonly busy: boolean; readonly mode: "first" | "edit"; readonly status: "" | "CONFIRMED" | "DECLINED" }): string {
  if (busy) return "rsvp.invite.submitting";
  if (mode === "edit") return "rsvp.invite.save";
  return status === "CONFIRMED" ? "rsvp.invite.submitYes" : status === "DECLINED" ? "rsvp.invite.submitNo" : "rsvp.invite.submitNone";
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
