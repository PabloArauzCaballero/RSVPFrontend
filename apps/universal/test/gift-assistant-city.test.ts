import { describe, expect, it } from "vitest";
import { celebrationCityHint } from "../src/host/gifts/assistant/city";

const cities = [
  { slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz", departmentCode: "SC" },
  { slug: "la-paz", name: "La Paz", department: "La Paz", departmentCode: "LP" },
  { slug: "el-alto", name: "El Alto", department: "La Paz", departmentCode: "LP" }
];

describe("R4 · the delivery city that starts the assistant", () => {
  it("matches by slug or by the whole name, ignoring accents and case, and drops only the known «de la Sierra» tail", () => {
    expect(celebrationCityHint({ citySlug: "la-paz" }, cities)).toBe("la-paz");
    expect(celebrationCityHint({ city: "LA PAZ" }, cities)).toBe("la-paz");
    expect(celebrationCityHint({ city: "Santa Cruz" }, cities)).toBe("santa-cruz");
    expect(celebrationCityHint({ city: "Santa Cruz de la Sierra" }, cities)).toBe("santa-cruz");
    expect(celebrationCityHint({ venueCity: "el alto" }, cities)).toBe("el-alto");
  });
  it("a lone article is not a city: «la» and «el» do not pick La Paz or El Alto, and a free-text venue is never guessed", () => {
    expect(celebrationCityHint({ city: "la" }, cities)).toBe("");
    expect(celebrationCityHint({ city: "el" }, cities)).toBe("");
    expect(celebrationCityHint({ city: "Santa" }, cities)).toBe("");
    expect(celebrationCityHint({ venue: "Salón La Paz" }, cities)).toBe("");
    expect(celebrationCityHint({}, cities)).toBe("");
  });
});
