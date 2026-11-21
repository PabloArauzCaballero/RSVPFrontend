import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import * as admin from "../src/admin/index.js";

/** A24 partner admin hooks through the real fetch client: method, path, query, headers and cache invalidation. */
interface Seen { readonly method: string; readonly path: string; readonly body: unknown; readonly headers: Headers }

function harness(respond: (seen: Seen) => { status?: number; body?: unknown } = () => ({ body: {} })) {
  const calls: Seen[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const seen: Seen = { method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: new Headers(init?.headers) };
    calls.push(seen);
    const { status = 200, body = {} } = respond(seen);
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper, queryClient };
}

describe("partner list query", () => {
  it("sends only the filters that are set, the sort, the zero-based page and 25 per page", () => {
    expect(admin.adminPartnersPath({})).toBe("/providers/admin/partners?sort=-createdAt&page=0&pageSize=25");
    expect(admin.adminPartnersPath({ q: "  sol ", status: "SUSPENDED", kypStatus: "EXPIRED", categoryCode: "FLORES", cityCode: "la-paz", personType: "JURIDICA", origin: "ADMIN", plan: "FREE", kypExpiringWithinDays: 30, createdFrom: "2026-01-01", createdTo: "2026-02-01", hasPublishedListings: false, sort: "name", page: 2 }))
      .toBe("/providers/admin/partners?q=sol&status=SUSPENDED&kypStatus=EXPIRED&categoryCode=FLORES&cityCode=la-paz&personType=JURIDICA&origin=ADMIN&plan=FREE&kypExpiringWithinDays=30&createdFrom=2026-01-01&createdTo=2026-02-01&hasPublishedListings=false&sort=name&page=2&pageSize=25");
  });

  it("useAdminPartners reads that path", async () => {
    const h = harness(() => ({ body: { items: [], page: 0, pageSize: 25, total: 0 } }));
    const view = renderHook(() => admin.useAdminPartners(h.client, { status: "VERIFIED" }), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]?.path).toBe("/providers/admin/partners?status=VERIFIED&sort=-createdAt&page=0&pageSize=25");
  });
});

describe("identity lookups (one filter per call)", () => {
  it("exact e-mail: lower-cased, alone in the query; null when nobody has it", async () => {
    const h = harness(() => ({ body: { items: [] } }));
    const view = renderHook(() => admin.useAdminUserByEmail(h.client, " Ana@Sol.BO "), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(view.result.current.data).toBeNull();
    expect(h.calls[0]?.path).toBe("/identity/admin/users?email=ana%40sol.bo&page=0&size=1");
  });

  it("ids: deduplicated, sorted, comma-joined, and mapped by id; nothing is sent without ids", async () => {
    const h = harness(() => ({ body: { items: [{ id: "b", email: "b@x.bo", roles: [], status: "ACTIVE", createdAt: "" }] } }));
    const view = renderHook(() => admin.useAdminUsersByIds(h.client, ["b", "a", "b"]), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]?.path).toBe("/identity/admin/users?ids=a%2Cb&page=0&size=2");
    expect(view.result.current.data?.get("b")?.email).toBe("b@x.bo");
    const idle = harness();
    renderHook(() => admin.useAdminUsersByIds(idle.client, []), { wrapper: idle.wrapper });
    expect(idle.calls).toHaveLength(0);
  });
});

describe("intake", () => {
  it("the commit sends confirmReviewed and reuses ONE Idempotency-Key per intake, even after a failure", async () => {
    let attempt = 0;
    const h = harness((seen) => (seen.path.endsWith("/commit") && attempt++ === 0 ? { status: 503, body: { type: "about:blank", title: "x", status: 503, code: "KYP_ENCRYPTION_NOT_CONFIGURED" } } : { status: 201, body: { id: "p-1" } }));
    const view = renderHook(() => admin.useCommitIntake(h.client, "i-idem"), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync().catch(() => undefined); });
    await act(async () => { await view.result.current.mutateAsync(); });
    const commits = h.calls.filter((call) => call.path === "/providers/admin/intakes/i-idem/commit");
    expect(commits).toHaveLength(2);
    expect(commits[0]?.body).toEqual({ confirmReviewed: true });
    const key = commits[0]?.headers.get("idempotency-key");
    expect(key).toMatch(/^commit:[A-Za-z0-9_.:-]+$/);
    expect(commits[1]?.headers.get("idempotency-key")).toBe(key);
    expect(admin.commitIdempotencyKey("i-idem")).toBe(key);
    expect(admin.commitIdempotencyKey("i-other", () => "fixed")).toBe("commit:fixed");
  });

  it("upload: register, PUT with the method and headers the server returned, then complete; the intake is refreshed", async () => {
    const h = harness((seen) => (seen.path.endsWith("/documents") ? { status: 201, body: { documentId: "d-1", uploadUrl: "https://s3.test/obj?sig=1", method: "PUT", headers: { "content-type": "application/pdf", "x-amz-meta-kind": "TAX_ID" }, expiresAt: "" } } : { body: { id: "d-1" } }));
    const put = vi.fn(async () => undefined);
    const invalidate = vi.spyOn(h.queryClient, "invalidateQueries");
    const view = renderHook(() => admin.useUploadIntakeDocument(h.client, "i-1"), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ input: { kind: "TAX_ID", fileName: "nit.pdf", contentType: "application/pdf", sizeBytes: 10 }, put }); });
    expect(h.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["POST /providers/admin/intakes/i-1/documents", "POST /providers/admin/intakes/i-1/documents/d-1/complete"]);
    expect(put).toHaveBeenCalledWith({ url: "https://s3.test/obj?sig=1", method: "PUT", headers: { "content-type": "application/pdf", "x-amz-meta-kind": "TAX_ID" } });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: admin.partnerKeys.intake("i-1") }));
  });

  it("create, patch, delete document and discard hit their routes", async () => {
    const h = harness((seen) => ({ status: seen.method === "DELETE" ? 204 : 200, body: { id: "i-1", fieldErrors: {} } }));
    const create = renderHook(() => admin.useCreateIntake(h.client), { wrapper: h.wrapper });
    await act(async () => { await create.result.current.mutateAsync("u-1"); });
    const patch = renderHook(() => admin.usePatchIntake(h.client, "i-1"), { wrapper: h.wrapper });
    await act(async () => { await patch.result.current.mutateAsync({ contact: { phone: "70000000" } }); });
    const remove = renderHook(() => admin.useDeleteIntakeDocument(h.client, "i-1"), { wrapper: h.wrapper });
    await act(async () => { await remove.result.current.mutateAsync("d-1"); });
    const discard = renderHook(() => admin.useDiscardIntake(h.client), { wrapper: h.wrapper });
    await act(async () => { await discard.result.current.mutateAsync("i-1"); });
    expect(h.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["POST /providers/admin/intakes", "PATCH /providers/admin/intakes/i-1", "DELETE /providers/admin/intakes/i-1/documents/d-1", "DELETE /providers/admin/intakes/i-1"]);
    expect(h.calls[0]?.body).toEqual({ ownerUserId: "u-1" });
    expect(h.calls[1]?.body).toEqual({ contact: { phone: "70000000" } });
  });
});

describe("partner mutations", () => {
  it("PATCH carries If-Match with the version; actions post their reason; the list and detail are invalidated", async () => {
    const h = harness(() => ({ body: { id: "p-1" } }));
    const invalidate = vi.spyOn(h.queryClient, "invalidateQueries");
    const patch = renderHook(() => admin.usePatchPartner(h.client, "p-1"), { wrapper: h.wrapper });
    await act(async () => { await patch.result.current.mutateAsync({ sections: { identity: { name: "Sol" } }, version: 4 }); });
    expect(h.calls[0]?.headers.get("if-match")).toBe("4");
    const action = renderHook(() => admin.usePartnerAction(h.client), { wrapper: h.wrapper });
    await act(async () => { await action.result.current.mutateAsync({ providerId: "p-1", action: "suspend", reason: "Fraude" }); });
    await act(async () => { await action.result.current.mutateAsync({ providerId: "p-1", action: "kyp-complete" }); });
    expect(h.calls.slice(1).map((call) => [call.path, call.body])).toEqual([["/providers/admin/partners/p-1/suspend", { reason: "Fraude" }], ["/providers/admin/partners/p-1/kyp/complete", undefined]]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: admin.partnerKeys.lists });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: admin.partnerKeys.detail("p-1") });
  });

  it("review, download and the audited CI reveal", async () => {
    const h = harness(() => ({ body: { id: "p-1", url: "https://s3.test/x" } }));
    const review = renderHook(() => admin.useReviewPartnerDocument(h.client, "p-1"), { wrapper: h.wrapper });
    await act(async () => { await review.result.current.mutateAsync({ documentId: "d-1", decision: "REJECTED", reason: "Ilegible" }); });
    const download = renderHook(() => admin.useAdminDocumentDownload(h.client), { wrapper: h.wrapper });
    await act(async () => { await download.result.current.mutateAsync("d-1"); });
    const reveal = renderHook(() => admin.useRevealPartnerCi(h.client, "p-1", true), { wrapper: h.wrapper });
    await waitFor(() => expect(reveal.result.current.isSuccess).toBe(true));
    expect(h.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["POST /providers/admin/partners/p-1/documents/d-1/review", "GET /providers/admin/documents/d-1/download", "GET /providers/admin/partners/p-1?reveal=ci"]);
    expect(h.calls[0]?.body).toEqual({ decision: "REJECTED", reason: "Ilegible" });
  });
});
