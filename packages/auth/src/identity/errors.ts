import { ApiError } from "@rsvp/api-client";

export type AuthFailure = "invalidCredentials" | "emailTaken" | "validation" | "offline" | "unavailable" | "unknown";

const STATUS_UNAUTHORIZED = 401;
const STATUS_CONFLICT = 409;
const STATUS_INVALID = 422;
const STATUS_SERVER_ERROR = 500;

/**
 * Maps a failed Identity call to what the person can act on. A thrown non-API error from `fetch`
 * (TypeError) is a network failure; Identity answers every login failure with the same 401.
 */
export function classifyAuthError(error: unknown): AuthFailure {
  if (error instanceof ApiError) {
    if (error.status === STATUS_UNAUTHORIZED) return "invalidCredentials";
    if (error.status === STATUS_CONFLICT) return "emailTaken";
    if (error.status === STATUS_INVALID) return "validation";
    return error.status >= STATUS_SERVER_ERROR ? "unavailable" : "unknown";
  }
  return error instanceof TypeError ? "offline" : "unknown";
}

/** Field-level messages from an Identity 422 problem (`errors[]`), keyed by field. */
export function fieldErrorsOf(error: unknown): Readonly<Record<string, string>> {
  if (!(error instanceof ApiError)) return {};
  const list = error.problem?.["errors"];
  if (!Array.isArray(list)) return {};
  const result: Record<string, string> = {};
  for (const item of list as Array<{ field?: unknown; message?: unknown }>) if (typeof item.field === "string" && typeof item.message === "string") result[item.field] = item.message;
  return result;
}
