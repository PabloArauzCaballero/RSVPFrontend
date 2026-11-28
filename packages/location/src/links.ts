import { isValidCoordinates, type Coordinates, type Location } from "./location";

/**
 * Map links: reading the point a link saved before carries in sight, and writing the OpenStreetMap link that stands in
 * for a point while stored data still has a link field. Only the text of the link is read: no request is made and no
 * redirect is followed, so a short link (maps.app.goo.gl, goo.gl, g.co) yields nothing.
 */

const LINK_MAX = 500;
const COORDINATE_DIGITS = 6;
const OSM_BASE = "https://www.openstreetmap.org/";

/** Map services whose links hosts have saved. The tests keep this in step with what the invitation accepts today. */
const MAP_HOSTS: readonly { readonly host: RegExp; readonly path?: RegExp }[] = [
  { host: /^(www\.|maps\.)?google\.[a-z.]{2,6}$/, path: /^\/maps(\/|$)/ },
  { host: /^maps\.google\.[a-z.]{2,6}$/ },
  { host: /^maps\.apple\.com$/ },
  { host: /^(www\.|ul\.)?waze\.com$/ },
  { host: /^(www\.)?openstreetmap\.org$/ },
  { host: /^osm\.org$/ }
];

const GOOGLE_HOST = /(^|\.)google\./;

/** A plain decimal number and nothing else: no exponent, no hexadecimal, no empty text. */
const DECIMAL = /^\s*[+-]?\d+(?:\.\d+)?\s*$/;
/** `@lat,lng` as one path segment, optionally followed by the zoom: `/@-17.78,-63.18,15z`. */
const AT_SEGMENT = /\/@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)(?=[,/]|$)/;

function point(lat: string | null | undefined, lng: string | null | undefined): Coordinates | null {
  if (!lat || !lng || !DECIMAL.test(lat) || !DECIMAL.test(lng)) return null;
  const candidate = { lat: Number(lat), lng: Number(lng) };
  return isValidCoordinates(candidate) ? candidate : null;
}

/** A parameter that is exactly "lat,lng". An address that merely starts with numbers is not a point. */
function pair(value: string | null): Coordinates | null {
  const parts = value?.split(",") ?? [];
  return parts.length === 2 ? point(parts[0], parts[1]) : null;
}

function knownMapLink(link: string): URL | null {
  const raw = link.trim();
  if (!raw || raw.length > LINK_MAX) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  return MAP_HOSTS.some((rule) => rule.host.test(host) && (!rule.path || rule.path.test(url.pathname))) ? url : null;
}

/**
 * The point carried by a saved map link, or null. `query`, `q`, `mlat`+`mlon` and the `ll` of Apple and Waze name the place
 * (`legacy-link`); `@lat,lng` and Google's `ll` only say where the map was centred and come out as `legacy-link-unverified`.
 */
export function locationFromLegacyLink(link: unknown): Location | null {
  const url = typeof link === "string" ? knownMapLink(link) : null;
  if (!url) return null;
  const params = url.searchParams;
  // In Google's links `ll` is where the map was centred, not the place; in Apple's and Waze's it is the destination.
  const ll = pair(params.get("ll"));
  const google = GOOGLE_HOST.test(url.hostname.toLowerCase());
  const named = pair(params.get("query")) ?? pair(params.get("q")) ?? (google ? null : ll) ?? point(params.get("mlat"), params.get("mlon"));
  if (named) return { ...named, source: "legacy-link" };
  const view = AT_SEGMENT.exec(url.pathname);
  const centre = (google ? ll : null) ?? (view ? point(view[1], view[2]) : null);
  return centre ? { ...centre, source: "legacy-link-unverified" } : null;
}

/**
 * The OpenStreetMap link, with its pin, that represents a point in a stored link field. Six decimals are about 11 cm.
 * Throws a `RangeError` for coordinates outside the globe instead of writing a link to nowhere.
 */
export function osmPointUrl(coordinates: Coordinates): string {
  if (!isValidCoordinates(coordinates)) throw new RangeError("Coordinates out of range");
  return `${OSM_BASE}?mlat=${coordinates.lat.toFixed(COORDINATE_DIGITS)}&mlon=${coordinates.lng.toFixed(COORDINATE_DIGITS)}`;
}

/**
 * OpenStreetMap's directions page with the point as destination: what «how to get there» opens. The visitor picks the origin
 * there. `to=lat,lng` is what the site itself reads (openstreetmap-website, `index_modules/directions.js`).
 */
export function osmDirectionsUrl(coordinates: Coordinates): string {
  return `${OSM_BASE}directions?to=${encodeURIComponent(formatCoordinates(coordinates, ","))}`;
}

/** "lat,lng" with six decimals. Throws a `RangeError` for coordinates outside the globe. */
export function formatCoordinates(coordinates: Coordinates, separator = ", "): string {
  if (!isValidCoordinates(coordinates)) throw new RangeError("Coordinates out of range");
  return `${coordinates.lat.toFixed(COORDINATE_DIGITS)}${separator}${coordinates.lng.toFixed(COORDINATE_DIGITS)}`;
}
