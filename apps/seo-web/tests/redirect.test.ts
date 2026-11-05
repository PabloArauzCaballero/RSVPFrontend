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

  it("/r/ is not indexable", () => {
    const rule = (robots().rules as { disallow: string[] }[])[0];
    expect(rule?.disallow).toContain("/r/");
  });
});
