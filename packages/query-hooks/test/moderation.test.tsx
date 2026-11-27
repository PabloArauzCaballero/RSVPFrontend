import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApiClient, toApiError, type ApiClient } from "@rsvp/api-client";
import { HttpResponse, http, setupServer } from "@rsvp/testing";
import { MUSIC_ELEMENT, REPORT_COMMENT_MAX, previewFailure, reportBody, reportDraftProblem, reportFailure, submitPublicReport, useAdminReports, useHiddenAssetPreview } from "../src/index.js";

// F7 · moderation hooks over MSW (Celebration 1.8.0, Template/Media 1.9.0): the real fetch client, only the network is simulated.
const BASE = "http://gateway.msw";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// The client takes the global fetch when it is made, so it is made after msw patched it (beforeAll).
let client: ApiClient;
beforeAll(() => { client = createApiClient({
  baseUrl: BASE, refreshSession: { refresh: async () => { throw toApiError(401, "refresh", { title: "Invalid refresh token", status: 401 }); } },
  tokenStore: { getAccessToken: async () => "tok", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
}); });
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
afterEach(() => queryClient.clear());
const apiError = (status: number, code?: string, retryAfter?: number) => { const error = toApiError(status, "test", { title: "t", status, ...(code ? { code } : {}) }); if (retryAfter) error.retryAfterSeconds = retryAfter; return error; };
const refuse = (status: number, code: string) => HttpResponse.json({ title: code, status, code }, { status, headers: { "content-type": "application/problem+json" } });

describe("what is sent for a report", () => {
  it("is the reason, the trimmed comment and the element only when there is one", () => {
    expect(reportBody({ reason: "SPAM", comment: "  anuncio  " })).toEqual({ reason: "SPAM", comment: "anuncio" });
    expect(reportBody({ reason: "SPAM", comment: "   " })).toEqual({ reason: "SPAM" });
    expect(reportBody({ reason: "COPYRIGHT", comment: "", element: MUSIC_ELEMENT })).toEqual({ reason: "COPYRIGHT", element: { kind: "SECTION", id: "music" } });
  });

  it("is refused before sending without a reason, or with OTHER and no words, or past the limit", () => {
    expect(reportDraftProblem({ reason: null, comment: "" })).toBe("reasonRequired");
    expect(reportDraftProblem({ reason: "OTHER", comment: "   " })).toBe("commentRequired");
    expect(reportDraftProblem({ reason: "SPAM", comment: "a".repeat(REPORT_COMMENT_MAX + 1) })).toBe("commentTooLong");
    expect(reportDraftProblem({ reason: "SPAM", comment: "a".repeat(REPORT_COMMENT_MAX) })).toBeNull();
    expect(reportDraftProblem({ reason: "OTHER", comment: "algo" })).toBeNull();
  });

  it("posts anonymously to the public route of the slug", async () => {
    let seen: Request | undefined;
    server.use(http.post(`${BASE}/celebrations/public/ana-y/reports`, ({ request }) => { seen = request.clone(); return HttpResponse.json({ id: "r-1", status: "RECEIVED" }, { status: 201 }); }));
    await expect(submitPublicReport(client, "ana-y", { reason: "SPAM", comment: "x", element: MUSIC_ELEMENT })).resolves.toEqual({ id: "r-1", status: "RECEIVED" });
    expect(seen?.headers.get("authorization")).toBeNull();
    expect(await seen?.json()).toEqual({ reason: "SPAM", comment: "x", element: { kind: "SECTION", id: "music" } });
  });
});

describe("why a report or a preview was refused", () => {
  it.each([
    [apiError(404), "notFound"], [apiError(422, "INVALID_TEXT_CHARACTER"), "invalidText"], [apiError(422, "REPORT_COMMENT_REQUIRED"), "commentRequired"], [apiError(422, "REPORT_COMMENT_TOO_LONG"), "commentTooLong"],
    [apiError(422, "ELEMENT_NOT_FOUND"), "elementGone"], [apiError(429), "tooManyLater"], [apiError(500), "generic"], [new TypeError("Failed to fetch"), "offline"]
  ] as const)("report %#", (error, key) => { expect(reportFailure(error).key).toBe(key); });

  it("tells how many whole minutes to wait from Retry-After, at least one", () => {
    expect(reportFailure(apiError(429, undefined, 125))).toEqual({ key: "tooMany", minutes: 3 });
    expect(reportFailure(apiError(429, undefined, 5))).toEqual({ key: "tooMany", minutes: 1 });
  });

  it.each([
    [apiError(409, "ASSET_NOT_QUARANTINED"), "notQuarantined"], [apiError(409, "ASSET_NOT_HIDDEN"), "notHidden"], [apiError(403), "forbidden"], [apiError(401), "forbidden"], [apiError(404), "notFound"], [apiError(500), "generic"], [new TypeError("x"), "generic"]
  ] as const)("preview %#", (error, key) => { expect(previewFailure(error)).toBe(key); });
});

describe("administrator", () => {
  it("lists the reports of one state", async () => {
    let url = "";
    server.use(http.get(`${BASE}/celebrations/admin/reports`, ({ request }) => { url = request.url; return HttpResponse.json({ items: [{ id: "r-1" }] }); }));
    const { result } = renderHook(() => useAdminReports(client, "DISMISSED"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(new URL(url).searchParams.get("status")).toBe("DISMISSED");
  });

  it("asks for a link per request, never reuses one, and keeps nothing in the cache", async () => {
    let issued = 0;
    server.use(http.post(`${BASE}/media/admin/assets/a-1/preview-links`, () => HttpResponse.json({ url: `https://media.test/public/previews/t${++issued}`, expiresAt: "2026-11-27T12:05:00Z", variant: "thumb", singleUse: true }, { status: 201 })));
    const { result } = renderHook(() => useHiddenAssetPreview(client), { wrapper });
    await act(async () => { await result.current.mutateAsync("a-1"); });
    await waitFor(() => expect(result.current.data?.url).toBe("https://media.test/public/previews/t1"));
    await act(async () => { await result.current.mutateAsync("a-1"); });
    await waitFor(() => expect(result.current.data?.url).toBe("https://media.test/public/previews/t2"));
    expect(issued).toBe(2);
  });

  it("surfaces a 409 while the bytes are still moving and a 403 for anyone who is not an administrator", async () => {
    server.use(http.post(`${BASE}/media/admin/assets/a-1/preview-links`, () => refuse(409, "ASSET_NOT_QUARANTINED")), http.post(`${BASE}/media/admin/assets/a-2/preview-links`, () => refuse(403, "FORBIDDEN")));
    const { result } = renderHook(() => useHiddenAssetPreview(client), { wrapper });
    await act(async () => { await result.current.mutateAsync("a-1").catch(() => undefined); });
    await waitFor(() => expect(previewFailure(result.current.error)).toBe("notQuarantined"));
    await act(async () => { await result.current.mutateAsync("a-2").catch(() => undefined); });
    await waitFor(() => expect(previewFailure(result.current.error)).toBe("forbidden"));
  });
});
