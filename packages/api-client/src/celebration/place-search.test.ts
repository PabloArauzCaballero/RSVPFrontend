import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../errors.js";
import type { ApiClient } from "../types.js";
import { searchMapPlaces } from "./place-search.js";

const client = (request: ApiClient["request"]): ApiClient => ({ request } as ApiClient);

describe("place search through the backend", () => {
  it("asks the authenticated search of the service (never Nominatim) and keeps only valid places", async () => {
    const request = vi.fn().mockResolvedValue({
      attribution: "© OpenStreetMap contributors",
      items: [
        null,
        { id: "node/1", name: "Floresta", label: "Floresta, Santa Cruz", lat: -17.8, lng: -63.2, osmType: "node", osmId: 1 },
        { id: "x", name: "Roto", label: "Roto", lat: null, lng: -63.2 },
        { id: "y", name: "Fuera", label: "Fuera", lat: -17.8, lng: 181 },
        { id: "way/9", name: "Calle", label: "Calle, La Paz", lat: -16.5, lng: -68.1, osmType: "planet", osmId: 9 }
      ]
    });
    const signal = new AbortController().signal;
    const found = await searchMapPlaces(client(request as ApiClient["request"]), "Floresta & zona", "es-BO", signal);
    expect(found.places).toEqual([
      { id: "node/1", name: "Floresta", label: "Floresta, Santa Cruz", point: { lat: -17.8, lng: -63.2 }, osm: { type: "node", id: 1 } },
      { id: "way/9", name: "Calle", label: "Calle, La Paz", point: { lat: -16.5, lng: -68.1 } }
    ]);
    expect(found.attribution).toBe("© OpenStreetMap contributors");
    const [path, options] = request.mock.calls[0] ?? [];
    expect(String(path).startsWith("/providers/geo/search?")).toBe(true);
    const params = new URL(`https://x${path}`).searchParams;
    expect(params.get("q")).toBe("Floresta & zona");
    expect(params.get("lang")).toBe("es-BO");
    expect(options.signal).toBe(signal);
  });

  it("sends the language the backend accepts and tolerates an empty or odd body", async () => {
    const request = vi.fn().mockResolvedValue({});
    expect((await searchMapPlaces(client(request as ApiClient["request"]), "abc", "fr-FR")).places).toEqual([]);
    expect(new URL(`https://x${request.mock.calls[0]?.[0]}`).searchParams.get("lang")).toBe("es-BO");
    await searchMapPlaces(client(request as ApiClient["request"]), "abc", "en-US");
    expect(new URL(`https://x${request.mock.calls[1]?.[0]}`).searchParams.get("lang")).toBe("en-US");
  });

  it("keeps the backend's failures (429 busy, 503 off) for the field to explain", async () => {
    const failure = new ApiError(503, "c1", { code: "GEOCODING_UNAVAILABLE", title: "off" } as never);
    await expect(searchMapPlaces(client(vi.fn().mockRejectedValue(failure) as ApiClient["request"]), "Floresta", "es-BO")).rejects.toBe(failure);
  });
});
