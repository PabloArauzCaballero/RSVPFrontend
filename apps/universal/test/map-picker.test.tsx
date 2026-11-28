import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapPicker } from "../src/host/map-picker";
import { mapTileUrl, OSM_TILE_URL } from "../src/platform/map-tiles";
import { fakeClient, renderApp } from "./support";

const leaflet = vi.hoisted(() => {
  const created = { attributionControl: { setPrefix: vi.fn() }, invalidateSize: vi.fn(), remove: vi.fn(), setView: vi.fn(), getCenter: vi.fn() };
  return { created, map: vi.fn(() => created), tileLayer: vi.fn((_url: string, _options: Record<string, unknown>) => ({ addTo: vi.fn() })) };
});
vi.mock("leaflet", () => ({ map: leaflet.map, tileLayer: leaflet.tileLayer }));

const openPicker = async (): Promise<readonly [string, Record<string, unknown>]> => {
  renderApp(<MapPicker initial={{ lat: -17.78, lng: -63.18 }} query="" onPick={vi.fn()} onClose={vi.fn()} />, fakeClient({}).client);
  await screen.findByTestId("map-canvas");
  await waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledTimes(1));
  const [call] = leaflet.tileLayer.mock.calls;
  if (!call) throw new Error("no tile layer");
  return call;
};

afterEach(() => { vi.unstubAllEnvs(); leaflet.tileLayer.mockClear(); });

describe("teselas del selector de ubicación", () => {
  it("cada tesela envía solo el origen aunque la página sea no-referrer, con la atribución de OpenStreetMap", async () => {
    const [url, options] = await openPicker();
    expect(url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(options.referrerPolicy).toBe("strict-origin-when-cross-origin");
    expect(String(options.attribution)).toContain("https://www.openstreetmap.org/copyright");
    expect(String(options.attribution)).toContain("OpenStreetMap");
  });

  it("el servidor de teselas se cambia con EXPO_PUBLIC_MAP_TILE_URL, sin tocar la política de referente", async () => {
    vi.stubEnv("EXPO_PUBLIC_MAP_TILE_URL", " https://tiles.example.com/{z}/{x}/{y}.png ");
    const [url, options] = await openPicker();
    expect(url).toBe("https://tiles.example.com/{z}/{x}/{y}.png");
    expect(options.referrerPolicy).toBe("strict-origin-when-cross-origin");
  });

  it("acepta la ranura {s} de subdominios", () => {
    vi.stubEnv("EXPO_PUBLIC_MAP_TILE_URL", "https://{s}.tiles.example.com/{z}/{x}/{y}.png");
    expect(mapTileUrl()).toBe("https://{s}.tiles.example.com/{z}/{x}/{y}.png");
  });

  it.each(["", "   ", "http://tiles.example.com/{z}/{x}/{y}.png", "/teselas/{z}/{x}/{y}.png", "https://tiles.example.com/{z}/{x}.png", "https://usuario:clave@tiles.example.com/{z}/{x}/{y}.png", "https:// /{z}/{x}/{y}.png"])(
    "un valor inservible (%j) deja el servidor de OpenStreetMap",
    (value) => {
      vi.stubEnv("EXPO_PUBLIC_MAP_TILE_URL", value);
      expect(mapTileUrl()).toBe(OSM_TILE_URL);
    }
  );
});
