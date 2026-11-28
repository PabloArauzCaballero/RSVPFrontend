import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { agendaEmptiness, categoryLabel, offerKind, createImpressionBatcher, uniqueZones, pageCount, pageParam, providerSearchPath, useDirectorySearch } from "../src/index.js";

describe("directory (shared by the public site and the app)", () => {
  it("categoryLabel: the published name, then the own translation, then the code as words; never a key nor a bare code", () => {
    const t = (key: string): string => (key === "directory.category.VENUE" ? "Salones de eventos" : key);
    expect(categoryLabel("VENUE", t, { VENUE: "Salones y quintas" })).toBe("Salones y quintas");
    // The catalogue answers the code as the name of a category without translations.
    expect(categoryLabel("VENUE", t, { VENUE: "VENUE" })).toBe("Salones de eventos");
    expect(categoryLabel("PASTRY", t, { PASTRY: "Pastelería" })).toBe("Pastelería");
    expect(categoryLabel("NEW_CODE", t, { NEW_CODE: "NEW_CODE" })).toBe("New code");
    expect(categoryLabel("PARTY-RENTALS", t)).toBe("Party rentals");
  });

  it("offerKind: named by the type only when every listing's category says the same one", () => {
    const categories = [{ code: "TABLEWARE", listingType: "PRODUCT" }, { code: "TOYS", listingType: "PRODUCT" }, { code: "MUSIC", listingType: "SERVICE" }, { code: "DECORATION", listingType: null }];
    const kind = (...codes: string[]) => offerKind(codes.map((category) => ({ category })), categories);
    expect(kind("TABLEWARE", "TOYS")).toBe("PRODUCT");
    expect(kind("MUSIC")).toBe("SERVICE");
    expect(kind("TABLEWARE", "MUSIC")).toBe("OFFER");
    expect(kind("DECORATION")).toBe("OFFER");
    expect(kind("TABLEWARE", "UNKNOWN")).toBe("OFFER");
    expect(offerKind([{ category: "MUSIC" }], [])).toBe("OFFER");
  });

  it("coverage zones typed differently by the provider are one zone (first spelling kept)", () => {
    expect(uniqueZones(["Santa cruz de la sierra", "Santa Cruz de la Sierra", " santa  cruz de la sierra ", "la-paz", "La Paz", ""])).toEqual(["Santa cruz de la sierra", "la-paz"]);
  });

  it("agendaEmptiness: no days → unpublished, none free → noneFree, a free day → null", () => {
    expect(agendaEmptiness([])).toBe("unpublished");
    expect(agendaEmptiness([{ available: false }, { available: false }])).toBe("noneFree");
    expect(agendaEmptiness([{ available: false }, { available: true }])).toBeNull();
  });

  it("the query path: proximity wins over the city; empty filters are not sent; page and size always are", () => {
    expect(providerSearchPath({ category: "VENUE", city: "la-paz", near: { lat: -16.5, lng: -68.15, radiusKm: 10 }, verifiedOnly: true, maxPriceMinor: 0, date: "2027-02-20", page: 2 }))
      .toBe("/providers?category=VENUE&lat=-16.5&lng=-68.15&radiusKm=10&verified=true&maxPriceMinor=0&availableOn=2027-02-20&page=2&pageSize=12");
    expect(providerSearchPath({})).toBe("/providers?page=1&pageSize=12");
    expect(pageCount({ total: 25, pageSize: 12 })).toBe(3);
    expect(pageCount({ total: 0, pageSize: 12 })).toBe(1);
    expect(pageParam(["4"])).toBe(4);
    expect(pageParam("0")).toBe(1);
  });

  it("impressions: once per listing, only UUIDs, in batches of at most 50, errors swallowed", async () => {
    const posts: { listingIds: string[]; surface: string }[] = [];
    const id = (n: number): string => `6f1c2a3b-4d5e-4f60-8a7b-${String(n).padStart(12, "0")}`;
    const batcher = createImpressionBatcher(async (body) => { posts.push(body); if (posts.length === 2) throw new Error("down"); }, "SEARCH", () => undefined);
    for (let n = 0; n < 51; n += 1) batcher.seen(id(n));
    batcher.seen(id(0));
    batcher.seen("not-a-uuid");
    await batcher.flush();
    expect(posts.map((body) => body.listingIds.length)).toEqual([50, 1]);
    expect(posts.every((body) => body.surface === "SEARCH" && Object.keys(body).length === 2)).toBe(true);
  });

  it("useDirectorySearch reads GET /providers without a session", async () => {
    const seen: { url: string; auth: string | null }[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => { seen.push({ url: String(input), auth: new Headers(init?.headers).get("authorization") }); return new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 12 }), { status: 200, headers: { "content-type": "application/json" } }); });
    const client = createApiClient({ baseUrl: "http://gw.test", fetchFn, tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }, refreshSession: { refresh: async () => { throw new Error("none"); } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useDirectorySearch(client, { category: "CATERING", page: 1 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(new URL(seen[0]?.url ?? "").pathname + new URL(seen[0]?.url ?? "").search).toBe("/providers?category=CATERING&page=1&pageSize=12");
    expect(seen[0]?.auth).toBeNull();
  });
});
