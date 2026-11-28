// @vitest-environment jsdom
import type * as ReactModule from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createApiClient } from "@rsvp/api-client";
import { describe, expect, it, vi } from "vitest";
import PartnerPage, { generateMetadata } from "../app/p/[slug]/page";
import { loadCategories } from "../lib/providers";

/** React's `cache` only memoizes inside a server render; here it memoizes by argument, as it does within one request. */
vi.mock("react", async (original) => ({
  ...(await original<typeof ReactModule>()),
  cache: <TResult,>(load: (key: string) => TResult) => {
    const seen = new Map<string, TResult>();
    return (key: string): TResult => {
      if (!seen.has(key)) seen.set(key, load(key));
      return seen.get(key) as TResult;
    };
  }
}));

const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const card = { listingId: "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11", providerSlug: "casa-loza", name: "Juego de vajilla", category: "TABLEWARE", city: "La Paz", department: "La Paz", verified: true };

describe("/p/{slug} · category of the page and its metadata", () => {
  it("both use the catalogue's name and read the categories once, with a time limit", async () => {
    const reads: (AbortSignal | null | undefined)[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/providers/categories")) {
        reads.push(init?.signal);
        // A name unlike the static translation: it only shows if the page really reads the catalogue.
        return json({ items: [{ code: "TABLEWARE", name: "Loza del catálogo", listingType: "PRODUCT" }] });
      }
      return json(String(input).includes("slug=casa-loza") ? { items: [card], total: 1, page: 1, pageSize: 12 } : {});
    }));
    const params = Promise.resolve({ slug: "casa-loza" });
    const metadata = await generateMetadata({ params });
    expect(metadata.title).toBe("Juego de vajilla · Loza del catálogo en La Paz");
    expect(metadata.description).toContain("proveedor verificado de loza del catálogo en La Paz.");
    const html = renderToStaticMarkup(await PartnerPage({ params }));
    expect(html).toContain("proveedor de loza del catálogo en La Paz, verificado por DOne. Publica 1 producto.");
    expect(html).not.toContain("directory.category");
    expect(reads).toHaveLength(1);
    expect(reads[0]).toBeInstanceOf(AbortSignal);
    vi.unstubAllGlobals();
  });

  it("a catalogue that never answers, or answers without items, leaves no categories", async () => {
    const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
    const client = (fetchFn: typeof fetch) => createApiClient({ baseUrl: "http://gateway.test", tokenStore: anonymous, refreshSession: { refresh: vi.fn() }, fetchFn });
    const hung: typeof fetch = (_input, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))); });
    expect(await loadCategories("es-BO", client(hung), 20)).toEqual([]);
    expect(await loadCategories("es-BO", client(async () => json({})))).toEqual([]);
  });
});
