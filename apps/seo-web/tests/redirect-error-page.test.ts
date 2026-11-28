// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { GET } from "../app/r/[listingId]/route";

interface Header { readonly key: string; readonly value: string }
const nextConfig = createRequire(import.meta.url)("../next.config.js") as { headers: () => Promise<readonly { readonly source: string; readonly headers: readonly Header[] }[]> };

const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const params = { params: Promise.resolve({ listingId: LISTING }) };

afterEach(() => vi.unstubAllGlobals());

describe("R6a · the failure page of /r/{id} never leaves the lead context in the visible URL", () => {
  it.each([[503], [404], [422]])("when the redirector answers %i the page strips ctx with history.replaceState and keeps the rest of the URL", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status })));
    const response = await GET(new Request(`http://site.test/r/${LISTING}?surface=GIFT_LIST&celebrationId=c1&ctx=token-secreto`), params);
    expect(response.status).not.toBe(302);
    const html = await response.text();
    expect(html).not.toContain("token-secreto");
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(script).toBeTruthy();
    window.history.replaceState(null, "", `/r/${LISTING}?surface=GIFT_LIST&celebrationId=c1&ctx=token-secreto#x`);
    new Function(script ?? "")();
    expect(window.location.search).toBe("?surface=GIFT_LIST&celebrationId=c1");
    expect(window.location.hash).toBe("#x");
    expect(window.location.href).not.toContain("token-secreto");
  });

  it("negative: without ctx the URL is left alone", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    const html = await (await GET(new Request(`http://site.test/r/${LISTING}?surface=SEARCH`), params)).text();
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
    window.history.replaceState(null, "", `/r/${LISTING}?surface=SEARCH`);
    new Function(script)();
    expect(window.location.search).toBe("?surface=SEARCH");
  });

  it("the failure page is not sent with a referrer (its URL may carry ctx until the script runs) but the 302 keeps the default policy", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    const failure = await GET(new Request(`http://site.test/r/${LISTING}?ctx=token-secreto`), params);
    expect(failure.headers.get("referrer-policy")).toBe("no-referrer");
    // The served header is replaced by the global rule of next.config.js (seen with a real `next start`), so the page itself must say it too.
    expect(await failure.text()).toContain('<meta name="referrer" content="no-referrer">');
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://hotel.example/" } })));
    const redirect = await GET(new Request(`http://site.test/r/${LISTING}?ctx=token-secreto`), params);
    expect(redirect.headers.get("referrer-policy")).toBeNull();
  });

  it("guard: the inline script of the page needs 'unsafe-inline' in script-src; if the CSP drops it (or is enforced) the page needs a nonce or hash first", async () => {
    const rules = await nextConfig.headers();
    const policies = rules.flatMap((rule) => rule.headers)
      .filter((header) => header.key.startsWith("Content-Security-Policy") && /script-src/.test(header.value));
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) expect(/script-src[^;]*'unsafe-inline'/.test(policy.value) || /script-src[^;]*('nonce-|'sha256-)/.test(policy.value)).toBe(true);
  });
});
