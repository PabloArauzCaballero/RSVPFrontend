import { publicSiteOrigin } from "./site-origin";

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The only way the app points at a partner: the redirector of the public site, `/r/{listingId}`, which records the lead and answers 302.
 * It lives on the public site (`publicSiteOrigin`), never on the app's own domain, which has no `/r` route.
 * Same rule as `PartnerLink` in ui-web; it takes a listing id, so a direct partner URL cannot be built here.
 */
export function partnerRedirectUrl(listingId: string, options: { readonly destination?: string; readonly surface: string; readonly celebrationId?: string; readonly ctx?: string | null }): string {
  if (!LISTING_ID.test(listingId)) throw new Error("partnerRedirectUrl needs a listing id (UUID), never a partner URL");
  const query = new URLSearchParams();
  if (options.destination) query.set("destination", options.destination);
  query.set("surface", options.surface);
  if (options.celebrationId) query.set("celebrationId", options.celebrationId);
  // R6a: the member's signed lead context (opaque, ~5 min). Only a link opened in the member's own session carries it.
  if (options.ctx) query.set("ctx", options.ctx);
  return `${publicSiteOrigin()}/r/${encodeURIComponent(listingId)}?${query.toString()}`;
}

/**
 * The link a person copies or shares: the same redirector, never with `ctx`. The lead context is a bearer (whoever holds the link
 * would click for free in the member's name), so the type does not accept it and a stray property is dropped.
 */
export function partnerShareUrl(listingId: string, options: { readonly destination?: string; readonly surface: string; readonly celebrationId?: string }): string {
  const { destination, surface, celebrationId } = options;
  return partnerRedirectUrl(listingId, { ...(destination ? { destination } : {}), surface, ...(celebrationId ? { celebrationId } : {}) });
}
