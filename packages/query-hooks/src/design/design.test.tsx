import { focusManager, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { designApi } from "./api.js";
import { useCelebrationDesign, useCreateDesign } from "./hooks.js";

const record = { id: "d1", kind: "CELEBRATION", celebrationId: "c1", name: "Boda", draftVersion: 2, publishedVersion: null, hasUnpublishedChanges: true, document: {}, createdAt: "", updatedAt: "" };
const wrapper = (client: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const fresh = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("designApi", () => {
  it("sends If-Match with the draft version on every write and the right paths", async () => {
    const request = vi.fn(async () => ({}));
    const api = designApi({ request } as unknown as ApiClient);
    await api.saveDraft("d1", 7, { schemaVersion: 2 } as never);
    await api.publish("d1", 7, "Final");
    await api.restore("d1", 3, 7);
    await api.create({ kind: "CELEBRATION", celebrationId: "c1", name: "Boda", templateId: "t1" });
    await api.get("d1"); await api.forCelebration("c1"); await api.privateTemplates(); await api.versions("d1"); await api.version("d1", 2); await api.remove("d1");
    const calls = request.mock.calls as unknown as [string, { method?: string; headers?: Record<string, string>; body?: unknown }?][];
    expect(calls.map(([path, options]) => `${options?.method ?? "GET"} ${path}`)).toEqual([
      "PUT /media/designs/d1/draft", "POST /media/designs/d1/publish", "POST /media/designs/d1/versions/3/restore", "POST /media/designs",
      "GET /media/designs/d1", "GET /media/celebrations/c1/design", "GET /media/designs?kind=PRIVATE_TEMPLATE", "GET /media/designs/d1/versions", "GET /media/designs/d1/versions/2", "DELETE /media/designs/d1"
    ]);
    expect(calls.slice(0, 3).map(([, options]) => options?.headers)).toEqual([{ "if-match": '"7"' }, { "if-match": '"7"' }, { "if-match": '"7"' }]);
    expect(calls[1]?.[1]?.body).toEqual({ label: "Final" });
  });
});

describe("design hooks", () => {
  it("useCelebrationDesign returns the record, null on 404 and throws on other errors", async () => {
    const ok = { request: vi.fn(async () => record) } as unknown as ApiClient;
    const found = renderHook(() => useCelebrationDesign(ok, "c1"), { wrapper: wrapper(fresh()) });
    await waitFor(() => expect(found.result.current.data).toEqual(record));
    const missing = { request: vi.fn(async () => { throw new ApiError(404, "x"); }) } as unknown as ApiClient;
    const none = renderHook(() => useCelebrationDesign(missing, "c1"), { wrapper: wrapper(fresh()) });
    await waitFor(() => expect(none.result.current.data).toBeNull());
    const broken = { request: vi.fn(async () => { throw new ApiError(500, "x"); }) } as unknown as ApiClient;
    const failed = renderHook(() => useCelebrationDesign(broken, "c1"), { wrapper: wrapper(fresh()) });
    await waitFor(() => expect(failed.result.current.isError).toBe(true));
    const idle = renderHook(() => useCelebrationDesign(ok, undefined), { wrapper: wrapper(fresh()) });
    expect(idle.result.current.fetchStatus).toBe("idle");
  });

  it("does not refetch when the window regains focus or the network returns: the editor holds its own copy (M1)", async () => {
    const request = vi.fn(async () => record);
    const client = { request } as unknown as ApiClient;
    const { result } = renderHook(() => useCelebrationDesign(client, "c1"), { wrapper: wrapper(fresh()) });
    await waitFor(() => expect(result.current.data).toEqual(record));
    await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true); onlineManager.setOnline(false); onlineManager.setOnline(true); });
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.refetch(); });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("useCreateDesign seeds the celebration's query with the new design", async () => {
    const client = fresh();
    const api = { request: vi.fn(async () => record) } as unknown as ApiClient;
    const { result } = renderHook(() => useCreateDesign(api), { wrapper: wrapper(client) });
    await act(async () => { await result.current.mutateAsync({ kind: "CELEBRATION", celebrationId: "c1", name: "Boda", templateId: "t1" }); });
    expect(client.getQueryData(["designs", "celebration", "c1"])).toEqual(record);
    const privateOne = { ...record, celebrationId: null };
    const second = renderHook(() => useCreateDesign({ request: vi.fn(async () => privateOne) } as unknown as ApiClient), { wrapper: wrapper(client) });
    await act(async () => { await second.result.current.mutateAsync({ kind: "PRIVATE_TEMPLATE", name: "Mía", fromDesignId: "d1" }); });
  });
});
