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
  readonly page?: number;
}

/** Builds the query of GET /providers (consumer contract in docs/contracts/provider-search.md). */
export function providerSearchPath(query: ProviderQuery): string {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.city) params.set("city", query.city);
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
