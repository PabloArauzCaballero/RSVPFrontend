import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { useMediaAssets } from "../src/celebration/index.js";
import { createProcessingAgeTracker } from "../src/celebration/processing-age.js";

const MINUTE = 60_000;

function server(createdAt: () => string) {
  const state = { calls: 0, offline: false };
  const client = createApiClient({
    baseUrl: "http://gateway.test",
    tokenStore: { getAccessToken: async () => "host", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined },
    refreshSession: { refresh: async () => { throw new Error("Unexpected refresh"); } },
    fetchFn: async () => {
      state.calls += 1;
      if (state.offline) throw new TypeError("offline");
      return new Response(JSON.stringify({ items: [{ id: "photo", status: "PROCESSING", createdAt: createdAt(), variants: {} }] }), { headers: { "content-type": "application/json" } });
    }
  });
  return { client, state };
}

type UseAssets = typeof useMediaAssets;
function open(hook: UseAssets, client: ReturnType<typeof server>["client"], celebrationId: string) {
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queries}>{children}</QueryClientProvider>;
  return renderHook(() => hook(client, celebrationId), { wrapper });
}
const pass = async (ms: number): Promise<void> => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

/** True when the screen is still asking: the hook stops polling exactly when it holds every processing photo as stuck. */
async function stillPolling(state: { calls: number }): Promise<boolean> {
  const before = state.calls;
  await pass(30_000);
  return state.calls > before;
}

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("age of a photo in PROCESSING", () => {
  it.each([
    ["a client clock ten minutes ahead of the server", -10 * MINUTE],
    ["a healthy upload that took five minutes after the presign", -5 * MINUTE]
  ])("is not stuck on first sight with %s", async (_name, offset) => {
    const createdAt = new Date(Date.now() + offset).toISOString();
    const h = server(() => createdAt);
    open(useMediaAssets, h.client, `skew-${offset}`);
    await pass(10);
    expect(await stillPolling(h.state)).toBe(true);
  });

  it("detects a stuck photo after three minutes with a client clock behind the server", async () => {
    const createdAt = new Date(Date.now() + 60 * MINUTE).toISOString();
    const h = server(() => createdAt);
    open(useMediaAssets, h.client, "behind");
    await pass(10);
    await pass(2.5 * MINUTE);
    expect(await stillPolling(h.state)).toBe(true);
    await pass(MINUTE);
    expect(await stillPolling(h.state)).toBe(false);
  });

  it("ignores the device clock being changed while it watches", async () => {
    const h = server(() => new Date().toISOString());
    open(useMediaAssets, h.client, "clock-change");
    await pass(10);
    vi.setSystemTime(Date.now() + 60 * MINUTE);
    await pass(6_000);
    expect(await stillPolling(h.state)).toBe(true);
  });

  it("does not grow while polls fail", async () => {
    const h = server(() => new Date().toISOString());
    const view = open(useMediaAssets, h.client, "offline");
    await pass(10);
    h.state.offline = true;
    await pass(2_100);
    await pass(10 * MINUTE);
    expect(view.result.current.isError).toBe(true);
    // Ten minutes later the server confirms it is still PROCESSING: only now is it stuck.
    h.state.offline = false;
    await act(async () => { await view.result.current.refetch(); });
    expect(await stillPolling(h.state)).toBe(false);
  });

  it("keeps counting across reloads, so reloading often cannot hide a stuck photo, and closed time does not count", async () => {
    const createdAt = (): string => new Date().toISOString();
    const reload = async (): Promise<UseAssets> => { cleanup(); vi.resetModules(); return (await import("../src/celebration/index.js")).useMediaAssets; };

    const first = server(createdAt);
    open(await reload(), first.client, "reload");
    await pass(2 * MINUTE);
    cleanup();
    await pass(60 * MINUTE);

    const second = server(createdAt);
    open(await reload(), second.client, "reload");
    await pass(10);
    expect(await stillPolling(second.state)).toBe(true);
    await pass(MINUTE);
    expect(await stillPolling(second.state)).toBe(false);
  });
});

describe("processing age tracker", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  };

  it("saves durations only and forgets a photo that left PROCESSING", () => {
    let now = 1_000;
    const storage = memory();
    const tracker = createProcessingAgeTracker(() => now, () => storage);
    tracker.observe("c", ["a", "b"]);
    now += 5_000;
    tracker.observe("c", ["a"]);
    expect(tracker.ageMs("c", "a")).toBe(5_000);
    expect(tracker.ageMs("c", "b")).toBe(0);
    expect(JSON.parse([...storage.values.values()][0] ?? "{}")).toEqual({ a: 5_000 });
    tracker.observe("c", []);
    expect(storage.values.size).toBe(0);
  });

  it.each([["not json{"], ["null"], ['{"a":-5}'], ['{"a":"900000"}']])("starts from zero when the saved value is %s", (raw) => {
    const tracker = createProcessingAgeTracker(() => 50, () => ({ ...memory(), getItem: () => raw }));
    tracker.observe("c", ["a"]);
    expect(tracker.ageMs("c", "a")).toBe(0);
  });

  it("works from memory when storage is missing or throws", () => {
    const blocked = (): never => { throw new Error("SecurityError"); };
    for (const storage of [() => undefined, blocked]) {
      let now = 0;
      const tracker = createProcessingAgeTracker(() => now, storage);
      tracker.observe("c", ["a"]);
      now = 200_000;
      tracker.observe("c", ["a"]);
      expect(tracker.ageMs("c", "a")).toBe(200_000);
    }
  });
});
