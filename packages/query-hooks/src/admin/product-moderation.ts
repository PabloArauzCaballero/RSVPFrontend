import { useInfiniteQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import type { ProviderCatalogComponents } from "@rsvp/contracts";

/**
 * R8b (provider-catalog 3.11.0, D-10 #17 and #18, plan §5.13): the administrator's product moderation. Every type comes from the
 * generated contract, so a field renamed by the backend fails `tsc` here and not in a screen. All routes are ADMIN-only (401 / 403).
 * The inbox carries ids and catalog text only (PF-1): never a guest, an owner contact or a lead.
 */
type Schemas = ProviderCatalogComponents["schemas"];
export type ModerationInbox = Schemas["ModerationInbox"];
export type ModerationListing = Schemas["ModerationListing"];
export type ListingModeration = Schemas["ListingModeration"];
export type ModerationCompleteness = Schemas["CompletenessState"];
export type ModerationView = ModerationInbox["view"];

export const MODERATION_VIEWS: readonly ModerationView[] = ["RECENT", "HIDDEN"];
export const MODERATION_COMPLETENESS: readonly ModerationCompleteness[] = ["COMPLETE", "INCOMPLETE", "HIDDEN_BY_ADMIN"];
/** The server's limits for `days` (1 to 30, 7 by default) and the reason (3 to 500 characters, one line of plain text). */
export const MODERATION_DAYS: readonly number[] = [7, 14, 30];
export const MODERATION_DEFAULT_DAYS = 7;
export const HIDE_REASON_MIN = 3;
export const HIDE_REASON_MAX = 500;
export const MODERATION_PAGE_SIZE = 50;

export interface ModerationFilters {
  readonly view: ModerationView;
  readonly days?: number;
  readonly providerId?: string;
  readonly category?: string;
  readonly featured?: boolean;
  readonly completeness?: ModerationCompleteness;
  readonly locale?: string;
}

export const productModerationKeys = {
  all: ["admin", "product-moderation"] as const,
  list: (path: string) => ["admin", "product-moderation", "list", path] as const
} as const;

const ADMIN_LISTINGS = "/providers/admin/listings";
const INBOX = "/providers/admin/moderation/listings";

/** Only the filters that are set, in a fixed order (a stable cache key); the cursor goes last and only after the first page. */
export function productModerationPath(filters: ModerationFilters, cursor?: string): string {
  const params = new URLSearchParams();
  params.set("view", filters.view);
  if (filters.view === "RECENT" && filters.days !== undefined && filters.days !== MODERATION_DEFAULT_DAYS) params.set("days", String(filters.days));
  const providerId = filters.providerId?.trim();
  if (providerId) params.set("providerId", providerId);
  if (filters.category) params.set("category", filters.category);
  if (filters.featured !== undefined) params.set("featured", String(filters.featured));
  if (filters.completeness) params.set("completeness", filters.completeness);
  params.set("limit", String(MODERATION_PAGE_SIZE));
  if (filters.locale) params.set("locale", filters.locale);
  if (cursor) params.set("cursor", cursor);
  return `${INBOX}?${params.toString()}`;
}

/** The inbox by keyset pages: `fetchNextPage` sends the opaque `nextCursor` of the last page. A 422 INVALID_CURSOR is not retried. */
export function useProductModerationInbox(client: ApiClient, filters: ModerationFilters, enabled = true) {
  const key = productModerationPath(filters);
  return useInfiniteQuery({
    queryKey: productModerationKeys.list(key),
    queryFn: ({ pageParam }) => client.request<ModerationInbox>(productModerationPath(filters, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 5_000, gcTime: 60_000, retry: false, enabled
  });
}

/** The two tab counters, always of the last page read (they ignore the optional filters). */
export function moderationCounts(pages: readonly ModerationInbox[] | undefined): ModerationInbox["counts"] | undefined {
  return pages && pages.length > 0 ? pages[pages.length - 1]?.counts : undefined;
}

/** After any decision: the inbox (list and counters) and the reads of that provider (all providers when the answer did not say which). */
function refresh(queryClient: QueryClient, providerId?: string): Promise<unknown> {
  return Promise.all([queryClient.invalidateQueries({ queryKey: productModerationKeys.all }), queryClient.invalidateQueries({ queryKey: providerId ? ["providers", providerId] : ["providers"] })]);
}

/**
 * POST /providers/admin/listings/{id}/hide `{ reason }` (3 to 500 characters). Idempotent by state: the same reason again is 200 with
 * `replayed: true`; another reason while hidden is 409 LISTING_ALREADY_HIDDEN; a service is 422 MODERATION_PRODUCT_ONLY.
 */
export function useHideListing(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, reason }: { readonly listingId: string; readonly reason: string }) =>
      client.request<ListingModeration, Schemas["HideListingInput"]>(`${ADMIN_LISTINGS}/${encodeURIComponent(listingId)}/hide`, { method: "POST", body: { reason } }),
    onSettled: (data) => refresh(queryClient, data?.providerId)
  });
}

/** POST /providers/admin/listings/{id}/show. Idempotent: showing a visible product is 200 with `replayed: true`. It is not featured again. */
export function useShowListing(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId }: { readonly listingId: string }) => client.request<ListingModeration>(`${ADMIN_LISTINGS}/${encodeURIComponent(listingId)}/show`, { method: "POST" }),
    onSettled: (data) => refresh(queryClient, data?.providerId)
  });
}

/** PUT /providers/admin/listings/{id}/featured `{ featured }`. Idempotent; 409 LISTING_HIDDEN when the product is hidden, 422 FEATURED_PRODUCT_ONLY. */
export function useSetListingFeatured(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, featured }: { readonly listingId: string; readonly featured: boolean }) =>
      client.request<Schemas["ProductSheet"], { readonly featured: boolean }>(`${ADMIN_LISTINGS}/${encodeURIComponent(listingId)}/featured`, { method: "PUT", body: { featured } }),
    onSettled: (data) => refresh(queryClient, data?.providerId)
  });
}
