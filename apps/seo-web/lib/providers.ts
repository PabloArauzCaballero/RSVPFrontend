import type { ApiClient } from "@rsvp/api-client";
import { PAGE_SIZE, providerSearchPath, type DirectoryCard, type DirectoryQuery, type OfferCategory } from "@rsvp/query-hooks";
import { publicClient } from "./api";

// Reference data and query building live in @rsvp/query-hooks so the app's directory searches and paginates identically.
export {
  PROVIDER_CATEGORIES, PROVIDER_CITIES, categoryBySlug, cityBySlug, PAGE_SIZE, DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM,
  parseGeo, providerSearchPath, pageCount, pageParam, type ProviderCategory, type ProviderCity, type GeoFilter
} from "@rsvp/query-hooks";

/** Provider directory (F24), server side: the search that never throws (an unreachable catalogue is a state of the page). */
const FIRST_PAGE = 1;

export type ProviderCard = DirectoryCard;

export interface ProviderPage {
  readonly items: readonly ProviderCard[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  /** False when the catalogue could not be reached; the page then says so instead of inventing results. */
  readonly available: boolean;
}

export type ProviderQuery = DirectoryQuery;

/**
 * The categories the catalogue publishes in one language (GET /providers/categories): names and listing types. They are
 * extended by the admin, so the static translation can lag behind; an unreachable catalogue leaves the translation alone.
 */
export async function loadCategories(locale: string, client: ApiClient = publicClient()): Promise<readonly OfferCategory[]> {
  try {
    const { items } = await client.request<{ readonly items: readonly OfferCategory[] }>(`/providers/categories?locale=${encodeURIComponent(locale)}`, { auth: false });
    return items;
  } catch {
    return [];
  }
}

export const categoryNamesOf = (categories: readonly OfferCategory[]): Readonly<Record<string, string>> => Object.fromEntries(categories.map((item) => [item.code, item.name]));

export const loadCategoryNames = async (locale: string, client?: ApiClient): Promise<Readonly<Record<string, string>>> => categoryNamesOf(await loadCategories(locale, client));

export async function searchProviders(query: ProviderQuery, client: ApiClient = publicClient()): Promise<ProviderPage> {
  try {
    const page = await client.request<Omit<ProviderPage, "available">>(providerSearchPath(query), { auth: false });
    return { ...page, available: true };
  } catch {
    return { items: [], total: 0, page: query.page ?? FIRST_PAGE, pageSize: PAGE_SIZE, available: false };
  }
}
