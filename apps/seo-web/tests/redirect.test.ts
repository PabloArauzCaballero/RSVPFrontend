import { describe, expect, it, vi } from "vitest";
import { GET } from "../app/r/[listingId]/route";
import { correlationIdOf, resolveRedirect, withAttribution } from "../lib/redirect";
import robots from "../app/robots";

const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const CID = "11111111-2222-4333-8444-555555555555";
const ctx = { params: Promise.resolve({ listingId: LISTING }) };

/** Stands in for Kong → Provider Catalog GET /r/{listingId}: answers 302 + Location like the contract. */
function gateway(response: () => Response) {
  const fetchFn = vi.fn(async () => response());
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}
const upstream302 = (location = "https://hotel.example/reservas?utm_source=rsvp&utm_medium=referral") => () => new Response(null, { status: 302, headers: { location } });

describe("REQ-F27-02/03 · /r/{listingId} redirector", () => {
  it("answers exactly 302, never 301, and sends the visitor to the partner", async () => {
    gateway(upstream302());
    const response = await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP`), ctx);
    expect(response.status).toBe(302);
    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toContain("https://hotel.example/reservas");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("even if the backend answered 301/308, the site only emits 302 (a permanent redirect would bypass lead counting)", async () => {
    gateway(() => new Response(null, { status: 301, headers: { location: "https://hotel.example/" } }));
    const response = await GET(new Request(`http://site.test/r/${LISTING}`), ctx);
    expect(response.status).toBe(302);
  });

  it("REQ-F27-04 · the final URL carries the UTM parameters of the visitor and the correlationId", async () => {
    const fetchFn = gateway(upstream302("https://hotel.example/reservas"));
    const response = await GET(new Request(`http://site.test/r/${LISTING}?destination=OFFICIAL_SITE&utm_campaign=boda-ana&utm_content=card&surface=SEARCH`, { headers: { "x-correlation-id": CID, "user-agent": "Mozilla/5.0 Mobile" } }), ctx);
    const final = new URL(response.headers.get("location") ?? "");
    expect(final.searchParams.get("utm_campaign")).toBe("boda-ana");
    expect(final.searchParams.get("utm_content")).toBe("card");
    expect(final.searchParams.get("correlationId")).toBe(CID);
    expect(response.headers.get("x-correlation-id")).toBe(CID);
    // And the backend was asked with the same correlation id, surface and destination, without following redirects.
    const [url, init] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit & { headers: Record<string, string> }];
    expect(url.pathname).toBe(`/r/${LISTING}`);
    expect(url.searchParams.get("destination")).toBe("OFFICIAL_SITE");
    expect(url.searchParams.get("surface")).toBe("SEARCH");
    expect(init.redirect).toBe("manual");
    expect(init.headers["x-correlation-id"]).toBe(CID);
    expect(init.headers["user-agent"]).toBe("Mozilla/5.0 Mobile");
  });

  it("does not overwrite the UTM or correlationId the backend already set, and ignores non-http targets", () => {
    const incoming = new URLSearchParams("utm_source=evil&utm_term=x");
    const out = new URL(withAttribution("https://p.example/?utm_source=rsvp&correlationId=abc", incoming, CID));
    expect(out.searchParams.get("utm_source")).toBe("rsvp");
    expect(out.searchParams.get("utm_term")).toBe("x");
    expect(out.searchParams.get("correlationId")).toBe("abc");
    expect(withAttribution("tel:+59171234567", incoming, CID)).toBe("tel:+59171234567");
  });

  it("generates a correlation id when the caller's is missing or malformed", () => {
    expect(correlationIdOf(null, null)).toMatch(/^[0-9a-f-]{36}$/);
    expect(correlationIdOf("not-a-uuid", null)).not.toBe("not-a-uuid");
    expect(correlationIdOf(null, CID)).toBe(CID);
  });

  it("backend not answering: clear error page with a link back, not a redirect", async () => {
    gateway(() => new Response('{"message":"name resolution failed"}', { status: 503 }));
    const response = await GET(new Request(`http://site.test/r/${LISTING}?destination=PHONE`, { headers: { referer: "http://site.test/p/hotel-andino" } }), ctx);
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("No pudimos abrir el enlace");
    expect(html).toContain('href="/p/hotel-andino"');
    expect(html).toContain("noindex");
    expect(html).not.toContain("name resolution");
  });

  it("network failure is the same controlled error; unknown listing is a 404 page; bad id never reaches the backend", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect((await GET(new Request(`http://site.test/r/${LISTING}`), ctx)).status).toBe(503);
    gateway(() => new Response("{}", { status: 404 }));
    const missing = await GET(new Request(`http://site.test/r/${LISTING}`), ctx);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("ya no está disponible");
    const fetchFn = gateway(upstream302());
    const bad = await resolveRedirect({ listingId: "no-es-uuid", searchParams: new URLSearchParams(), fetchFn });
    expect(bad).toMatchObject({ kind: "failure", status: 404 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("an external referer never becomes the back link (open redirect)", async () => {
    gateway(() => new Response("{}", { status: 503 }));
    const response = await GET(new Request(`http://site.test/r/${LISTING}`, { headers: { referer: "https://evil.example/phish" } }), ctx);
    expect(await response.text()).toContain('href="/proveedores"');
  });

  it("A23 · a link without destination (gift items) asks Provider Catalog for the listing's primary destination, never a fixed OFFICIAL_SITE", async () => {
    const fetchFn = gateway(upstream302("https://shop.example/torta?utm_source=rsvp"));
    const celebrationId = "22222222-3333-4444-8555-666666666666";
    const response = await GET(new Request(`http://site.test/r/${LISTING}?surface=GIFT_LIST&celebrationId=${celebrationId}`), ctx);
    expect(response.status).toBe(302);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.has("destination")).toBe(false);
    expect(url.searchParams.get("surface")).toBe("GIFT_LIST");
    expect(url.searchParams.get("celebrationId")).toBe(celebrationId);
  });

  it("A23 · every service destination of a microsite button is forwarded as is; an unknown one is dropped, not replaced", async () => {
    for (const destination of ["OFFICIAL_SITE", "LANDING", "WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "PRODUCT_PAGE"]) {
      const fetchFn = gateway(upstream302());
      await GET(new Request(`http://site.test/r/${LISTING}?destination=${destination}&surface=PUBLIC_SITE`), ctx);
      const [url] = fetchFn.mock.calls[0] as unknown as [URL];
      expect(url.searchParams.get("destination")).toBe(destination);
    }
    const fetchFn = gateway(upstream302());
    await GET(new Request(`http://site.test/r/${LISTING}?destination=javascript:alert(1)`), ctx);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.has("destination")).toBe(false);
  });

  it("R6a · ctx (the member's lead context) is forwarded to Provider Catalog unchanged and never reaches the partner URL", async () => {
    const fetchFn = gateway(upstream302("https://shop.example/torta?utm_source=rsvp"));
    const token = "lead-context-de-prueba";
    const response = await GET(new Request(`http://site.test/r/${LISTING}?surface=GIFT_LIST&celebrationId=22222222-3333-4444-8555-666666666666&ctx=${token}`), ctx);
    expect(response.status).toBe(302);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.get("ctx")).toBe(token);
    expect(response.headers.get("location")).not.toContain(token);
    expect(response.headers.get("location")).not.toContain("ctx=");
  });

  it("R6a · without ctx none is sent, and an empty one is dropped (a guest's click is billed as before)", async () => {
    const fetchFn = gateway(upstream302());
    await GET(new Request(`http://site.test/r/${LISTING}?surface=GIFT_LIST&ctx=`), ctx);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.has("ctx")).toBe(false);
  });

  it("R6a · PREVIEW is a known surface and is forwarded as the lead's surface", async () => {
    const fetchFn = gateway(upstream302());
    await GET(new Request(`http://site.test/r/${LISTING}?surface=PREVIEW`), ctx);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.get("surface")).toBe("PREVIEW");
  });

  it("R6a · a ctx longer than 512 characters, with spaces or with control characters is dropped before calling the backend, and the click still redirects", async () => {
    for (const bad of ["a".repeat(513), "con espacio", "tab%09", "salto%0Ade-linea", "acentuaci%C3%B3n"]) {
      const fetchFn = gateway(upstream302());
      const response = await GET(new Request(`http://site.test/r/${LISTING}?surface=GIFT_LIST&celebrationId=22222222-3333-4444-8555-666666666666&ctx=${bad}`), ctx);
      expect(response.status).toBe(302);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      const [url] = fetchFn.mock.calls[0] as unknown as [URL];
      expect(url.searchParams.has("ctx")).toBe(false);
      expect(url.searchParams.get("celebrationId")).toBe("22222222-3333-4444-8555-666666666666");
    }
  });

  it("R6a · a ctx of exactly 512 characters is still forwarded", async () => {
    const fetchFn = gateway(upstream302());
    const token = "a".repeat(512);
    await GET(new Request(`http://site.test/r/${LISTING}?surface=GIFT_LIST&ctx=${token}`), ctx);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.get("ctx")).toBe(token);
  });

  it("R6a · a 422 INVALID_LEAD_CONTEXT is NOT retried (the code is shared by sessionId, surface, celebrationId…): one backend call and the failure is reported", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ code: "INVALID_LEAD_CONTEXT" }), { status: 422 }));
    vi.stubGlobal("fetch", fetchFn);
    const response = await GET(new Request(`http://site.test/r/${LISTING}?surface=NO_EXISTE&ctx=token`), ctx);
    expect(response.status).toBe(400);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("/r/ is not indexable", () => {
    const rule = (robots().rules as { disallow: string[] }[])[0];
    expect(rule?.disallow).toContain("/r/");
  });
});

describe("B1 · /r forwards the visitor address so Kong rate-limits each visitor, not seo-web", () => {
  const sentHeaders = (fetchFn: ReturnType<typeof gateway>) => new Headers((fetchFn.mock.calls[0] as unknown as [URL, RequestInit])[1].headers as Record<string, string>);

  it("sends the right-most X-Forwarded-For entry (the one the proxy appended) as X-Forwarded-For and X-Real-IP", async () => {
    const fetchFn = gateway(upstream302());
    await GET(new Request(`http://site.test/r/${LISTING}`, { headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.7" } }), ctx);
    const headers = sentHeaders(fetchFn);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(headers.get("x-real-ip")).toBe("203.0.113.7");
  });

  it("a forged left-most entry or a non-address is never forwarded", async () => {
    const fetchFn = gateway(upstream302());
    await GET(new Request(`http://site.test/r/${LISTING}`, { headers: { "x-forwarded-for": "203.0.113.7, not-an-ip" } }), ctx);
    expect(sentHeaders(fetchFn).get("x-forwarded-for")).toBeNull();
    expect(sentHeaders(fetchFn).get("x-real-ip")).toBeNull();
  });

  it("without a proxy header nothing is invented", async () => {
    const fetchFn = gateway(upstream302());
    await GET(new Request(`http://site.test/r/${LISTING}`), ctx);
    expect(sentHeaders(fetchFn).get("x-forwarded-for")).toBeNull();
  });
});

describe("B1 · clientAddressOf / trustedProxyHops", async () => {
  const { clientAddressOf, trustedProxyHops } = await import("../lib/client-address");
  it("reads the entry written by the N-th trusted proxy from the right, IPv4 or IPv6", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.9, 2001:db8::1, 10.0.0.5" });
    expect(clientAddressOf(headers, 1)).toBe("10.0.0.5");
    expect(clientAddressOf(headers, 2)).toBe("2001:db8::1");
    expect(clientAddressOf(headers, 4)).toBeNull();
    expect(clientAddressOf(headers, 0)).toBeNull();
  });
  it("hops come from SEO_WEB_TRUSTED_PROXY_HOPS; invalid values fall back to 1", () => {
    expect(trustedProxyHops(undefined)).toBe(1);
    expect(trustedProxyHops("2")).toBe(2);
    expect(trustedProxyHops("0")).toBe(0);
    for (const bad of ["-1", "abc", "9", "1.5"]) expect(trustedProxyHops(bad)).toBe(1);
  });
});

describe("R5 · /r resolves the WhatsApp message on the server", () => {
  const ITEM = "22222222-3333-4444-8555-666666666666";
  const VARIANT = "33333333-4444-4555-8666-777777777777";
  const WA = "https://wa.me/59170000000?text=Hola%20Tortas%2C%20vengo%20de%20DOne.%20Quiero%20regalar%20Vajilla%20%C3%97%202";
  const celebration = "4f0f2d3d-0000-4000-8000-000000000001";

  it("forwards giftItemId, variant, quantity and celebrationSlug (next to celebrationId) to Provider Catalog", async () => {
    const fetchFn = gateway(upstream302(WA));
    await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&surface=GIFT_LIST&celebrationId=${celebration}&celebrationSlug=ana-y-luis&giftItemId=${ITEM}&variant=${VARIANT}&quantity=2&locale=es-BO`), ctx);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect(Object.fromEntries(url.searchParams)).toEqual({ destination: "WHATSAPP", surface: "GIFT_LIST", celebrationId: celebration, celebrationSlug: "ana-y-luis", giftItemId: ITEM, variant: VARIANT, quantity: "2", locale: "es-BO" });
  });

  it("the answer is exactly the wa.me link of the backend: no utm_* and no correlationId added, the text untouched", async () => {
    gateway(upstream302(WA));
    const response = await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&utm_campaign=boda&surface=GIFT_LIST`, { headers: { "x-correlation-id": CID } }), ctx);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(WA);
    expect(withAttribution(WA, new URLSearchParams("utm_source=x"), CID)).toBe(WA);
    expect(withAttribution("https://api.whatsapp.com/send?phone=1&text=hola", new URLSearchParams("utm_source=x"), CID)).toBe("https://api.whatsapp.com/send?phone=1&text=hola");
  });

  it("drops values that do not have the shape of the field instead of failing the click (a quantity that is not a positive integer would be a 422)", async () => {
    const fetchFn = gateway(upstream302(WA));
    await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&quantity=abc&giftItemId=not-an-id&variant=%3Cscript%3E&celebrationSlug=%20bad%20slug`), ctx);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    for (const key of ["quantity", "giftItemId", "variant", "celebrationSlug"]) expect(url.searchParams.has(key)).toBe(false);
    for (const zero of ["0", "-3", "2.5", "1e3", ""]) {
      fetchFn.mockClear();
      await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&quantity=${encodeURIComponent(zero)}`), ctx);
      expect((fetchFn.mock.calls[0] as unknown as [URL])[0].searchParams.has("quantity")).toBe(false);
    }
  });

  it("PF-1: a guest's name, phone or free text in the link never reaches Provider Catalog", async () => {
    const fetchFn = gateway(upstream302(WA));
    await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&text=Hola&name=Marta&phone=70000000&guestName=Marta&email=a%40b.c&message=hola`), ctx);
    const [url] = fetchFn.mock.calls[0] as unknown as [URL];
    expect([...url.searchParams.keys()].sort()).toEqual(["destination", "surface"]);
  });

  it("a backend 422 (for instance INVALID_QUANTITY) is the page of an invalid link, not a crash", async () => {
    gateway(() => new Response(JSON.stringify({ code: "INVALID_QUANTITY" }), { status: 422 }));
    const response = await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&quantity=2`), ctx);
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
  });

  it("M-6 · the slug has the contract's shape (lowercase words with single hyphens, at most 100): anything else is dropped, never a 422", async () => {
    const fetchFn = gateway(upstream302(WA));
    for (const slug of ["Ana_y_Luis", "ana--luis", "-ana", "ana-", "ana luis", "a".repeat(101)]) {
      fetchFn.mockClear();
      await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&celebrationSlug=${encodeURIComponent(slug)}`), ctx);
      expect((fetchFn.mock.calls[0] as unknown as [URL])[0].searchParams.has("celebrationSlug")).toBe(false);
    }
    for (const slug of ["ana-y-luis", "boda2026", "a".repeat(100)]) {
      fetchFn.mockClear();
      await GET(new Request(`http://site.test/r/${LISTING}?destination=WHATSAPP&celebrationSlug=${slug}`), ctx);
      expect((fetchFn.mock.calls[0] as unknown as [URL])[0].searchParams.get("celebrationSlug")).toBe(slug);
    }
  });
});
