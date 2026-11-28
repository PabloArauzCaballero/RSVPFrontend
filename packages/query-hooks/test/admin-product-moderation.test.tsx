import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import * as admin from "../src/admin/index.js";

/** R8b product moderation hooks through the real fetch client: method, path, query, body and cache invalidation. */
interface Seen { readonly method: string; readonly path: string; readonly body: unknown }

function harness(respond: (seen: Seen) => { status?: number; body?: unknown } = () => ({ body: {} })) {
  const calls: Seen[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const seen: Seen = { method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(seen);
    const { status = 200, body = {} } = respond(seen);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper, queryClient };
}

const page = (over: object = {}) => ({ view: "RECENT", days: 7, since: "2026-11-20T00:00:00Z", counts: { recent: 2, hidden: 1 }, nextCursor: null, items: [], ...over });
const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";

describe("product moderation inbox path", () => {
  it("sends only the filters that are set and keeps the default window out of the query", () => {
    expect(admin.productModerationPath({ view: "RECENT" })).toBe("/providers/admin/moderation/listings?view=RECENT&limit=50");
    expect(admin.productModerationPath({ view: "RECENT", days: 7 })).toBe("/providers/admin/moderation/listings?view=RECENT&limit=50");
    expect(admin.productModerationPath({ view: "RECENT", days: 30, providerId: ` ${ID} `, category: "FLORES", featured: false, completeness: "INCOMPLETE", locale: "es-BO" }, "abc=="))
      .toBe(`/providers/admin/moderation/listings?view=RECENT&days=30&providerId=${ID}&category=FLORES&featured=false&completeness=INCOMPLETE&limit=50&locale=es-BO&cursor=abc%3D%3D`);
  });

  it("HIDDEN never sends days", () => {
    expect(admin.productModerationPath({ view: "HIDDEN", days: 30 })).toBe("/providers/admin/moderation/listings?view=HIDDEN&limit=50");
    // B2: the sheet filter exists only in RECENT; in HIDDEN every product is HIDDEN_BY_ADMIN, so a carried-over value would empty the list.
    expect(admin.productModerationPath({ view: "HIDDEN", completeness: "COMPLETE", category: "FLORES" })).toBe("/providers/admin/moderation/listings?view=HIDDEN&category=FLORES&limit=50");
  });

  it("reads the first page, then follows nextCursor and stops at null", async () => {
    const h = harness((seen) => ({ body: seen.path.includes("cursor=c2") ? page({ nextCursor: null, items: [{ listingId: "b" }] }) : page({ nextCursor: "c2", items: [{ listingId: "a" }] }) }));
    const view = renderHook(() => admin.useProductModerationInbox(h.client, { view: "RECENT" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(view.result.current.hasNextPage).toBe(true);
    await act(async () => { await view.result.current.fetchNextPage(); });
    expect(h.calls.map((call) => call.path)).toEqual(["/providers/admin/moderation/listings?view=RECENT&limit=50", "/providers/admin/moderation/listings?view=RECENT&limit=50&cursor=c2"]);
    await waitFor(() => expect(view.result.current.hasNextPage).toBe(false));
    expect(admin.moderationCounts(view.result.current.data?.pages)).toEqual({ recent: 2, hidden: 1 });
  });

  it("does not retry a failure (422 INVALID_CURSOR is read by the screen)", async () => {
    const h = harness(() => ({ status: 422, body: { title: "x", status: 422, code: "INVALID_CURSOR" } }));
    const view = renderHook(() => admin.useProductModerationInbox(h.client, { view: "HIDDEN" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    expect(h.calls).toHaveLength(1);
  });
});

describe("hide, show and featured", () => {
  it("hide: POST with the reason only, then the inbox and the provider reads are invalidated", async () => {
    const h = harness(() => ({ body: { listingId: ID, hidden: true, replayed: false } }));
    const spy = vi.spyOn(h.queryClient, "invalidateQueries");
    const view = renderHook(() => admin.useHideListing(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ listingId: ID, reason: "Foto con teléfono" }); });
    expect(h.calls[0]).toEqual({ method: "POST", path: `/providers/admin/listings/${ID}/hide`, body: { reason: "Foto con teléfono" } });
    expect(spy.mock.calls.map((call) => call[0]?.queryKey)).toEqual([admin.productModerationKeys.all, ["providers"]]);
  });

  it("hide: a refused reason (422) and a different reason while hidden (409) reach the caller and still refresh", async () => {
    const h = harness(() => ({ status: 409, body: { title: "x", status: 409, code: "LISTING_ALREADY_HIDDEN" } }));
    const spy = vi.spyOn(h.queryClient, "invalidateQueries");
    const view = renderHook(() => admin.useHideListing(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ listingId: ID, reason: "Otro motivo" }).catch(() => undefined); });
    await waitFor(() => expect(view.result.current.error).toBeTruthy());
    expect((view.result.current.error as { problem?: { code?: string } }).problem?.code).toBe("LISTING_ALREADY_HIDDEN");
    expect(spy).toHaveBeenCalled();
  });

  it("show: POST without a body", async () => {
    const h = harness(() => ({ body: { listingId: ID, hidden: false, replayed: true } }));
    const view = renderHook(() => admin.useShowListing(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ listingId: ID }); });
    expect(h.calls[0]).toEqual({ method: "POST", path: `/providers/admin/listings/${ID}/show`, body: undefined });
  });

  it("featured: PUT with the flag; 409 LISTING_HIDDEN is surfaced", async () => {
    const h = harness(() => ({ status: 409, body: { title: "x", status: 409, code: "LISTING_HIDDEN" } }));
    const view = renderHook(() => admin.useSetListingFeatured(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ listingId: ID, featured: true }).catch(() => undefined); });
    expect(h.calls[0]).toEqual({ method: "PUT", path: `/providers/admin/listings/${ID}/featured`, body: { featured: true } });
    await waitFor(() => expect((view.result.current.error as { problem?: { code?: string } }).problem?.code).toBe("LISTING_HIDDEN"));
  });
});
