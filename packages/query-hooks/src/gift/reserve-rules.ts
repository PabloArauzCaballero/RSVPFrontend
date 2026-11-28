import { ApiError } from "@rsvp/api-client";
import { GUEST_LONG_WAIT_SECONDS } from "../guest/rsvp-flow.js";
import { problemCode } from "./api.js";
import { insufficientUnitsLeft } from "./guest-card.js";

/**
 * The guest's gift list rules, shared by the app (`apps/universal/src/guest/gifts-screen.tsx`) and the public site
 * (`apps/seo-web/components/gift/gift-experience.tsx`): the same limits, the same reading of every failure and the same i18n
 * keys (`gifts.guest.*`), so both surfaces say the same thing for the same answer of Gift List. Only keys and numbers live
 * here; each surface translates and draws them.
 */

/** Gift List contract 1.2.0 · ReserveGiftRequest: guestDisplayName <= 120, message <= 500 characters. */
export const NAME_MAX = 120;
export const MESSAGE_MAX = 500;

export interface ReserveFieldErrors { readonly name?: "tooLong"; readonly message?: "tooLong" }

/** Blocks a 422 before it is sent: both fields are optional, only the maximum length matters. */
export function reserveFieldErrors(input: { readonly name: string; readonly message: string }): ReserveFieldErrors {
  return { ...(input.name.trim().length > NAME_MAX ? { name: "tooLong" as const } : {}), ...(input.message.trim().length > MESSAGE_MAX ? { message: "tooLong" as const } : {}) };
}

export type ReserveFailure = "taken" | "units" | "already" | "limit" | "closed" | "expired" | "forbidden" | "attendance" | "notFound" | "busy" | "validation" | "offline" | "generic";

const isGiftTakenError = (error: ApiError): boolean => error.status === 409 && problemCode(error) === "GIFT_NOT_AVAILABLE";
/** The host closed the list by hand: no gift can be reserved, so retrying the same tap never helps. */
const isListClosedError = (error: ApiError): boolean => error.status === 409 && problemCode(error) === "LIST_CLOSED";
const isRsvpRequiredError = (error: ApiError): boolean => error.status === 403 && ["GUEST_RSVP_DECLINED", "GUEST_RSVP_REQUIRED"].includes(problemCode(error) ?? "");

/** One reading of a failed reservation, so the form always says what to do next. */
export function reserveFailureKind(error: unknown): ReserveFailure {
  if (!(error instanceof ApiError)) return "offline";
  if (isGiftTakenError(error)) return "taken";
  if (isListClosedError(error)) return "closed";
  if (isRsvpRequiredError(error)) return "attendance";
  // R5: fewer units are left than asked (409 INSUFFICIENT_UNITS, with unitsLeft), or the guest already holds a reservation of this gift.
  if (insufficientUnitsLeft(error) !== undefined) return "units";
  if (error.status === 409 && problemCode(error) === "ALREADY_RESERVED") return "already";
  if (error.problem?.code === "RESERVATION_LIMIT_REACHED") return "limit";
  if (error.status === 401) return "expired";
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "notFound";
  if (error.status === 429) return "busy";
  if (error.status === 422 || error.status === 400) return "validation";
  return "generic";
}

/** Failures that retrying the same tap can fix (the credential, the list and the gift are still valid). */
export const isReserveRetryable = (kind: ReserveFailure): boolean => kind === "busy" || kind === "offline" || kind === "generic";

/** An i18n key and its values: what a surface passes to its translator. */
export interface GuestMessage { readonly key: string; readonly params?: Readonly<Record<string, number>> }

const RESERVE_ERROR_KEY: Readonly<Record<Exclude<ReserveFailure, "taken">, string>> = {
  attendance: "gifts.error.attendanceBody", units: "gifts.guest.reserveError.units", already: "gifts.guest.reserveError.already",
  limit: "gifts.guest.reserveError.limit", closed: "gifts.guest.reserveError.closed", expired: "gifts.guest.reserveError.expired", forbidden: "gifts.guest.reserveError.forbidden", notFound: "gifts.guest.reserveError.notFound", busy: "gifts.guest.reserveError.busy",
  validation: "gifts.guest.reserveError.validation", offline: "gifts.guest.reserveError.offline", generic: "gifts.guest.reserveError.generic"
};

/** What the reserve form says after a failure ("taken" has its own block with alternatives). A long wait is told in minutes. */
export function reserveFailureMessage(kind: Exclude<ReserveFailure, "taken">, retryAfterSeconds?: number, unitsLeft?: number): GuestMessage {
  if (kind === "units") return { key: unitsLeft === 0 ? "gifts.guest.reserveError.unitsNone" : "gifts.guest.reserveError.units", params: { count: unitsLeft ?? 0 } };
  if (kind === "busy" && retryAfterSeconds) {
    return retryAfterSeconds >= GUEST_LONG_WAIT_SECONDS
      ? { key: "gifts.guest.reserveError.busyMinutes", params: { minutes: Math.ceil(retryAfterSeconds / 60) } }
      : { key: "gifts.guest.reserveError.busyWait", params: { seconds: Math.ceil(retryAfterSeconds) } };
  }
  return { key: RESERVE_ERROR_KEY[kind] };
}

export type GiftBlockerArt = "linkExpired" | "noAccess" | "offline";
export interface GiftListBlocker {
  /** The app's illustration name (the site draws the same one). */
  readonly illustration: GiftBlockerArt;
  readonly title: GuestMessage;
  readonly body: GuestMessage;
  /** The same tap can succeed later (busy, unavailable). */
  readonly retryable: boolean;
  /** No credential at all: the way out is the invitation link, not a retry. */
  readonly needsLink: boolean;
}

/**
 * Why the gift list could not open, with the one thing to do about it. `hasCredential` is false when the page was opened
 * without the personal link and none was kept for this celebration: there is no anonymous read, so it asks for the link.
 */
export function giftListBlocker(status: number, retryAfterSeconds: number | undefined, hasCredential: boolean): GiftListBlocker {
  const block = (illustration: GiftBlockerArt, title: string, body: GuestMessage, retryable = false, needsLink = false): GiftListBlocker => ({ illustration, title: { key: title }, body, retryable, needsLink });
  if (status === 401 && !hasCredential) return block("linkExpired", "gifts.error.needLinkTitle", { key: "gifts.error.needLinkBody" }, false, true);
  if (status === 401) return block("linkExpired", "gifts.guest.error.expiredTitle", { key: "gifts.guest.error.expiredBody" });
  if (status === 404) return block("linkExpired", "gifts.guest.error.otherTitle", { key: "gifts.guest.error.otherBody" });
  if (status === 403) return block("noAccess", "gifts.guest.error.forbiddenTitle", { key: "gifts.guest.error.forbiddenBody" });
  if (status === 429) {
    const body = retryAfterSeconds && retryAfterSeconds >= GUEST_LONG_WAIT_SECONDS ? { key: "gifts.guest.error.busyMinutes", params: { minutes: Math.ceil(retryAfterSeconds / 60) } } : { key: "gifts.guest.error.busyBody" };
    return block("offline", "gifts.guest.error.busyTitle", body, true);
  }
  return block("offline", "gifts.guest.error.unavailableTitle", { key: "gifts.guest.error.unavailableBody" }, true);
}
