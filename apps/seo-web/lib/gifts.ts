import { ApiError, type ApiClient } from "@rsvp/api-client";
import type { GiftItem } from "@rsvp/query-hooks";
import { publicClient } from "./api";

/**
 * F22 server side: resolves the celebration only. Gift List has no anonymous read by backend decision (REQ-F22-04, Gift List 1.2.0):
 * the list loads in the browser with the opaque credential of the invitation link, so the server renders the shell and never the gifts.
 */
export interface GiftCelebration { readonly celebrationId: string; readonly title: string; readonly slug: string; readonly timeZone?: string }
export type GiftPageData = { readonly state: "ready"; readonly celebration: GiftCelebration } | { readonly state: "not-found" };

interface PublicRead { readonly celebrationId: string; readonly slug: string; readonly content?: { readonly title?: string }; readonly timeZone?: string }

export async function loadGiftPage(slug: string, client: ApiClient = publicClient()): Promise<GiftPageData> {
  try {
    const view = await client.request<PublicRead>(`/celebrations/public/${encodeURIComponent(slug)}`, { auth: false });
    return { state: "ready", celebration: { celebrationId: view.celebrationId, slug, title: view.content?.title ?? slug, ...(view.timeZone ? { timeZone: view.timeZone } : {}) } };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { state: "not-found" };
    throw error;
  }
}

/** Opens the partner product through the redirector (F27); never the partner URL itself. */
export function partnerGiftHref(item: Pick<GiftItem, "productListingId">, celebrationId: string): string | null {
  return item.productListingId ? `/r/${encodeURIComponent(item.productListingId)}?surface=GIFT_LIST&celebrationId=${encodeURIComponent(celebrationId)}` : null;
}
