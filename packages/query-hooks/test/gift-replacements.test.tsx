import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient, toApiError } from "@rsvp/api-client";
import {
  createBatchKeys, createBodyKeys, GIFT_UNAVAILABLE_REASONS, arrangeGifts, guestGiftState, guestVisible, isGiftUnavailable, replacementsFailure, replacementsPath, replacementsRetryable, swapEntry, swapFailureCode,
  unavailableReasonOf, useGiftReplacements, type GiftItem
} from "../src/index.js";

/** R7 · gift-list 1.19.0: the unavailable gift, the replacements read (listGiftReplacements) and the swap entry for the contract's batch. */
const item = (over: Partial<GiftItem> = {}): GiftItem => ({
  id: "g1", listId: "l", celebrationId: "c", title: "Vajilla", price: { amountMinor: 45000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 1, createdAt: "2026-11-01T00:00:00Z", ...over
});

describe("R7 · isGiftUnavailable and the reason", () => {
  it("reads `availability`, because the wire status keeps the value the gift had", () => {
    expect(isGiftUnavailable(item({ availability: "UNAVAILABLE" }))).toBe(true);
    expect(isGiftUnavailable(item({ availability: "AVAILABLE" }))).toBe(false);
    expect(isGiftUnavailable(item())).toBe(false);
    expect(isGiftUnavailable(item({ status: "COMMITTED" }))).toBe(false);
    // R1: the contract's `status` never says UNAVAILABLE, so a legacy value there marks nothing (the cast is the point: it is not a contract status).
    const legacy = { ...item(), status: "UNAVAILABLE" as GiftItem["status"] };
    expect(isGiftUnavailable(legacy)).toBe(false);
  });
  it("knows the nine reasons of the contract and ignores one it does not know", () => {
    expect(GIFT_UNAVAILABLE_REASONS).toHaveLength(9);
    expect(unavailableReasonOf({ unavailableReason: "OUT_OF_STOCK" })).toBe("OUT_OF_STOCK");
    expect(unavailableReasonOf({ unavailableReason: "NEW_ONE" })).toBeNull();
    expect(unavailableReasonOf({ unavailableReason: null })).toBeNull();
    expect(unavailableReasonOf({})).toBeNull();
  });
});

describe("M41 · the guest never meets an unavailable gift", () => {
  it("guestVisible and arrangeGifts drop it whatever the filters, and keep the other gifts in order", () => {
    const gifts = [item({ id: "a" }), item({ id: "b", availability: "UNAVAILABLE" }), item({ id: "c", status: "COMMITTED", availability: "UNAVAILABLE" }), item({ id: "d", source: "EXTERNAL" })];
    expect(guestVisible(gifts).map((g) => g.id)).toEqual(["a", "d"]);
    for (const onlyAvailable of [true, false]) {
      const { partner, other } = arrangeGifts(gifts, { source: "all", onlyAvailable });
      expect([...partner, ...other].map((g) => g.id)).toEqual(["a", "d"]);
    }
    expect(arrangeGifts(gifts, { source: "partner", onlyAvailable: false }).partner.map((g) => g.id)).toEqual(["a"]);
  });
  it("a stray one that reached the card offers nothing: no reserve, no units, no provider buttons, not even for the coordinator", () => {
    expect(guestGiftState(item({ availability: "UNAVAILABLE", quantity: 12, unitsLeft: 8 }))).toMatchObject({ canReserve: false, chooseUnits: false, showProviderButtons: false });
    expect(guestGiftState(item({ availability: "UNAVAILABLE", groupGiftEnabled: true, participants: 1, viewer: { reservationId: "r", role: "COORDINATOR", status: "PENDING_REVIEW", units: 1 } }))).toMatchObject({ role: "COORDINATOR", showProviderButtons: false, canReserve: false });
  });
  it("when the gift is AVAILABLE again it is the normal card", () => {
    expect(guestGiftState(item({ availability: "AVAILABLE" }))).toMatchObject({ canReserve: true, showProviderButtons: true });
    expect(guestGiftState(item())).toMatchObject({ canReserve: true, showProviderButtons: true });
  });
});

describe("R7 · replacementsPath", () => {
  const base = "/gifts/celebrations/c-1/items/g-1/replacements";
  it("sends only eventType and city, which the server accepts, and only when they fit the contract's patterns", () => {
    expect(replacementsPath("c-1", "g-1")).toBe(base);
    expect(replacementsPath("c-1", "g-1", { eventType: "WEDDING", city: "santa-cruz" })).toBe(`${base}?eventType=WEDDING&city=santa-cruz`);
    // A value outside the pattern would be a 422 INVALID_QUERY: it is left out instead.
    expect(replacementsPath("c-1", "g-1", { eventType: "wedding party", city: "Santa Cruz" })).toBe(base);
    expect(replacementsPath("c-1", "g-1", { eventType: null, city: undefined })).toBe(base);
  });
  it("encodes the ids", () => {
    expect(replacementsPath("a/b", "c d")).toBe("/gifts/celebrations/a%2Fb/items/c%20d/replacements");
  });
});

describe("R7 · failures of the read and of the swap", () => {
  const failure = (status: number, code?: string) => toApiError(status, "t", { title: "x", status, ...(code ? { code } : {}) });
  it("403 and 404 are final; 503 and a missing answer are worth another try", () => {
    expect(replacementsFailure(failure(403, "HOST_REQUIRED"))).toBe("forbidden");
    expect(replacementsFailure(failure(404))).toBe("notFound");
    expect(replacementsFailure(failure(503))).toBe("unavailable");
    expect(replacementsFailure(failure(500))).toBe("unknown");
    expect(replacementsFailure(new TypeError("fetch failed"))).toBe("offline");
    expect(replacementsRetryable("forbidden")).toBe(false);
    expect(replacementsRetryable("notFound")).toBe(false);
    for (const kind of ["unavailable", "offline", "unknown"] as const) expect(replacementsRetryable(kind)).toBe(true);
  });
  it("swapFailureCode names only the 422 codes the panel explains", () => {
    expect(swapFailureCode(failure(422, "DUPLICATE_GIFT_IDEA"))).toBe("DUPLICATE_GIFT_IDEA");
    expect(swapFailureCode(failure(422, "CATALOG_PRODUCT_UNAVAILABLE"))).toBe("CATALOG_PRODUCT_UNAVAILABLE");
    expect(swapFailureCode(failure(422, "SOMETHING_ELSE"))).toBeNull();
    expect(swapFailureCode(failure(409, "DUPLICATE_GIFT_IDEA"))).toBeNull();
    expect(swapFailureCode(new Error("boom"))).toBeNull();
  });
});

describe("R7 · swapEntry", () => {
  it("keeps the idea, the quantity and the coordinated-gift switch of the gift it replaces, with the new product and no version", () => {
    expect(swapEntry({ quantity: 3, groupGiftEnabled: true }, { listingId: "L" }, "CAKE")).toEqual({ productListingId: "L", giftIdeaCode: "CAKE", quantity: 3, groupGiftEnabled: true });
    expect(swapEntry({}, { listingId: "L" }, "CAKE")).toEqual({ productListingId: "L", giftIdeaCode: "CAKE", quantity: 1, groupGiftEnabled: false });
    expect(swapEntry({ quantity: 0 }, { listingId: "L" }, "CAKE").quantity).toBe(1);
  });
});

function harness(respond: (url: URL, attempt: number) => { status?: number; body?: unknown } | "network") {
  const calls: { path: string; method: string; headers: Headers }[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ path: `${url.pathname}${url.search}`, method: init?.method ?? "GET", headers: new Headers(init?.headers) });
    const answer = respond(url, calls.length);
    if (answer === "network") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status ?? 200, headers: { "content-type": (answer.status ?? 200) >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper };
}
const REPLACEMENTS = { itemId: "g-1", giftIdeaCode: "CAKE", items: [{ listingId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a01", title: "Torta", priceMinor: 15000, currency: "BOB" }] };

describe("R7 · useGiftReplacements", () => {
  it("GETs the replacements of the gift with the host session and returns the contract's body", async () => {
    const h = harness(() => ({ body: REPLACEMENTS }));
    const view = renderHook(() => useGiftReplacements(h.client, "c-1", "g-1", { eventType: "WEDDING", city: "santa-cruz" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]).toMatchObject({ method: "GET", path: "/gifts/celebrations/c-1/items/g-1/replacements?eventType=WEDDING&city=santa-cruz" });
    expect(h.calls[0]?.headers.get("authorization")).toBe("Bearer session");
    expect(view.result.current.data).toEqual(REPLACEMENTS);
  });
  it("an empty list is a success, not an error", async () => {
    const h = harness(() => ({ body: { ...REPLACEMENTS, items: [] } }));
    const view = renderHook(() => useGiftReplacements(h.client, "c-1", "g-1", {}), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(view.result.current.data?.items).toEqual([]);
  });
  it("403 and 404 are not retried", async () => {
    for (const status of [403, 404]) {
      const h = harness(() => ({ status, body: { title: "x", status } }));
      const view = renderHook(() => useGiftReplacements(h.client, "c-1", "g-1", {}), { wrapper: h.wrapper });
      await waitFor(() => expect(view.result.current.isError).toBe(true));
      expect(h.calls).toHaveLength(1);
      expect(view.result.current.error).toBeInstanceOf(ApiError);
      expect(replacementsFailure(view.result.current.error)).toBe(status === 403 ? "forbidden" : "notFound");
    }
  });
  it("a lost answer is retried once, then the error shows and refetch recovers", async () => {
    const h = harness((_url, attempt) => (attempt <= 2 ? "network" : { body: REPLACEMENTS }));
    const view = renderHook(() => useGiftReplacements(h.client, "c-1", "g-1", {}), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isError).toBe(true), { timeout: 5000 });
    expect(h.calls).toHaveLength(2);
    expect(replacementsFailure(view.result.current.error)).toBe("offline");
    void view.result.current.refetch();
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true), { timeout: 5000 });
    expect(view.result.current.data).toEqual(REPLACEMENTS);
  }, 15000);
  it("does not ask until enabled", async () => {
    const h = harness(() => ({ body: REPLACEMENTS }));
    renderHook(() => useGiftReplacements(h.client, "c-1", "g-1", {}, false), { wrapper: h.wrapper });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(h.calls).toHaveLength(0);
  });
});

describe("R7 · createBodyKeys (one Idempotency-Key per body)", () => {
  const a = { items: [{ productListingId: "a", giftIdeaCode: "X" }] } as never;
  const b = { items: [{ productListingId: "b", giftIdeaCode: "X" }] } as never;
  it("keeps A's key after B was tried, and a success forgets only that body", () => {
    let n = 0;
    const keys = createBodyKeys(() => `k${++n}`);
    const first = keys(a);
    expect(keys(b)).not.toBe(first);
    expect(keys(a)).toBe(first);
    keys.reset(a);
    expect(keys(a)).not.toBe(first);
    expect(keys(b)).toBe("k2");
  });
  it("the default single-body keys are unchanged: another body replaces the key", () => {
    let n = 0;
    const keys = createBatchKeys(() => `k${++n}`);
    const first = keys(a);
    keys(b);
    expect(keys(a)).not.toBe(first);
  });
});
