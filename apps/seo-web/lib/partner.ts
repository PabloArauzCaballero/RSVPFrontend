import type { ApiClient } from "@rsvp/api-client";
import { publicClient } from "./api";
import { resolveProviderId } from "./catalog";
import { searchProviders, type ProviderCard } from "./providers";

/**
 * Partner microsite data (F25), read from GET /providers?slug= (verified, published listings only).
 * An unknown, unverified or suspended partner returns no listings and is a controlled 404 (B14) that
 * reveals nothing; a catalogue that cannot answer is a distinct "unavailable" state, never a 404.
 */

const MAX_SLUG_PAGES = 20;
export const PARTNER_CONTACT_ORDER = ["WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "OFFICIAL_SITE"] as const;

export interface Partner {
  readonly slug: string;
  readonly name: string;
  readonly category: string;
  readonly city: string;
  readonly department: string;
  readonly summary?: string;
  readonly imageUrl?: string;
  readonly address?: string;
  readonly hours: readonly string[];
  readonly coverage: readonly string[];
  /** Listing that carries the contact buttons; every destination is reached via /r/{listingId}. */
  readonly primaryListingId: string;
  readonly providerId?: string;
  readonly destinations: readonly string[];
  readonly listings: readonly ProviderCard[];
}

export type PartnerLookup =
  | { readonly state: "ok"; readonly partner: Partner }
  | { readonly state: "not-found" }
  | { readonly state: "unavailable" };

export function partnerFromListings(slug: string, cards: readonly ProviderCard[]): Partner | null {
  const own = cards.filter((card) => card.providerSlug === slug && card.verified);
  const head = own[0];
  if (!head) return null;
  const known = PARTNER_CONTACT_ORDER.filter((destination) => own.some((card) => card.destinations?.includes(destination)));
  // The public card does not list its destinations: offer the default one and let the redirector answer if it is not enabled.
  const destinations = known.length ? known : (PARTNER_CONTACT_ORDER.slice(-1) as readonly string[]);
  const withContact = own.find((card) => card.destinations?.length) ?? head;
  return {
    slug,
    name: head.name,
    category: head.category,
    city: head.city,
    department: head.department,
    ...(head.summary ? { summary: head.summary } : {}),
    ...(head.imageUrl ? { imageUrl: head.imageUrl } : {}),
    ...(head.address ? { address: head.address } : {}),
    hours: head.hours ?? [],
    coverage: [...new Set(own.flatMap((card) => [...(card.coverage ?? []), ...(card.fulfillment?.coverageZones ?? [])]))],
    ...(own.find((card) => card.providerId)?.providerId ? { providerId: own.find((card) => card.providerId)?.providerId as string } : {}),
    primaryListingId: withContact.listingId,
    destinations,
    listings: own
  };
}

export async function loadPartner(slug: string, client: ApiClient = publicClient()): Promise<PartnerLookup> {
  // Provider Catalog 2.0.0 ignores `?slug=` (it returns the whole directory), so the partner's cards are collected
  // across the pages, bounded; a catalogue that honours the filter answers in the first page.
  const cards: ProviderCard[] = [];
  for (let page = 1; page <= MAX_SLUG_PAGES; page += 1) {
    const result = await searchProviders({ slug, page }, client);
    if (!result.available) return cards.length ? finish(slug, cards, client) : { state: "unavailable" };
    cards.push(...result.items.filter((card) => card.providerSlug === slug));
    if (page * result.pageSize >= result.total) break;
  }
  return finish(slug, cards, client);
}

async function finish(slug: string, cards: readonly ProviderCard[], client: ApiClient): Promise<PartnerLookup> {
  const partner = partnerFromListings(slug, cards);
  return partner ? { state: "ok", partner: await withBusinessName(partner, client) } : { state: "not-found" };
}

/**
 * The public card's `name` is the listing title, not the business. The provider's own name comes from GET /providers/{id},
 * reachable once the id is resolved; if it cannot be, the card data is kept as is.
 */
async function withBusinessName(partner: Partner, client: ApiClient): Promise<Partner> {
  try {
    const providerId = await resolveProviderId(partner);
    if (!providerId) return partner;
    const profile = await client.request<{ readonly name?: string }>(`/providers/${providerId}`, { auth: false });
    return { ...partner, providerId, ...(profile.name ? { name: profile.name } : {}) };
  } catch {
    return partner;
  }
}

/** The only way a partner contact is linked: through the redirector, tagged with the surface it came from. */
export function contactHref(listingId: string, destination: string, surface = "PUBLIC_SITE"): string {
  return `/r/${encodeURIComponent(listingId)}?destination=${destination}&surface=${surface}`;
}

/** Slugs for the sitemap: walks the directory pages (bounded) and keeps each verified partner once. */
export async function loadPartnerSlugs(client: ApiClient = publicClient(), maxPages = 20): Promise<readonly string[]> {
  const slugs = new Set<string>();
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await searchProviders({ verifiedOnly: true, page }, client);
    if (!result.available) break;
    for (const card of result.items) if (card.verified) slugs.add(card.providerSlug);
    if (page * result.pageSize >= result.total) break;
  }
  return [...slugs];
}
