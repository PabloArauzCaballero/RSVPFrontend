import type { ApiClient } from "@rsvp/api-client";
import { publicClient } from "./api";

/**
 * Provider directory (F24). Categories and cities are the reference data of provider-catalog
 * (`categories`, `boliviaGeo`); their Spanish URL slugs are what ranks for searches such as
 * "salón de eventos Santa Cruz".
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

export const categoryBySlug = (slug: string): ProviderCategory | undefined => PROVIDER_CATEGORIES.find((category) => category.slug === slug);
export const cityBySlug = (slug: string): ProviderCity | undefined => PROVIDER_CITIES.find((city) => city.slug === slug);

export const PAGE_SIZE = 12;
const FIRST_PAGE = 1;

/** One verified, published listing as the directory shows it. */
export interface ProviderCard {
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
  readonly address?: string;
  readonly hours?: readonly string[];
  /** Present in the Provider Catalog 2.0.0 card: who fulfils, coverage zones, transport cost and lead time (F25-04). */
  readonly fulfillment?: { readonly responsible: string; readonly coverageZones: readonly string[]; readonly transportCostMinor?: number; readonly leadTimeDays: number; readonly conditions: string; readonly disclaimer: string };
  /** Not in the public card today; resolved through the listing when absent (lib/catalog.ts). */
  readonly providerId?: string;
}

export interface ProviderPage {
  readonly items: readonly ProviderCard[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  /** False when the catalogue could not be reached; the page then says so instead of inventing results. */
  readonly available: boolean;
}

export interface ProviderQuery {
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
export function providerSearchPath(query: ProviderQuery): string {
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

export async function searchProviders(query: ProviderQuery, client: ApiClient = publicClient()): Promise<ProviderPage> {
  try {
    const page = await client.request<Omit<ProviderPage, "available">>(providerSearchPath(query), { auth: false });
    return { ...page, available: true };
  } catch {
    return { items: [], total: 0, page: query.page ?? FIRST_PAGE, pageSize: PAGE_SIZE, available: false };
  }
}

export function pageCount(page: Pick<ProviderPage, "total" | "pageSize">): number {
  return Math.max(FIRST_PAGE, Math.ceil(page.total / page.pageSize));
}

/** ?page=N from search params, never below 1. */
export function pageParam(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > FIRST_PAGE ? parsed : FIRST_PAGE;
}
