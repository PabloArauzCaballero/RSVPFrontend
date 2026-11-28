import { useQuery } from "@tanstack/react-query";
import { DEFAULT_MAP_CONFIG, readMapConfig, type MapConfig } from "@rsvp/celebration-theme/model";
import { useApiClient } from "./providers";
import { OSM_TILE_URL, mapTileUrl } from "./map-tiles";

/**
 * Map settings of the backend (`GET /providers/geo/map-config`): tile server, attribution and whether search is on. They are
 * read at run time so the map provider can change without publishing the apps. While they load, or if they cannot be read,
 * the build-time override (`EXPO_PUBLIC_MAP_TILE_URL`) or OpenStreetMap's own server is used, so the map never waits on this call.
 */
export function useMapConfigState(): { readonly config: MapConfig; /** The settings call finished, whatever its outcome: a map created now will not be re-created with other tiles. */ readonly settled: boolean } {
  const client = useApiClient();
  const query = useQuery({
    queryKey: ["map-config"],
    queryFn: async () => readMapConfig(await client.request<unknown>("/providers/geo/map-config", { auth: false })),
    staleTime: 5 * 60 * 1000, retry: false, refetchOnWindowFocus: false
  });
  if (query.data) return { config: query.data, settled: true };
  const fallback = mapTileUrl();
  return { config: fallback === OSM_TILE_URL ? DEFAULT_MAP_CONFIG : { ...DEFAULT_MAP_CONFIG, tileUrl: fallback }, settled: query.isFetched };
}

export function useMapConfig(): MapConfig {
  return useMapConfigState().config;
}
