import { describe, expect, it, vi } from "vitest";

const { searchProviders } = vi.hoisted(() => ({ searchProviders: vi.fn(async (_query: unknown) => ({ items: [], total: 0, page: 1, pageSize: 12, available: true })) }));
vi.mock("../lib/providers", async (original) => ({ ...(await original<Record<string, unknown>>()), searchProviders }));

import SearchPage from "../app/proveedores/buscar/page";
import CityPage from "../app/proveedores/[categoria]/[ciudad]/page";

/** Provider Catalog documents `city` as the city SLUG (identity of the geography); the display name answers 422 "city is not valid". */
describe("city filter sends the slug, never the display name", () => {
  it("search page: ?ciudad=la-paz queries city=la-paz", async () => {
    await SearchPage({ searchParams: Promise.resolve({ ciudad: "la-paz" }) });
    expect(searchProviders).toHaveBeenLastCalledWith(expect.objectContaining({ city: "la-paz" }));
  });
  it("category + city landing page queries the slug too", async () => {
    await CityPage({ params: Promise.resolve({ categoria: "salones", ciudad: "santa-cruz" }), searchParams: Promise.resolve({}) } as never);
    expect(searchProviders).toHaveBeenLastCalledWith(expect.objectContaining({ city: "santa-cruz" }));
  });
});
