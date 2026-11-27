// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/r/[listingId]/route";

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
});
