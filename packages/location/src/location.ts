/**
 * Where something happens, as coordinates. Pure rules with no UI and no network: the web, the app and the public pages
 * share them. Maps are OpenStreetMap's.
 */

export interface Coordinates {
  readonly lat: number;
  readonly lng: number;
}

/**
 * How the point was obtained: marked on the map, chosen from a search result, read from the device, or read from a map
 * link saved before. `legacy-link-unverified` is a point taken from the `@lat,lng` of a link: that is where the map was
 * centred when the link was copied, which may not be the place itself, so a person has to confirm it.
 */
export type LocationSource = "map" | "search" | "device" | "legacy-link" | "legacy-link-unverified";

export interface Location extends Coordinates {
  /** Postal address as people read it. */
  readonly address?: string;
  /** How to recognise the place: "blue gate, next to the church". */
  readonly reference?: string;
  /** Name of the place the point was marked for, so a later change of name can be noticed. */
  readonly forName?: string;
  readonly source: LocationSource;
}

const MAX_LAT = 90;
const MAX_LNG = 180;

const within = (value: unknown, limit: number): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

/** True only for two finite numbers inside the globe: latitude in ±90, longitude in ±180. Never converts text. */
export function isValidCoordinates(value: { readonly lat?: unknown; readonly lng?: unknown } | null | undefined): value is Coordinates {
  return Boolean(value) && within(value?.lat, MAX_LAT) && within(value?.lng, MAX_LNG);
}
