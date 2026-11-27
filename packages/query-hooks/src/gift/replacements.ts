import { ApiError } from "@rsvp/api-client";
import type { GiftListComponents } from "@rsvp/contracts";
import { problemCode } from "./api.js";
import type { GiftBatchEntry } from "./assistant.js";
import type { GiftItem } from "./types.js";

/**
 * R7 (gift-list 1.19.0, plan 5.10): the host's «3 reemplazos de la misma idea» of a gift its provider no longer offers.
 * `GET /celebrations/{celebrationId}/items/{giftItemId}/replacements` (listGiftReplacements) only READS. The contract has no replace operation: the swap
 * is the multiple add (`POST /items/batch`, addGiftItemsBatch) of the chosen listing, and an UNAVAILABLE gift does not occupy its idea, so the idea
 * is free to take the new product. The unavailable gift stays on the list, marked, until the provider offers it again.
 */
export type GiftReplacements = GiftListComponents["schemas"]["GiftReplacements"];
export type GiftReplacement = GiftListComponents["schemas"]["GiftReplacement"];

/** The only two query parameters the server accepts (any other or repeated one is 422 INVALID_QUERY), checked against the contract's patterns. */
const EVENT_TYPE = /^[A-Za-z][A-Za-z0-9_]{1,59}$/;
const CITY = /^[a-z0-9][a-z0-9-]{0,79}$/;
export interface ReplacementsQuery { readonly eventType?: string | null | undefined; readonly city?: string | null | undefined }

/** A value outside the contract's pattern is left out (the replacements are then not ordered by it) instead of making the whole read a 422. */
export function replacementsPath(celebrationId: string, giftItemId: string, query: ReplacementsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.eventType && EVENT_TYPE.test(query.eventType)) params.set("eventType", query.eventType);
  if (query.city && CITY.test(query.city)) params.set("city", query.city);
  const search = params.toString();
  return `/gifts/celebrations/${encodeURIComponent(celebrationId)}/items/${encodeURIComponent(giftItemId)}/replacements${search ? `?${search}` : ""}`;
}
export const replacementsKey = (celebrationId: string, giftItemId: string, query: ReplacementsQuery = {}) =>
  ["gifts", celebrationId, "replacements", giftItemId, query.eventType ?? "", query.city ?? ""] as const;

/** What the panel says when the read fails: 403 (not MANAGE), 404 (the gift is gone or is another celebration's), a retry, or a dependency that is down. */
export type ReplacementsFailure = "forbidden" | "notFound" | "unavailable" | "offline" | "unknown";
export function replacementsFailure(error: unknown): ReplacementsFailure {
  if (!(error instanceof ApiError)) return "offline";
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "notFound";
  if (error.status === 503 || error.status === 502 || error.status === 504) return "unavailable";
  return "unknown";
}
/** Forbidden and not-found do not get better by trying again; the rest do. */
export const replacementsRetryable = (failure: ReplacementsFailure): boolean => failure !== "forbidden" && failure !== "notFound";

/** The batch entry that swaps `item` for `replacement`: the same idea, quantity and coordinated-gift switch, the new product and no version. */
export function swapEntry(item: Pick<GiftItem, "quantity" | "groupGiftEnabled">, replacement: Pick<GiftReplacement, "listingId">, giftIdeaCode: string): GiftBatchEntry {
  return { productListingId: replacement.listingId, giftIdeaCode, quantity: Math.max(1, item.quantity ?? 1), groupGiftEnabled: item.groupGiftEnabled === true };
}

/** The stable 422 codes of the swap that the panel explains in its own words; any other falls back to the generic message. */
export const SWAP_CODES = ["CATALOG_PRODUCT_UNAVAILABLE", "GIFT_LISTING_NOT_ELIGIBLE", "GIFT_LISTING_NOT_PRODUCT", "DUPLICATE_GIFT_IDEA", "INVALID_QUANTITY", "INVALID_GIFT_IDEA"] as const;
export type SwapCode = (typeof SWAP_CODES)[number];
export function swapFailureCode(error: unknown): SwapCode | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null;
  const code = problemCode(error);
  return (SWAP_CODES as readonly string[]).includes(code ?? "") ? (code as SwapCode) : null;
}
