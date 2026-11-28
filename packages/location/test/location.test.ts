import { describe, expect, it, vi } from "vitest";
import { mapUrl, pointOf, pointUrl } from "@rsvp/celebration-theme/model";
import { isValidCoordinates, locationFromLegacyLink, osmPointUrl } from "../src/index";

describe("rangos de las coordenadas", () => {
  it.each([[0, 0], [-90, -180], [90, 180], [-17.783327, -63.18214]])("acepta (%d, %d)", (lat, lng) => {
    expect(isValidCoordinates({ lat, lng })).toBe(true);
  });

  it.each([
    [{ lat: 90.000001, lng: 0 }], [{ lat: -90.1, lng: 0 }], [{ lat: 0, lng: 180.000001 }], [{ lat: 0, lng: -181 }],
    [{ lat: Number.NaN, lng: 0 }], [{ lat: 0, lng: Number.POSITIVE_INFINITY }], [{ lat: "-17.7", lng: "-63.1" }], [{ lat: 0 }], [{}]
  ])("rechaza %j", (value) => {
    expect(isValidCoordinates(value)).toBe(false);
  });

  it("rechaza la ausencia de valor", () => {
    expect(isValidCoordinates(null)).toBe(false);
    expect(isValidCoordinates(undefined)).toBe(false);
  });
});

describe("coordenadas de enlaces heredados", () => {
  const point = { lat: -17.78, lng: -63.18 };

  it.each([
    "https://www.google.com/maps/search/?api=1&query=-17.78%2C-63.18",
    "https://maps.google.com/?q=-17.78,-63.18",
    "https://www.google.com/maps?q=-17.78,%20-63.18",
    "https://maps.apple.com/?ll=-17.78,-63.18",
    "https://waze.com/ul?ll=-17.78%2C-63.18&navigate=yes",
    "https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18",
    "https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18#map=17/-10/-50",
    "https://osm.org/?mlon=-63.18&mlat=-17.78",
    "  https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18  "
  ])("lee el punto que nombra %s", (link) => {
    expect(locationFromLegacyLink(link)).toEqual({ ...point, source: "legacy-link" });
  });

  it.each([
    "https://www.google.com/maps/@-17.78,-63.18,17z",
    "https://www.google.com/maps/place/Salon/@-17.78,-63.18,17z/data=abc",
    "https://www.google.com/maps/@-17.78,-63.18"
  ])("marca como sin verificar el centro de la vista de %s", (link) => {
    expect(locationFromLegacyLink(link)).toEqual({ ...point, source: "legacy-link-unverified" });
  });

  it("el parámetro que nombra el lugar gana sobre el centro de la vista", () => {
    expect(locationFromLegacyLink("https://www.google.com/maps/place/X/@-10,-50,15z?q=-17.78,-63.18")).toEqual({ ...point, source: "legacy-link" });
  });

  it.each([
    "https://maps.app.goo.gl/ABCD",
    "https://goo.gl/maps/abc",
    "https://www.google.com/maps/search/?api=1&query=Sal%C3%B3n%20Las%20Palmas",
    "https://www.google.com/maps?q=12,%205%20de%20Octubre",
    "https://www.google.com/maps?q=-17.78,-63.18,15",
    "https://www.google.com/maps?q=-97.78,-63.18",
    "https://www.google.com/maps/@-17.78,-663.18,15z",
    "https://www.google.com/maps/@-17.78,-63.18abc",
    "https://www.openstreetmap.org/?mlat=-17.78",
    "https://www.openstreetmap.org/?mlat=&mlon=",
    "https://www.openstreetmap.org/?mlat=1e1&mlon=0x10",
    "https://www.openstreetmap.org/#map=17/-17.78/-63.18",
    "http://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18",
    "https://usuario@www.openstreetmap.org/?mlat=-17.78&mlon=-63.18",
    "https://openstreetmap.org.evil.example/?mlat=-17.78&mlon=-63.18",
    "https://www.google.com/url?q=-17.78,-63.18",
    "javascript:alert(1)",
    "Salón Las Palmas, -17.78,-63.18",
    `https://www.openstreetmap.org/?mlat=-17.78&mlon=-63.18&x=${"a".repeat(500)}`,
    ""
  ])("no inventa un punto a partir de %s", (link) => {
    expect(locationFromLegacyLink(link)).toBeNull();
  });

  it("no acepta lo que no es texto", () => {
    for (const value of [undefined, null, 5, { lat: 1, lng: 1 }]) expect(locationFromLegacyLink(value)).toBeNull();
  });

  it("no hace peticiones ni sigue redirecciones", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    locationFromLegacyLink("https://maps.app.goo.gl/ABCD");
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("URL de compatibilidad de OpenStreetMap", () => {
  it("lleva el pin en mlat/mlon con seis decimales", () => {
    expect(osmPointUrl({ lat: -17.7833271234, lng: -63.18214 })).toBe("https://www.openstreetmap.org/?mlat=-17.783327&mlon=-63.182140");
  });

  it("se vuelve a leer como el mismo punto", () => {
    expect(locationFromLegacyLink(osmPointUrl({ lat: 90, lng: -180 }))).toEqual({ lat: 90, lng: -180, source: "legacy-link" });
  });

  it("no escribe un enlace con coordenadas fuera de rango", () => {
    expect(() => osmPointUrl({ lat: 91, lng: 0 })).toThrow(RangeError);
    expect(() => osmPointUrl({ lat: 0, lng: Number.NaN })).toThrow(RangeError);
  });
});

describe("compatibilidad con la invitación actual (celebration-theme)", () => {
  const point = { lat: -17.783327, lng: -63.18214 };

  it("el lector actual admite y entiende la URL de OpenStreetMap", () => {
    expect(mapUrl(osmPointUrl(point))).toBe(osmPointUrl(point));
    expect(pointOf(osmPointUrl(point))).toEqual(point);
  });

  it("lee los pines que la invitación guarda hoy", () => {
    expect(locationFromLegacyLink(pointUrl(point))).toEqual({ ...point, source: "legacy-link" });
  });

  it("todo enlace del que se extrae un punto es un enlace que la invitación acepta", () => {
    const links = [
      "https://www.google.com.bo/maps?q=-17.78,-63.18", "https://google.com/maps/@-17.78,-63.18,17z", "https://maps.google.com.bo/?ll=-17.78,-63.18",
      "https://maps.apple.com/?q=-17.78,-63.18", "https://ul.waze.com/ul?ll=-17.78,-63.18", "https://www.waze.com/ul?ll=-17.78,-63.18", "https://openstreetmap.org/?mlat=-17.78&mlon=-63.18"
    ];
    for (const link of links) {
      expect(locationFromLegacyLink(link), link).not.toBeNull();
      expect(mapUrl(link), link).toBeTruthy();
    }
  });
});
