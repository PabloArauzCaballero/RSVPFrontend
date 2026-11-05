import { parsePersonalLink, personalLinkPath } from "@rsvp/auth";

/**
 * F1 · deep link router. Maps any incoming URL (verified https link, `rsvp://` scheme, legacy token-only form)
 * to an in-app route, or null when the link is not ours. Pure so it is tested without a device.
 */
export const GUEST_RSVP_ROUTE = "/c/[slug]/rsvp/[token]";
export function resolveDeepLink(url: string): string | null {
  const link = parsePersonalLink(url);
  if (!link) return null;
  return link.slug ? personalLinkPath(link.slug, link.token) : `/rsvp/${encodeURIComponent(link.token)}`;
}
