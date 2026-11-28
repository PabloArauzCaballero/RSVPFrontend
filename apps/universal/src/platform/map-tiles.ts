/**
 * Tile server of the web map. `EXPO_PUBLIC_MAP_TILE_URL` switches it at build time without touching code; unset, empty or
 * unusable values keep OpenStreetMap's own server. Its policy (https://operations.osmfoundation.org/policies/tiles/) asks
 * for visible attribution, a Referer, normal HTTP caching and no prefetch or offline use. The variable must be read
 * literally (`process.env.EXPO_PUBLIC_…`) for Expo to inline it.
 */
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const PLACEHOLDERS: readonly string[] = ["{z}", "{x}", "{y}"];

/** A tile template is usable when it is `https`, carries no user or password and names the three tile coordinates. */
function isTileTemplate(value: string): boolean {
  if (!value.startsWith("https://") || !PLACEHOLDERS.every((part) => value.includes(part))) return false;
  try {
    // `{s}` is Leaflet's subdomain slot: a real letter stands in for it while the address is checked.
    const url = new URL(value.replace("{s}", "a"));
    return !url.username && !url.password;
  } catch {
    return false;
  }
}

export function mapTileUrl(): string {
  const configured = process.env.EXPO_PUBLIC_MAP_TILE_URL?.trim() ?? "";
  return isTileTemplate(configured) ? configured : OSM_TILE_URL;
}
