import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CelebrationRenderer, mapUrl, navigationHref, pointOf, pointUrl, readContent, themeFromTemplate } from "./index.js";
import { NOW, t, TEMPLATES, VIEW } from "../test/fixtures.js";

const POINT = "https://www.google.com/maps/search/?api=1&query=-17.783300%2C-63.182100";

describe("the exact place of the venue", () => {
  it("accepts only https links of maps services: a link typed by a host never becomes an arbitrary or script href", () => {
    expect(mapUrl("https://maps.app.goo.gl/AbC123")).toBe("https://maps.app.goo.gl/AbC123");
    expect(mapUrl("  https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z ")).toBe("https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z");
    expect(mapUrl("https://maps.apple.com/?ll=-17.78,-63.18")).toBeTruthy();
    expect(mapUrl("https://waze.com/ul?ll=-17.78,-63.18")).toBeTruthy();
    expect(mapUrl("https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18")).toBeTruthy();
    for (const bad of ["javascript:alert(1)", "http://maps.app.goo.gl/AbC", "https://evil.example/maps", "https://www.google.com/search?q=x", "https://google.com.evil.example/maps/x", "https://user:pw@www.google.com/maps/x", "no es un enlace", "", 42, null, `https://www.google.com/maps/${"x".repeat(600)}`]) expect(mapUrl(bad)).toBeUndefined();
  });

  it("a point marked on the map becomes a maps link and is read back from it", () => {
    expect(pointUrl({ lat: -17.7833, lng: -63.1821 })).toBe(POINT);
    expect(pointOf(POINT)).toEqual({ lat: -17.7833, lng: -63.1821 });
    expect(pointOf("https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z")).toEqual({ lat: -17.78, lng: -63.18 });
    expect(pointOf("https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18")).toEqual({ lat: -17.78, lng: -63.18 });
    expect(pointOf("https://maps.app.goo.gl/AbC123")).toBeNull();
    expect(pointOf("https://www.google.com/maps/search/?api=1&query=Salon%20Las%20Palmas")).toBeNull();
    expect(pointOf("https://www.google.com/maps/search/?api=1&query=95,200")).toBeNull();
  });

  it("«how to get there» opens the marked place, and falls back to a search by name when there is none or it is not a maps link", () => {
    expect(navigationHref({ name: "Iglesia", mapUrl: POINT })).toBe(POINT);
    expect(navigationHref({ name: "Iglesia", mapUrl: "javascript:alert(1)" })).toBe("https://www.google.com/maps/search/?api=1&query=Iglesia");
    expect(readContent({ ...VIEW, content: { ...VIEW.content, venueMapUrl: "https://evil.example/x" } }).venueMapUrl).toBeUndefined();
    const page = (content: Record<string, unknown>): string => renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={{ ...VIEW, content: { ...VIEW.content, ...content } }} t={t} now={NOW} />);
    const alone = page({ venueName: "Hacienda El Carmen", venues: [], venueMapUrl: POINT });
    expect(alone).toContain(`href="${POINT.replaceAll("&", "&amp;")}"`);
    // with a list of venues, the main one still leads with its exact place unless the list already names it
    const listed = page({ venueName: "Hacienda El Carmen", venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], venueMapUrl: POINT });
    expect(listed).toContain(`href="${POINT.replaceAll("&", "&amp;")}"`);
    expect(listed).toContain("Catedral");
    const repeated = page({ venueName: "Catedral", venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], venueMapUrl: POINT });
    expect(repeated.split(`href="${POINT.replaceAll("&", "&amp;")}"`)).toHaveLength(2);
  });
});
