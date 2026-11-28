import { useQuery } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { retryTransient } from "../policy.js";
import { sheetLocale } from "./product-sheet.js";
import type { GiftRecommendations } from "../gift/assistant.js";

/**
 * R3 (provider-catalog 3.6.0, D-10 §5.5): the ideas with eligible products for an event type and a city. Public and read-only. It is the only source
 * of the host assistant: when it fails the screen shows the error with «Reintentar», never another list (A27).
 */
export interface RecommendationQuery { readonly eventType?: string | undefined; readonly city?: string | undefined; readonly locale: string }

/**
 * The server answers 422 INVALID_QUERY to ANY parameter outside eventType, city, ideas, productsPerIdea, offset and locale, a cache-buster included,
 * so the URL is built here from that closed list and nothing else is ever appended.
 */
export function recommendationPath(query: RecommendationQuery): string {
  const params = new URLSearchParams();
  if (query.eventType) params.set("eventType", query.eventType);
  if (query.city) params.set("city", query.city);
  params.set("locale", sheetLocale(query.locale));
  return `/providers/gift-ideas/recommendations?${params.toString()}`;
}

export const recommendationKey = (query: RecommendationQuery) => ["providers", "gift-recommendations", query.eventType ?? "", query.city ?? "", sheetLocale(query.locale)] as const;

export function useGiftRecommendations(client: ApiClient, query: RecommendationQuery, enabled = true) {
  return useQuery({
    queryKey: recommendationKey(query),
    queryFn: ({ signal }) => client.request<GiftRecommendations>(recommendationPath(query), { auth: false, signal }),
    // The server caches 60 s; the assistant keeps what the host is choosing from for as long.
    staleTime: 60_000, gcTime: 5 * 60_000, retry: retryTransient, enabled
  });
}
