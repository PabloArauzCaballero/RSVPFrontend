import { describe, expect, it } from "vitest";
import { osmSearchHref, placeSearchHref } from "./location.js";

const SEARCH = "https://www.openstreetmap.org/search?query=";

describe("osmSearchHref: «Cómo llegar» de una invitación antigua sin pin", () => {
  it("codifica la dirección escrita en la búsqueda de openstreetmap.org", () => {
    expect(osmSearchHref("Av. Arce 2345, La Paz")).toBe(`${SEARCH}Av.%20Arce%202345%2C%20La%20Paz`);
    expect(osmSearchHref("Salón Ñandú & Cía #5")).toBe(`${SEARCH}Sal%C3%B3n%20%C3%91and%C3%BA%20%26%20C%C3%ADa%20%235`);
  });
  it("quita enlaces y correos pegados en la dirección: no localizan nada y pueden llevar identificadores", () => {
    expect(osmSearchHref("Salón Real https://maps.app.goo.gl/abc123 Calle 5")).toBe(`${SEARCH}Sal%C3%B3n%20Real%20Calle%205`);
    expect(osmSearchHref("www.google.com/maps?q=1,2 Plaza")).toBe(`${SEARCH}Plaza`);
    expect(osmSearchHref("contacto ana@example.com Av. Sol 1")).toBe(`${SEARCH}contacto%20Av.%20Sol%201`);
  });
  it("limpia controles y mitades de pares sustitutos, y corta por puntos de código", () => {
    expect(osmSearchHref("Calle\u0000 \u{200B}Uno\ud800")).not.toBeNull();
    expect(() => osmSearchHref("a\ud800b")).not.toThrow();
    const long = osmSearchHref("ñ".repeat(300));
    expect(decodeURIComponent((long ?? "").slice(SEARCH.length))).toBe("ñ".repeat(200));
  });
  it("sin nada buscable no devuelve enlace", () => {
    expect(osmSearchHref("")).toBeNull();
    expect(osmSearchHref("   ---   ")).toBeNull();
    expect(osmSearchHref("https://maps.app.goo.gl/abc")).toBeNull();
  });
});

describe("placeSearchHref", () => {
  it("usa la dirección y, sin ella (o sin nada buscable en ella), el nombre; nunca los dos juntos", () => {
    expect(placeSearchHref("Salón Real", "Calle 5 123")).toBe(`${SEARCH}Calle%205%20123`);
    expect(placeSearchHref("Salón Real")).toBe(`${SEARCH}Sal%C3%B3n%20Real`);
    expect(placeSearchHref("Salón Real", "https://goo.gl/x")).toBe(`${SEARCH}Sal%C3%B3n%20Real`);
    expect(placeSearchHref("---", "")).toBeNull();
  });
});
