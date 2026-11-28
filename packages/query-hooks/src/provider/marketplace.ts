/**
 * Proveedores para mi evento (marketplace del invitado): reference data and query building shared by seo-web (the guest's tab) and
 * anything that links to it. Categories come from GET /providers/categories?view=marketplace, in the order of the event type; the
 * thumbnails are static art keyed by the category slug (see `MARKETPLACE_THUMBS`). A category the art does not know (one an admin
 * created) gets the generic tile: the row never breaks.
 *
 * Consumer contract: provider-catalog 3.8.0 (provisional; assigned at merge). Nothing here sends a guest identifier.
 */

/** Slugs of the 20 categories that have a 3D thumbnail (files under apps/seo-web/public/marketplace/v1). Same order as the wedding order. */
export const MARKETPLACE_THUMBS = [
  "wedding-planners", "salones", "catering", "fotografia", "musica", "decoracion", "pastry", "flowers", "maquillaje", "vestidos-y-trajes",
  "jewelry", "invitaciones", "alquiler-para-eventos", "sonido-e-iluminacion", "bebidas-y-barra", "animacion-y-shows", "recuerdos",
  "transporte", "hospedaje", "luna-de-miel"
] as const;
export type MarketplaceThumb = (typeof MARKETPLACE_THUMBS)[number];
export const MARKETPLACE_THUMB_SIZES = [88, 176, 264] as const;
export type MarketplaceThumbSize = (typeof MARKETPLACE_THUMB_SIZES)[number];
export type MarketplaceTheme = "light" | "dark";

export const isMarketplaceThumb = (slug: string): slug is MarketplaceThumb => (MARKETPLACE_THUMBS as readonly string[]).includes(slug);

/** Public path of a thumbnail (`v1` is part of the path: the files are immutable, new art is a new folder). */
export const marketplaceThumbSrc = (slug: MarketplaceThumb, theme: MarketplaceTheme, size: MarketplaceThumbSize): string => `/marketplace/v1/${slug}-${theme}-${size}.webp`;
/** `srcset` of one theme: 88 px for 1x, 176 for 2x, 264 for 3x. */
export const marketplaceThumbSrcSet = (slug: MarketplaceThumb, theme: MarketplaceTheme): string =>
  MARKETPLACE_THUMB_SIZES.map((size, index) => `${marketplaceThumbSrc(slug, theme, size)} ${index + 1}x`).join(", ");

/** A category of the guest marketplace (GET /providers/categories?view=marketplace). */
export interface MarketplaceCategory {
  readonly code: string;
  readonly slug: string;
  readonly name: string;
  readonly listingType?: "SERVICE" | "PRODUCT" | null;
  /** 1-based position for the requested event type. */
  readonly order: number;
  /** Providers with an eligible offer (in the city, when one was asked). */
  readonly count: number;
}

/** One card of the marketplace: the directory card plus the two additive fields of 3.8.0. */
export interface MarketplaceCard {
  readonly listingId: string;
  readonly providerId?: string;
  readonly providerSlug: string;
  readonly providerName?: string;
  readonly name: string;
  readonly category: string;
  readonly listingType?: "SERVICE" | "PRODUCT";
  /** True when the provider's plan raised the card in the ranking: the page says so («Destacado»). */
  readonly sponsored?: boolean;
  readonly city: string;
  readonly department: string;
  readonly verified: boolean;
  readonly summary?: string;
  readonly priceFrom?: { readonly amountMinor: number; readonly currency: string };
  readonly imageUrl?: string;
  readonly destinations?: readonly string[];
}
export interface MarketplacePage { readonly items: readonly MarketplaceCard[]; readonly total: number; readonly page: number; readonly pageSize: number }

export const MARKETPLACE_PAGE_SIZE = 12;
const EVENT_TYPE = /^[A-Z][A-Z0-9_]{1,59}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface MarketplaceQuery {
  /** Category code or slug; absent = all. */
  readonly category?: string;
  /** City slug; filters strictly. */
  readonly city?: string;
  /** Event type of the celebration the guest comes from; only orders (never filters). */
  readonly eventType?: string;
  readonly page?: number;
}

/** GET /providers for the marketplace: one card per provider, the guest rules (view=marketplace). A malformed filter is dropped, never sent. */
export function marketplaceSearchPath(query: MarketplaceQuery): string {
  const params = new URLSearchParams({ view: "marketplace", groupBy: "provider" });
  if (query.category && SLUG.test(query.category.toLowerCase().replace(/_/g, "-"))) params.set("category", query.category);
  if (query.city && SLUG.test(query.city)) params.set("city", query.city);
  if (query.eventType && EVENT_TYPE.test(query.eventType)) params.set("eventType", query.eventType);
  params.set("page", String(Math.max(1, Math.trunc(query.page ?? 1))));
  params.set("pageSize", String(MARKETPLACE_PAGE_SIZE));
  return `/providers?${params.toString()}`;
}

/** GET /providers/categories for the marketplace tab: only categories with providers, in the order of the event type. */
export function marketplaceCategoriesPath(query: Pick<MarketplaceQuery, "city" | "eventType"> & { readonly locale?: string }): string {
  const params = new URLSearchParams({ view: "marketplace" });
  if (query.eventType && EVENT_TYPE.test(query.eventType)) params.set("eventType", query.eventType);
  if (query.city && SLUG.test(query.city)) params.set("city", query.city);
  if (query.locale === "es-BO" || query.locale === "en-US") params.set("locale", query.locale);
  return `/providers/categories?${params.toString()}`;
}

const slugify = (text: string): string => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * The city of the celebration, when its content says one: `citySlug`, `city` or `venueCity` matched against the cities the catalogue serves
 * (slug or name, without accents). The public view has no structured city, so no match means «all of Bolivia», never a guess.
 */
export function celebrationCityHint(content: Readonly<Record<string, unknown>> | undefined, cities: readonly { readonly slug: string; readonly name: string }[]): string | undefined {
  for (const key of ["citySlug", "city", "venueCity"]) {
    const raw = content?.[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const wanted = slugify(raw);
    const found = cities.find((city) => city.slug === wanted || slugify(city.name) === wanted);
    if (found) return found.slug;
  }
  return undefined;
}

/** Where the marketplace of a celebration lives. Never carries a query, a fragment or the guest's link. */
export const marketplacePath = (celebrationSlug: string): string => `/c/${encodeURIComponent(celebrationSlug)}/proveedores`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The origin of a click the guest made on the marketplace, kept for the tab only (sessionStorage) so the partner page can attribute it. */
export interface MarketplaceOrigin { readonly celebrationId: string; readonly at: number }
export const MARKETPLACE_ORIGIN_KEY = "rsvp.marketplace.origin";
export const MARKETPLACE_ORIGIN_TTL_MS = 2 * 60 * 60 * 1000;
export function parseMarketplaceOrigin(raw: string | null, now: number): MarketplaceOrigin | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<MarketplaceOrigin>;
    if (typeof value.celebrationId !== "string" || !UUID.test(value.celebrationId) || typeof value.at !== "number") return undefined;
    if (!(now >= value.at && now - value.at <= MARKETPLACE_ORIGIN_TTL_MS)) return undefined;
    return { celebrationId: value.celebrationId.toLowerCase(), at: value.at };
  } catch { return undefined; }
}
