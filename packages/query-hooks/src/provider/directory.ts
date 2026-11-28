import type { ProviderCatalogComponents } from "@rsvp/contracts";
import type { ApiClient } from "@rsvp/api-client";

/**
 * Provider directory (F24) reference data and query building, shared by the public site and the app so both search,
 * paginate and count impressions identically. Categories and cities are the reference data of provider-catalog
 * (`categories`, `boliviaGeo`); their Spanish URL slugs are the addresses of both surfaces.
 */

export const PROVIDER_CATEGORIES = [
  { code: "VENUE", slug: "salones" },
  { code: "CATERING", slug: "catering" },
  { code: "PHOTOGRAPHY", slug: "fotografia" },
  { code: "MUSIC", slug: "musica" },
  { code: "DECORATION", slug: "decoracion" },
  { code: "MAKEUP", slug: "maquillaje" },
  { code: "TRANSPORT", slug: "transporte" },
  { code: "INVITATIONS", slug: "invitaciones" },
  { code: "WEDDING_PLANNER", slug: "wedding-planners" },
  { code: "ACCOMMODATION", slug: "hospedaje" },
  { code: "HONEYMOON", slug: "luna-de-miel" }
] as const;
export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const PROVIDER_CITIES = [
  { slug: "la-paz", name: "La Paz", department: "La Paz", featured: true },
  { slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz", featured: true },
  { slug: "cochabamba", name: "Cochabamba", department: "Cochabamba", featured: true },
  { slug: "sucre", name: "Sucre", department: "Chuquisaca", featured: true },
  { slug: "tarija", name: "Tarija", department: "Tarija", featured: false },
  { slug: "oruro", name: "Oruro", department: "Oruro", featured: false },
  { slug: "potosi", name: "Potosí", department: "Potosí", featured: false },
  { slug: "trinidad", name: "Trinidad", department: "Beni", featured: false },
  { slug: "cobija", name: "Cobija", department: "Pando", featured: false }
] as const;
export type ProviderCity = (typeof PROVIDER_CITIES)[number];

/**
 * The label of a listing's category. Categories are reference data the admin can extend, so the name the catalogue
 * publishes (GET /providers/categories) wins; then the static translation (catalogue unreachable or category retired);
 * and last the code written as words. Never a translation key nor a bare code.
 * `translate` returns the key when it has no text for it (i18next's behaviour).
 */
export function categoryLabel(code: string, translate: (key: string) => string, published: Readonly<Record<string, string>> = {}): string {
  // The catalogue answers the code as the name of a category with no translation: that is not a name.
  const name = published[code];
  if (name && name !== code) return name;
  // "" is how the verification queue says "no listing yet".
  if (!code) return "";
  const key = `directory.category.${code}`;
  const own = translate(key);
  if (own && own !== key) return own;
  const words = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type OfferKind = "SERVICE" | "PRODUCT" | "OFFER";
export const FACT_LEAD_KEY: Readonly<Record<OfferKind, string>> = { SERVICE: "partner.factLeadService", PRODUCT: "partner.factLeadProduct", OFFER: "partner.factLeadOffer" };

/**
 * What a provider's listings are, to name them when counting. The public card carries no listing type, but its category
 * does (`listingType` of GET /providers/categories, and the catalogue rejects a listing of the other type). All of one
 * type is named by it; a mix, a category open to both (null) or one that could not be read is the neutral "OFFER".
 */
export function offerKind(listings: readonly { readonly category: string }[], categories: readonly { readonly code: string; readonly listingType?: string | null }[]): OfferKind {
  const kinds = new Set(listings.map((listing) => categories.find((category) => category.code === listing.category)?.listingType ?? "OFFER"));
  const [only] = kinds;
  return kinds.size === 1 && (only === "SERVICE" || only === "PRODUCT") ? only : "OFFER";
}

export const categoryBySlug = (slug: string): ProviderCategory | undefined => PROVIDER_CATEGORIES.find((category) => category.slug === slug);
export const cityBySlug = (slug: string): ProviderCity | undefined => PROVIDER_CITIES.find((city) => city.slug === slug);

/** One verified, published listing as the directory shows it. */
export interface DirectoryCard {
  readonly listingId: string;
  readonly providerSlug: string;
  readonly name: string;
  readonly category: string;
  readonly city: string;
  readonly department: string;
  readonly verified: boolean;
  readonly summary?: string;
  readonly priceFrom?: { readonly amountMinor: number; readonly currency: string };
  readonly imageUrl?: string;
  /** Destinations enabled for the listing (WHATSAPP, PHONE, EMAIL, INSTAGRAM, OFFICIAL_SITE, LANDING, PRODUCT_PAGE); each is reached through /r/{listingId}. */
  readonly destinations?: readonly string[];
  /** Cities or areas the provider serves (F25 coverage zone). */
  readonly coverage?: readonly string[];
  /** A line of text or, as the catalogue really sends it, an object `{ line, city, reference, latitude, longitude }` (see `addressText`, `addressPoint`). */
  readonly address?: string | { readonly line?: string; readonly city?: string; readonly reference?: string; readonly latitude?: number; readonly longitude?: number };
  /** The business hours as the catalogue sends them (contract `BusinessHours`: `{ weekly: [{ weekdays, opens, closes }], note? }`); read with `hoursLines`. Older mocks sent a list of lines, which `hoursLines` also accepts. */
  readonly hours?: ProviderCatalogComponents["schemas"]["BusinessHours"] | readonly string[];
  /** Present in the Provider Catalog 2.0.0 card: who fulfils, coverage zones, transport cost and lead time (F25-04). */
  readonly fulfillment?: { readonly responsible: string; readonly coverageZones: readonly string[]; readonly transportCostMinor?: number; readonly leadTimeDays: number; readonly conditions: string; readonly disclaimer: string };
  /** Not in the public card today; resolved through the listing when absent (apps/seo-web/lib/catalog.ts). */
  readonly providerId?: string;
}

/** One page of GET /providers. */
export interface DirectoryPage { readonly items: readonly DirectoryCard[]; readonly total: number; readonly page: number; readonly pageSize: number }

export const PAGE_SIZE = 12;
const FIRST_PAGE = 1;

/** What the directory asks GET /providers for (consumer contract in docs/contracts/provider-search.md). */
export interface DirectoryQuery {
  readonly category?: string;
  readonly city?: string;
  readonly verifiedOnly?: boolean;
  readonly maxPriceMinor?: number;
  readonly date?: string;
  /** Provider microsite lookup (F25): returns only that provider's verified listings. */
  readonly slug?: string;
  /** Proximity filter (F24 REQ-04): listings within `radiusKm` of the point, nearest first. Wins over `city`. */
  readonly near?: GeoFilter;
  readonly page?: number;
}

export interface GeoFilter { readonly lat: number; readonly lng: number; readonly radiusKm: number }

export const DEFAULT_RADIUS_KM = 25;
export const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
const GEO_DECIMALS = 2;
const MAX_LAT = 90;
const MAX_LNG = 180;
const MAX_RADIUS_KM = 200;

/**
 * Reads ?lat=&lng=&radio= (km). Anything out of range is ignored so the page falls back to the city filter.
 * Coordinates are rounded to about 1 km: enough for "near me", and the browser's exact position is never sent.
 */
export function parseGeo(lat: string | undefined, lng: string | undefined, radius: string | undefined): GeoFilter | undefined {
  if (!lat || !lng) return undefined;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > MAX_LAT || Math.abs(longitude) > MAX_LNG) return undefined;
  const parsedRadius = Number(radius);
  const radiusKm = Number.isFinite(parsedRadius) && parsedRadius > 0 && parsedRadius <= MAX_RADIUS_KM ? parsedRadius : DEFAULT_RADIUS_KM;
  return { lat: Number(latitude.toFixed(GEO_DECIMALS)), lng: Number(longitude.toFixed(GEO_DECIMALS)), radiusKm };
}

/** Builds the query of GET /providers (consumer contract in docs/contracts/provider-search.md). */
export function providerSearchPath(query: DirectoryQuery): string {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.slug) params.set("slug", query.slug);
  if (query.near) {
    params.set("lat", String(query.near.lat));
    params.set("lng", String(query.near.lng));
    params.set("radiusKm", String(query.near.radiusKm));
  } else if (query.city) params.set("city", query.city);
  if (query.verifiedOnly) params.set("verified", "true");
  if (query.maxPriceMinor !== undefined) params.set("maxPriceMinor", String(query.maxPriceMinor));
  if (query.date) params.set("availableOn", query.date);
  params.set("page", String(query.page ?? FIRST_PAGE));
  params.set("pageSize", String(PAGE_SIZE));
  return `/providers?${params.toString()}`;
}

export function pageCount(page: { readonly total: number; readonly pageSize: number }): number {
  return Math.max(FIRST_PAGE, Math.ceil(page.total / page.pageSize));
}

/** ?page=N from search params, never below 1. */
export function pageParam(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > FIRST_PAGE ? parsed : FIRST_PAGE;
}

const MAX_BATCH = 50;
const FLUSH_MS = 1200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Collects the listings that actually entered the viewport and reports them with POST /providers/impressions in batches
 * (1-50 distinct ids per call). A listing is reported once per page view; the body carries only listing ids and the surface:
 * no visitor identifier, no query, no location, no cookie.
 */
export function createImpressionBatcher(post: (body: { listingIds: string[]; surface: string }) => Promise<unknown>, surface: string, schedule: (fn: () => void, ms: number) => unknown = setTimeout) {
  const reported = new Set<string>();
  let queue: string[] = [];
  let timer: unknown = null;
  async function flush(): Promise<void> {
    timer = null;
    while (queue.length) {
      const listingIds = queue.slice(0, MAX_BATCH);
      queue = queue.slice(MAX_BATCH);
      try { await post({ listingIds, surface }); } catch { /* metrics are best effort: never surface an error to the visitor */ }
    }
  }
  return {
    seen(listingId: string): void {
      if (!UUID.test(listingId) || reported.has(listingId)) return;
      reported.add(listingId);
      queue.push(listingId);
      if (queue.length >= MAX_BATCH) void flush();
      else if (timer === null) timer = schedule(() => { void flush(); }, FLUSH_MS);
    },
    flush
  };
}

export const recordImpressions = (client: ApiClient, body: { listingIds: string[]; surface: string }): Promise<unknown> =>
  client.request("/providers/impressions", { method: "POST", auth: false, body });
