import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { isMediaProcessingStuck, useMediaAssets } from "../src/celebration/index.js";
import { createProcessingAgeTracker, isProcessingStuck } from "../src/celebration/processing-age.js";

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

  it.each([
    ["a healthy upload signed seconds ago", -5_000],
    ["a slow upload signed two hours ago", -120 * MINUTE],
    ["a device clock twenty hours ahead", -20 * 60 * MINUTE]
  ])("the one-day backup does not mark %s", async (_name, offset) => {
    const createdAt = new Date(Date.now() + offset).toISOString();
    const h = server(() => createdAt);
    open(useMediaAssets, h.client, `recent-${offset}`);
    await pass(10);
    expect(isMediaProcessingStuck(`recent-${offset}`, { id: "photo", createdAt })).toBe(false);
    expect(await stillPolling(h.state)).toBe(true);
  });

  it("gives up on a photo signed more than a day ago even if every visit is too short to add up", async () => {
    const createdAt = new Date(Date.now() - 25 * 60 * MINUTE).toISOString();
    const h = server(() => createdAt);
    open(useMediaAssets, h.client, "abandoned");
    await pass(10);
    expect(isMediaProcessingStuck("abandoned", { id: "photo", createdAt })).toBe(true);
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
    expect(isMediaProcessingStuck("offline", { id: "photo" })).toBe(false);
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

  it("keeps the age still until the next server answer", () => {
    let now = 0;
    const storage = memory();
    const tracker = createProcessingAgeTracker(() => now, () => storage);
    tracker.observe("c", ["a"]);
    now = 10_000;
    tracker.observe("c", ["a"]);
    now = 900_000;
    expect(tracker.ageMs("c", "a")).toBe(10_000);
    expect(JSON.parse([...storage.values.values()][0] ?? "{}")).toEqual({ a: 10_000 });
  });

  it("never moves the saved count back when two tabs share storage", () => {
    let now = 0;
    const storage = memory();
    const stored = (): unknown => JSON.parse([...storage.values.values()][0] ?? "{}");
    const first = createProcessingAgeTracker(() => now, () => storage);
    first.observe("c", ["a"]);
    now = 100_000;
    const second = createProcessingAgeTracker(() => now, () => storage);
    second.observe("c", ["a"]);
    now = 150_000;
    first.observe("c", ["a"]);
    expect(stored()).toEqual({ a: 150_000 });
    now = 160_000;
    second.observe("c", ["a"]);
    // The second tab has only watched for 60 s: it takes the longer saved count instead of overwriting it.
    expect(second.ageMs("c", "a")).toBe(150_000);
    expect(stored()).toEqual({ a: 150_000 });
    // From there it keeps adding its own time.
    now = 190_000;
    second.observe("c", ["a"]);
    expect(second.ageMs("c", "a")).toBe(180_000);
    expect(stored()).toEqual({ a: 180_000 });
  });

  it("uses the backup date only from one day on, and never a missing or invalid one", () => {
    const day = 24 * 60 * MINUTE;
    const at = (ms: number): string => new Date(ms).toISOString();
    expect(isProcessingStuck(0, at(0), day - 1)).toBe(false);
    expect(isProcessingStuck(0, at(0), day)).toBe(true);
    expect(isProcessingStuck(0, undefined, day * 10)).toBe(false);
    expect(isProcessingStuck(0, "not a date", day * 10)).toBe(false);
    expect(isProcessingStuck(0, at(day * 2), day)).toBe(false);
    expect(isProcessingStuck(3 * MINUTE, undefined, 0)).toBe(true);
  });

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
