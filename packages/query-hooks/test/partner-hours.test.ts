import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProviderCatalogComponents } from "@rsvp/contracts";
import { describe, expect, it } from "vitest";
import { hoursLines, partnerFromListings, type DirectoryCard } from "../src/index.js";

type Card = ProviderCatalogComponents["schemas"]["ProviderCard"];
type Hours = NonNullable<Card["hours"]>;

/** The shape the catalogue really sends, typed by the generated contract (a change of the contract breaks this file at typecheck). */
const REAL: Hours = { weekly: [{ weekdays: [1, 2, 3, 4, 5], opens: "09:00", closes: "18:00" }, { weekdays: [6], opens: "09:00", closes: "13:00" }], note: "Feriados cerrado" };

const card = (hours: Card["hours"]): DirectoryCard => ({
  listingId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a01", providerSlug: "dulce-sol", name: "Torta", category: "PASTRY", city: "La Paz", department: "La Paz", verified: true,
  ...(hours ? { hours } : {})
} as DirectoryCard);

describe("las horas de atención del partner (contrato BusinessHours)", () => {
  it("el contrato vendorizado dice que BusinessHours es un objeto con `weekly`, no una lista", () => {
    const spec = JSON.parse(readFileSync(join(__dirname, "../../contracts/specs/provider-catalog.openapi.json"), "utf8")) as { components: { schemas: Record<string, { type: string; required?: string[]; properties: Record<string, { type: string }> }> } };
    const hours = spec.components.schemas["BusinessHours"];
    expect(hours?.type).toBe("object");
    expect(hours?.required).toEqual(["weekly"]);
    expect(hours?.properties["weekly"]?.type).toBe("array");
  });

  it("partnerFromListings no revienta con el objeto real y lo vuelve líneas de texto", () => {
    const partner = partnerFromListings("dulce-sol", [card(REAL)]);
    expect(partner?.hours).toEqual(["Lun, Mar, Mié, Jue, Vie 09:00-18:00", "Sáb 09:00-13:00", "Feriados cerrado"]);
    expect(() => partner?.hours.map((line) => line)).not.toThrow();
  });

  it("sin horas, o con filas malformadas, da una lista vacía o solo lo legible, nunca una excepción", () => {
    expect(partnerFromListings("dulce-sol", [card(undefined)])?.hours).toEqual([]);
    expect(hoursLines({ weekly: [] })).toEqual([]);
    expect(hoursLines({ weekly: [{ weekdays: [9], opens: "09:00", closes: "18:00" }, { weekdays: [1], opens: "25:00", closes: "18:00" }, null, { weekdays: [0, 0], opens: "10:00", closes: "12:00" }] })).toEqual(["Dom 10:00-12:00"]);
    expect(hoursLines(null)).toEqual([]);
    expect(hoursLines("Lu-Do")).toEqual([]);
    expect(hoursLines(["Lu-Do 08:00-22:00", ""])).toEqual(["Lu-Do 08:00-22:00"]);
  });
});
