import { locationFromLegacyLink } from "./links";
import { isValidCoordinates, type Coordinates, type Location, type LocationSource } from "./location";

/**
 * Reading `content.locations`, the celebration's top-level map of `"main"` or a venue key to its point, and deciding which
 * point a guest is shown while stored data still has the main venue's link (`venueMapUrl`) beside it. The key is top-level
 * on purpose: the host editor keeps content keys it does not know, but rebuilds every item of `venues[]`.
 *
 * The backend does not validate this key yet, so the reader trusts nothing: a malformed entry is left out.
 */

/** The entry of the main venue (`venueName`). */
export const MAIN_LOCATION_KEY = "main";

const SOURCES: readonly LocationSource[] = ["pin", "search", "device", "legacy-link", "legacy-link-unverified"];
const TEXT_LIMITS = { address: 200, reference: 200, forName: 120 } as const;
/** About a metre: links keep six decimals of what was marked. */
const SAME_POINT_DEGREES = 0.00001;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

function readLocation(value: unknown): Location | null {
  if (!isRecord(value)) return null;
  const point = { lat: value["lat"], lng: value["lng"] };
  const source = SOURCES.find((candidate) => candidate === value["source"]);
  if (!isValidCoordinates(point) || !source) return null;
  const texts = Object.fromEntries(Object.entries(TEXT_LIMITS).flatMap(([key, limit]) => {
    const raw = value[key];
    const text = typeof raw === "string" ? raw.trim() : "";
    return text && text.length <= limit ? [[key, text]] : [];
  }));
  return { lat: point.lat, lng: point.lng, source, ...texts };
}

/** The valid entries of `content.locations`. */
export function readLocations(value: unknown): Readonly<Record<string, Location>> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const location = readLocation(entry);
    return location ? [[key, location]] : [];
  }));
}

/** A point a person has confirmed and that was marked for this name (when it says for which). */
function usable(location: Location | null | undefined, name: string): Location | undefined {
  if (!location || location.source === "legacy-link-unverified") return undefined;
  return location.forName && location.forName !== name.trim() ? undefined : location;
}

const samePoint = (a: Coordinates, b: Coordinates): boolean => Math.abs(a.lat - b.lat) <= SAME_POINT_DEGREES && Math.abs(a.lng - b.lng) <= SAME_POINT_DEGREES;

/** The point of a listed venue: only what `content.locations[key]` says for it. */
export function venueLocation(stored: Location | undefined, name: string): Location | undefined {
  return usable(stored, name);
}

/**
 * The point of the main venue. Its link rules, because clients that do not know `content.locations` still edit it: when
 * they change or remove the link, the stored point is stale. So the point is the one the link carries, and the stored
 * entry only adds to it (address, reference) when both are the same point. A link with no verified point gives none.
 */
export function mainVenueLocation(stored: Location | undefined, link: string | undefined, name: string): Location | undefined {
  const linked = locationFromLegacyLink(link);
  if (!linked || linked.source !== "legacy-link") return undefined;
  const confirmed = usable(stored, name);
  return confirmed && samePoint(confirmed, linked) ? confirmed : linked;
}
