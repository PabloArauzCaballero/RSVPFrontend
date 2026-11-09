import { ApiError } from "@rsvp/api-client";
import { isGiftTaken } from "@rsvp/query-hooks";

/** Gift List contract 1.2.0 · ReserveGiftRequest: guestDisplayName <= 120, message <= 500 characters. */
export const NAME_MAX = 120;
export const MESSAGE_MAX = 500;

export interface ReserveFieldErrors { readonly name?: "tooLong"; readonly message?: "tooLong" }

/** Blocks a 422 before it is sent: both fields are optional, only the maximum length matters. */
export function reserveFieldErrors(input: { readonly name: string; readonly message: string }): ReserveFieldErrors {
  return { ...(input.name.trim().length > NAME_MAX ? { name: "tooLong" as const } : {}), ...(input.message.trim().length > MESSAGE_MAX ? { message: "tooLong" as const } : {}) };
}

export type ReserveFailure = "taken" | "limit" | "expired" | "forbidden" | "notFound" | "busy" | "validation" | "offline" | "generic";

/** One reading of a failed reservation, so the dialog always says what to do next. */
export function reserveFailureKind(error: unknown): ReserveFailure {
  if (!(error instanceof ApiError)) return "offline";
  if (isGiftTaken(error)) return "taken";
  if (error.problem?.code === "RESERVATION_LIMIT_REACHED") return "limit";
  if (error.status === 401) return "expired";
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "notFound";
  if (error.status === 429) return "busy";
  if (error.status === 422 || error.status === 400) return "validation";
  return "generic";
}

/** Failures that retrying the same tap can fix (the credential, the list and the gift are still valid). */
export const isRetryable = (kind: ReserveFailure): boolean => kind === "busy" || kind === "offline" || kind === "generic";
