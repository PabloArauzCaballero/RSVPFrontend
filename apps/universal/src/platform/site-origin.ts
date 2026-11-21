import { personalLinkOrigin } from "@rsvp/auth";

/**
 * Two different origins, which a deployment may serve from different domains (in TEST: the app at dev.done…, the public
 * Next site at rsvp-web…). Literal `process.env.EXPO_PUBLIC_*` reads so Expo inlines them.
 */

const trimSlash = (value: string): string => value.replace(/\/+$/, "");

/** Origin of the guests' personal links (`${origin}/c/{slug}/rsvp/{token}`): where the RSVP link must open. */
export const siteOrigin = (): string => personalLinkOrigin({ RSVP_PUBLIC_ORIGIN: process.env.EXPO_PUBLIC_RSVP_ORIGIN, EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL });

/**
 * Origin of the public site (seo-web): it serves the partner redirector `/r/{listingId}` and the indexable pages. It is
 * EXPO_PUBLIC_SITE_URL. Without it the RSVP origin is used, which is right only when one domain serves both (local
 * development, a single-domain deployment); a deployment with two domains must set EXPO_PUBLIC_SITE_URL (see the runbook).
 */
export const publicSiteOrigin = (): string => {
  const site = process.env.EXPO_PUBLIC_SITE_URL?.trim();
  return site ? trimSlash(site) : siteOrigin();
};
