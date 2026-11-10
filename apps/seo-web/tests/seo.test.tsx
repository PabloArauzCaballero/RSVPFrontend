// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { createApiClient, type ApiClient } from "@rsvp/api-client";
import { createTranslator } from "@rsvp/i18n/server";
import { describe, expect, it, vi } from "vitest";
import { PublicCelebration } from "../components/public-celebration";
import { ProviderResults } from "../components/provider-directory";
import { loadPublicPage, loadPublicSlugs } from "../lib/celebration";
import { eventJsonLd, itemListJsonLd, jsonLdScript, zonedIso } from "../lib/json-ld";
import { celebrationMetadata } from "../lib/metadata";
import { pageParam, providerSearchPath, searchProviders } from "../lib/providers";
import { requestedLanguage } from "../lib/locale";
import robots from "../app/robots";
import { GALLERY, TEMPLATES, VIEW } from "./celebration-fixtures";

const page = { view: VIEW, template: TEMPLATES[0] ?? null, gallery: GALLERY };
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });

/** A client whose fetch answers by path, like MSW handlers for the contract responses. */
function clientFor(routes: Readonly<Record<string, Response | (() => Response)>>): { readonly client: ApiClient; readonly calls: string[] } {
  const calls: string[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    const route = Object.entries(routes).find(([prefix]) => path.startsWith(prefix))?.[1];
    if (!route) return json(404, { title: "Not found", status: 404 });
    return typeof route === "function" ? route() : route.clone();
  }) as unknown as typeof fetch;
  const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
  return { client: createApiClient({ baseUrl: "http://gateway.test", tokenStore: anonymous, refreshSession: { refresh: vi.fn() }, fetchFn }), calls };
}

const dom = (html: string): Document => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");

describe("data loading (contract responses)", () => {
  it("loads the view, its template and its gallery", async () => {
    const { client, calls } = clientFor({
      [`/celebrations/public/${VIEW.slug}`]: json(200, VIEW),
      [`/media/templates/${VIEW.templateId}`]: json(200, TEMPLATES[0]),
      [`/media/public/celebrations/${VIEW.celebrationId}/assets`]: json(200, { items: GALLERY })
    });
    const loaded = await loadPublicPage(VIEW.slug, "en-US", client);
    expect(loaded?.template?.id).toBe("t-classic");
    expect(loaded?.gallery).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });

  it("A21 · a 404 from the read model is a controlled not-found, revealing nothing", async () => {
    const { client, calls } = clientFor({});
    expect(await loadPublicPage("borrador", "es-BO", client)).toBeNull();
    expect(calls).toEqual(["/celebrations/public/borrador"]);
  });

  it("missing template or gallery degrade gracefully; other errors surface", async () => {
    const { client } = clientFor({ [`/celebrations/public/${VIEW.slug}`]: json(200, VIEW) });
    const loaded = await loadPublicPage(VIEW.slug, "", client);
    expect(loaded?.template).toBeNull();
    expect(loaded?.gallery).toEqual([]);
    const broken = clientFor({ "/celebrations/public": json(503, { title: "Down", status: 503 }) });
    await expect(loadPublicPage(VIEW.slug, "", broken.client)).rejects.toThrow();
    for (const status of [401, 403, 409, 422]) {
      const failing = clientFor({ "/celebrations/public": json(status, { title: "x", status }) });
      await expect(loadPublicPage(VIEW.slug, "", failing.client)).rejects.toMatchObject({ status });
    }
  });

  it("sitemap slugs come from the API", async () => {
    const { client } = clientFor({ "/celebrations/public": json(200, { items: [{ slug: "a", updatedAt: "2026-10-17T00:00:00Z", supportedLocales: ["es-BO"] }] }) });
    expect((await loadPublicSlugs(client)).map((item) => item.slug)).toEqual(["a"]);
  });
});

describe("rendered public page", () => {
  it("REQ-F10-06 · the DOM has no partner link outside the redirector", () => {
    const document = dom(renderToStaticMarkup(<PublicCelebration page={page} />));
    const anchors = [...document.querySelectorAll("a")];
    const partners = anchors.filter((anchor) => anchor.dataset["linkKind"] === "partner");
    expect(partners.map((anchor) => anchor.getAttribute("href"))).toEqual(["/r/listing-42"]);
    const outbound = anchors.filter((anchor) => /^https?:/.test(anchor.getAttribute("href") ?? ""));
    expect(outbound.every((anchor) => ["navigation", "image"].includes(anchor.dataset["linkKind"] ?? ""))).toBe(true);
    expect(anchors.every((anchor) => anchor.dataset["linkKind"])).toBe(true);
  });

  it("REQ-F08-04 · JSON-LD Event in the page, with the celebration's own UTC offset", () => {
    const document = dom(renderToStaticMarkup(<PublicCelebration page={page} />));
    const data = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? "{}");
    expect(data["@type"]).toBe("Event");
    expect(data.startDate).toBe("2026-12-19T19:00:00-04:00");
    expect(data.location).toEqual({ "@type": "Place", name: "Iglesia San Francisco", address: "Plaza San Francisco, La Paz" });
    expect(data.organizer.map((person: { name: string }) => person.name)).toEqual(["Ana", "Luis"]);
  });

  it("REQ-F10-04 · same celebration in es-BO and en-US, with a language switcher", () => {
    const es = renderToStaticMarkup(<PublicCelebration page={page} />);
    const en = renderToStaticMarkup(<PublicCelebration page={{ ...page, view: { ...VIEW, locale: "en-US", content: { ...VIEW.content, title: "Ana & Luis" } } }} />);
    expect(es).toContain("Itinerario");
    expect(en).toContain("Schedule");
    expect(en).toContain("Ana &amp; Luis");
    expect(dom(es).querySelectorAll(".celebration-languages a")).toHaveLength(2);
  });

  it("REQ-F10-05 · itinerary in the celebration zone (La Paz) even when the server runs elsewhere", () => {
    const html = renderToStaticMarkup(<PublicCelebration page={page} />);
    expect(html).toContain("7:00 p. m.");
    expect(html).toContain("11:30 p. m.");
  });

  it("a section page renders only that section and no JSON-LD", () => {
    const document = dom(renderToStaticMarkup(<PublicCelebration page={page} only="faq" />));
    expect([...document.querySelectorAll("[data-section]")].map((node) => node.getAttribute("data-section"))).toEqual(["faq"]);
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});

describe("metadata and crawling", () => {
  const t = createTranslator("es-BO");

  it("REQ-F08-02/03 · title, description, canonical, hreflang and the WhatsApp card from real content", () => {
    const metadata = celebrationMetadata(VIEW, GALLERY, t);
    expect(metadata.title).toBe("Ana y Luis");
    expect(metadata.description).toBe("Boda · sábado, 19 de diciembre de 2026 · Hacienda El Prado");
    expect(metadata.alternates?.canonical).toMatch(/\/c\/ana-y-luis$/);
    expect(Object.keys(metadata.alternates?.languages ?? {})).toEqual(["es-BO", "en-US"]);
    expect(metadata.openGraph).toMatchObject({ type: "website", locale: "es_BO", images: [{ url: GALLERY[0]?.variants.full, width: 1920, height: 1280 }] });
    expect(celebrationMetadata(VIEW, GALLERY, t, { id: "faq", path: "faq" }).title).toBe("Preguntas frecuentes · Ana y Luis");
    expect(celebrationMetadata({ ...VIEW, content: { title: "X" } }, [], t).description).toBe("Toda la información de la celebración en un solo lugar.");
  });

  it("REQ-F08-05 · robots keeps private surfaces and magic links out", () => {
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules[0] : rules)?.disallow;
    expect(disallow).toEqual(expect.arrayContaining(["/admin", "/api", "/panel", "/r/", "/c/*/rsvp"]));
  });

  it("JSON-LD helpers are safe and schema-shaped", () => {
    expect(zonedIso({ date: "2026-03-29", time: "03:30", timeZone: "Europe/Madrid", utcOffset: "+02:00" })).toBe("2026-03-29T03:30:00+02:00");
    expect(eventJsonLd({ ...VIEW, localTimes: {} }, [], "u")).toBeNull();
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
    const list = itemListJsonLd([{ name: "Salón A", url: "https://x/p/a" }], "https://x/proveedores/salones");
    expect(list).toMatchObject({ "@type": "ItemList", numberOfItems: 1, itemListElement: [{ "@type": "ListItem", position: 1, name: "Salón A" }] });
  });

  it("?lang wins over Accept-Language only when supported", () => {
    expect(requestedLanguage("en-US", "es-BO")).toBe("en-US");
    expect(requestedLanguage("fr-FR", "es-BO,es;q=0.9")).toBe("es-BO,es;q=0.9");
    expect(requestedLanguage(undefined, null)).toBe("");
  });
});

describe("provider directory (F24)", () => {
  const t = createTranslator("es-BO");
  const card = { listingId: "l1", providerSlug: "salon-sol", name: "Salón Sol", category: "VENUE", city: "Santa Cruz de la Sierra", department: "Santa Cruz", verified: true, priceFrom: { amountMinor: 1250000, currency: "BOB" } };

  it("builds the search contract query and parses pages", () => {
    expect(providerSearchPath({ category: "VENUE", city: "Sucre", verifiedOnly: true, maxPriceMinor: 500000, date: "2026-12-19", page: 2 })).toBe("/providers?category=VENUE&city=Sucre&verified=true&maxPriceMinor=500000&availableOn=2026-12-19&page=2&pageSize=12");
    expect(pageParam("3")).toBe(3);
    expect(pageParam(["0"])).toBe(1);
    expect(pageParam("x")).toBe(1);
  });

  it("an unreachable catalogue is reported, never filled with invented results", async () => {
    const { client } = clientFor({ "/providers": json(503, { title: "Down", status: 503 }) });
    const result = await searchProviders({ category: "VENUE" }, client);
    expect(result).toMatchObject({ available: false, items: [] });
    expect(renderToStaticMarkup(<ProviderResults page={result} t={t} locale="es-BO" path="/proveedores/salones" />)).toContain("no está disponible");
  });

  it("REQ-F24-05 · listings carry ItemList JSON-LD, prices without floats, and crawlable pagination", async () => {
    const { client } = clientFor({ "/providers": json(200, { items: [card], total: 30, page: 2, pageSize: 12 }) });
    const result = await searchProviders({ category: "VENUE", page: 2 }, client);
    const document = dom(renderToStaticMarkup(<ProviderResults page={result} t={t} locale="es-BO" path="/proveedores/salones" query="page=2" />));
    const data = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? "{}");
    expect(data.itemListElement[0].url).toMatch(/\/p\/salon-sol$/);
    expect(document.body.textContent).toContain("Bs");
    expect(document.body.textContent).toContain("12.500,00");
    expect(document.querySelector('a[rel="prev"]')?.getAttribute("href")).toBe("/proveedores/salones");
    expect(document.querySelector('a[rel="next"]')?.getAttribute("href")).toBe("/proveedores/salones?page=3");
    expect(document.body.textContent).toContain("30 resultados");
  });

  it("an empty category says so", async () => {
    const { client } = clientFor({ "/providers": json(200, { items: [], total: 0, page: 1, pageSize: 12 }) });
    expect(renderToStaticMarkup(<ProviderResults page={await searchProviders({}, client)} t={t} locale="es-BO" path="/proveedores" />)).toContain("Todavía no hay proveedores");
  });
});
