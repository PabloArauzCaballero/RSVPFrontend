import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { useMediaAssets, type MediaAsset } from "../src/celebration/index.js";
import { LEAD_CONTEXT_REFRESH_MS, leadContextOf, useAddGift, useGiftList } from "../src/gift/index.js";
import { useChangeGuestGroup, useGuestDetail, useGuestGroups, useGuestList, useRegisterGuest } from "../src/guest/index.js";

function setup(respond: (method: string, path: string) => unknown, queryDefaults: { readonly refetchOnWindowFocus?: boolean } = {}) {
  const calls: string[] = [];
  const client = createApiClient({
    baseUrl: "http://gateway.test",
    tokenStore: { getAccessToken: async () => "host", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined },
    refreshSession: { refresh: async () => { throw new Error("Unexpected refresh"); } },
    fetchFn: async (url, options) => {
      const path = new URL(String(url)).pathname;
      const method = options?.method ?? "GET";
      calls.push(`${method} ${path}`);
      const data = respond(method, path);
      return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    }
  });
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false, ...queryDefaults }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queries}>{children}</QueryClientProvider>;
  return { client, queries, wrapper, calls };
}

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("targeted resource refresh", () => {
  it("refreshes a guest projection while events are pending, then stops when the list catches up", async () => {
    vi.useFakeTimers();
    let pendingEvents = 1;
    const h = setup(() => ({ items: pendingEvents ? [] : [{ guestId: "guest-1", name: "Invitado" }], freshness: { pendingEvents } }));
    const view = renderHook(() => useGuestList(h.client, "c-1"), { wrapper: h.wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(view.result.current.data?.items).toHaveLength(0);
    pendingEvents = 0;
    await act(async () => { await vi.advanceTimersByTimeAsync(2_010); });
    expect(view.result.current.data?.items[0]?.guestId).toBe("guest-1");
    const count = h.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(h.calls).toHaveLength(count);
  });
  it("observes PROCESSING until PROCESSED, then stops without touching another celebration", async () => {
    vi.useFakeTimers();
    let status: MediaAsset["status"] = "PROCESSING";
    const h = setup((_method, path) => ({ items: path.includes("other") ? [] : [{ id: "photo", status }] }));
    const view = renderHook(() => ({ photos: useMediaAssets(h.client, "c-1"), other: useMediaAssets(h.client, "other") }), { wrapper: h.wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(view.result.current.photos.data?.items[0]?.status).toBe("PROCESSING");
    status = "PROCESSED";
    await act(async () => { await vi.advanceTimersByTimeAsync(2_010); });
    expect(view.result.current.photos.data?.items[0]?.status).toBe("PROCESSED");
    const completedCount = h.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(h.calls).toHaveLength(completedCount);
    expect(h.calls.filter((call) => call.includes("other"))).toHaveLength(1);
  });

  it("stops on a rejected image, and after unmount", async () => {
    vi.useFakeTimers();
    let status = "PROCESSING";
    const h = setup(() => ({ items: [{ id: "photo", status }] }));
    const view = renderHook(() => useMediaAssets(h.client, "c-1"), { wrapper: h.wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(view.result.current.data?.items[0]?.status).toBe("PROCESSING");
    status = "REJECTED";
    await act(async () => { await vi.advanceTimersByTimeAsync(2_010); });
    expect(view.result.current.data?.items[0]?.status).toBe("REJECTED");
    const count = h.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(h.calls).toHaveLength(count);
    status = "PROCESSING";
    await act(async () => { await view.result.current.refetch(); });
    view.unmount();
    const unmountedCount = h.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(h.calls).toHaveLength(unmountedCount);
  });

  it("preserves existing photos on a polling error, pauses and recovers on retry", async () => {
    vi.useFakeTimers();
    let fail = false;
    const h = setup(() => { if (fail) throw new TypeError("offline"); return { items: [{ id: "photo", status: "PROCESSING" }] }; });
    const view = renderHook(() => useMediaAssets(h.client, "c-1"), { wrapper: h.wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(view.result.current.data?.items[0]?.status).toBe("PROCESSING");
    expect(view.result.current.isError).toBe(false);
    expect(view.result.current.isSuccess).toBe(true);
    fail = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(2_010); });
    expect(view.result.current.isError).toBe(true);
    expect(view.result.current.data?.items[0]?.id).toBe("photo");
    const count = h.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(h.calls).toHaveLength(count);
    fail = false;
    await act(async () => { await view.result.current.refetch(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(view.result.current.isSuccess).toBe(true);
  });

  it("keeps existing PROCESSED variant URLs stable across polling when MinIO signatures rotate", async () => {
    vi.useFakeTimers();
    let poll = 0;
    const h = setup(() => {
      poll += 1;
      return {
        items: [
          { id: "ready-1", status: "PROCESSED", variants: { thumb: `https://api.test/rsvp-media/uploads/c-1/ready-1/a-thumb.webp?X-Amz-Signature=sig-${poll}` } },
          { id: "pending-1", status: "PROCESSING", variants: {} }
        ]
      };
    });
    const view = renderHook(() => useMediaAssets(h.client, "c-1"), { wrapper: h.wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    const firstUrl = view.result.current.data?.items[0]?.variants.thumb;
    expect(firstUrl).toContain("sig-1");
    await act(async () => { await vi.advanceTimersByTimeAsync(2_010); });
    expect(poll).toBeGreaterThanOrEqual(2);
    expect(view.result.current.data?.items[0]?.variants.thumb).toBe(firstUrl);
  });

  it("stops polling automatically when a PROCESSING asset is stale", async () => {
    vi.useFakeTimers();
    const h = setup(() => ({ items: [{ id: "stuck-1", status: "PROCESSING", variants: {} }] }));
    const view = renderHook(() => useMediaAssets(h.client, "stale-celebration"), { wrapper: h.wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3 * 60_000 + 10_000); });
    expect(view.result.current.data?.items[0]?.status).toBe("PROCESSING");
    const count = h.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(h.calls).toHaveLength(count);
  });

  it("adding a gift updates the active list without refetching another celebration", async () => {
    const items: { id: string; source: string; status: string }[] = [];
    const h = setup((method, path) => {
      if (method === "POST") { const item = { id: "g-1", source: "EXTERNAL", status: "AVAILABLE" }; items.push(item); return item; }
      return { items: path.includes("other") ? [] : items };
    });
    const view = renderHook(() => ({ list: useGiftList(h.client, "c-1"), other: useGiftList(h.client, "other"), add: useAddGift(h.client, "c-1") }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.list.isSuccess && view.result.current.other.isSuccess).toBe(true));
    await act(async () => { await view.result.current.add.mutateAsync({ source: "EXTERNAL", title: "Vajilla", url: "https://shop.example/gift", price: { amountMinor: 5000, currency: "BOB" } }); });
    await waitFor(() => expect(view.result.current.list.data?.items[0]?.id).toBe("g-1"));
    expect(h.calls.filter((call) => call.includes("other"))).toHaveLength(1);
  });

  it("registering a guest refreshes both the list and its group counts; changing group refreshes detail", async () => {
    const guests: { guestId: string; groupId: string | null }[] = [];
    const h = setup((method, path) => {
      if (method === "POST") { guests.push({ guestId: "guest-1", groupId: null }); return guests[0]; }
      if (method === "PATCH") { guests[0] = { guestId: "guest-1", groupId: "group-1" }; return guests[0]; }
      if (path.endsWith("/groups")) return { items: [{ groupId: "group-1", guestCount: guests.length }] };
      if (path.endsWith("/guest-1")) return guests[0] ?? { guestId: "guest-1", groupId: null };
      return { items: guests };
    });
    const view = renderHook(() => ({ list: useGuestList(h.client, "c-1"), groups: useGuestGroups(h.client, "c-1"), detail: useGuestDetail(h.client, "c-1", "guest-1"), add: useRegisterGuest(h.client, "c-1"), move: useChangeGuestGroup(h.client, "c-1") }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.groups.isSuccess && view.result.current.detail.isSuccess).toBe(true));
    await act(async () => { await view.result.current.add.mutateAsync({ name: "Invitado de prueba", allowedCompanions: 0 }); });
    await waitFor(() => expect(view.result.current.list.data?.items).toHaveLength(1));
    expect(h.calls.filter((call) => call === "GET /guests/celebrations/c-1/groups")).toHaveLength(2);
    await act(async () => { await view.result.current.move.mutateAsync({ guestId: "guest-1", groupId: "group-1" }); });
    await waitFor(() => expect(view.result.current.detail.data?.groupId).toBe("group-1"));
  });
});

describe("R6a · lead context of the gift list", () => {
  it("the refresh interval is below the 300 s TTL of the context Gift List signs", () => {
    expect(LEAD_CONTEXT_REFRESH_MS).toBeLessThan(300_000);
  });

  it("leadContextOf: the signed token, or undefined for a guest, a public read or an older server", () => {
    expect(leadContextOf({ leadContext: "tok" })).toBe("tok");
    expect(leadContextOf({ leadContext: null })).toBeUndefined();
    expect(leadContextOf({ leadContext: "" })).toBeUndefined();
    expect(leadContextOf({})).toBeUndefined();
    expect(leadContextOf(undefined)).toBeUndefined();
  });

  it("a member's list is re-read before the context expires and the new context replaces the old one", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let reads = 0;
    const h = setup(() => ({ items: [], partnerPriorityEnabled: true, leadContext: `ctx-${++reads}` }));
    const view = renderHook(() => useGiftList(h.client, "c-1", undefined, undefined, { refreshLeadContext: true }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.data?.leadContext).toBe("ctx-1"));
    await act(async () => { await vi.advanceTimersByTimeAsync(LEAD_CONTEXT_REFRESH_MS + 1_000); });
    await waitFor(() => expect(view.result.current.data?.leadContext).toBe("ctx-2"));
    expect(h.calls.filter((call) => call.startsWith("GET"))).toHaveLength(2);
  });

  it("a member's read without refreshLeadContext (default) never polls", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const h = setup(() => ({ items: [], partnerPriorityEnabled: true, leadContext: "ctx-1" }));
    const view = renderHook(() => useGiftList(h.client, "c-1"), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(LEAD_CONTEXT_REFRESH_MS * 3); });
    expect(h.calls.filter((call) => call.startsWith("GET"))).toHaveLength(1);
  });

  it("a read without context (guest) never polls", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const h = setup(() => ({ items: [], partnerPriorityEnabled: true, leadContext: null }));
    const view = renderHook(() => useGiftList(h.client, "c-1", "guest-credential-0123456789"), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(LEAD_CONTEXT_REFRESH_MS * 3); });
    expect(h.calls.filter((call) => call.startsWith("GET"))).toHaveLength(1);
  });

  const backgroundAndBack = async () => act(async () => { focusManager.setFocused(false); focusManager.setFocused(true); });

  it("coming back to the tab or the app re-reads a member's list even when the app turns focus refetch off (seo-web) and the read is still fresh", async () => {
    let reads = 0;
    const h = setup(() => ({ items: [], partnerPriorityEnabled: true, leadContext: `ctx-${++reads}` }), { refetchOnWindowFocus: false });
    const view = renderHook(() => useGiftList(h.client, "c-1", undefined, undefined, { refreshLeadContext: true }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.data?.leadContext).toBe("ctx-1"));
    await backgroundAndBack();
    await waitFor(() => expect(view.result.current.data?.leadContext).toBe("ctx-2"));
  });

  it("negative: without refreshLeadContext, or for a read with no context (guest), coming back does not refetch when the app has focus refetch off", async () => {
    const member = setup(() => ({ items: [], partnerPriorityEnabled: true, leadContext: "ctx-1" }), { refetchOnWindowFocus: false });
    const a = renderHook(() => useGiftList(member.client, "c-1"), { wrapper: member.wrapper });
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    const guest = setup(() => ({ items: [], partnerPriorityEnabled: true, leadContext: null }), { refetchOnWindowFocus: false });
    const b = renderHook(() => useGiftList(guest.client, "c-1", "guest-credential-0123456789", undefined, { refreshLeadContext: true }), { wrapper: guest.wrapper });
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    await backgroundAndBack();
    expect(member.calls.filter((call) => call.startsWith("GET"))).toHaveLength(1);
    expect(guest.calls.filter((call) => call.startsWith("GET"))).toHaveLength(1);
  });
});
