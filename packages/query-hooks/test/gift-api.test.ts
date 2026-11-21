import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { activeReservationsByItem, giftService } from "../src/index.js";

interface Call { readonly method: string; readonly path: string; readonly headers: Headers }

function harness(answer: (url: URL, init?: RequestInit) => unknown) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, headers: new Headers(init?.headers) });
    return new Response(JSON.stringify(answer(url, init)), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  const tokens = { getAccessToken: async () => "host-access", getRefreshToken: async () => "refresh", setTokens: async () => undefined, clear: async () => undefined };
  return { client: createApiClient({ baseUrl: "http://gateway.test", tokenStore: tokens, refreshSession: { refresh: vi.fn() }, fetchFn }), calls };
}
const item = (id: string) => ({ id, listId: "l", celebrationId: "c-1", title: id, price: { amountMinor: 1, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z" });

describe("L4 · gift lists follow nextCursor and read the whole list in pages of 200", () => {
  it("items: three pages become one list, each request carries limit and the previous cursor", async () => {
    const pages: Record<string, unknown> = {
      "": { items: [item("a"), item("b")], partnerPriorityEnabled: true, nextCursor: "p2" },
      p2: { items: [item("c")], partnerPriorityEnabled: true, nextCursor: "p3" },
      p3: { items: [item("d")], partnerPriorityEnabled: true, nextCursor: null }
    };
    const { client, calls } = harness((url) => pages[url.searchParams.get("cursor") ?? ""]);
    const list = await giftService(client).list("c-1", "guest-credential");
    expect(list.items.map((entry) => entry.id)).toEqual(["a", "b", "c", "d"]);
    expect(list.partnerPriorityEnabled).toBe(true);
    expect(calls.map((call) => call.path)).toEqual(["/gifts/celebrations/c-1/items?limit=200", "/gifts/celebrations/c-1/items?limit=200&cursor=p2", "/gifts/celebrations/c-1/items?limit=200&cursor=p3"]);
    expect(calls.every((call) => call.headers.get("authorization") === "Bearer guest-credential")).toBe(true);
  });
  it("a server before 1.12.0 (no nextCursor) is read in one call; the status filter survives paging", async () => {
    const { client, calls } = harness(() => ({ items: [{ id: "r1", itemId: "a", celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z" }] }));
    const page = await giftService(client).reservations("c-1", "COMMITTED");
    expect(page.items).toHaveLength(1);
    expect(calls.map((call) => call.path)).toEqual(["/gifts/celebrations/c-1/reservations?status=COMMITTED&limit=200"]);
  });
  it("a cursor that never ends fails loudly instead of looping or cutting the list short", async () => {
    const { client } = harness(() => ({ items: [item("x")], partnerPriorityEnabled: false, nextCursor: "again" }));
    await expect(giftService(client).list("c-1")).rejects.toThrow("pagination did not end");
  });
});

describe("D-3 · cancellation calls", () => {
  it("the guest cancels with their credential and an Idempotency-Key; the host with the session", async () => {
    const { client, calls } = harness(() => ({ id: "r1", status: "CANCELLED" }));
    await giftService(client).cancel("c-1", "r1", "guest-credential", "key-1");
    await giftService(client).cancel("c-1", "r1", undefined, "key-2");
    expect(calls.map((call) => [call.method, call.path, call.headers.get("authorization"), call.headers.get("idempotency-key")])).toEqual([
      ["POST", "/gifts/celebrations/c-1/reservations/r1/cancel", "Bearer guest-credential", "key-1"],
      ["POST", "/gifts/celebrations/c-1/reservations/r1/cancel", "Bearer host-access", "key-2"]
    ]);
  });
  it("activeReservationsByItem keeps only pending or committed reservations, by gift", () => {
    const at = "2026-11-01T00:00:00Z";
    const map = activeReservationsByItem([
      { id: "1", itemId: "a", celebrationId: "c", status: "CANCELLED", requestedAt: at },
      { id: "2", itemId: "a", celebrationId: "c", status: "COMMITTED", requestedAt: at },
      { id: "3", itemId: "b", celebrationId: "c", status: "PENDING_REVIEW", requestedAt: at },
      { id: "4", itemId: "c", celebrationId: "c", status: "REJECTED", requestedAt: at }
    ]);
    expect([...map.entries()].map(([key, value]) => [key, value.id])).toEqual([["a", "2"], ["b", "3"]]);
  });
});
