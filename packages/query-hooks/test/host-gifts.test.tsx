import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApiClient, toApiError } from "@rsvp/api-client";
import { http, HttpResponse, setupServer } from "@rsvp/testing";
import { useHostGiftCatalog, useHostGiftVisibility } from "../src/host-gifts/index";

const BASE = "http://host-gifts.test";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());
function setup() {
  const client = createApiClient({ baseUrl: BASE,
    fetchFn: (input, init) => { const options = { ...init }; delete options.signal; return fetch(input, options); },
    tokenStore: { getAccessToken: async () => "host", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined },
    refreshSession: { refresh: async () => { throw toApiError(401, "f23-refresh", { status: 401, title: "Expired" }); } }
  });
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  return { client, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={queries}>{children}</QueryClientProvider> };
}

describe("F23 catalog and verified visibility", () => {
  it("sends the bounded query with locale, and changing language does not reuse translated results", async () => {
    const locales: (string | null)[] = [];
    server.use(http.get(`${BASE}/listings`, ({ request }) => { const url = new URL(request.url); locales.push(url.searchParams.get("locale")); expect(url.searchParams.get("limit")).toBe("50"); expect(url.searchParams.get("q")).toBe("vajilla"); expect(url.searchParams.get("type")).toBe("PRODUCT"); return HttpResponse.json({ items: [{ title: url.searchParams.get("locale") }] }); }));
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook(({ locale }) => useHostGiftCatalog(client, "vajilla", locale), { wrapper, initialProps: { locale: "en-US" } });
    await waitFor(() => expect(result.current.data?.items[0]?.title).toBe("en-US"));
    rerender({ locale: "es-BO" });
    await waitFor(() => expect(result.current.data?.items[0]?.title).toBe("es-BO"));
    expect(locales).toEqual(["en-US", "es-BO"]);
  });

  it("confirms a preference by reading it back instead of trusting only PUT success", async () => {
    let current = { showRequesterToHost: true, showRequesterToGuests: false, version: 0 };
    const calls: string[] = [];
    server.use(http.put(`${BASE}/gifts/celebrations/c/gift-settings`, async ({ request }) => { calls.push("PUT"); current = { ...current, ...await request.json() as object, version: 1 }; return HttpResponse.json(current); }), http.get(`${BASE}/gifts/celebrations/c/gift-settings`, () => { calls.push("GET"); return HttpResponse.json(current); }));
    const { client, wrapper } = setup(); const { result } = renderHook(() => useHostGiftVisibility(client, "c"), { wrapper });
    await act(async () => { await result.current.mutateAsync({ showRequesterToHost: false, showRequesterToGuests: false }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(current.showRequesterToHost).toBe(false); expect(result.current.data?.showRequesterToHost).toBe(false); expect(calls).toEqual(["PUT", "GET"]);
  });

  it.each(["flags", "version"])("rejects a successful write when the next read has stale %s", async (condition) => {
    server.use(http.put(`${BASE}/gifts/celebrations/c/gift-settings`, () => HttpResponse.json({ showRequesterToHost: false, showRequesterToGuests: false, version: 2 })), http.get(`${BASE}/gifts/celebrations/c/gift-settings`, () => HttpResponse.json({ showRequesterToHost: condition === "flags", showRequesterToGuests: false, version: condition === "version" ? 1 : 2 })));
    const { client, wrapper } = setup(); const { result } = renderHook(() => useHostGiftVisibility(client, "c"), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ showRequesterToHost: false, showRequesterToGuests: false })).rejects.toThrow("GIFT_VISIBILITY_NOT_APPLIED"); });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it.each([401, 403, 409, 422, 503])("does not retry a preference write after HTTP %s", async (status) => {
    let writes = 0;
    server.use(http.put(`${BASE}/gifts/celebrations/c/gift-settings`, () => { writes++; return HttpResponse.json({ status, title: "Failure" }, { status }); }));
    const { client, wrapper } = setup(); const { result } = renderHook(() => useHostGiftVisibility(client, "c"), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ showRequesterToHost: false, showRequesterToGuests: false })).rejects.toMatchObject({ status }); });
    expect(writes).toBe(1);
  });
});
