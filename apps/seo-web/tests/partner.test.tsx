// @vitest-environment jsdom
import { addressText } from "../lib/partner";
import { renderToStaticMarkup } from "react-dom/server";
import { createApiClient, type ApiClient } from "@rsvp/api-client";
import { createTranslator } from "@rsvp/i18n/server";
import { describe, expect, it, vi } from "vitest";
import { PartnerMicrosite, PartnerUnavailable } from "../components/partner-microsite";
import { loadPartner, loadPartnerSlugs, partnerFromListings } from "../lib/partner";
import type { ProviderCard } from "../lib/providers";
import sitemap from "../app/sitemap";
import { generateMetadata } from "../app/p/[slug]/page";

const t = createTranslator("es-BO");
const card = (over: Partial<ProviderCard> = {}): ProviderCard => ({
  listingId: "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11", providerSlug: "hotel-andino", name: "Hotel Andino", category: "ACCOMMODATION", city: "La Paz", department: "La Paz", verified: true,
  summary: "Hospedaje boutique en el centro.", priceFrom: { amountMinor: 45000, currency: "BOB" }, destinations: ["WHATSAPP", "EMAIL", "PHONE"], coverage: ["La Paz", "El Alto"], address: "Calle Comercio 123", hours: ["Lu-Do 08:00-22:00"], ...over
});
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
function client(respond: (url: URL) => Response): ApiClient {
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => respond(new URL(String(input)))) as unknown as typeof fetch;
  return createApiClient({ baseUrl: "http://gateway.test", tokenStore: anonymous, refreshSession: { refresh: vi.fn() }, fetchFn });
}
const dom = (html: string): Document => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");

describe("F25 · partner microsite /p/{slug}", () => {
  it("loads the partner by slug from GET /providers", async () => {
    let asked = "";
    const lookup = await loadPartner("hotel-andino", client((url) => { asked = url.search; return json(200, { items: [card()], total: 1, page: 1, pageSize: 12 }); }));
    expect(asked).toContain("slug=hotel-andino");
    expect(lookup.state).toBe("ok");
  });

  it("REQ-F25-02 · renders LocalBusiness JSON-LD with address, hours and area served", async () => {
    const lookup = await loadPartner("hotel-andino", client(() => json(200, { items: [card()], total: 1, page: 1, pageSize: 12 })));
    if (lookup.state !== "ok") throw new Error("expected ok");
    const document = dom(renderToStaticMarkup(<PartnerMicrosite partner={lookup.partner} t={t} locale="es-BO" />));
    const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? "{}");
    expect(ld).toMatchObject({ "@type": "LocalBusiness", name: "Hotel Andino", address: { "@type": "PostalAddress", streetAddress: "Calle Comercio 123", addressLocality: "La Paz", addressCountry: "BO" }, openingHours: ["Lu-Do 08:00-22:00"] });
    expect(ld.areaServed).toHaveLength(2);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.body.textContent).toContain("Desde");
  });

  it("REQ-F25-05 · the platform disclaimer comes before the contact buttons, and every contact goes through /r/", async () => {
    const partner = partnerFromListings("hotel-andino", [card()]);
    if (!partner) throw new Error("expected partner");
    const document = dom(renderToStaticMarkup(<PartnerMicrosite partner={partner} t={t} locale="es-BO" />));
    const disclaimer = document.querySelector('[data-testid="partner-disclaimer"]');
    const first = document.querySelector(".partner-actions a");
    expect(disclaimer).not.toBeNull();
    expect(disclaimer!.compareDocumentPosition(first!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const hrefs = [...document.querySelectorAll(".partner-actions a")].map((a) => a.getAttribute("href")).filter((href) => !href?.startsWith("/p/"));
    expect(hrefs).toEqual([
      "/r/7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11?destination=WHATSAPP&surface=PUBLIC_SITE",
      "/r/7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11?destination=PHONE&surface=PUBLIC_SITE",
      "/r/7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11?destination=EMAIL&surface=PUBLIC_SITE"
    ]);
    expect([...document.querySelectorAll("a")].filter((a) => /^(https?:|tel:|mailto:|wa\.me)/.test(a.getAttribute("href") ?? ""))).toEqual([]);
  });

  it("empty state: a partner without description, coverage, services or contacts still renders honest text", () => {
    const partner = partnerFromListings("hotel-andino", [card({ summary: undefined, coverage: undefined, destinations: undefined, address: undefined, hours: undefined, priceFrom: undefined })]);
    if (!partner) throw new Error("expected partner");
    const html = renderToStaticMarkup(<PartnerMicrosite partner={partner} t={t} locale="es-BO" />);
    expect(html).toContain("todavía no ha agregado una descripción");
    // The public card does not list destinations: the default one is offered, always through the redirector.
    expect(html).toContain("destination=OFFICIAL_SITE");
    expect(html).not.toMatch(/href="https?:/);
  });

  it("REQ-F25-06 · unverified, suspended or unknown partner is not-found and leaks nothing; unreachable catalogue is a different state", async () => {
    expect(partnerFromListings("hotel-andino", [card({ verified: false })])).toBeNull();
    expect(partnerFromListings("otro", [card()])).toBeNull();
    expect((await loadPartner("fantasma", client(() => json(200, { items: [], total: 0, page: 1, pageSize: 12 })))).state).toBe("not-found");
    expect((await loadPartner("hotel-andino", client(() => json(503, { title: "Down", status: 503 })))).state).toBe("unavailable");
    const html = renderToStaticMarkup(<PartnerUnavailable t={t} />);
    expect(dom(html).querySelector('a[href="/proveedores"]')).not.toBeNull();
  });

  it("metadata: title/description/canonical for a real partner, noindex otherwise", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => (String(input).includes("slug=hotel-andino") ? json(200, { items: [card()], total: 1, page: 1, pageSize: 12 }) : json(503, { status: 503 }))));
    const ok = await generateMetadata({ params: Promise.resolve({ slug: "hotel-andino" }) });
    expect(ok.title).toBe("Hotel Andino · Hospedaje en La Paz");
    expect(ok.alternates?.canonical).toContain("/p/hotel-andino");
    // A one-line summary alone is too short for a snippet: the factual sentence is appended (50 to 160 characters).
    expect(String(ok.description).length).toBeGreaterThanOrEqual(50);
    expect(String(ok.description).length).toBeLessThanOrEqual(160);
    expect(ok.robots).toMatchObject({ index: true });
    const down = await generateMetadata({ params: Promise.resolve({ slug: "otro" }) });
    expect(down.robots).toMatchObject({ index: false });
  });
});

describe("F08 REQ-05 · sitemap.xml", () => {
  it("lists the indexable routes (home, directory, partners, celebrations) and none of the private or non-indexable ones", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith("/celebrations/public")) return json(200, { items: [{ slug: "ana-y-luis", updatedAt: "2026-11-01T00:00:00Z", supportedLocales: ["es-BO", "en-US"] }] });
      if (url.pathname.startsWith("/providers")) return json(200, { items: [card(), card({ listingId: "b", providerSlug: "salon-sol", name: "Salón Sol" }), card({ listingId: "c", providerSlug: "pendiente", verified: false })], total: 3, page: 1, pageSize: 12 });
      return json(404, {});
    }));
    const entries = await sitemap();
    const urls = entries.map((entry) => new URL(entry.url).pathname);
    expect(urls).toEqual(expect.arrayContaining(["/", "/proveedores", "/proveedores/salones", "/p/hotel-andino", "/p/salon-sol", "/c/ana-y-luis"]));
    expect(urls).not.toContain("/p/pendiente");
    expect(urls.filter((path) => path.startsWith("/r/") || path.includes("/rsvp") || path.includes("/buscar") || path.startsWith("/panel") || path.startsWith("/admin") || path === "/catalogo")).toEqual([]);
    // One entry per language address (es-BO bare, en-US with ?lang=), each listing itself among its alternates (hreflang in the sitemap).
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
    for (const entry of entries.filter((candidate) => !candidate.url.includes("/c/"))) expect(Object.values(entry.alternates?.languages ?? {})).toContain(entry.url);
  });

  it("still answers when the API is down (no partners, no celebrations, static routes remain)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(503, { status: 503 })));
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain("/proveedores");
    expect(urls.some((path) => path.startsWith("/p/") || path.startsWith("/c/"))).toBe(false);
  });

  it("walks every directory page for partner slugs, bounded", async () => {
    const seen: string[] = [];
    const slugs = await loadPartnerSlugs(client((url) => { seen.push(url.searchParams.get("page") ?? ""); return json(200, { items: [card({ providerSlug: `p${url.searchParams.get("page")}` })], total: 30, page: 1, pageSize: 12 }); }));
    expect(seen).toEqual(["1", "2", "3"]);
    expect(slugs).toEqual(["p1", "p2", "p3"]);
  });
});

describe("address shapes from the catalogue", () => {
  it("text stays text; an object is reduced to its line so the page never renders an object", () => {
    expect(addressText("Calle Comercio 123")).toBe("Calle Comercio 123");
    expect(addressText({ city: "La Paz", line: "Av. Arce 2000", latitude: -16.5, longitude: -68.1, reference: "frente a la plaza" })).toBe("Av. Arce 2000, frente a la plaza");
    expect(addressText({ city: "La Paz" })).toBeUndefined();
    expect(addressText(undefined)).toBeUndefined();
  });
});
