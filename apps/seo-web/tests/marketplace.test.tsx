// @vitest-environment jsdom
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { createApiClient, type ApiClient } from "@rsvp/api-client";
import { createTranslator } from "@rsvp/i18n/server";
import { MARKETPLACE_ORIGIN_KEY, MARKETPLACE_THUMBS, MARKETPLACE_THUMB_SIZES, marketplaceThumbSrc, type MarketplaceCard, type MarketplaceCategory } from "@rsvp/query-hooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuestMarketplace, marketplaceHref } from "../components/marketplace/guest-marketplace";
import { OriginLinks } from "../components/marketplace/origin-links";
import { PublicCelebration } from "../components/public-celebration";
import { forgetMarketplaceProviders, guestMarketplaceEnabled, loadMarketplace, marketplaceHasProviders, showMarketplaceEntry, type MarketplaceData } from "../lib/marketplace";
import { TEMPLATES, VIEW } from "./celebration-fixtures";

afterEach(() => { cleanup(); window.sessionStorage.clear(); forgetMarketplaceProviders(); });

const ON = { GUEST_MARKETPLACE: "on" } as const;
const CELEBRATION = { celebrationId: "0b7e7c3a-5d2f-4c1e-9a8b-2f6d4e1c3a90", slug: "ana-y-luis", eventType: { code: "QUINCEANERA" }, content: { title: "Los quince de Ana", city: "Santa Cruz de la Sierra" } };
const CITIES = [{ slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz" }, { slug: "la-paz", name: "La Paz", department: "La Paz" }];
const category = (code: string, slug: string, name: string, order: number, count = 1): MarketplaceCategory => ({ code, slug, name, order, count, listingType: "SERVICE" });
const CATEGORIES = [category("WEDDING_PLANNER", "wedding-planners", "Organizadores de eventos", 1), category("CATERING", "catering", "Catering y bocaditos", 2), category("NEW_ONE", "categoria-nueva", "Categoría nueva", 3)];
const card = (over: Partial<MarketplaceCard> = {}): MarketplaceCard => ({ listingId: "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11", providerSlug: "eventos-andinos", providerName: "Eventos Andinos", name: "Organización completa", category: "WEDDING_PLANNER", listingType: "SERVICE", city: "Santa Cruz de la Sierra", department: "Santa Cruz", verified: true, destinations: ["WHATSAPP"], priceFrom: { amountMinor: 250000, currency: "BOB" }, ...over });

interface Seen { readonly urls: string[] }
function client(handlers: Partial<Record<string, () => Response | Promise<Response>>> = {}): { readonly client: ApiClient; readonly seen: Seen } {
  const seen: Seen = { urls: [] };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    seen.urls.push(`${url.pathname}${url.search}`);
    const key = Object.keys(handlers).find((prefix) => url.pathname.startsWith(prefix));
    if (key) return handlers[key]!();
    if (url.pathname.startsWith("/celebrations/public/")) return json(CELEBRATION);
    if (url.pathname === "/providers/geo") return json({ items: CITIES });
    if (url.pathname === "/providers/categories") return json({ items: CATEGORIES });
    if (url.pathname === "/providers") return json({ items: [card()], total: 1, page: 1, pageSize: 12 });
    return json({}, 404);
  }) as unknown as typeof fetch;
  const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
  return { client: createApiClient({ baseUrl: "http://gateway.test", tokenStore: anonymous, refreshSession: { refresh: vi.fn() }, fetchFn }), seen };
}

describe("guest marketplace · loading (/c/{slug}/proveedores)", () => {
  it("is off unless the deployment says on: nothing is requested", async () => {
    const { client: api, seen } = client();
    expect(guestMarketplaceEnabled({})).toBe(false);
    expect(guestMarketplaceEnabled({ GUEST_MARKETPLACE: "true" })).toBe(false);
    expect(await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: {}, client: api })).toEqual({ state: "disabled" });
    expect(seen.urls).toEqual([]);
  });

  it("asks the categories in the order of the event type and the providers one per provider, in the celebration's city", async () => {
    const { client: api, seen } = client();
    const data = await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: api });
    expect(data.state).toBe("ready");
    if (data.state !== "ready") return;
    expect(data.city).toBe("santa-cruz");
    expect(seen.urls).toContain("/providers/categories?view=marketplace&eventType=QUINCEANERA&city=santa-cruz&locale=es-BO");
    expect(seen.urls).toContain("/providers?view=marketplace&groupBy=provider&city=santa-cruz&eventType=QUINCEANERA&page=1&pageSize=12");
  });

  it("the guest's own choice wins over the celebration's city, «todas» means all of Bolivia, a malformed category or an unknown city is ignored, and a category with no providers there stays applied", async () => {
    const lp = client();
    const chosen = await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: lp.client, city: "la-paz", category: "catering" });
    expect(chosen.state === "ready" && chosen.city).toBe("la-paz");
    expect(lp.seen.urls.some((url) => url.startsWith("/providers?") && url.includes("category=catering") && url.includes("city=la-paz"))).toBe(true);
    const all = client();
    const bolivia = await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: all.client, city: "todas" });
    expect(bolivia.state === "ready" && bolivia.city).toBeUndefined();
    expect(all.seen.urls.every((url) => !url.includes("city="))).toBe(true);
    const odd = client();
    const ignored = await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: odd.client, city: "atlantis", category: "../etc/passwd" });
    expect(ignored.state === "ready" && ignored.category).toBeUndefined();
    expect(odd.seen.urls.every((url) => !url.includes("atlantis") && !url.includes("passwd"))).toBe(true);
    // «Sonido» chosen, then another city that has none: the category is still asked (the page shows the empty state), never silently turned into «all».
    const none = client();
    const kept = await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: none.client, category: "sonido-e-iluminacion", city: "la-paz" });
    expect(kept.state === "ready" && kept.category).toBe("sonido-e-iluminacion");
    expect(none.seen.urls.some((url) => url.startsWith("/providers?") && url.includes("category=sonido-e-iluminacion") && url.includes("city=la-paz"))).toBe(true);
  });

  it("never sends anything of the guest: no credential, no guest id, no token", async () => {
    const { client: api, seen } = client();
    await loadMarketplace({ slug: "ana-y-luis", locale: "en-US", env: ON, client: api, category: "catering", page: 2 });
    for (const url of seen.urls) expect(url).not.toMatch(/guest|token|credential|rsvp\/|ref=|referer/i);
  });

  it("an unknown celebration is not-found; any failure of the catalogue is «unavailable», never another source", async () => {
    expect(await loadMarketplace({ slug: "no-existe", locale: "es-BO", env: ON, client: client({ "/celebrations/public/": () => new Response(JSON.stringify({ code: "NotFound" }), { status: 404, headers: { "content-type": "application/problem+json" } }) }).client })).toEqual({ state: "not-found" });
    const down = await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: client({ "/providers": () => new Response("{}", { status: 503 }) }).client });
    expect(down.state).toBe("unavailable");
    const celebrationDown = await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: client({ "/celebrations/public/": () => new Response("{}", { status: 500 }) }).client });
    expect(celebrationDown.state).toBe("unavailable");
  });

  it("the catalogue's own switch off (404 MARKETPLACE_DISABLED) is the same as this site's switch off: the tab does not exist, it is not an error page", async () => {
    const off = () => new Response(JSON.stringify({ code: "MARKETPLACE_DISABLED" }), { status: 404, headers: { "content-type": "application/problem+json" } });
    expect(await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: client({ "/providers/categories": off }).client })).toEqual({ state: "disabled" });
    expect(await loadMarketplace({ slug: "ana-y-luis", locale: "es-BO", env: ON, client: client({ "/providers": off }).client })).toEqual({ state: "disabled" });
  });

  it("the entry is offered only when the deployment turned the tab on and the catalogue has providers (and one failed check hides it)", async () => {
    const empty = client({ "/providers/categories": () => new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "content-type": "application/json" } }) });
    expect(await showMarketplaceEntry({}, empty.client)).toBe(false);
    expect(empty.seen.urls).toEqual([]);
    expect(await showMarketplaceEntry(ON, empty.client)).toBe(false);
    forgetMarketplaceProviders();
    expect(await showMarketplaceEntry(ON, client().client)).toBe(true);
    forgetMarketplaceProviders();
    expect(await marketplaceHasProviders(client({ "/providers/categories": () => new Response("{}", { status: 500 }) }).client)).toBe(false);
    // One answer per minute: the second call does not ask again.
    forgetMarketplaceProviders();
    const counted = client();
    await marketplaceHasProviders(counted.client, 1_000);
    await marketplaceHasProviders(counted.client, 30_000);
    expect(counted.seen.urls.filter((url) => url.startsWith("/providers/categories"))).toHaveLength(1);
  });
});

const dom = (html: string): Document => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");
const ready = (over: Partial<Extract<MarketplaceData, { state: "ready" }>> = {}): Extract<MarketplaceData, { state: "ready" }> => ({
  state: "ready", celebration: { celebrationId: CELEBRATION.celebrationId, slug: "ana-y-luis", title: "Los quince de Ana", eventType: "QUINCEANERA", cityHint: "santa-cruz" }, cities: CITIES, categories: CATEGORIES,
  page: { items: [card(), card({ listingId: "8e2d2b45-6e5d-4b4a-8b3f-1a5a3e4e8c22", providerSlug: "sonido-sol", providerName: "Sonido Sol", name: "Sonido y luces", category: "CATERING", sponsored: true, imageUrl: "https://media.example/sol.webp", priceFrom: undefined })], total: 2, page: 1, pageSize: 12 },
  city: "santa-cruz", ...over
});
const html = (data: Parameters<typeof GuestMarketplace>[0]["data"], locale: "es-BO" | "en-US" = "es-BO") => renderToStaticMarkup(<GuestMarketplace data={data} t={createTranslator(locale)} locale={locale} lang={locale} />);

describe("guest marketplace · the page", () => {
  it("the categories are a navigation of links (not tabs): «Todas» first, the selected one marked with aria-current, names always visible, thumbnails decorative", () => {
    const document = dom(html(ready({ category: "catering" })));
    const nav = document.querySelector('nav[aria-label="Categorías de proveedores"]');
    expect(nav).not.toBeNull();
    expect(document.querySelector('[role="tablist"],[role="tab"]')).toBeNull();
    const links = [...nav!.querySelectorAll("a")];
    expect(links.map((a) => a.querySelector(".mkt-cat__name")?.textContent)).toEqual(["Todas", "Organizadores de eventos", "Catering y bocaditos", "Categoría nueva"]);
    expect(links.filter((a) => a.getAttribute("aria-current") === "true").map((a) => a.querySelector(".mkt-cat__name")?.textContent)).toEqual(["Catering y bocaditos"]);
    expect(links[1]!.getAttribute("href")).toBe("/c/ana-y-luis/proveedores?categoria=wedding-planners&ciudad=santa-cruz&lang=es-BO");
    for (const image of document.querySelectorAll(".mkt-cat img")) expect(image.getAttribute("alt")).toBe("");
    // A category without art gets the generic tile; one with art gets both colour schemes.
    expect(links[3]!.querySelector(".mkt-thumb--generic")?.textContent).toBe("C");
    expect(links[1]!.querySelectorAll("img")).toHaveLength(2);
    expect(links[1]!.querySelector("img")?.getAttribute("srcset")).toContain("/marketplace/v1/wedding-planners-light-176.webp 2x");
  });

  it("says who does what, shows one card per provider with «Destacado» only when the plan raised it, and links only to the partner's page", () => {
    const document = dom(html(ready()));
    expect(document.querySelector('[data-testid="mkt-trust"]')?.textContent).toBe("DOne verifica a los proveedores; no presta el servicio. El proveedor puede pagar a DOne por tu contacto.");
    const cards = [...document.querySelectorAll(".mkt-card")];
    expect(cards).toHaveLength(2);
    expect(cards[0]!.querySelector('[data-testid="mkt-sponsored"]')).toBeNull();
    expect(cards[1]!.querySelector('[data-testid="mkt-sponsored"]')?.textContent).toBe("Destacado");
    expect(cards[0]!.querySelector("h3 a")?.getAttribute("href")).toBe("/p/eventos-andinos");
    expect(cards[0]!.textContent).toMatch(/Desde .*2.?500/);
    expect(cards[1]!.querySelector("img")?.getAttribute("alt")).toBe("");
    // No direct partner link and no redirector on this page: the lead is born on the partner's page.
    expect(document.querySelectorAll('a[href^="/r/"], a[href^="http"], a[href^="tel:"], a[href^="mailto:"]')).toHaveLength(0);
    expect(document.querySelector(".mkt__back")?.getAttribute("href")).toBe("/c/ana-y-luis?lang=es-BO");
    expect(document.querySelector('[data-testid="mkt-count"]')?.getAttribute("aria-live")).toBe("polite");
    expect(document.querySelector('[data-testid="mkt-count"]')?.textContent).toBe("2 proveedores");
  });

  it("the city form works without a script (GET), keeps the category and offers all of Bolivia", () => {
    const form = dom(html(ready({ category: "catering" }))).querySelector("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/c/ana-y-luis/proveedores");
    expect(form.querySelector('input[name="categoria"]')?.getAttribute("value")).toBe("catering");
    expect(form.querySelector("label")?.getAttribute("for")).toBe("mkt-city");
    expect([...form.querySelectorAll("option")].map((option) => option.textContent)).toEqual(["Toda Bolivia", "Santa Cruz de la Sierra", "La Paz"]);
    expect(form.querySelector("option[selected]")?.getAttribute("value")).toBe("santa-cruz");
  });

  it("states: empty search offers all of Bolivia and clearing filters; an empty catalogue says so; an error offers retry and no other source", () => {
    const empty = dom(html(ready({ page: { items: [], total: 0, page: 1, pageSize: 12 }, category: "catering" })));
    expect(empty.querySelector('[data-testid="mkt-empty"]')).not.toBeNull();
    expect(empty.querySelector('[data-testid="mkt-empty"] a.rsvp-button:not(.rsvp-button--secondary)')?.getAttribute("href")).toBe("/c/ana-y-luis/proveedores?categoria=catering&ciudad=todas&lang=es-BO");
    expect([...empty.querySelectorAll('[data-testid="mkt-empty"] a')].map((a) => a.textContent)).toEqual(["Ver toda Bolivia", "Quitar filtros"]);
    const none = dom(html(ready({ categories: [], city: undefined, category: undefined, page: { items: [], total: 0, page: 1, pageSize: 12 } })));
    expect(none.querySelector("h2")?.textContent).toBe("Estamos reuniendo proveedores");
    expect(none.querySelector("nav.mkt-rail")).toBeNull();
    const failed = dom(html({ state: "unavailable", celebration: { celebrationId: "", slug: "ana-y-luis", title: "Los quince de Ana" } }));
    expect(failed.querySelector('[role="alert"]')).not.toBeNull();
    expect(failed.querySelector('[data-testid="mkt-retry"]')?.getAttribute("href")).toBe("/c/ana-y-luis/proveedores?lang=es-BO");
  });

  it("english: names, trust line and states are translated", () => {
    const document = dom(html(ready(), "en-US"));
    expect(document.querySelector("h1")?.textContent).toBe("Vendors for your event");
    expect(document.querySelector('[data-testid="mkt-trust"]')?.textContent).toContain("DOne verifies vendors; it does not provide the service.");
    expect(document.querySelector('[data-testid="mkt-count"]')?.textContent).toBe("2 vendors");
    expect(document.querySelector("nav.mkt-rail a")?.textContent).toBe("All");
  });

  it("pagination keeps the filters and appears only when there is more than one page", () => {
    const one = dom(html(ready()));
    expect(one.querySelector("nav.mkt-pager")).toBeNull();
    const many = dom(html(ready({ page: { items: [card()], total: 30, page: 2, pageSize: 12 }, category: "catering" })));
    const links = [...many.querySelectorAll("nav.mkt-pager a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/c/ana-y-luis/proveedores?categoria=catering&ciudad=santa-cruz&lang=es-BO", "/c/ana-y-luis/proveedores?categoria=catering&ciudad=santa-cruz&pagina=3&lang=es-BO"]);
    expect(marketplaceHref("a b", { page: 1 })).toBe("/c/a%20b/proveedores");
  });

  it("the addresses of the tab never carry a token, a fragment or a guest identifier", () => {
    const text = html(ready({ category: "catering" }));
    expect(text).not.toMatch(/token|#|guestId|credential/i);
    expect(marketplaceHref("ana-y-luis", { city: "la-paz", category: "catering", page: 2, lang: "en-US" })).toBe("/c/ana-y-luis/proveedores?categoria=catering&ciudad=la-paz&pagina=2&lang=en-US");
  });
});

describe("guest marketplace · attribution on the partner's page", () => {
  const IDS = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
  beforeEach(() => {
    document.body.innerHTML = `<div data-origin-links><a id="wa" href="/r/${IDS}?destination=WHATSAPP&amp;surface=PUBLIC_SITE">WhatsApp</a><a id="web" href="https://partner.example/x">Sitio</a></div><a id="out" href="/r/${IDS}?destination=PHONE">fuera</a>`;
  });
  it("marks the contact links of the section as coming from the tab when this tab came from it", () => {
    window.sessionStorage.setItem(MARKETPLACE_ORIGIN_KEY, JSON.stringify({ celebrationId: CELEBRATION.celebrationId, at: Date.now() }));
    render(<OriginLinks />);
    const wa = new URL(document.getElementById("wa")!.getAttribute("href")!, "http://x.test");
    expect(wa.pathname).toBe(`/r/${IDS}`);
    expect([wa.searchParams.get("destination"), wa.searchParams.get("surface"), wa.searchParams.get("celebrationId")]).toEqual(["WHATSAPP", "CELEBRATION_SITE", CELEBRATION.celebrationId]);
    expect(wa.searchParams.has("guestId")).toBe(false);
    expect(document.getElementById("web")!.getAttribute("href")).toBe("https://partner.example/x");
    expect(document.getElementById("out")!.getAttribute("href")).toBe(`/r/${IDS}?destination=PHONE`);
  });
  it("changes nothing without an origin, with an expired one, or with a malformed one", () => {
    for (const stored of [null, JSON.stringify({ celebrationId: CELEBRATION.celebrationId, at: Date.now() - 3 * 60 * 60 * 1000 }), JSON.stringify({ celebrationId: "x", at: Date.now() }), "{"]) {
      window.sessionStorage.clear();
      if (stored !== null) window.sessionStorage.setItem(MARKETPLACE_ORIGIN_KEY, stored);
      document.getElementById("wa")!.setAttribute("href", `/r/${IDS}?destination=WHATSAPP&surface=PUBLIC_SITE`);
      render(<OriginLinks />);
      expect(document.getElementById("wa")!.getAttribute("href")).toBe(`/r/${IDS}?destination=WHATSAPP&surface=PUBLIC_SITE`);
      cleanup();
    }
  });
});

describe("guest marketplace · entries on the invitation", () => {
  const page = { view: VIEW, template: TEMPLATES[0]!, gallery: [] };
  it("a quiet block at the end of the invitation, only when offered: no query beyond the language, no token, not in the dock", () => {
    const off = dom(renderToStaticMarkup(<PublicCelebration page={page} />));
    expect(off.querySelector('[data-testid="providers-entry"]')).toBeNull();
    const on = dom(renderToStaticMarkup(<PublicCelebration page={page} providersEntry />));
    const entry = on.querySelector('[data-testid="providers-entry"]');
    expect(entry?.querySelector("a")?.getAttribute("href")).toBe("/c/ana-y-luis/proveedores?lang=es-BO");
    expect(entry?.querySelector("a")?.textContent).toBe("Proveedores para tu evento");
    expect(on.querySelector(".celebration-dock")?.contains(entry!) ?? false).toBe(false);
    const section = dom(renderToStaticMarkup(<PublicCelebration page={page} providersEntry only="story" />));
    expect(section.querySelector('[data-testid="providers-entry"]')).toBeNull();
  });
});

describe("guest marketplace · the 3D tiles shipped with the site", () => {
  const root = join(process.cwd(), "public");
  it("all 20 categories have light and dark art at 88, 176 and 264 px, inside the budget of 6 KB (88 and 176) and 12 KB (264)", () => {
    expect(MARKETPLACE_THUMBS).toHaveLength(20);
    for (const slug of MARKETPLACE_THUMBS) for (const theme of ["light", "dark"] as const) for (const size of MARKETPLACE_THUMB_SIZES) {
      const file = join(root, marketplaceThumbSrc(slug, theme, size));
      expect(existsSync(file), file).toBe(true);
      const bytes = statSync(file).size;
      expect(bytes, file).toBeLessThanOrEqual(size === 264 ? 12 * 1024 : 6 * 1024);
      expect(readFileSync(file).subarray(0, 4).toString("latin1"), `${file} is a WebP`).toBe("RIFF");
    }
  });
});
