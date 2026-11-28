import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "@rsvp/api-client";
import { giftListClosurePath, useGiftListClosure } from "../src/index.js";

/** Gift List 1.13.0 putGiftListClosure: PUT with the wanted state, answers 200/401/403/404/422/503, and the list is read again either way. */
function harness(respond: (call: { path: string; method: string; body: unknown }) => { status?: number; body?: unknown } | "network") {
  const calls: { path: string; method: string; body: unknown; headers: Headers }[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call = { path: url.pathname, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: new Headers(init?.headers) };
    calls.push(call);
    const answer = respond(call);
    if (answer === "network") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status ?? 200, headers: { "content-type": (answer.status ?? 200) >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper, invalidate };
}

describe("useGiftListClosure", () => {
  it("PUTs the wanted state with the host session at the contract's path, and reads the list again", async () => {
    const h = harness(() => ({ body: { closed: true, closedAt: "2026-11-28T12:00:00Z" } }));
    const view = renderHook(() => useGiftListClosure(h.client, "c-1"), { wrapper: h.wrapper });
    const answer = await act(async () => view.result.current.mutateAsync(true));
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]).toMatchObject({ method: "PUT", path: "/gifts/celebrations/c-1/gift-list/closure", body: { closed: true } });
    expect(h.calls[0]?.headers.get("authorization")).toBe("Bearer session");
    expect(giftListClosurePath("c-1")).toBe("/gifts/celebrations/c-1/gift-list/closure");
    expect(answer).toEqual({ closed: true, closedAt: "2026-11-28T12:00:00Z" });
    await waitFor(() => expect(h.invalidate).toHaveBeenCalled());
  });

  it("reopening sends closed:false, and a repeated request is the same request (PUT, no Idempotency-Key needed)", async () => {
    const h = harness(() => ({ body: { closed: false, closedAt: null } }));
    const view = renderHook(() => useGiftListClosure(h.client, "c-1"), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync(false); });
    await act(async () => { await view.result.current.mutateAsync(false); });
    expect(h.calls.map((call) => [call.method, call.body])).toEqual([["PUT", { closed: false }], ["PUT", { closed: false }]]);
    expect(h.calls[0]?.headers.get("idempotency-key")).toBeNull();
  });

  it("encodes the celebration id in the path", () => {
    expect(giftListClosurePath("a/b c")).toBe("/gifts/celebrations/a%2Fb%20c/gift-list/closure");
  });

  it("403 HOST_REQUIRED, 404 GIFT_LIST_NOT_FOUND and 503 reach the caller as ApiError with their status and code, and the list is still read again", async () => {
    for (const [status, code] of [[403, "HOST_REQUIRED"], [404, "GIFT_LIST_NOT_FOUND"], [503, "DEPENDENCY_UNAVAILABLE"]] as const) {
      const h = harness(() => ({ status, body: { title: "x", status, code } }));
      const view = renderHook(() => useGiftListClosure(h.client, "c-1"), { wrapper: h.wrapper });
      const failure = await act(async () => view.result.current.mutateAsync(true).catch((error: unknown) => error));
      expect(failure).toBeInstanceOf(ApiError);
      expect((failure as ApiError).status).toBe(status);
      expect((failure as ApiError).problem?.code).toBe(code);
      await waitFor(() => expect(h.invalidate).toHaveBeenCalled());
    }
  });

  it("a lost connection is a TypeError, never a success", async () => {
    const h = harness(() => "network");
    const view = renderHook(() => useGiftListClosure(h.client, "c-1"), { wrapper: h.wrapper });
    const failure = await act(async () => view.result.current.mutateAsync(true).catch((error: unknown) => error));
    expect(failure).toBeInstanceOf(TypeError);
    await waitFor(() => expect(view.result.current.isError).toBe(true));
  });
});
