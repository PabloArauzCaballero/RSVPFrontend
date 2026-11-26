import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import * as hooks from "../src/index.js";
import * as admin from "../src/admin/index.js";

/** DPA-10 partner request hooks through the real fetch client: method, path, query, headers, body and cache invalidation. */
interface Seen { readonly method: string; readonly path: string; readonly body: unknown; readonly headers: Headers }

function harness(respond: (seen: Seen) => { status?: number; body?: unknown } = () => ({ body: {} })) {
  const calls: Seen[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const seen: Seen = { method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: new Headers(init?.headers) };
    calls.push(seen);
    const { status = 200, body = {} } = respond(seen);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidated = vi.spyOn(queryClient, "invalidateQueries");
  const keys = (): unknown[] => invalidated.mock.calls.map(([filters]) => filters?.queryKey);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper, queryClient, keys };
}

const REQUEST = {
  id: "r-1", requesterUserId: "u-1", businessName: "Flores Sol", categoryCode: "FLORES", departmentCode: "LP", cityCode: "la-paz", contactPhone: "+59170012345", contactChannel: "WHATSAPP",
  message: null, contactConsent: true, status: "OPEN", statusReason: null, reviewedBy: null, convertedIntakeId: null, createdAt: "2026-11-22T12:00:00Z", updatedAt: "2026-11-22T12:00:00Z", version: 1
};

describe("requester hooks", () => {
  it("useMyPartnerRequests reads /providers/partner-requests/mine with the session", async () => {
    const h = harness(() => ({ body: { items: [REQUEST] } }));
    const view = renderHook(() => hooks.useMyPartnerRequests(h.client), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]).toMatchObject({ method: "GET", path: "/providers/partner-requests/mine" });
    expect(h.calls[0]?.headers.get("authorization")).toBe("Bearer session");
    expect(view.result.current.data?.items[0]?.id).toBe("r-1");
  });

  it("submit POSTs the body as given and refreshes /mine", async () => {
    const h = harness(() => ({ status: 201, body: REQUEST }));
    const view = renderHook(() => hooks.useSubmitPartnerRequest(h.client), { wrapper: h.wrapper });
    const input = { businessName: "Flores Sol", categoryCode: "FLORES", departmentCode: "LP", cityCode: "la-paz", contactPhone: "+59170012345", contactChannel: "WHATSAPP" as const, message: null, contactConsent: true as const };
    await act(async () => { await view.result.current.mutateAsync(input); });
    expect(h.calls[0]).toMatchObject({ method: "POST", path: "/providers/partner-requests", body: input });
    expect(h.keys()).toContainEqual(["partner-requests", "mine"]);
  });

  it("submit surfaces the server's problem code (REQUEST_LIMIT) and does not refresh", async () => {
    const h = harness(() => ({ status: 429, body: { type: "about:blank", title: "Limit", status: 429, code: "REQUEST_LIMIT", details: { limit: 3, windowDays: 30 } } }));
    const view = renderHook(() => hooks.useSubmitPartnerRequest(h.client), { wrapper: h.wrapper });
    const failure = await act(async () => view.result.current.mutateAsync({ businessName: "x", categoryCode: "FLORES", departmentCode: "LP", cityCode: "la-paz", contactPhone: "7001234", contactConsent: true }).catch((error: unknown) => error));
    expect((failure as { problem?: { code?: string } }).problem?.code).toBe("REQUEST_LIMIT");
    expect(h.keys()).not.toContainEqual(["partner-requests", "mine"]);
  });

  it("withdraw DELETEs the request with If-Match when the version is known, and refreshes /mine", async () => {
    const h = harness(() => ({ body: { ...REQUEST, status: "REJECTED", statusReason: "WITHDRAWN_BY_REQUESTER" } }));
    const view = renderHook(() => hooks.useWithdrawPartnerRequest(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ requestId: "r 1", version: 4 }); });
    expect(h.calls[0]).toMatchObject({ method: "DELETE", path: "/providers/partner-requests/r%201" });
    expect(h.calls[0]?.headers.get("if-match")).toBe("4");
    await act(async () => { await view.result.current.mutateAsync({ requestId: "r-1" }); });
    expect(h.calls[1]?.headers.get("if-match")).toBeNull();
    expect(h.keys()).toContainEqual(["partner-requests", "mine"]);
  });
});

describe("admin hooks", () => {
  it("the list path repeats status[], trims q, keeps newest first and pages by 25", () => {
    expect(admin.adminPartnerRequestsPath({})).toBe("/providers/admin/partner-requests?sort=-createdAt&page=0&pageSize=25");
    expect(admin.adminPartnerRequestsPath({ statuses: ["OPEN", "IN_REVIEW"], q: "  sol ", page: 2 }))
      .toBe("/providers/admin/partner-requests?status%5B%5D=OPEN&status%5B%5D=IN_REVIEW&q=sol&sort=-createdAt&page=2&pageSize=25");
    expect(admin.adminPartnerRequestsPath({ q: "   " })).toBe("/providers/admin/partner-requests?sort=-createdAt&page=0&pageSize=25");
  });

  it("useAdminPartnerRequests reads that path and returns the counts", async () => {
    const h = harness(() => ({ body: { items: [REQUEST], page: 0, pageSize: 25, total: 1, counts: { OPEN: 2, IN_REVIEW: 1 } } }));
    const view = renderHook(() => admin.useAdminPartnerRequests(h.client, { statuses: ["REJECTED"] }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]?.path).toBe("/providers/admin/partner-requests?status%5B%5D=REJECTED&sort=-createdAt&page=0&pageSize=25");
    expect(view.result.current.data?.counts).toEqual({ OPEN: 2, IN_REVIEW: 1 });
  });

  it("take POSTs with If-Match and refreshes the queue", async () => {
    const h = harness(() => ({ body: { ...REQUEST, status: "IN_REVIEW" } }));
    const view = renderHook(() => admin.useTakePartnerRequest(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ requestId: "r-1", version: 1 }); });
    expect(h.calls[0]).toMatchObject({ method: "POST", path: "/providers/admin/partner-requests/r-1/take", body: undefined });
    expect(h.calls[0]?.headers.get("if-match")).toBe("1");
    expect(h.keys()).toContainEqual(["admin", "partner-requests"]);
  });

  it("reject sends { reason } and refreshes the queue, also after a version conflict", async () => {
    const h = harness(() => ({ status: 409, body: { type: "about:blank", title: "Conflict", status: 409, code: "PARTNER_REQUEST_VERSION_CONFLICT", details: { currentVersion: 3 } } }));
    const view = renderHook(() => admin.useRejectPartnerRequest(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ requestId: "r-1", version: 2, reason: "No es un negocio de eventos" }).catch(() => undefined); });
    expect(h.calls[0]).toMatchObject({ method: "POST", path: "/providers/admin/partner-requests/r-1/reject", body: { reason: "No es un negocio de eventos" } });
    expect(h.calls[0]?.headers.get("if-match")).toBe("2");
    expect(h.keys()).toContainEqual(["admin", "partner-requests"]);
  });

  it("convert caches the returned intake for the wizard and refreshes the queue, the partners list and the open intakes", async () => {
    const intake = { id: "i-9", status: "OPEN", ownerUserId: "u-1", documents: [], fieldErrors: { identity: {}, contact: {}, coverage: {}, kyp: {} }, identity: { name: "Flores Sol", categoryCodes: ["FLORES"] }, createdBy: "a", createdAt: "", updatedAt: "" };
    const h = harness(() => ({ body: { request: { ...REQUEST, status: "CONVERTED", convertedIntakeId: "i-9" }, intake } }));
    const view = renderHook(() => admin.useConvertPartnerRequest(h.client), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ requestId: "r-1", version: 2 }); });
    expect(h.calls[0]).toMatchObject({ method: "POST", path: "/providers/admin/partner-requests/r-1/convert" });
    expect(h.calls[0]?.headers.get("if-match")).toBe("2");
    expect(h.queryClient.getQueryData(admin.partnerKeys.intake("i-9"))).toEqual(intake);
    expect(h.keys()).toEqual(expect.arrayContaining([["admin", "intakes", "open"], ["admin", "partners", "list"], ["admin", "partner-requests"]]));
  });
});
