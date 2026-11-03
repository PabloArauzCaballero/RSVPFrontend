import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConflictError, createApiClient, ForbiddenError, UnauthorizedError, ValidationError } from "@rsvp/api-client";
import {
  useAddGiftItem, useApproveReservation, useGiftItems, useProviders, useRegisterDeviceToken, useRegisterGuest, useReserveGift, useRespondToRsvp,
  useRequestBooking, useRequestQuote, useRsvp, useUpdateNotificationPreferences, useVerifyProvider, queryKeys
} from "../src/index.js";

function setup(status = 200, body: unknown = { ok: true }) {
  const calls: { method: string; path: string; auth: string | null; body: unknown }[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, auth: new Headers(init?.headers).get("authorization"), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "tok", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, queryClient, wrapper };
}

describe("domain hooks hit the gateway-prefixed contract routes", () => {
  it("guests: public RSVP read has no token; respond invalidates only that token", async () => {
    const { client, calls, wrapper, queryClient } = setup();
    const read = renderHook(() => useRsvp(client, "abc"), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(calls[0]).toMatchObject({ method: "GET", path: "/guests/rsvp/abc", auth: null });
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const respond = renderHook(() => useRespondToRsvp<unknown, { attending: boolean }>(client, "abc"), { wrapper });
    await act(() => respond.result.current.mutateAsync({ attending: true }));
    expect(calls.filter((c) => c.method !== "GET")[0]).toMatchObject({ method: "PATCH", path: "/guests/rsvp/abc", body: { attending: true } });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.guest.rsvp("abc") });
    const register = renderHook(() => useRegisterGuest<unknown, { name: string }>(client, "c-1"), { wrapper });
    await act(() => register.result.current.mutateAsync({ name: "Ana" }));
    expect(calls.filter((c) => c.method !== "GET")[1]).toMatchObject({ method: "POST", path: "/guests/celebrations/c-1/guests", auth: "Bearer tok" });
  });

  it("gifts: list, add, reserve (public) and approve (authenticated)", async () => {
    const { client, calls, wrapper } = setup();
    renderHook(() => useGiftItems(client, "c-1"), { wrapper });
    await waitFor(() => expect(calls).toHaveLength(1));
    const add = renderHook(() => useAddGiftItem<unknown, object>(client, "c-1"), { wrapper });
    const reserve = renderHook(() => useReserveGift<unknown, object>(client, "c-1"), { wrapper });
    const approve = renderHook(() => useApproveReservation<unknown>(client, "c-1"), { wrapper });
    await act(async () => { await add.result.current.mutateAsync({}); await reserve.result.current.mutateAsync({ giftItemId: "g-1", input: {} }); await approve.result.current.mutateAsync("r-1"); });
    expect(calls.filter((c, i) => i === 0 || c.method !== "GET").map((c) => `${c.method} ${c.path} ${c.auth ? "auth" : "public"}`)).toEqual([
      "GET /gifts/celebrations/c-1/items public", "POST /gifts/celebrations/c-1/items auth", "POST /gifts/items/g-1/reservations public", "POST /gifts/reservations/r-1/approve auth"
    ]);
  });

  it("providers and notifications", async () => {
    const { client, calls, wrapper } = setup();
    renderHook(() => useProviders(client, { category: "FOTO", city: undefined }), { wrapper });
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ method: "GET", path: "/providers/?category=FOTO", auth: null });
    const verify = renderHook(() => useVerifyProvider<unknown>(client), { wrapper });
    const quote = renderHook(() => useRequestQuote<unknown, object>(client, "p-1"), { wrapper });
    const booking = renderHook(() => useRequestBooking<unknown, object>(client, "p-1"), { wrapper });
    const device = renderHook(() => useRegisterDeviceToken<unknown, object>(client), { wrapper });
    const prefs = renderHook(() => useUpdateNotificationPreferences<unknown, object>(client), { wrapper });
    await act(async () => { await verify.result.current.mutateAsync("p-1"); await quote.result.current.mutateAsync({}); await booking.result.current.mutateAsync({}); await device.result.current.mutateAsync({}); await prefs.result.current.mutateAsync({}); });
    expect(calls.slice(1).filter((c) => c.method !== "GET" || c.path.startsWith("/providers/?")).map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /providers/p-1/verify", "GET /providers/?category=FOTO", "POST /providers/p-1/quotes", "POST /providers/p-1/bookings", "POST /notifications/devices", "PATCH /notifications/preferences"
    ]);
  });
});

describe.each([
  [401, UnauthorizedError], [403, ForbiddenError], [409, ConflictError], [422, ValidationError]
] as const)("uniform error handling: HTTP %i", (status, ErrorType) => {
  it.each([
    ["guest respond", (client: ReturnType<typeof setup>["client"]) => useRespondToRsvp<unknown, object>(client, "t")],
    ["gift reserve", (client: ReturnType<typeof setup>["client"]) => useReserveGift<unknown, object>(client, "c")]
  ])("%s surfaces a typed %i error with the correlation id", async (_name, hook) => {
    const { client, wrapper } = setup(status, { type: "x", title: "boom", status });
    const view = renderHook(() => hook(client), { wrapper });
    const input = _name === "gift reserve" ? { giftItemId: "g", input: {} } : {};
    await act(async () => { await expect((view.result.current as unknown as { mutateAsync: (v: unknown) => Promise<unknown> }).mutateAsync(input)).rejects.toBeInstanceOf(ErrorType); });
  });
});
