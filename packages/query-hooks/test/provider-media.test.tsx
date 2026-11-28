import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import * as hooks from "../src/index.js";

/** Imagenes por archivo · photos of the provider itself (gallery and logo) through the real fetch client: paths, headers, body, polling and cache. */
interface Seen { readonly method: string; readonly path: string; readonly body: unknown; readonly headers: Headers }
type Reply = { status?: number; body?: unknown };
const PID = "11111111-1111-4111-8111-111111111111";
const PHOTO = "33333333-3333-4333-8333-333333333333";

function harness(respond: (seen: Seen) => Reply) {
  const calls: Seen[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const raw = init?.body;
    const seen: Seen = { method: init?.method ?? "GET", path: url.pathname, body: typeof raw === "string" ? JSON.parse(raw) : raw, headers: new Headers(init?.headers) };
    calls.push(seen);
    const { status = 200, body = {} } = respond(seen);
    if (status === 204) return new Response(null, { status });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidated = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper, invalidated };
}
const media = (status: string, purpose = "GALLERY", extra: Record<string, unknown> = {}) => ({ id: PHOTO, purpose, status, rejectReason: null, contentType: "image/png", altText: null, position: 0, renditions: null, createdAt: "2026-11-28T10:00:00Z", updatedAt: "2026-11-28T10:00:00Z", ...extra });
const upload = { method: "PUT", url: "https://s3.test/provider-media/uploads/providers/p/media/x?X-Amz-Signature=abc", headers: { "Content-Type": "image/png" }, expiresAt: "2026-11-28T10:10:00Z" };
const file = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], { type: "image/png" });

describe("provider media (gallery and logo)", () => {
  it("lists the provider's photos", async () => {
    const h = harness(() => ({ body: { items: [media("READY")] } }));
    const view = renderHook(() => hooks.useProviderMedia(h.client, PID), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]).toMatchObject({ method: "GET", path: `/providers/${PID}/media` });
    expect(view.result.current.data?.[0]?.id).toBe(PHOTO);
  });

  it("registers the purpose and the exact size, PUTs the same Blob without bearer, completes and polls until READY", async () => {
    let reads = 0;
    const h = harness((seen) => {
      if (seen.path.endsWith("/media/uploads")) return { status: 201, body: { ...media("PENDING_UPLOAD", "LOGO"), upload } };
      if (seen.path.endsWith("/complete")) return { status: 202, body: media("QUEUED", "LOGO") };
      reads += 1;
      return { body: { items: [media(reads < 2 ? "PROCESSING" : "READY", "LOGO")] } };
    });
    const put = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    const sleep = vi.fn(async () => undefined);
    const stages: string[] = [];
    const view = renderHook(() => hooks.useUploadProviderMedia(h.client, PID, { put, poll: { intervalMs: 10, sleep } }), { wrapper: h.wrapper });
    const settled = await act(async () => view.result.current.mutateAsync({ file, contentType: "image/png", purpose: "LOGO", idempotencyKey: "logo-1", altText: "  Logo  ", onStage: (stage) => stages.push(stage) }));
    expect(h.calls[0]).toMatchObject({ method: "POST", path: `/providers/${PID}/media/uploads`, body: { purpose: "LOGO", contentType: "image/png", bytes: file.size, altText: "Logo" } });
    expect(h.calls[0]?.headers.get("idempotency-key")).toBe("logo-1");
    const [url, init] = (put as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0] ?? [];
    expect(url).toBe(upload.url);
    expect(init?.body).toBe(file);
    expect(new Headers(init?.headers).get("authorization")).toBeNull();
    expect(h.calls[1]).toMatchObject({ method: "POST", path: `/providers/${PID}/media/${PHOTO}/complete` });
    expect(settled?.status).toBe("READY");
    expect(stages).toEqual(["requesting", "uploading", "processing"]);
    expect(h.invalidated.mock.calls.map(([filters]) => filters?.queryKey)).toContainEqual(hooks.providerMediaKeys.list(PID));
  });

  it("refuses HEIC, a type outside JPEG/PNG/WebP and oversize files before any request", async () => {
    const h = harness(() => ({ body: {} }));
    const view = renderHook(() => hooks.useUploadProviderMedia(h.client, PID), { wrapper: h.wrapper });
    const refused = await act(async () => view.result.current.mutateAsync({ file, contentType: "image/heic", purpose: "GALLERY", idempotencyKey: "k" }).catch((error: unknown) => error));
    expect(refused).toBeInstanceOf(hooks.PhotoInputError);
    const big = new Blob([new Uint8Array(hooks.MAX_PHOTO_BYTES + 1)], { type: "image/png" });
    const tooBig = await act(async () => view.result.current.mutateAsync({ file: big, contentType: "image/png", purpose: "GALLERY", idempotencyKey: "k2" }).catch((error: unknown) => error));
    expect((tooBig as hooks.PhotoInputError).code).toBe("PHOTO_SIZE");
    expect(h.calls).toHaveLength(0);
  });

  it("a refused PUT (403: another size than declared) is a PhotoUploadError and nothing is completed; a REJECTED photo comes back with its reason", async () => {
    const h = harness(() => ({ status: 201, body: { ...media("PENDING_UPLOAD"), upload } }));
    const view = renderHook(() => hooks.useUploadProviderMedia(h.client, PID, { put: (async () => new Response("", { status: 403 })) as typeof fetch }), { wrapper: h.wrapper });
    const failure = await act(async () => view.result.current.mutateAsync({ file, contentType: "image/png", purpose: "GALLERY", idempotencyKey: "k" }).catch((error: unknown) => error));
    expect(failure).toBeInstanceOf(hooks.PhotoUploadError);
    expect(h.calls.some((call) => call.path.endsWith("/complete"))).toBe(false);

    const rejecting = harness((seen) => seen.path.endsWith("/media/uploads") ? { status: 201, body: { ...media("PENDING_UPLOAD"), upload } }
      : seen.path.endsWith("/complete") ? { status: 202, body: media("QUEUED") } : { body: { items: [media("REJECTED", "GALLERY", { rejectReason: "UNREADABLE" })] } });
    const second = renderHook(() => hooks.useUploadProviderMedia(rejecting.client, PID, { put: (async () => new Response(null, { status: 200 })) as typeof fetch, poll: { sleep: async () => undefined } }), { wrapper: rejecting.wrapper });
    const settled = await act(async () => second.result.current.mutateAsync({ file, contentType: "image/png", purpose: "GALLERY", idempotencyKey: "k3" }));
    expect(settled).toMatchObject({ status: "REJECTED", rejectReason: "UNREADABLE" });
  });

  it("DELETE sends the photo id and surfaces 409 MEDIA_IN_USE", async () => {
    const h = harness(() => ({ status: 409, body: { type: "about:blank", title: "Conflict", status: 409, code: "MEDIA_IN_USE", details: { usedBy: "MICROSITE" } } }));
    const view = renderHook(() => hooks.useDeleteProviderMedia(h.client, PID), { wrapper: h.wrapper });
    const failure = await act(async () => view.result.current.mutateAsync(PHOTO).catch((error: unknown) => error));
    expect(h.calls[0]).toMatchObject({ method: "DELETE", path: `/providers/${PID}/media/${PHOTO}` });
    expect((failure as { problem?: { code?: string } }).problem?.code).toBe("MEDIA_IN_USE");
  });

  it("counts only what still takes a slot (not REJECTED or DELETING)", () => {
    const items = [media("READY"), media("REJECTED"), media("DELETING"), media("PROCESSING", "LOGO")] as never[];
    expect(hooks.activeMedia(items, "GALLERY")).toHaveLength(1);
    expect(hooks.activeMedia(items, "LOGO")).toHaveLength(1);
  });

  it("micrositePictures picks the alt in the reader's language, then Spanish, and keeps the logo", () => {
    const pictures = hooks.micrositePictures({ gallery: [{ url: "https://m/1.webp", alt: { "es-BO": "Mesa", "en-US": "Table" } }, { url: "https://m/2.webp" }], logo: { url: "https://m/logo.webp" } }, "en-US");
    expect(pictures).toEqual({ logoUrl: "https://m/logo.webp", gallery: [{ url: "https://m/1.webp", alt: "Table" }, { url: "https://m/2.webp", alt: "" }] });
    expect(hooks.micrositePictures({ gallery: [], logo: null })).toEqual({});
  });
});
