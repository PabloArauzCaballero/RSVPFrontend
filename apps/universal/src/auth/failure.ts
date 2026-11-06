import { ApiError } from "@rsvp/api-client";
import { classifyAuthError, type AuthFailure } from "@rsvp/auth";

/** Everything Identity (or the network) can answer that a person must be told about. */
export type SubmitFailure =
  | { readonly kind: AuthFailure | "forbidden" }
  | { readonly kind: "rateLimited"; readonly retryAfterSeconds: number | null };

const STATUS_FORBIDDEN = 403;
const STATUS_TOO_MANY = 429;
/** A Retry-After above this is shown as "a moment": nobody waits an hour in front of a form. */
const MAX_COOLDOWN_SECONDS = 120;

/** Adds 403 and 429 (with Retry-After) to the shared classification of sign-in, sign-up and recovery failures. */
export function describeFailure(error: unknown): SubmitFailure {
  if (error instanceof ApiError && error.status === STATUS_TOO_MANY) {
    const wait = error.retryAfterSeconds;
    return { kind: "rateLimited", retryAfterSeconds: wait !== undefined && wait > 0 ? Math.min(Math.ceil(wait), MAX_COOLDOWN_SECONDS) : null };
  }
  if (error instanceof ApiError && error.status === STATUS_FORBIDDEN) return { kind: "forbidden" };
  return { kind: classifyAuthError(error) };
}
