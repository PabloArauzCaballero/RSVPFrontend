// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchPage from "../app/proveedores/buscar/page";
import { parseGeo, providerSearchPath } from "../lib/providers";

const card = (n: number) => ({ listingId: `id-${n}`, providerSlug: `salon-${n}`, name: `Salón ${n}`, category: "VENUE", city: "La Paz", department: "La Paz", verified: true });
const page = (items: unknown[], total = items.length) => new Response(JSON.stringify({ items, total, page: 1, pageSize: 12 }), { status: 200, headers: { "content-type": "application/json" } });
const dom = (html: string): Document => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");

/** Renders the real page component (server component) with the gateway mocked at fetch. */
async function render(search: Record<string, string>, respond: () => Response = () => page([card(1), card(2)])) {
  const fetchFn = vi.fn(async () => respond());
  vi.stubGlobal("fetch", fetchFn);
  const html = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve(search) }));
  const asked = fetchFn.mock.calls.map((call) => new URL(String((call as unknown[])[0])));
  return { document: dom(html), asked, html };
}
afterEach(() => vi.unstubAllGlobals());

describe("REQ-F24-04 · search page, proximity filter", () => {
  it("lat/lng/radio query the catalogue by proximity (city is not sent) and render the results", async () => {
    const { asked, document } = await render({ lat: "-16.4897", lng: "-68.1193", radio: "10", ciudad: "santa-cruz" });
    expect(asked[0]?.pathname).toBe("/providers");
    expect(asked[0]?.searchParams.get("lat")).toBe("-16.49");
    expect(asked[0]?.searchParams.get("lng")).toBe("-68.12");
    expect(asked[0]?.searchParams.get("radiusKm")).toBe("10");
    expect(asked[0]?.searchParams.has("city")).toBe(false);
    expect(document.querySelectorAll(".directory-results li")).toHaveLength(2);
    expect(document.querySelector('script[type="application/ld+json"]')).not.toBeNull();
  });

  it("the form keeps the position in hidden fields, shows the active-location notice and can clear it", async () => {
    const { document } = await render({ lat: "-16.49", lng: "-68.12", radio: "50", categoria: "salones" });
    expect((document.querySelector('input[name="lat"]') as HTMLInputElement).value).toBe("-16.49");
    expect((document.querySelector('select[name="radio"]') as HTMLSelectElement).value).toBe("50");
    expect(document.querySelector(".directory-nearme-active")?.textContent).toContain("50 km");
    const clear = document.querySelector(".directory-nearme-active a")?.getAttribute("href");
    expect(clear).toBe("/proveedores/buscar?categoria=salones");
  });

  it("fallback: without usable coordinates the city filter is used, no geo params are sent", async () => {
    const cases: Record<string, string>[] = [{ ciudad: "la-paz" }, { ciudad: "la-paz", lat: "abc", lng: "-68" }, { ciudad: "la-paz", lat: "95", lng: "10" }, { ciudad: "la-paz", lat: "-16" }];
    for (const search of cases) {
      const { asked, document } = await render(search);
      expect(asked[0]?.searchParams.get("city")).toBe("la-paz");
      expect(asked[0]?.searchParams.has("lat")).toBe(false);
      expect(document.querySelector(".directory-nearme-active")).toBeNull();
    }
  });

  it("pagination links keep the position so back/next stay on the same search", async () => {
    const { document } = await render({ lat: "-16.49", lng: "-68.12", radio: "25" }, () => page([card(1)], 30));
    const next = document.querySelector('a[rel="next"]')?.getAttribute("href") ?? "";
    expect(next).toContain("/proveedores/buscar?");
    expect(new URL(next, "http://x").searchParams.get("lat")).toBe("-16.49");
    expect(new URL(next, "http://x").searchParams.get("page")).toBe("2");
  });

  it("empty and unavailable states are announced, not silent", async () => {
    expect((await render({ ciudad: "oruro" }, () => page([]))).document.querySelector('[role="status"].directory-status')?.textContent).toContain("Todavía no hay proveedores");
    const down = await render({ ciudad: "oruro" }, () => new Response("{}", { status: 503 }));
    expect(down.document.querySelector('[role="status"].directory-status')?.textContent).toContain("No pudimos cargar los proveedores");
  });

  it("parseGeo bounds and the query builder", () => {
    expect(parseGeo("-16.5", "-68.15", undefined)).toEqual({ lat: -16.5, lng: -68.15, radiusKm: 25 });
    expect(parseGeo("-16.5", "-68.15", "9999")?.radiusKm).toBe(25);
    expect(parseGeo("", "-68", "10")).toBeUndefined();
    expect(providerSearchPath({ near: { lat: -16.5, lng: -68.15, radiusKm: 10 }, city: "La Paz" })).toContain("radiusKm=10");
    expect(providerSearchPath({ near: { lat: -16.5, lng: -68.15, radiusKm: 10 }, city: "La Paz" })).not.toContain("city=");
  });
});
