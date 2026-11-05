import { siteOrigin } from "./site-origin";

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The only way the app points at a partner: the redirector of the public site, `/r/{listingId}`, which records the lead and answers 302.
 * Same rule as `PartnerLink` in ui-web; it takes a listing id, so a direct partner URL cannot be built here.
 */
export function partnerRedirectUrl(listingId: string, options: { readonly destination?: string; readonly surface: string; readonly celebrationId?: string }): string {
  if (!LISTING_ID.test(listingId)) throw new Error("partnerRedirectUrl needs a listing id (UUID), never a partner URL");
  const query = new URLSearchParams();
  if (options.destination) query.set("destination", options.destination);
  query.set("surface", options.surface);
  if (options.celebrationId) query.set("celebrationId", options.celebrationId);
  return `${siteOrigin()}/r/${encodeURIComponent(listingId)}?${query.toString()}`;
}
