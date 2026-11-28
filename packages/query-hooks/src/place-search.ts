import { ApiError, searchMapPlaces, type ApiClient } from '@rsvp/api-client';
import { useQuery } from '@tanstack/react-query';

/** The service caches for 30 days; this only avoids asking twice while the field is open. */
const CACHE_MS = 15 * 60 * 1000;

/** Why a search failed, for the field's message: busy (429), off or down (503) or anything else. */
export type PlaceSearchFailure = 'busy' | 'off' | 'error';
export function placeSearchFailure(error: unknown): PlaceSearchFailure {
  if (error instanceof ApiError) return error.status === 429 ? 'busy' : error.status === 503 ? 'off' : 'error';
  return 'error';
}

/** Runs only for a query the host submitted: the field sets `query` on «Buscar», never while typing (OSMF policy: no autocomplete). */
export function usePlaceSearch(client: ApiClient, query: string, locale: string) {
  return useQuery({
    queryKey: ['place-search', locale, query],
    queryFn: ({ signal }) => searchMapPlaces(client, query, locale, signal),
    enabled: Boolean(query),
    staleTime: CACHE_MS,
    gcTime: CACHE_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
