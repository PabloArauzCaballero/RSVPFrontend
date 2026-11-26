export interface MapPlace {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly point: { readonly lat: number; readonly lng: number };
}

const PLACE_SEARCH = 'https://nominatim.openstreetmap.org/search';
const MAX_RESULTS = 5;

function toPlace(entry: unknown): MapPlace[] {
  if (!entry || typeof entry !== 'object') return [];
  const row = entry as Record<string, unknown>;
  const label = typeof row['display_name'] === 'string' ? row['display_name'].trim() : '';
  const name = (typeof row['name'] === 'string' && row['name'].trim()) || label.split(',')[0]?.trim() || label;
  const coordinate = (value: unknown): number => typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
  const lat = coordinate(row['lat']);
  const lng = coordinate(row['lon']);
  const id = row['place_id'];
  return label && name && (typeof id === 'number' || typeof id === 'string') && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? [{ id: String(id), name, label, point: { lat, lng } }]
    : [];
}

/** The map's existing provider. Call only for a place or address explicitly submitted by the host. */
export async function searchMapPlaces(query: string, locale: string, signal?: AbortSignal): Promise<readonly MapPlace[]> {
  const params = new URLSearchParams({ format: 'jsonv2', limit: String(MAX_RESULTS), 'accept-language': locale, q: query });
  const response = await fetch(`${PLACE_SEARCH}?${params}`, { headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) });
  if (!response.ok) throw new Error(`MAP_SEARCH_HTTP_${response.status}`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error('MAP_SEARCH_INVALID_RESPONSE');
  return rows.slice(0, MAX_RESULTS).flatMap(toPlace);
}
