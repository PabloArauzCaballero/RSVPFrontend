import { apiBaseUrl } from "./api";
import type { Partner } from "./partner";

/**
 * Provider Catalog's public card has no providerId, and quotes/bookings/calendar are keyed by it. The listing read
 * (GET /listings/{id}, contract 2.0.0) carries it. The gateway does not route /listings yet, so `RSVP_CATALOG_URL` may
 * point server-side at the catalog service; without it the gateway is tried and, if it answers 404, the partner has no
 * resolvable id and the quote/schedule pages say the provider is unavailable instead of guessing.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveProviderId(partner: Pick<Partner, "providerId" | "primaryListingId">, fetchFn: typeof fetch = fetch): Promise<string | null> {
  if (partner.providerId) return partner.providerId;
  const base = (process.env.RSVP_CATALOG_URL ?? apiBaseUrl()).replace(/\/$/, "");
  try {
    const response = await fetchFn(`${base}/listings/${encodeURIComponent(partner.primaryListingId)}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(2500), next: { revalidate: 300 } } as RequestInit);
    if (!response.ok) return null;
    const body = (await response.json()) as { providerId?: unknown };
    return typeof body.providerId === "string" && UUID.test(body.providerId) ? body.providerId : null;
  } catch {
    return null;
  }
}
