import { describe, expect, it } from "vitest";
import { MAP_BRIDGE, embedModeFromQuery, mapEmbedUrl, parseMapToNative, parseNativeToMap, startFromQuery } from "./picker-bridge.js";

const wire = (message: object): string => JSON.stringify({ bridge: MAP_BRIDGE, ...message });

describe("the map page ↔ native app bridge", () => {
  it("accepts only its own, well-formed messages", () => {
    expect(parseMapToNative(wire({ type: "ready" }))).toEqual({ bridge: MAP_BRIDGE, type: "ready" });
    expect(parseMapToNative(wire({ type: "moved", lat: -16.5, lng: -68.1 }))).toEqual({ bridge: MAP_BRIDGE, type: "moved", lat: -16.5, lng: -68.1 });
    expect(parseMapToNative(wire({ type: "unavailable" }))?.type).toBe("unavailable");
    for (const bad of [wire({ type: "moved", lat: 91, lng: 0 }), wire({ type: "moved", lat: "1", lng: 0 }), wire({ type: "picked", lat: 1, lng: 1 }), JSON.stringify({ type: "ready" }), JSON.stringify({ bridge: "other", type: "ready" }), "not json", "[]", null, 42]) expect(parseMapToNative(bad)).toBeNull();
    expect(parseNativeToMap(wire({ type: "center", lat: -17.7, lng: -63.1, zoom: 17 }))).toEqual({ bridge: MAP_BRIDGE, type: "center", lat: -17.7, lng: -63.1, zoom: 17 });
    expect(parseNativeToMap(wire({ type: "center", lat: -17.7, lng: -63.1, zoom: 99 }))).toEqual({ bridge: MAP_BRIDGE, type: "center", lat: -17.7, lng: -63.1 });
    expect(parseNativeToMap(wire({ type: "center", lat: 200, lng: 0 }))).toBeNull();
    expect(parseNativeToMap(wire({ type: "ready" }))).toBeNull();
  });

  it("the page address carries only where the map opens, and a bad query opens on Bolivia", () => {
    expect(mapEmbedUrl("https://site.example/", { lat: -17.7833, lng: -63.1821, zoom: 17 })).toBe("https://site.example/mapa/incrustado?lat=-17.783300&lng=-63.182100&z=17");
    expect(startFromQuery({ lat: "-17.78", lng: "-63.18", z: "15" })).toEqual({ lat: -17.78, lng: -63.18, zoom: 15 });
    expect(startFromQuery({ lat: "-17.78", lng: "-63.18", z: "99" }).zoom).toBe(17);
    expect(startFromQuery({ lat: "95", lng: "0" })).toEqual({ lat: -16.7, lng: -64.9, zoom: 5 });
    expect(startFromQuery({})).toEqual({ lat: -16.7, lng: -64.9, zoom: 5 });
  });

  it("the view mode is a parameter of the page address and anything else is the picker", () => {
    expect(mapEmbedUrl("https://site.example", { lat: -17.7, lng: -63.1, zoom: 17 }, "view")).toBe("https://site.example/mapa/incrustado?lat=-17.700000&lng=-63.100000&z=17&mode=view");
    expect(embedModeFromQuery("view")).toBe("view");
    for (const other of [undefined, "", "pick", "VIEW", "edit"]) expect(embedModeFromQuery(other)).toBe("pick");
  });
});
