import { publicSiteOrigin } from "./site-origin";

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A `ctx` (the member's signed lead context) is only valid with the celebration it was signed for, so the type demands `celebrationId`
 * whenever `ctx` is a value.
 */
export type PartnerLinkContext =
  | { readonly celebrationId: string; readonly ctx?: string | null }
  | { readonly celebrationId?: undefined; readonly ctx?: undefined };

/**
 * The only way the app points at a partner: the redirector of the public site, `/r/{listingId}`, which records the lead and answers 302.
 * It lives on the public site (`publicSiteOrigin`), never on the app's own domain, which has no `/r` route.
 * Same rule as `PartnerLink` in ui-web; it takes a listing id, so a direct partner URL cannot be built here.
 *
 * With `ctx` the URL is a bearer (whoever holds it clicks for free in the member's name): it is handed to `Linking.openURL` and never shown, copied
 * or shared. `surface: "PREVIEW"` only means something with the signed `ctx` of the portal or of moderation; without a token the click is evaluated
 * as a normal one (decision M-2).
 */
export function partnerRedirectUrl(listingId: string, options: { readonly destination?: string; readonly surface: string } & PartnerLinkContext): string {
  if (!LISTING_ID.test(listingId)) throw new Error("partnerRedirectUrl needs a listing id (UUID), never a partner URL");
  const query = new URLSearchParams();
  if (options.destination) query.set("destination", options.destination);
  query.set("surface", options.surface);
  if (options.celebrationId) query.set("celebrationId", options.celebrationId);
  // R6a: the member's signed lead context (opaque, ~5 min).
  if (options.ctx) query.set("ctx", options.ctx);
  return `${publicSiteOrigin()}/r/${encodeURIComponent(listingId)}?${query.toString()}`;
}

/**
 * R6b · a link the provider portal opens on one of the provider's own listings. `ctx` is the signed one of `POST /providers/{id}/lead-context`: `PROVIDER_OWNER`
 * makes the click `PROVIDER_SELF` (M-1) and `PREVIEW` makes `surface=PREVIEW` count (M-2); the surface follows the relation, so a preview never claims to be
 * the public site. The URL is a bearer for 15 minutes (whoever holds it clicks for free on that provider's listings): it goes to `Linking.openURL` and is
 * never rendered, copied, shared or stored.
 */
export function portalRedirectUrl(listingId: string, options: { readonly relation: "PROVIDER_OWNER" | "PREVIEW"; readonly ctx: string; readonly destination?: string }): string {
  if (!LISTING_ID.test(listingId)) throw new Error("portalRedirectUrl needs a listing id (UUID), never a partner URL");
  if (!options.ctx) throw new Error("portalRedirectUrl needs the ctx of lead-context");
  const query = new URLSearchParams();
  if (options.destination) query.set("destination", options.destination);
  query.set("surface", options.relation === "PREVIEW" ? "PREVIEW" : "PUBLIC_SITE");
  query.set("ctx", options.ctx);
  return `${publicSiteOrigin()}/r/${encodeURIComponent(listingId)}?${query.toString()}`;
}
