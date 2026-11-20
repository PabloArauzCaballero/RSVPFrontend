import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchMapPlaces } from './place-search';

afterEach(() => vi.unstubAllGlobals());

describe('place search', () => {
  it('returns the display name and point only for places with valid coordinates', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([
      null,
      { place_id: 1, display_name: 'Floresta, Santa Cruz', lat: '-17.8', lon: '-63.2' },
      { place_id: 2, display_name: 'Invalid', lat: null, lon: '-63.2' },
      { place_id: 3, display_name: 'Out of range', lat: '-17.8', lon: '181' },
    ]));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await searchMapPlaces('Floresta & zona', 'es-BO', signal)).toEqual([{ id: '1', name: 'Floresta', label: 'Floresta, Santa Cruz', point: { lat: -17.8, lng: -63.2 } }]);
    const [url, options] = fetch.mock.calls[0] ?? [];
    expect(new URL(String(url)).searchParams.get('q')).toBe('Floresta & zona');
    expect(options.signal).toBe(signal);
  });

  it('preserves HTTP failures for the field to offer a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    await expect(searchMapPlaces('Floresta', 'es-BO')).rejects.toThrow('MAP_SEARCH_HTTP_429');
  });
});
