import type { ApiClient } from "../types.js";

/**
 * Place search for the host's venue (MAP-03). It goes through the backend (`GET /providers/geo/search`), never straight to
 * Nominatim: the backend keeps the one-request-per-second budget of the whole app, caches, identifies us and can switch the
 * search off without publishing the apps. Call it only for a query the host explicitly submitted (never while typing).
 */
export interface MapPlace {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly point: { readonly lat: number; readonly lng: number };
  readonly osm?: { readonly type: "node" | "way" | "relation"; readonly id: number };
}

export interface MapPlaceSearch { readonly places: readonly MapPlace[]; readonly attribution: string }

const MAX_RESULTS = 5;

function toPlace(entry: unknown): MapPlace[] {
  if (!entry || typeof entry !== "object") return [];
  const row = entry as Record<string, unknown>;
  const { id, name, label, lat, lng, osmType, osmId } = row;
  if (typeof id !== "string" || typeof name !== "string" || typeof label !== "string" || !name || !label) return [];
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
  const kind = (["node", "way", "relation"] as const).find((candidate) => candidate === osmType);
  const osm = kind && typeof osmId === "number" && Number.isSafeInteger(osmId) && osmId > 0 ? { type: kind, id: osmId } : undefined;
  return [{ id, name, label, point: { lat, lng }, ...(osm ? { osm } : {}) }];
}

export async function searchMapPlaces(client: ApiClient, query: string, locale: string, signal?: AbortSignal): Promise<MapPlaceSearch> {
  const params = new URLSearchParams({ q: query, lang: locale === "en-US" ? "en-US" : "es-BO" });
  const body = await client.request<{ readonly items?: unknown; readonly attribution?: unknown }>(`/providers/geo/search?${params}`, { ...(signal ? { signal } : {}) });
  const items = Array.isArray(body?.items) ? body.items.slice(0, MAX_RESULTS).flatMap(toPlace) : [];
  return { places: items, attribution: typeof body?.attribution === "string" && body.attribution ? body.attribution : "© OpenStreetMap contributors" };
}
