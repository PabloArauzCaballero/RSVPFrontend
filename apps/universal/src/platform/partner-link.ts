import { publicSiteOrigin } from "./site-origin";

/** An event type code (WEDDING, BABY_SHOWER): the same shape the redirector of the public site accepts; anything else is not sent. */
const EVENT_TYPE_SHAPE = /^[A-Z][A-Z0-9_]{1,59}$/;
const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A `ctx` (the member's signed lead context) is only valid with the celebration it was signed for, so the type demands `celebrationId`
 * whenever `ctx` is a value.
 */
export interface GiftLinkContext {
  /** Public slug of the celebration: with `celebrationId` (and only then) it fills {celebracion}, {fecha} and {entrega} of the WhatsApp message. Always send both. */
  readonly celebrationSlug?: string;
  /** The gift of the guest's list the click comes from; stored with the lead, never shown to the provider. */
  readonly giftItemId?: string;
  /** The product version (the gift's `variantCode`): {version} and the price of the message. */
  readonly variant?: string | null;
  /** Units the guest wants (a positive integer): {cantidad} of the message. */
  readonly quantity?: number;
  /** City slug of the celebration, when it is known: {ciudad}. */
  readonly city?: string;
  /** Event type code of the celebration (`eventType.code` of its public view): the provider reports break leads down by it. */
  readonly eventType?: string;
}
export type PartnerLinkContext =
  | ({ readonly celebrationId: string; readonly ctx?: string | null } & GiftLinkContext)
  | { readonly celebrationId?: undefined; readonly ctx?: undefined };

/**
 * The only way the app points at a partner: the redirector of the public site, `/r/{listingId}`, which records the lead and answers 302.
 * It lives on the public site (`publicSiteOrigin`), never on the app's own domain, which has no `/r` route.
 * Same rule as `PartnerLink` in ui-web; it takes a listing id, so a direct partner URL cannot be built here.
 *
 * With `ctx` the URL is a bearer (whoever holds it clicks for free in the member's name): it is handed to `Linking.openURL` and never shown, copied
 * or shared. `surface: "PREVIEW"` depends on the backend: on provider-catalog 3.8.0 (BE b44a5cb3) a PREVIEW click without a token was recorded as an invalid
 * lead with reason `PREVIEW`; since R6b (BE #166, in the official branch, `lead-policy.ts`) `surface=PREVIEW` without a portal `ctx` is ignored and counts as a normal
 * visitor, and only a `ctx` issued by the portal or by moderation for that listing makes it an invalid `PREVIEW` lead (seen in the real walkthrough).
 */
export function partnerRedirectUrl(listingId: string, options: { readonly destination?: string; readonly surface: string; /** es-BO or en-US: picks the language of the provider's template. */ readonly locale?: string } & PartnerLinkContext): string {
  if (!LISTING_ID.test(listingId)) throw new Error("partnerRedirectUrl needs a listing id (UUID), never a partner URL");
  const query = new URLSearchParams();
  if (options.destination) query.set("destination", options.destination);
  query.set("surface", options.surface);
  if (options.celebrationId) {
    query.set("celebrationId", options.celebrationId);
    // R5: what the redirector needs to resolve the WhatsApp message on the server. The guest's name, phone or id never go in the link (PF-1).
    if (options.celebrationSlug) query.set("celebrationSlug", options.celebrationSlug);
    if (options.giftItemId) query.set("giftItemId", options.giftItemId);
    if (options.variant) query.set("variant", options.variant);
    if (Number.isInteger(options.quantity) && (options.quantity ?? 0) > 0) query.set("quantity", String(options.quantity));
    if (options.city) query.set("city", options.city);
    if (options.eventType && EVENT_TYPE_SHAPE.test(options.eventType)) query.set("eventType", options.eventType);
  }
  if (options.locale) query.set("locale", options.locale);
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
