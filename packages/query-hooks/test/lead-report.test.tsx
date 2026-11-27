import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import * as hooks from "../src/index.js";

/** R6b · lead report, CSV and ctx hooks through the real fetch client: method, path, query, headers and body. */
interface Seen { readonly method: string; readonly path: string; readonly body: unknown; readonly headers: Headers }
const PID = "11111111-1111-4111-8111-111111111111";
const LID = "22222222-2222-4222-8222-222222222222";
const EMPTY_REASONS = { dup: 0, bot: 0, PREVIEW: 0, NOT_ELIGIBLE: 0, PROVIDER_SELF: 0, HOST_OR_PLANNER: 0, OTHER: 0 };

function harness(respond: (seen: Seen) => Response) {
  const calls: Seen[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const raw = init?.body;
    const seen: Seen = { method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, body: typeof raw === "string" ? JSON.parse(raw) : raw, headers: new Headers(init?.headers) };
    calls.push(seen);
    return respond(seen);
  }) as unknown as typeof fetch;
  const client = createApiClient({ baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } }, tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined } });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper, queryClient };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });

describe("lead report hooks", () => {
  it("GET /providers/{id}/leads/report sends month, listingId and destination, and leaves empty filters out", async () => {
    const h = harness(() => json({ month: "2026-11", providers: [], rows: [] }));
    const full = renderHook(() => hooks.useProviderLeadReport(h.client, PID, { month: "2026-11", listingId: LID, destination: "WHATSAPP" }), { wrapper: h.wrapper });
    await waitFor(() => expect(full.result.current.isSuccess).toBe(true));
    const bare = renderHook(() => hooks.useProviderLeadReport(h.client, PID, { month: "2026-10", listingId: "", destination: "" }), { wrapper: h.wrapper });
    await waitFor(() => expect(bare.result.current.isSuccess).toBe(true));
    expect(h.calls.map((call) => `${call.method} ${call.path}`)).toEqual([`GET /providers/${PID}/leads/report?month=2026-11&listingId=${LID}&destination=WHATSAPP`, `GET /providers/${PID}/leads/report?month=2026-10`]);
    expect(h.calls[0]?.headers.get("authorization")).toBe("Bearer session");
  });
  it("does not call the report for a malformed month or without a provider", async () => {
    const h = harness(() => json({}));
    renderHook(() => hooks.useProviderLeadReport(h.client, PID, { month: "2026-13" }), { wrapper: h.wrapper });
    renderHook(() => hooks.useProviderLeadReport(h.client, undefined, { month: "2026-11" }), { wrapper: h.wrapper });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(h.calls).toEqual([]);
  });
  it("surfaces the contract's 422 INVALID_MONTH as an error", async () => {
    const h = harness(() => json({ title: "Invalid month", status: 422, code: "INVALID_MONTH" }, 422));
    const view = renderHook(() => hooks.useProviderLeadReport(h.client, PID, { month: "2026-11" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    expect(view.result.current.error).toMatchObject({ status: 422 });
  });
  it("GET /providers/admin/leads/report takes month and the optional providerId", async () => {
    const h = harness(() => json({ providerId: null, month: "2026-11", providers: [], rows: [] }));
    const view = renderHook(() => hooks.useAdminLeadReport(h.client, "2026-11", PID), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]?.path).toBe(`/providers/admin/leads/report?month=2026-11&providerId=${PID}`);
  });
  it("the CSV is read as text with Accept text/csv and keeps its CRLF lines", async () => {
    const csv = "proveedor,producto\r\nDulce Sol,Torta\r\n";
    const h = harness(() => new Response(csv, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } }));
    const view = renderHook(() => hooks.useDownloadLeadReportCsv(h.client), { wrapper: h.wrapper });
    let text = "";
    await act(async () => { text = await view.result.current.mutateAsync({ month: "2026-11" }); });
    expect(text).toBe(csv);
    expect(h.calls[0]?.path).toBe("/providers/admin/leads/report.csv?month=2026-11");
    expect(h.calls[0]?.headers.get("accept")).toContain("text/csv");
  });
  it("drops a leading byte order mark from the text the client hands over (the file saver adds its own)", async () => {
    const withBom = { request: vi.fn(async () => "\uFEFFproveedor,producto\r\n") } as never;
    await expect(hooks.leadReportApi(withBom).adminCsv("2026-11")).resolves.toBe("proveedor,producto\r\n");
    expect(withBom.request).toHaveBeenCalledWith("/providers/admin/leads/report.csv?month=2026-11", { responseType: "text" });
    const without = { request: vi.fn(async () => "a\r\n") } as never;
    await expect(hooks.leadReportApi(without).adminCsv("2026-11", PID)).resolves.toBe("a\r\n");
  });
  it("a 403 on the CSV is an error and no text is returned", async () => {
    const h = harness(() => json({ title: "Forbidden", status: 403 }, 403));
    const view = renderHook(() => hooks.useDownloadLeadReportCsv(h.client), { wrapper: h.wrapper });
    await act(async () => { await expect(view.result.current.mutateAsync({ month: "2026-11" })).rejects.toMatchObject({ status: 403 }); });
  });
});

describe("useLeadContext (M-1, M-2)", () => {
  it("POST /providers/{id}/lead-context asks PROVIDER_OWNER without a listing and returns the ctx", async () => {
    const h = harness(() => json({ ctx: "opaque-token", relation: "PROVIDER_OWNER", expiresAt: "2026-11-27T12:15:00Z" }));
    const view = renderHook(() => hooks.useLeadContext(h.client, PID, { relation: "PROVIDER_OWNER" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.data?.ctx).toBe("opaque-token"));
    expect(h.calls[0]).toMatchObject({ method: "POST", path: `/providers/${PID}/lead-context`, body: { relation: "PROVIDER_OWNER" } });
  });
  it("PREVIEW is not asked until a listing is chosen, and then carries it", async () => {
    const h = harness(() => json({ ctx: "preview-token", relation: "PREVIEW", expiresAt: "2026-11-27T12:15:00Z" }));
    const none = renderHook(() => hooks.useLeadContext(h.client, PID, { relation: "PREVIEW" }), { wrapper: h.wrapper });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(h.calls).toEqual([]);
    expect(none.result.current.data).toBeUndefined();
    const chosen = renderHook(() => hooks.useLeadContext(h.client, PID, { relation: "PREVIEW", listingId: LID }), { wrapper: h.wrapper });
    await waitFor(() => expect(chosen.result.current.data?.ctx).toBe("preview-token"));
    expect(h.calls[0]?.body).toEqual({ relation: "PREVIEW", listingId: LID });
  });
  it("the ctx is renewed every 10 minutes (it lives 15), also in the background and on focus", async () => {
    const h = harness(() => json({ ctx: "t", relation: "PROVIDER_OWNER", expiresAt: "2026-11-27T12:15:00Z" }));
    const view = renderHook(() => hooks.useLeadContext(h.client, PID, { relation: "PROVIDER_OWNER" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    const options = h.queryClient.getQueryCache().findAll()[0]?.options;
    expect(hooks.PORTAL_LEAD_CONTEXT_REFRESH_MS).toBeLessThan(15 * 60_000);
    expect(options?.refetchInterval).toBe(hooks.PORTAL_LEAD_CONTEXT_REFRESH_MS);
    expect(options?.refetchIntervalInBackground).toBe(true);
    expect(options?.refetchOnWindowFocus).toBe(true);
    expect(options?.staleTime).toBe(hooks.PORTAL_LEAD_CONTEXT_REFRESH_MS);
  });
  it("a 503 LEAD_CONTEXT_UNAVAILABLE leaves no ctx and is not retried", async () => {
    const h = harness(() => json({ title: "Unavailable", status: 503, code: "LEAD_CONTEXT_UNAVAILABLE" }, 503));
    const view = renderHook(() => hooks.useLeadContext(h.client, PID, { relation: "PROVIDER_OWNER" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    expect(view.result.current.data).toBeUndefined();
    expect(h.calls).toHaveLength(1);
  });
});

describe("useInfiniteLeads filters", () => {
  it("adds month, listingId and destination to GET /leads and keeps the page size", async () => {
    const h = harness(() => json({ items: [], total: 0 }));
    const view = renderHook(() => hooks.useInfiniteLeads(h.client, PID, { month: "2026-11", listingId: LID, destination: "PHONE" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]?.path).toBe(`/providers/${PID}/leads?limit=50&offset=0&month=2026-11&listingId=${LID}&destination=PHONE`);
  });
  it("EMPTY_REASONS covers every reason of the report", () => {
    expect(Object.keys(EMPTY_REASONS).sort()).toEqual([...hooks.INVALID_REASONS].sort());
  });
});
