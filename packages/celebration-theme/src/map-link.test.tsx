import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locationFromLegacyLink, osmPointUrl } from "@rsvp/location";
import { CelebrationRenderer, mapUrl, pointOf, pointUrl, readContent, shownVenues, themeFromTemplate } from "./index.js";
import { NOW, t, TEMPLATES, VIEW } from "../test/fixtures.js";

const POINT = "https://www.openstreetmap.org/?mlat=-17.783300&mlon=-63.182100";
/** What the picker saved before: the point is still read from it, the address itself is never shown or followed. */
const OLD_POINT = "https://www.google.com/maps/search/?api=1&query=-17.783300%2C-63.182100";
const DIRECTIONS = "https://www.openstreetmap.org/directions?to=-17.783300%2C-63.182100";
const SEARCH = "https://www.openstreetmap.org/search?query=";

describe("the exact place of the venue", () => {
  it("accepts only https links of maps services: a link typed by a host never becomes an arbitrary or script href", () => {
    expect(mapUrl("https://maps.app.goo.gl/AbC123")).toBe("https://maps.app.goo.gl/AbC123");
    expect(mapUrl("  https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z ")).toBe("https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z");
    expect(mapUrl("https://maps.apple.com/?ll=-17.78,-63.18")).toBeTruthy();
    expect(mapUrl("https://waze.com/ul?ll=-17.78,-63.18")).toBeTruthy();
    expect(mapUrl("https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18")).toBeTruthy();
    for (const bad of ["javascript:alert(1)", "http://maps.app.goo.gl/AbC", "https://evil.example/maps", "https://www.google.com/search?q=x", "https://google.com.evil.example/maps/x", "https://user:pw@www.google.com/maps/x", "no es un enlace", "", 42, null, `https://www.google.com/maps/${"x".repeat(600)}`]) expect(mapUrl(bad)).toBeUndefined();
  });

  it("a point marked on the map becomes an OpenStreetMap link and is read back from it", () => {
    expect(pointUrl({ lat: -17.7833, lng: -63.1821 })).toBe(POINT);
    expect(pointOf(POINT)).toEqual({ lat: -17.7833, lng: -63.1821 });
    expect(pointOf(OLD_POINT)).toEqual({ lat: -17.7833, lng: -63.1821 });
    expect(pointOf("https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z")).toEqual({ lat: -17.78, lng: -63.18 });
    expect(pointOf("https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18")).toEqual({ lat: -17.78, lng: -63.18 });
    expect(pointOf("https://maps.app.goo.gl/AbC123")).toBeNull();
    expect(pointOf("https://www.google.com/maps/search/?api=1&query=Salon%20Las%20Palmas")).toBeNull();
    expect(pointOf("https://www.google.com/maps/search/?api=1&query=95,200")).toBeNull();
  });

  it("the link the invitation reads and the one @rsvp/location writes agree, old links included", () => {
    const point = { lat: -17.783327, lng: -63.18214 };
    expect(mapUrl(osmPointUrl(point))).toBe(osmPointUrl(point));
    expect(pointOf(osmPointUrl(point))).toEqual(point);
    expect(locationFromLegacyLink(OLD_POINT)).toEqual({ lat: -17.7833, lng: -63.1821, source: "legacy-link" });
    for (const link of [
      "https://www.google.com.bo/maps?q=-17.78,-63.18", "https://google.com/maps/@-17.78,-63.18,17z", "https://maps.google.com.bo/?ll=-17.78,-63.18",
      "https://maps.apple.com/?q=-17.78,-63.18", "https://ul.waze.com/ul?ll=-17.78,-63.18", "https://www.waze.com/ul?ll=-17.78,-63.18", "https://openstreetmap.org/?mlat=-17.78&mlon=-63.18"
    ]) {
      expect(locationFromLegacyLink(link), link).not.toBeNull();
      expect(mapUrl(link), link).toBeTruthy();
    }
  });
});

const page = (content: Record<string, unknown>): string => renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={{ ...VIEW, content: { ...VIEW.content, ...content } }} t={t} now={NOW} />);
const hrefs = (html: string): string[] => [...html.matchAll(/<a [^>]*data-link-kind="navigation"[^>]*>/g)].map((match) => /href="([^"]*)"/.exec(match[0])?.[1] ?? "");

describe("what a guest gets", () => {
  it("«how to get there» opens OpenStreetMap directions to the marked point, whatever service the saved link was from", () => {
    for (const venueMapUrl of [POINT, OLD_POINT, "https://waze.com/ul?ll=-17.7833,-63.1821", "https://maps.apple.com/?ll=-17.7833,-63.1821"]) {
      const html = page({ venueName: "Hacienda El Carmen", venues: [], venueMapUrl });
      expect(hrefs(html), venueMapUrl).toEqual([DIRECTIONS]);
      expect(html).not.toMatch(/google\.com\/maps|waze\.com|maps\.apple\.com/);
    }
  });

  it("an old invitation with only a link without a point, or only text, searches the written text on OpenStreetMap: no pin and no point is made up", () => {
    for (const venueMapUrl of [undefined, "https://maps.app.goo.gl/AbC123", "https://www.google.com/maps/@-17.78,-63.18,17z", "https://www.google.com/maps?ll=-17.78,-63.18", "https://evil.example/x", "javascript:alert(1)"]) {
      const html = page({ venueName: "Hacienda El Carmen", venues: [{ key: "ceremony", kind: "ceremony", name: "Catedral", address: "Plaza 24 de Septiembre" }], venueMapUrl });
      // The main venue only leads the list when the host saved a link the invitation reads; it has a name and no address.
      const main = mapUrl(venueMapUrl) ? [SEARCH + "Hacienda%20El%20Carmen"] : [];
      expect(hrefs(html), String(venueMapUrl)).toEqual([...main, SEARCH + "Plaza%2024%20de%20Septiembre"]);
      expect(html).not.toMatch(/directions\?to=|mlat=|-17\.78/);
      expect(html).not.toContain("celebration-map-open");
      expect(html).not.toMatch(/google|goo\.gl|evil\.example|javascript:/);
      expect(html).toContain("celebration.venues.searchOnly");
      expect(html).toContain("celebration.venues.searchName");
      expect(html).not.toContain("celebration.venues.directionsName");
      for (const [anchor] of html.matchAll(/<a [^>]*data-link-kind="navigation"[^>]*>/g)) {
        expect(anchor).toContain('rel="noopener noreferrer"');
        expect(anchor.toLowerCase()).toContain('referrerpolicy="no-referrer"');
      }
      expect(html).toContain("celebration.venues.copy");
      expect(html).toContain("Plaza 24 de Septiembre");
    }
  });

  it("with no text to search for there is no «how to get there», only the plain notice", () => {
    const html = page({ venueName: "—", venues: [], venueMapUrl: "https://maps.app.goo.gl/AbC123" });
    expect(hrefs(html)).toEqual([]);
    expect(html).toContain("celebration.venues.unmarked");
    expect(html).not.toContain("celebration.venues.searchOnly");
  });

  it("the search carries only the public text of the place: nothing of the guest, the invitation or a pasted link", () => {
    const html = page({ venueName: "Salón", venues: [{ key: "v1", kind: "ceremony", name: "Salón", address: "Calle Sucre #50 & Junín, Sta. Cruz https://maps.app.goo.gl/AbC123?g_st=iw" }], venueMapUrl: undefined });
    expect(hrefs(html)).toEqual([SEARCH + encodeURIComponent("Calle Sucre #50 & Junín, Sta. Cruz")]);
    for (const secret of [VIEW.slug, VIEW.celebrationId]) expect(hrefs(html).join()).not.toContain(secret);
  });

  it("the map is offered with a point, and nothing of it is in the served page before the tap", () => {
    const html = page({ venueName: "Hacienda El Carmen", venues: [], venueMapUrl: POINT });
    expect(html).toContain("celebration-map-open");
    expect(html).not.toContain("tile.openstreetmap.org");
    expect(html).not.toContain("<iframe");
  });

  it("the main venue leads when the host saved its place and the list does not name it; a listed one with its name takes the point", () => {
    expect(hrefs(page({ venueName: "Hacienda El Carmen", venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], venueMapUrl: POINT }))).toEqual([DIRECTIONS]);
    const repeated = page({ venueName: "Catedral", venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], venueMapUrl: POINT });
    expect(hrefs(repeated)).toEqual([DIRECTIONS]);
  });

  it("content.locations gives each listed venue its own point, address and reference", () => {
    const content = readContent({ ...VIEW, content: {
      ...VIEW.content, venueName: "Salón", venueMapUrl: undefined,
      venues: [{ key: "ceremony", kind: "ceremony", name: "Catedral" }, { key: "party", kind: "reception", name: "Quinta" }, { kind: "other", name: "Sin clave" }],
      locations: {
        ceremony: { lat: -17.78, lng: -63.18, source: "pin", address: "Calle 1", reference: "portón azul" },
        party: { lat: -17.7, lng: -63.1, source: "search", forName: "Otro nombre" },
        "2": { lat: -17.6, lng: -63, source: "pin" },
        main: { lat: -17.5, lng: -63, source: "pin" }
      }
    } });
    const shown = shownVenues(content);
    expect(shown.map((venue) => [venue.name, venue.location?.lat])).toEqual([["Catedral", -17.78], ["Quinta", undefined], ["Sin clave", undefined]]);
    const html = page({ venues: [{ key: "ceremony", kind: "ceremony", name: "Catedral" }], locations: { ceremony: { lat: -17.78, lng: -63.18, source: "pin", address: "Calle 1", reference: "portón azul" } } });
    expect(hrefs(html)).toEqual(["https://www.openstreetmap.org/directions?to=-17.780000%2C-63.180000"]);
    expect(html).toContain("Calle 1");
    expect(html).toContain("portón azul");
  });

  it("a main venue hidden by moderation takes no pin with it", () => {
    const content = readContent({ ...VIEW, content: { ...VIEW.content, venueName: undefined, venueMapUrl: POINT, locations: { main: { lat: -17.7833, lng: -63.1821, source: "pin" } } } });
    expect(shownVenues(content).every((venue) => !venue.location)).toBe(true);
  });
});
