import { ApiError, type ApiClient } from "@rsvp/api-client";
import { celebrationCityHint, marketplaceCategoriesPath, marketplaceSearchPath, type MarketplaceCategory, type MarketplacePage } from "@rsvp/query-hooks";
import { publicClient } from "./api";

/**
 * Proveedores para mi evento (marketplace del invitado), server side. The tab is a public page of the celebration
 * (`/c/{slug}/proveedores`): it reads the celebration (type, id, city hint), the categories in the order of its event type and
 * one page of providers, all from the catalogue, and never from another source: a failure is an error state, not a fallback.
 * It reads nothing of the guest: no link credential, no guest id, no cookie.
 */

/** Off by default: the tab and every link to it exist only when the deployment sets GUEST_MARKETPLACE=on (decision 3 of the design report). */
export const guestMarketplaceEnabled = (env: Readonly<Record<string, string | undefined>> = process.env): boolean => env["GUEST_MARKETPLACE"] === "on";

export interface MarketplaceCity { readonly slug: string; readonly name: string; readonly department: string }
export interface MarketplaceCelebration { readonly celebrationId: string; readonly slug: string; readonly title: string; readonly eventType?: string; readonly cityHint?: string }

export type MarketplaceData =
  | { readonly state: "disabled" }
  | { readonly state: "not-found" }
  | { readonly state: "unavailable"; readonly celebration: MarketplaceCelebration }
  | {
      readonly state: "ready";
      readonly celebration: MarketplaceCelebration;
      readonly cities: readonly MarketplaceCity[];
      readonly categories: readonly MarketplaceCategory[];
      readonly page: MarketplacePage;
      /** The city actually applied (the guest's choice, else the celebration's), or undefined for all of Bolivia. */
      readonly city?: string;
      /** The category actually applied, or undefined for all. */
      readonly category?: string;
    };

interface PublicRead { readonly celebrationId: string; readonly slug: string; readonly content?: Readonly<Record<string, unknown>> & { readonly title?: string }; readonly eventType?: { readonly code?: string } }

export interface MarketplaceRequest { readonly slug: string; readonly category?: string | undefined; readonly city?: string | undefined; readonly page?: number | undefined; readonly locale: string; readonly env?: Readonly<Record<string, string | undefined>>; readonly client?: ApiClient }

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ALL = "todas";

/** `?ciudad=` is a city slug, or `todas` (the guest asked for all of Bolivia, so the celebration's city must not be applied again). */
export async function loadMarketplace(request: MarketplaceRequest): Promise<MarketplaceData> {
  if (!guestMarketplaceEnabled(request.env)) return { state: "disabled" };
  const client = request.client ?? publicClient();
  let view: PublicRead;
  try {
    view = await client.request<PublicRead>(`/celebrations/public/${encodeURIComponent(request.slug)}`, { auth: false });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { state: "not-found" };
    return { state: "unavailable", celebration: { celebrationId: "", slug: request.slug, title: request.slug } };
  }
  const celebration: MarketplaceCelebration = {
    celebrationId: view.celebrationId, slug: request.slug, title: view.content?.title ?? request.slug,
    ...(view.eventType?.code ? { eventType: view.eventType.code } : {})
  };
  const geo = await client.request<{ readonly items?: readonly MarketplaceCity[] }>("/providers/geo", { auth: false }).then((answer) => answer.items ?? [], () => undefined);
  const cities = geo ?? [];
  const hint = celebrationCityHint(view.content, cities);
  const asked = request.city === ALL ? undefined : request.city && SLUG.test(request.city) && cities.some((city) => city.slug === request.city) ? request.city : undefined;
  const city = request.city === ALL ? undefined : asked ?? hint;
  const withHint = { ...celebration, ...(hint ? { cityHint: hint } : {}) };
  try {
    const categories = await client.request<{ readonly items?: readonly MarketplaceCategory[] }>(marketplaceCategoriesPath({ ...(celebration.eventType ? { eventType: celebration.eventType } : {}), ...(city ? { city } : {}), locale: request.locale }), { auth: false });
    const items = categories.items ?? [];
    // A category the guest asked for stays applied even when it has no providers in this city (the list above only shows categories that have some):
    // the answer is then the empty state with a way out, not a silent change to «all». The catalogue answers an unknown slug with an empty page.
    const category = request.category && SLUG.test(request.category) ? request.category : undefined;
    const page = await client.request<MarketplacePage>(marketplaceSearchPath({ ...(category ? { category } : {}), ...(city ? { city } : {}), ...(celebration.eventType ? { eventType: celebration.eventType } : {}), page: request.page ?? 1 }), { auth: false });
    return { state: "ready", celebration: withHint, cities, categories: items, page, ...(city ? { city } : {}), ...(category ? { category } : {}) };
  } catch (error) {
    // The catalogue answers 404 MARKETPLACE_DISABLED while its own GUEST_MARKETPLACE is off: the tab does not exist, as when this site's switch is off.
    if (error instanceof ApiError && error.status === 404) return { state: "disabled" };
    return { state: "unavailable", celebration: withHint };
  }
}

/**
 * Whether the catalogue has at least one provider for the marketplace, to decide if the invitation shows the entry at all (a tab that is always empty
 * is not offered). One short answer per minute per server; a failure hides the entry, it never invents one.
 */
let known: { readonly at: number; readonly value: boolean } | undefined;
const KNOWN_MS = 60_000;
export async function marketplaceHasProviders(client: ApiClient = publicClient(), now: number = Date.now()): Promise<boolean> {
  if (known && now - known.at < KNOWN_MS) return known.value;
  const value = await client.request<{ readonly items?: readonly unknown[] }>(marketplaceCategoriesPath({}), { auth: false }).then((answer) => (answer.items?.length ?? 0) > 0, () => false);
  known = { at: now, value };
  return value;
}
/** Test hook: forget the remembered answer. */
export const forgetMarketplaceProviders = (): void => { known = undefined; };

/** Is the entry shown: the deployment turned the tab on and the catalogue has providers. */
export async function showMarketplaceEntry(env: Readonly<Record<string, string | undefined>> = process.env, client?: ApiClient): Promise<boolean> {
  return guestMarketplaceEnabled(env) && marketplaceHasProviders(client);
}
