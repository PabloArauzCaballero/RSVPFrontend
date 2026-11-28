import { describe, expect, it, vi } from "vitest";
import { isValidCoordinates, locationFromLegacyLink, mainVenueLocation, osmDirectionsUrl, osmPointUrl, osmSearchUrl, readLocations, venueLocation } from "../src/index";

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
    "https://www.google.com/maps?q=-17.78,-63.18&ll=-10,-50",
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
    "https://www.google.com/maps/@-17.78,-63.18",
    "https://www.google.com/maps?ll=-17.78,-63.18",
    "https://maps.google.com/?ll=-17.78,-63.18&q=Sal%C3%B3n",
    "https://google.com.bo/maps?ll=-17.78%2C-63.18"
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

describe("indicaciones de OpenStreetMap", () => {
  it("lleva el punto como destino", () => {
    expect(osmDirectionsUrl({ lat: -17.7833271234, lng: -63.18214 })).toBe("https://www.openstreetmap.org/directions?to=-17.783327%2C-63.182140");
  });

  it("no escribe indicaciones hacia coordenadas fuera de rango", () => {
    expect(() => osmDirectionsUrl({ lat: 0, lng: 181 })).toThrow(RangeError);
  });
});

describe("content.locations", () => {
  const entry = { lat: -17.78, lng: -63.18, source: "pin" };
  const link = "https://www.openstreetmap.org/?mlat=-17.780000&mlon=-63.180000";

  it("deja fuera todo lo que no sea una ubicación válida", () => {
    expect(readLocations({
      ok: { ...entry, address: " Calle 1 ", reference: "x".repeat(201), forName: "Salón", extra: 1 },
      texto: { ...entry, lat: "-17.78" }, rango: { ...entry, lat: 95 }, sinOrigen: { lat: 1, lng: 1 }, origen: { ...entry, source: "map" }, nulo: null
    })).toEqual({ ok: { ...entry, address: "Calle 1", forName: "Salón" } });
    for (const value of [undefined, null, "x", [entry]]) expect(readLocations(value)).toEqual({});
  });

  it("una sede usa su punto, salvo que sea de otro nombre o esté sin verificar", () => {
    const stored = readLocations({ v: { ...entry, forName: "Catedral" } })["v"];
    expect(venueLocation(stored, "Catedral")).toEqual(stored);
    expect(venueLocation(stored, "Otro lugar")).toBeUndefined();
    expect(venueLocation({ lat: 1, lng: 1, source: "legacy-link-unverified" }, "Catedral")).toBeUndefined();
    expect(venueLocation(undefined, "Catedral")).toBeUndefined();
  });

  it("en el lugar principal el punto guardado completa al del enlace cuando coinciden", () => {
    const stored = { lat: -17.78, lng: -63.18, source: "search" as const, reference: "portón azul" };
    expect(mainVenueLocation(stored, link, "Salón")).toEqual(stored);
  });

  it("si el enlace cambió gana el enlace; un nombre distinto descarta lo guardado", () => {
    const stored = { lat: -10, lng: -50, source: "pin" as const, reference: "viejo" };
    expect(mainVenueLocation(stored, link, "Salón")).toEqual({ lat: -17.78, lng: -63.18, source: "legacy-link" });
    expect(mainVenueLocation({ ...stored, lat: -17.78, lng: -63.18, forName: "Antes" }, link, "Salón")).toEqual({ lat: -17.78, lng: -63.18, source: "legacy-link" });
  });

  it("sin enlace, o con un enlace sin punto verificado, no hay punto principal", () => {
    const stored = { lat: -17.78, lng: -63.18, source: "pin" as const };
    for (const value of [undefined, "https://maps.app.goo.gl/ABCD", "https://www.google.com/maps/@-17.78,-63.18,17z", "https://www.google.com/maps?ll=-17.78,-63.18"]) {
      expect(mainVenueLocation(stored, value, "Salón")).toBeUndefined();
    }
  });
});

describe("búsqueda de una dirección escrita", () => {
  const SEARCH = "https://www.openstreetmap.org/search?query=";
  const queryOf = (written: string): string | null => {
    const href = osmSearchUrl(written);
    if (href === null) return null;
    const url = new URL(href);
    expect([url.origin, url.pathname, [...url.searchParams.keys()], url.hash]).toEqual(["https://www.openstreetmap.org", "/search", ["query"], ""]);
    return url.searchParams.get("query");
  };

  it("codifica el texto entero: ni &, ni #, ni +, ni ? abren otro parámetro", () => {
    expect(osmSearchUrl("Av. Busch #12 & 2º anillo")).toBe(`${SEARCH}Av.%20Busch%20%2312%20%26%202%C2%BA%20anillo`);
    expect(queryOf("A+B?mlat=1&x=%2F, Ñuflo de Chávez")).toBe("A+B?mlat=1&x=%2F, Ñuflo de Chávez");
    expect(queryOf("  Calle 1 \n\t Santa\u0000Cruz  ")).toBe("Calle 1 Santa Cruz");
  });

  it("quita los enlaces y correos pegados, que pueden llevar identificadores", () => {
    expect(queryOf("Calle 1 https://maps.app.goo.gl/AbC?g_st=iw")).toBe("Calle 1");
    expect(queryOf("Calle 1 www.example.com/i/token123 maps.app.goo.gl/XyZ ana@example.com")).toBe("Calle 1");
    expect(osmSearchUrl("https://www.google.com/maps/@-17.78,-63.18,17z")).toBeNull();
  });

  it("sin nada que buscar no hay enlace", () => {
    for (const written of ["", "   ", "—", "#, .", "\u0007"]) expect(osmSearchUrl(written), JSON.stringify(written)).toBeNull();
  });

  it("recorta lo muy largo sin partir un carácter, y no falla con medio par suplente", () => {
    expect(queryOf("a".repeat(500))).toBe("a".repeat(200));
    expect(queryOf(`${"a".repeat(199)}😀b`)).toBe(`${"a".repeat(199)}😀`);
    expect(queryOf("Salón \ud800 Rosa")).toBe("Salón Rosa");
  });
});
