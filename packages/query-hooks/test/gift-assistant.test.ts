import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "@rsvp/api-client";
import {
  AFFORDABLE_UNITS_PER_GUESTS, assistantApi, balanceOf, bandOf, batchFailures, createBatchKeys, defaultVariant, deliveryNotesProblem, notesLength, ideaOverlapsBand, mayHaveBeenApplied, recommendationPath, suggestGroupGift, toBatchEntry, unitPriceOf
} from "../src/index.js";

interface Call { readonly method: string; readonly path: string; readonly headers: Headers; readonly body: unknown }
type Answer = { readonly status: number; readonly body?: unknown } | ((call: Call, n: number) => { readonly status: number; readonly body?: unknown });
function harness(answer: Answer) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Call = { method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const result = typeof answer === "function" ? answer(call, calls.length) : answer;
    return new Response(JSON.stringify(result.body ?? {}), { status: result.status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  const tokens = { getAccessToken: async () => "host-access", getRefreshToken: async () => "refresh", setTokens: async () => undefined, clear: async () => undefined };
  return { client: createApiClient({ baseUrl: "http://gateway.test", tokenStore: tokens, refreshSession: { refresh: vi.fn() }, fetchFn }), calls };
}
const L = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const entry = { productListingId: L, giftIdeaCode: "CAKE", quantity: 1, groupGiftEnabled: false };

describe("R4 · the balance bar (§5.6)", () => {
  it("the four ranges close at Bs 200, 500 and 1 000 and the last one is open", () => {
    expect([0, 20_000, 20_001, 50_000, 50_001, 100_000, 100_001, 9_000_000].map(bandOf)).toEqual(["b1", "b1", "b2", "b2", "b3", "b3", "b4", "b4"]);
  });
  it("one gift up to Bs 200 and 40 guests asks for cheap ideas (the example of the plan)", () => {
    const report = balanceOf([{ unitMinor: 15_000, quantity: 1 }, { unitMinor: 300_000, quantity: 1 }], 40);
    expect(report.units).toEqual({ b1: 1, b2: 0, b3: 0, b4: 1 });
    expect(report.affordableTarget).toBe(Math.ceil(40 / AFFORDABLE_UNITS_PER_GUESTS));
    expect(report.needsAffordable).toBe(true);
  });
  it("units, not rows, are counted, and enough affordable units balance the list; no guests never judges", () => {
    expect(balanceOf([{ unitMinor: 10_000, quantity: 10 }], 40).needsAffordable).toBe(false);
    expect(balanceOf([{ unitMinor: 10_000, quantity: 10 }], 40).totalUnits).toBe(10);
    expect(balanceOf([], 0).needsAffordable).toBe(false);
  });
  it("a range filter keeps the ideas whose prices reach it", () => {
    expect(ideaOverlapsBand({ minMinor: 15_000, maxMinor: 90_000 }, "b1")).toBe(true);
    expect(ideaOverlapsBand({ minMinor: 60_000, maxMinor: 90_000 }, "b1")).toBe(false);
    expect(ideaOverlapsBand({ minMinor: 60_000, maxMinor: 90_000 }, "b4")).toBe(false);
  });
  it("the coordinated-gift switch is suggested only above Bs 1 000 for the whole quantity (§11)", () => {
    expect(suggestGroupGift(100_000, 1)).toBe(false);
    expect(suggestGroupGift(100_001, 1)).toBe(true);
    expect(suggestGroupGift(40_000, 3)).toBe(true);
    expect(suggestGroupGift(40_000, 2)).toBe(false);
  });
});

describe("R4 · products and versions", () => {
  const product = { price: { amountMinor: 30_000, currency: "BOB" as const }, variants: [
    { id: "v-out", label: "Rojo", price: { amountMinor: 35_000, currency: "BOB" as const }, stock: "OUT_OF_STOCK" as const },
    { id: "v-ok", label: "Dorado", price: { amountMinor: 40_000, currency: "BOB" as const }, stock: "AVAILABLE" as const }
  ] };
  it("preselects the first version in stock and prices by the chosen version", () => {
    expect(defaultVariant(product)).toBe("v-ok");
    expect(defaultVariant({ variants: [] })).toBeNull();
    expect(unitPriceOf(product, "v-ok")).toBe(40_000);
    expect(unitPriceOf(product, null)).toBe(30_000);
  });
  it("a batch entry carries the idea, the version, the quantity and the switch", () => {
    expect(toBatchEntry({ ideaCode: "CAKE", listingId: L, variantId: "v-ok", quantity: 2, groupGift: true })).toEqual({ productListingId: L, giftIdeaCode: "CAKE", variantCode: "v-ok", quantity: 2, groupGiftEnabled: true });
    expect(toBatchEntry({ ideaCode: "CAKE", listingId: L, variantId: null, quantity: 1, groupGift: false })).toEqual(entry);
  });
});

describe("R4 · the recommendation URL has no parameter outside the closed list", () => {
  it("eventType, city and locale only; an unknown app language reads es-BO", () => {
    expect(recommendationPath({ eventType: "WEDDING", city: "santa-cruz", locale: "en-US" })).toBe("/providers/gift-ideas/recommendations?eventType=WEDDING&city=santa-cruz&locale=en-US");
    expect(recommendationPath({ locale: "pt-BR" })).toBe("/providers/gift-ideas/recommendations?locale=es-BO");
  });
});

describe("R4 · 422 of the batch: itemIndex and failures", () => {
  const error = (problem: Record<string, unknown>) => new ApiError(422, "c", { title: "x", status: 422, ...problem });
  it("the first failing entry and the catalog failures merge by index, ordered", () => {
    const failures = batchFailures(error({ code: "CATALOG_PRODUCT_UNAVAILABLE", itemIndex: 2, productListingId: L, failures: [{ itemIndex: 0, code: "GIFT_LISTING_NOT_ELIGIBLE", productListingId: "p0" }, { itemIndex: 2, code: "CATALOG_PRODUCT_UNAVAILABLE", productListingId: L }] }));
    expect(failures).toEqual([{ itemIndex: 0, code: "GIFT_LISTING_NOT_ELIGIBLE", productListingId: "p0" }, { itemIndex: 2, code: "CATALOG_PRODUCT_UNAVAILABLE", productListingId: L }]);
  });
  it("a 422 about the request itself, or another status, has no entry to point at", () => {
    expect(batchFailures(error({ code: "INVALID_DELIVERY_NOTES" }))).toEqual([]);
    expect(batchFailures(new ApiError(409, "c", { title: "x", status: 409, code: "X", itemIndex: 1 }))).toEqual([]);
    expect(batchFailures(new Error("boom"))).toEqual([]);
  });
});

describe("R4 · delivery notes, the same checks as the backend", () => {
  it("counts code points of the trimmed, NFC text and refuses control characters but not tab or line breaks", () => {
    expect(notesLength("  😀😀  ")).toBe(2);
    expect(notesLength("e\u0301")).toBe(1);
    expect(deliveryNotesProblem("😀".repeat(200))).toBeNull();
    expect(deliveryNotesProblem("😀".repeat(201))).toBe("tooLong");
    expect(deliveryNotesProblem("a\u0000b")).toBe("control");
    expect(deliveryNotesProblem("a\u007fb")).toBe("control");
    expect(deliveryNotesProblem("uno\ndos\r\n\ttres")).toBeNull();
  });
});

describe("R4 · Idempotency-Key", () => {
  it("the same selection keeps its key and another selection gets a new one", () => {
    let n = 0;
    const keyFor = createBatchKeys(() => `k${++n}`);
    expect(keyFor({ items: [entry] })).toBe("k1");
    expect(keyFor({ items: [entry] })).toBe("k1");
    expect(keyFor({ items: [{ ...entry, quantity: 2 }] })).toBe("k2");
    expect(keyFor({ items: [entry], deliveryNotes: "Portón verde" })).toBe("k3");
  });
  it("`reset` forgets the key: an identical body after a success is a new request", () => {
    let n = 0;
    const keyFor = createBatchKeys(() => `k${++n}`);
    expect(keyFor({ items: [entry] })).toBe("k1");
    keyFor.reset();
    expect(keyFor({ items: [entry] })).toBe("k2");
    expect(keyFor({ items: [entry] })).toBe("k2");
  });
  it("only a missing answer or a 5xx may have been applied; a 4xx wrote nothing", () => {
    const failure = (status: number) => new ApiError(status, "test", { title: "x", status });
    expect([new TypeError("fetch failed"), failure(500), failure(503), failure(504)].map(mayHaveBeenApplied)).toEqual([true, true, true, true]);
    expect([failure(401), failure(403), failure(404), failure(409), failure(422), failure(428), failure(429)].map(mayHaveBeenApplied)).toEqual([false, false, false, false, false, false, false]);
  });
  it("addBatch sends it as a header and one POST on the normal path", async () => {
    const { client, calls } = harness({ status: 201, body: { items: [], deliveryNotes: null } });
    await assistantApi(client).addBatch("c-1", { items: [entry] }, "key-1");
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(["POST /gifts/celebrations/c-1/items/batch"]);
    expect(calls[0]?.headers.get("idempotency-key")).toBe("key-1");
    expect(calls[0]?.body).toEqual({ items: [entry] });
  });
  it("without a list it creates it and sends the SAME request with the SAME key; a concurrent creation is fine", async () => {
    for (const creation of [201, 409]) {
      const { client, calls } = harness((call, n) => n === 1 ? { status: 404, body: { title: "x", status: 404, code: "GIFT_LIST_NOT_FOUND" } } : call.path.endsWith("/gift-list") ? { status: creation, body: { title: "x", status: creation, code: "GIFT_LIST_EXISTS" } } : { status: 201, body: { items: [], deliveryNotes: null } });
      await assistantApi(client).addBatch("c-1", { items: [entry] }, "key-2");
      const posts = calls.filter((call) => call.path.endsWith("/items/batch"));
      expect(posts).toHaveLength(2);
      expect(posts.map((call) => call.headers.get("idempotency-key"))).toEqual(["key-2", "key-2"]);
      expect(calls.map((call) => call.path.split("/").pop())).toEqual(["batch", "gift-list", "batch"]);
    }
  });
  it("a 422 is final: no list creation, no second POST", async () => {
    const { client, calls } = harness({ status: 422, body: { title: "x", status: 422, code: "INVALID_QUANTITY", itemIndex: 0 } });
    await expect(assistantApi(client).addBatch("c-1", { items: [entry] }, "k")).rejects.toMatchObject({ status: 422 });
    expect(calls).toHaveLength(1);
  });
  it("updateItem and putDeliveryNotes use the contract routes", async () => {
    const { client, calls } = harness({ status: 200, body: {} });
    await assistantApi(client).updateItem("c-1", "g-1", { version: 3, quantity: 2 });
    await assistantApi(client).putDeliveryNotes("c-1", null);
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(["PATCH /gifts/celebrations/c-1/items/g-1", "PUT /gifts/celebrations/c-1/gift-list/delivery-notes"]);
    expect(calls[0]?.body).toEqual({ version: 3, quantity: 2 });
    expect(calls[1]?.body).toEqual({ deliveryNotes: null });
  });
});
