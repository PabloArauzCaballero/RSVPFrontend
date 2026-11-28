/**
 * The message the map page (`/mapa/incrustado` of the site, loaded in the app's web view) and the native host editor exchange.
 * Pure and shared by both sides so neither trusts the other's shape: every message carries the bridge name, a known type and
 * numbers in range. The search runs in the app, with the host's session; the web view never holds a token.
 */
export const MAP_BRIDGE = "rsvp-map" as const;
export const MAP_EMBED_PATH = "/mapa/incrustado";

export type MapToNative =
  | { readonly bridge: typeof MAP_BRIDGE; readonly type: "ready" }
  | { readonly bridge: typeof MAP_BRIDGE; readonly type: "moved"; readonly lat: number; readonly lng: number }
  | { readonly bridge: typeof MAP_BRIDGE; readonly type: "unavailable" };
export type NativeToMap = { readonly bridge: typeof MAP_BRIDGE; readonly type: "center"; readonly lat: number; readonly lng: number; readonly zoom?: number };

const inRange = (lat: unknown, lng: unknown): boolean => typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

function parse(raw: unknown): Record<string, unknown> | null {
  let value: unknown = raw;
  if (typeof raw === "string") { try { value = JSON.parse(raw); } catch { return null; } }
  return typeof value === "object" && value !== null && !Array.isArray(value) && (value as Record<string, unknown>)["bridge"] === MAP_BRIDGE ? (value as Record<string, unknown>) : null;
}

export function parseMapToNative(raw: unknown): MapToNative | null {
  const message = parse(raw);
  if (!message) return null;
  if (message["type"] === "ready" || message["type"] === "unavailable") return { bridge: MAP_BRIDGE, type: message["type"] };
  if (message["type"] === "moved" && inRange(message["lat"], message["lng"])) return { bridge: MAP_BRIDGE, type: "moved", lat: message["lat"] as number, lng: message["lng"] as number };
  return null;
}

export function parseNativeToMap(raw: unknown): NativeToMap | null {
  const message = parse(raw);
  if (!message || message["type"] !== "center" || !inRange(message["lat"], message["lng"])) return null;
  const zoom = typeof message["zoom"] === "number" && message["zoom"] >= 1 && message["zoom"] <= 22 ? message["zoom"] : undefined;
  return { bridge: MAP_BRIDGE, type: "center", lat: message["lat"] as number, lng: message["lng"] as number, ...(zoom ? { zoom } : {}) };
}

/** Address of the map page for the web view: where it opens (the point already marked, or Bolivia) and nothing personal. */
export function mapEmbedUrl(origin: string, start: { readonly lat: number; readonly lng: number; readonly zoom: number }): string {
  const query = new URLSearchParams({ lat: start.lat.toFixed(6), lng: start.lng.toFixed(6), z: String(start.zoom) });
  return `${origin.replace(/\/$/, "")}${MAP_EMBED_PATH}?${query}`;
}

/** Where the map page starts, from its query; anything out of range opens on Bolivia. */
export function startFromQuery(query: { readonly lat?: string | undefined; readonly lng?: string | undefined; readonly z?: string | undefined }): { readonly lat: number; readonly lng: number; readonly zoom: number } {
  const lat = Number(query.lat); const lng = Number(query.lng); const zoom = Number(query.z);
  if (query.lat && query.lng && inRange(lat, lng)) return { lat, lng, zoom: Number.isInteger(zoom) && zoom >= 1 && zoom <= 19 ? zoom : 17 };
  return { lat: -16.7, lng: -64.9, zoom: 5 };
}
