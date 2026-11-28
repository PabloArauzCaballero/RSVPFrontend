/**
 * The place of a celebration, without links. The host marks a point (search or pin) and the invitation shows an OpenStreetMap
 * map and a «how to get there» action built from the coordinates. Nothing here reads or writes a maps URL as the way to give a
 * location; `venueMapUrl` only survives as a legacy input (a point may still be read from it) and as an OpenStreetMap link the
 * editor keeps writing so apps that do not know `locations` yet keep a pin (see `legacyLink`).
 */

export interface MapPoint { readonly lat: number; readonly lng: number }
export const LocationSource = { Pin: "pin", Search: "search", Device: "device", LegacyLink: "legacy-link" } as const;
export type LocationSource = (typeof LocationSource)[keyof typeof LocationSource];
export interface OsmRef { readonly type: "node" | "way" | "relation"; readonly id: number }

/** A point of `content.locations` (backend contract: Celebration 1.7.0). */
export interface CelebrationLocation {
  readonly lat: number;
  readonly lng: number;
  readonly address?: string;
  readonly reference?: string;
  /** The place name the point was marked for: when the venue is renamed to something else the pin is no longer trusted. */
  readonly forName?: string;
  readonly source: LocationSource;
  readonly osm?: OsmRef;
}

export const LOCATIONS_KEY = "locations";
export const MAIN_LOCATION = "main";
export const LOCATION_TEXT_MAX = { address: 200, reference: 200, forName: 120 } as const;
export const MAX_LOCATIONS = 21;

type Unknown = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Unknown => typeof value === "object" && value !== null && !Array.isArray(value);
const SOURCES = Object.values(LocationSource) as readonly string[];
const OSM_TYPES = ["node", "way", "relation"] as const;
const COORDINATE_DIGITS = 6;

export const isPoint = (lat: unknown, lng: unknown): boolean =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const clean = (value: unknown, max: number): string | undefined => {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text.length <= max ? text : undefined;
};

/** One point, read defensively: anything malformed is dropped (the backend already refuses it, but a stale or hand-made value never breaks a page). */
export function readLocation(value: unknown): CelebrationLocation | undefined {
  if (!isRecord(value) || !isPoint(value["lat"], value["lng"])) return undefined;
  const source = SOURCES.includes(value["source"] as string) ? (value["source"] as LocationSource) : LocationSource.Pin;
  const address = clean(value["address"], LOCATION_TEXT_MAX.address);
  const reference = clean(value["reference"], LOCATION_TEXT_MAX.reference);
  const forName = clean(value["forName"], LOCATION_TEXT_MAX.forName);
  const osm = isRecord(value["osm"]) && OSM_TYPES.includes(value["osm"]["type"] as never) && Number.isSafeInteger(value["osm"]["id"]) && (value["osm"]["id"] as number) > 0
    ? { type: value["osm"]["type"] as OsmRef["type"], id: value["osm"]["id"] as number } : undefined;
  return { lat: value["lat"] as number, lng: value["lng"] as number, source, ...(address ? { address } : {}), ...(reference ? { reference } : {}), ...(forName ? { forName } : {}), ...(osm ? { osm } : {}) };
}

export function readLocations(value: unknown): Readonly<Record<string, CelebrationLocation>> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, MAX_LOCATIONS).flatMap(([key, entry]) => {
    const location = readLocation(entry);
    return location ? [[key, location] as const] : [];
  }));
}

/**
 * `locations` after setting (or, with `null`, removing) one place. Places that are neither `main` nor in `keep` are dropped, so removing a
 * venue never leaves its point behind. Returns `undefined` when nothing is left (the key is then removed from the content).
 */
export function withLocation(current: unknown, key: string, entry: CelebrationLocation | null, keep: readonly string[]): Record<string, CelebrationLocation> | undefined {
  const allowed = new Set([MAIN_LOCATION, ...keep]);
  const next = Object.fromEntries(Object.entries({ ...readLocations(current), ...(entry ? { [key]: entry } : {}) }).filter(([name]) => allowed.has(name) && (entry !== null || name !== key)));
  return Object.keys(next).length ? next : undefined;
}

const sameWord = (left: string | undefined, right: string | undefined): boolean => (left ?? "").trim().toLowerCase() === (right ?? "").trim().toLowerCase();

/** Roughly 55 m: a pin marked again by an old client lands elsewhere by more than this. */
const SAME_PLACE_DEGREES = 0.0005;
const near = (first: MapPoint, second: MapPoint): boolean => Math.abs(first.lat - second.lat) <= SAME_PLACE_DEGREES && Math.abs(first.lng - second.lng) <= SAME_PLACE_DEGREES;

/**
 * The point to show for a place. A saved point is trusted while the name it was marked for is still the place's name; if an
 * older app changed the legacy link to another point, that newer choice wins (shown as unverified); a point read from a legacy
 * link only is `legacy-link`, never `pin`. `null` when there is nothing to show.
 */
export function resolveLocation(options: { readonly saved?: CelebrationLocation | undefined; readonly name: string; readonly legacy?: MapPoint | null | undefined }): CelebrationLocation | null {
  const { saved, name, legacy } = options;
  const trusted = saved && (!saved.forName || sameWord(saved.forName, name)) ? saved : undefined;
  if (trusted && (!legacy || near(trusted, legacy))) return trusted;
  if (legacy) return { lat: legacy.lat, lng: legacy.lng, source: LocationSource.LegacyLink, ...(trusted?.address ? { address: trusted.address } : {}) };
  return null;
}

export function formatPoint({ lat, lng }: MapPoint): string {
  return `${lat.toFixed(COORDINATE_DIGITS)},${lng.toFixed(COORDINATE_DIGITS)}`;
}

/** An OpenStreetMap link that opens on the point. Used for the legacy mirror (`venueMapUrl`) that apps without `locations` still read. */
export function legacyLink({ lat, lng }: MapPoint): string {
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(COORDINATE_DIGITS)}&mlon=${lng.toFixed(COORDINATE_DIGITS)}`;
}

/** «Cómo llegar»: OpenStreetMap's directions to the point, generated from coordinates (never a link the host provided). */
export function directionsHref({ lat, lng }: MapPoint): string {
  return `https://www.openstreetmap.org/directions?route=%3B${lat.toFixed(COORDINATE_DIGITS)}%2C${lng.toFixed(COORDINATE_DIGITS)}`;
}

/** The same point on the OpenStreetMap map, for when the in-page map cannot load. */
export function openMapHref({ lat, lng }: MapPoint): string {
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(COORDINATE_DIGITS)}&mlon=${lng.toFixed(COORDINATE_DIGITS)}#map=17/${lat.toFixed(COORDINATE_DIGITS)}/${lng.toFixed(COORDINATE_DIGITS)}`;
}

/** Map settings served by the backend (`GET /providers/geo/map-config`); this default is OpenStreetMap's own public server. */
export interface MapConfig { readonly tileUrl: string; readonly attribution: string; readonly maxZoom: number; readonly searchEnabled: boolean }
export const DEFAULT_MAP_CONFIG: MapConfig = { tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors", maxZoom: 19, searchEnabled: true };

/** A usable tile template: `https` (or local `http` for tests), no credentials, with the three coordinates. Anything else keeps the default. */
export function readMapConfig(value: unknown): MapConfig {
  if (!isRecord(value)) return DEFAULT_MAP_CONFIG;
  const tileUrl = typeof value["tileUrl"] === "string" ? value["tileUrl"] : "";
  let usable = false;
  try { const url = new URL(tileUrl.replace("{s}", "a").replace(/\{[zxy]\}/g, "1")); usable = (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) && !url.username && !url.password && ["{z}", "{x}", "{y}"].every((part) => tileUrl.includes(part)); } catch { usable = false; }
  const attribution = typeof value["attribution"] === "string" && value["attribution"].trim() && value["attribution"].length <= 300 ? value["attribution"].trim() : DEFAULT_MAP_CONFIG.attribution;
  const maxZoom = typeof value["maxZoom"] === "number" && Number.isInteger(value["maxZoom"]) && value["maxZoom"] >= 1 && value["maxZoom"] <= 22 ? value["maxZoom"] : DEFAULT_MAP_CONFIG.maxZoom;
  return { tileUrl: usable ? tileUrl : DEFAULT_MAP_CONFIG.tileUrl, attribution, maxZoom, searchEnabled: value["searchEnabled"] !== false };
}
