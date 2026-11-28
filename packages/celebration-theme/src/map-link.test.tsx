import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CelebrationRenderer, directionsHref, legacyLink, mapUrl, navigationHref, pointOf, readContent, readLocation, readLocations, readMapConfig, resolveLocation, shownVenues, themeFromTemplate, withLocation, DEFAULT_MAP_CONFIG } from "./index.js";
import { NOW, t, TEMPLATES, VIEW } from "../test/fixtures.js";

const PIN = { lat: -17.7833, lng: -63.1821, source: "pin" as const };
const page = (content: Record<string, unknown>): string => renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={{ ...VIEW, content: { ...VIEW.content, ...content } }} t={t} now={NOW} />);

describe("the place of the venue, without links", () => {
  it("reads a point from a legacy link only to extract coordinates; the link itself is never output", () => {
    expect(mapUrl("https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z")).toBeTruthy();
    expect(pointOf("https://www.google.com/maps/search/?api=1&query=-17.783300%2C-63.182100")).toEqual({ lat: -17.7833, lng: -63.1821 });
    expect(pointOf("https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18")).toEqual({ lat: -17.78, lng: -63.18 });
    expect(pointOf("https://maps.app.goo.gl/AbC123")).toBeNull();
    expect(pointOf("https://www.google.com/maps/search/?api=1&query=Salon%20Las%20Palmas")).toBeNull();
    for (const bad of ["javascript:alert(1)", "http://maps.app.goo.gl/AbC", "https://evil.example/maps", "https://user:pw@www.google.com/maps/x", 42, null]) expect(mapUrl(bad)).toBeUndefined();
    const html = page({ venueName: "Hacienda El Carmen", venues: [], venueMapUrl: "https://www.google.com/maps/search/?api=1&query=-17.783300%2C-63.182100" });
    expect(html).not.toContain("google.com");
    expect(html).toContain("celebration.venues.unverified");
    expect(html).toContain(directionsHref({ lat: -17.7833, lng: -63.1821 }).replaceAll("&", "&amp;"));
  });

  it("«how to get there» is OpenStreetMap's directions built from coordinates, and nothing when there is no point", () => {
    expect(navigationHref({ location: PIN })).toBe("https://www.openstreetmap.org/directions?route=%3B-17.783300%2C-63.182100");
    expect(navigationHref({})).toBeUndefined();
    expect(legacyLink(PIN)).toBe("https://www.openstreetmap.org/?mlat=-17.783300&mlon=-63.182100");
    expect(pointOf(legacyLink(PIN))).toEqual({ lat: -17.7833, lng: -63.1821 });
  });

  it("locations: malformed points are dropped, text is bounded, and removing a venue removes its point", () => {
    expect(readLocation({ lat: 95, lng: 0, source: "pin" })).toBeUndefined();
    expect(readLocation({ lat: "1", lng: 0 })).toBeUndefined();
    expect(readLocation({ lat: 1, lng: 2, source: "weird", address: "x".repeat(201), reference: " cerca ", osm: { type: "node", id: 5 } })).toEqual({ lat: 1, lng: 2, source: "pin", reference: "cerca", osm: { type: "node", id: 5 } });
    expect(Object.keys(readLocations({ main: PIN, bad: 3 }))).toEqual(["main"]);
    const both = withLocation({ main: PIN }, "v1", PIN, ["v1"]);
    expect(Object.keys(both ?? {})).toEqual(["main", "v1"]);
    expect(Object.keys(withLocation(both, "v1", null, ["v1"]) ?? {})).toEqual(["main"]);
    expect(withLocation({ main: PIN }, "main", null, [])).toBeUndefined();
    expect(Object.keys(withLocation({ main: PIN, gone: PIN }, "main", PIN, []) ?? {})).toEqual(["main"]);
  });

  it("a saved pin is trusted while its venue name matches; a renamed venue or a point changed by an older app falls back", () => {
    const saved = { ...PIN, forName: "Hacienda El Carmen" };
    expect(resolveLocation({ saved, name: "hacienda el carmen" })).toEqual(saved);
    expect(resolveLocation({ saved, name: "Otro salón" })).toBeNull();
    expect(resolveLocation({ saved, name: "Hacienda El Carmen", legacy: { lat: -17.7834, lng: -63.1822 } })).toEqual(saved);
    expect(resolveLocation({ saved, name: "Hacienda El Carmen", legacy: { lat: -16.5, lng: -68.15 } })).toMatchObject({ lat: -16.5, lng: -68.15, source: "legacy-link" });
    expect(resolveLocation({ name: "x" })).toBeNull();
  });

  it("the invitation shows the name and address as text, and the map, directions and copy actions only when a point exists", () => {
    const withPin = page({ venueName: "Hacienda El Carmen", venues: [], locations: { main: { ...PIN, address: "Camino al Urubó 5", reference: "Portón verde", forName: "Hacienda El Carmen" } } });
    expect(withPin).toContain("Camino al Urubó 5");
    expect(withPin).toContain("Portón verde");
    expect(withPin).toContain("celebration.venues.showMap");
    expect(withPin).toContain('href="https://www.openstreetmap.org/directions?route=%3B-17.783300%2C-63.182100"');
    expect(withPin).not.toContain("google.com");
    expect(withPin).not.toContain("<iframe");
    const textOnly = page({ venueName: "Hacienda El Carmen", venues: [], venueAddressNote: "x" });
    expect(textOnly).toContain("Hacienda El Carmen");
    expect(textOnly).not.toContain("celebration.venues.showMap");
    expect(textOnly).not.toContain("openstreetmap.org/directions");
  });

  it("with a list of venues the main one still leads with its point, each listed venue has its own, and a venue named like the main one shares it", () => {
    const listed = page({ venueName: "Hacienda", venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], locations: { main: PIN, v1: { ...PIN, lat: -17.78, lng: -63.18 } } });
    expect(listed).toContain("-17.783300%2C-63.182100");
    expect(listed).toContain("-17.780000%2C-63.180000");
    const repeated = page({ venueName: "Catedral", venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], locations: { main: PIN } });
    expect(repeated.split("openstreetmap.org/directions")).toHaveLength(2);
    const view = readContent({ ...VIEW, content: { ...VIEW.content, venueName: "Catedral", venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], locations: { main: PIN } } });
    expect(shownVenues(view).map((venue) => venue.key)).toEqual(["v1"]);
  });

  it("the schedule names the venue of an item by its venueKey", () => {
    const html = page({ venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], schedule: [{ id: "s1", title: "Misa", startsAt: "2026-12-19T23:00:00.000Z", venueKey: "v1" }, { id: "s2", title: "Brindis", startsAt: "2026-12-20T01:00:00.000Z", venueKey: "no-existe" }] });
    expect(html).toContain("celebration.schedule.at");
    expect(html.split("celebration.schedule.at")).toHaveLength(2);
  });

  it("map settings: a usable tile template is kept, anything else falls back to OpenStreetMap's own server", () => {
    expect(readMapConfig({ tileUrl: "https://tiles.example/{z}/{x}/{y}.png", attribution: "© Otro", maxZoom: 18, searchEnabled: false })).toEqual({ tileUrl: "https://tiles.example/{z}/{x}/{y}.png", attribution: "© Otro", maxZoom: 18, searchEnabled: false });
    for (const bad of [{ tileUrl: "http://tiles.example/{z}/{x}/{y}.png" }, { tileUrl: "https://u:p@tiles.example/{z}/{x}/{y}.png" }, { tileUrl: "https://tiles.example/x.png" }, { tileUrl: "javascript:1" }, null, "x"]) expect(readMapConfig(bad).tileUrl).toBe(DEFAULT_MAP_CONFIG.tileUrl);
    expect(readMapConfig({ maxZoom: 99 }).maxZoom).toBe(19);
  });
});
