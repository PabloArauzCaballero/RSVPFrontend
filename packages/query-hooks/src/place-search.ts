import { searchMapPlaces } from '@rsvp/api-client';
import { useQuery } from '@tanstack/react-query';

const CACHE_MS = 15 * 60 * 1000;

export function usePlaceSearch(query: string, locale: string) {
  return useQuery({
    queryKey: ['place-search', locale, query],
    queryFn: ({ signal }) => searchMapPlaces(query, locale, signal),
    enabled: Boolean(query),
    staleTime: CACHE_MS,
    gcTime: CACHE_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
