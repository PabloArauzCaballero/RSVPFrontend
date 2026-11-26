import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import * as hooks from "../src/index.js";

/** R2 · product sheet hooks through the real fetch client: method, path, headers (If-Match, Idempotency-Key), body, polling and cache. */
interface Seen { readonly method: string; readonly path: string; readonly body: unknown; readonly headers: Headers; readonly url: string }
type Reply = { status?: number; body?: unknown };

const PID = "11111111-1111-4111-8111-111111111111";
const LID = "22222222-2222-4222-8222-222222222222";
const PHOTO = "33333333-3333-4333-8333-333333333333";

function harness(respond: (seen: Seen) => Reply = () => ({ body: {} })) {
  const calls: Seen[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const raw = init?.body;
    const seen: Seen = { method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, url: url.toString(), body: typeof raw === "string" ? JSON.parse(raw) : raw, headers: new Headers(init?.headers) };
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
  const keys = (): unknown[] => invalidated.mock.calls.map(([filters]) => filters?.queryKey);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, wrapper, queryClient, keys, fetchFn };
}

const photo = (status: string, extra: Record<string, unknown> = {}) => ({ id: PHOTO, listingId: LID, variantId: null, status, rejectReason: null, contentType: "image/jpeg", altText: null, position: 0, renditions: null, createdAt: "2026-11-26T10:00:00Z", updatedAt: "2026-11-26T10:00:00Z", ...extra });
const sheet = (extra: Record<string, unknown> = {}) => ({ id: LID, providerId: PID, type: "PRODUCT", category: "TABLEWARE", city: "la-paz", title: "Juego de copas", published: false, disclaimer: "", version: 3, completeness: "INCOMPLETE", missing: ["PHOTO"], photos: [], variants: [], giftIdeas: ["GLASSWARE"], ...extra });

describe("productSheetService paths and headers", () => {
  it("GET the sheet with the locale", async () => {
    const h = harness(() => ({ body: sheet() }));
    const view = renderHook(() => hooks.useListingSheet(h.client, PID, LID, "en-US"), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(h.calls[0]).toMatchObject({ method: "GET", path: `/providers/${PID}/listings/${LID}?locale=en-US` });
    expect(view.result.current.data?.version).toBe(3);
  });

  it("a locale the catalog does not speak reads the sheet in es-BO", () => {
    expect(hooks.sheetLocale("fr-FR")).toBe("es-BO");
    expect(hooks.sheetLocale("en-US")).toBe("en-US");
  });

  it("PATCH sends If-Match with the quoted loaded version and stores the answer", async () => {
    const h = harness(() => ({ body: sheet({ version: 4, title: "Copas" }) }));
    const view = renderHook(() => hooks.usePatchListing(h.client, PID, LID, "es-BO"), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ version: 3, input: { titles: { "es-BO": "Copas" } } }); });
    expect(h.calls[0]).toMatchObject({ method: "PATCH", path: `/providers/${PID}/listings/${LID}?locale=es-BO`, body: { titles: { "es-BO": "Copas" } } });
    expect(h.calls[0]?.headers.get("if-match")).toBe("\"3\"");
    expect(h.queryClient.getQueryData(hooks.productSheetKeys.sheet(PID, LID, "es-BO"))).toMatchObject({ version: 4 });
    expect(h.keys()).toContainEqual(["providers", PID, "listings"]);
  });

  it("PATCH surfaces 409 VERSION_CONFLICT with details and leaves the cache alone", async () => {
    const h = harness(() => ({ status: 409, body: { type: "about:blank", title: "Conflict", status: 409, code: "VERSION_CONFLICT", details: { currentVersion: 5 } } }));
    const view = renderHook(() => hooks.usePatchListing(h.client, PID, LID, "es-BO"), { wrapper: h.wrapper });
    const failure = await act(async () => view.result.current.mutateAsync({ version: 3, input: { stock: "AVAILABLE" } }).catch((error: unknown) => error));
    expect((failure as { problem?: { code?: string } }).problem?.code).toBe("VERSION_CONFLICT");
    expect(hooks.sheetProblemDetails(failure).currentVersion).toBe(5);
    expect(h.queryClient.getQueryData(hooks.productSheetKeys.sheet(PID, LID, "es-BO"))).toBeUndefined();
  });

  it("create and duplicate carry the caller's Idempotency-Key", async () => {
    const h = harness((seen) => ({ status: 201, body: sheet({ id: seen.path.includes("duplicate") ? "copy" : LID }) }));
    const create = renderHook(() => hooks.useCreateProduct(h.client, PID, "es-BO"), { wrapper: h.wrapper });
    const input = { type: "PRODUCT" as const, category: "TABLEWARE", city: "la-paz", titles: { "es-BO": "Copas" }, destinations: { WHATSAPP: "https://wa.me/59170000000" } };
    await act(async () => { await create.result.current.mutateAsync({ input, idempotencyKey: "draft-1" }); });
    expect(h.calls[0]).toMatchObject({ method: "POST", path: `/providers/${PID}/listings?locale=es-BO`, body: input });
    expect(h.calls[0]?.headers.get("idempotency-key")).toBe("draft-1");
    const duplicate = renderHook(() => hooks.useDuplicateListing(h.client, PID, "es-BO"), { wrapper: h.wrapper });
    const copy = await act(async () => duplicate.result.current.mutateAsync({ listingId: LID, idempotencyKey: "dup-1" }));
    expect(h.calls[1]).toMatchObject({ method: "POST", path: `/providers/${PID}/listings/${LID}/duplicate?locale=es-BO` });
    expect(h.calls[1]?.headers.get("idempotency-key")).toBe("dup-1");
    expect(copy.id).toBe("copy");
  });

  it("gift ideas are public and filtered by category; the template is read and saved by the owner", async () => {
    const h = harness((seen) => seen.path.startsWith("/providers/gift-ideas")
      ? { body: { items: [{ code: "GLASSWARE", name: "Copas", names: {}, categories: ["TABLEWARE"], eventTypes: ["WEDDING"], priceHintMinor: null }] } }
      : { body: { providerId: PID, template: { "es-BO": "Hola {proveedor}" }, defaultTemplate: { "es-BO": "Hola" }, variables: ["producto"] } });
    const ideas = renderHook(() => hooks.useGiftIdeas(h.client, "TABLEWARE", "es-BO"), { wrapper: h.wrapper });
    await waitFor(() => expect(ideas.result.current.isSuccess).toBe(true));
    expect(h.calls[0]?.path).toBe("/providers/gift-ideas?category=TABLEWARE&locale=es-BO");
    expect(h.calls[0]?.headers.get("authorization")).toBeNull();
    expect(ideas.result.current.data?.[0]?.code).toBe("GLASSWARE");
    const save = renderHook(() => hooks.useSaveWhatsappTemplate(h.client, PID), { wrapper: h.wrapper });
    await act(async () => { await save.result.current.mutateAsync({ "es-BO": "Hola {proveedor}" }); });
    expect(h.calls[1]).toMatchObject({ method: "PUT", path: `/providers/${PID}/whatsapp-template`, body: { template: { "es-BO": "Hola {proveedor}" } } });
  });

  it("gift ideas wait for a category", () => {
    const h = harness();
    const ideas = renderHook(() => hooks.useGiftIdeas(h.client, undefined, "es-BO"), { wrapper: h.wrapper });
    expect(ideas.result.current.fetchStatus).toBe("idle");
    expect(h.calls).toHaveLength(0);
  });
});

describe("photo upload (§5.2)", () => {
  const upload = { method: "PUT", url: "https://s3.test/provider-media/uploads/x?X-Amz-Signature=abc", headers: { "Content-Type": "image/jpeg" }, expiresAt: "2026-11-26T10:10:00Z" };
  const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], { type: "image/jpeg" });

  it("registers the exact byte size, PUTs the same Blob without bearer, completes and polls until READY", async () => {
    let reads = 0;
    const h = harness((seen) => {
      if (seen.path.endsWith("/photos/uploads")) return { status: 201, body: { ...photo("PENDING_UPLOAD"), upload } };
      if (seen.path.endsWith("/complete")) return { status: 202, body: photo("QUEUED") };
      reads += 1;
      return { body: sheet({ photos: [photo(reads < 2 ? "PROCESSING" : "READY")], missing: reads < 2 ? ["PHOTO"] : [], completeness: reads < 2 ? "INCOMPLETE" : "COMPLETE" }) };
    });
    const put = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
    const sleep = vi.fn(async () => undefined);
    const stages: string[] = [];
    const view = renderHook(() => hooks.useUploadListingPhoto(h.client, PID, LID, "es-BO", { put, poll: { intervalMs: 10, sleep } }), { wrapper: h.wrapper });
    const settled = await act(async () => view.result.current.mutateAsync({ file, contentType: "image/jpeg", idempotencyKey: "photo-1", altText: "  Copas  ", onStage: (stage) => stages.push(stage) }));
    expect(h.calls[0]).toMatchObject({ method: "POST", path: `/providers/${PID}/listings/${LID}/photos/uploads`, body: { contentType: "image/jpeg", bytes: file.size, altText: "Copas" } });
    expect(h.calls[0]?.headers.get("idempotency-key")).toBe("photo-1");
    const [url, init] = (put as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0] ?? [];
    expect(url).toBe(upload.url);
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe(file);
    expect(new Headers(init?.headers).get("authorization")).toBeNull();
    expect(h.calls[1]).toMatchObject({ method: "POST", path: `/providers/${PID}/listings/${LID}/photos/${PHOTO}/complete` });
    expect(settled?.status).toBe("READY");
    expect(stages).toEqual(["requesting", "uploading", "processing"]);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(h.queryClient.getQueryData(hooks.productSheetKeys.sheet(PID, LID, "es-BO"))).toMatchObject({ completeness: "COMPLETE" });
  });

  it("returns a REJECTED photo with its reason (HEIC_UNSUPPORTED) instead of waiting forever", async () => {
    const h = harness((seen) => seen.path.endsWith("/photos/uploads") ? { status: 201, body: { ...photo("PENDING_UPLOAD"), upload } }
      : seen.path.endsWith("/complete") ? { status: 202, body: photo("QUEUED") }
      : { body: sheet({ photos: [photo("REJECTED", { rejectReason: "HEIC_UNSUPPORTED" })] }) });
    const view = renderHook(() => hooks.useUploadListingPhoto(h.client, PID, LID, "es-BO", { put: (async () => new Response(null, { status: 200 })) as typeof fetch, poll: { sleep: async () => undefined } }), { wrapper: h.wrapper });
    const settled = await act(async () => view.result.current.mutateAsync({ file, contentType: "image/jpeg", idempotencyKey: "k" }));
    expect(settled).toMatchObject({ status: "REJECTED", rejectReason: "HEIC_UNSUPPORTED" });
  });

  it("refuses HEIC and oversize files before any request", async () => {
    const h = harness();
    const view = renderHook(() => hooks.useUploadListingPhoto(h.client, PID, LID, "es-BO"), { wrapper: h.wrapper });
    const heic = await act(async () => view.result.current.mutateAsync({ file, contentType: "image/heic", idempotencyKey: "k" }).catch((error: unknown) => error));
    expect(heic).toBeInstanceOf(hooks.PhotoInputError);
    expect((heic as hooks.PhotoInputError).code).toBe("PHOTO_TYPE");
    expect(hooks.photoInputProblem({ type: "image/png", size: hooks.MAX_PHOTO_BYTES + 1 })).toBe("PHOTO_SIZE");
    expect(hooks.photoInputProblem({ type: "image/png", size: 0 })).toBe("PHOTO_SIZE");
    expect(hooks.photoInputProblem({ type: "image/webp", size: hooks.MAX_PHOTO_BYTES })).toBeNull();
    expect(h.calls).toHaveLength(0);
  });

  it("a refused PUT (403: size differs from the signed Content-Length) is a PhotoUploadError and nothing is completed", async () => {
    const h = harness(() => ({ status: 201, body: { ...photo("PENDING_UPLOAD"), upload } }));
    const view = renderHook(() => hooks.useUploadListingPhoto(h.client, PID, LID, "es-BO", { put: (async () => new Response("", { status: 403 })) as typeof fetch }), { wrapper: h.wrapper });
    const failure = await act(async () => view.result.current.mutateAsync({ file, contentType: "image/jpeg", idempotencyKey: "k" }).catch((error: unknown) => error));
    expect(failure).toBeInstanceOf(hooks.PhotoUploadError);
    expect((failure as hooks.PhotoUploadError).status).toBe(403);
    expect(h.calls.some((call) => call.path.endsWith("/complete"))).toBe(false);
  });

  it("an idempotent replay without upload link skips the PUT and the complete", async () => {
    const h = harness((seen) => seen.path.endsWith("/photos/uploads") ? { body: { ...photo("QUEUED"), upload: null } } : { body: sheet({ photos: [photo("READY")] }) });
    const put = vi.fn() as unknown as typeof fetch;
    const view = renderHook(() => hooks.useUploadListingPhoto(h.client, PID, LID, "es-BO", { put, poll: { sleep: async () => undefined } }), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ file, contentType: "image/jpeg", idempotencyKey: "k" }); });
    expect(put).not.toHaveBeenCalled();
    expect(h.calls.some((call) => call.path.endsWith("/complete"))).toBe(false);
  });

  it("polling gives up with PhotoTimeoutError while the worker is still busy", async () => {
    const service = { get: vi.fn(async () => sheet({ photos: [photo("PROCESSING")] }) as never) };
    await expect(hooks.waitForPhoto(service, { providerId: PID, listingId: LID, photoId: PHOTO, locale: "es-BO" }, { intervalMs: 10, timeoutMs: 30, sleep: async () => undefined })).rejects.toBeInstanceOf(hooks.PhotoTimeoutError);
    expect(service.get).toHaveBeenCalledTimes(3);
  });

  it("a photo deleted while waiting ends the wait without a photo", async () => {
    const service = { get: vi.fn(async () => sheet({ photos: [] }) as never) };
    const result = await hooks.waitForPhoto(service, { providerId: PID, listingId: LID, photoId: PHOTO, locale: "es-BO" }, { sleep: async () => undefined });
    expect(result.photo).toBeUndefined();
  });

  it("DELETE answers 204 and the sheet and list are read again", async () => {
    const h = harness(() => ({ status: 204 }));
    const view = renderHook(() => hooks.useDeleteListingPhoto(h.client, PID, LID, "es-BO"), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync(PHOTO); });
    expect(h.calls[0]).toMatchObject({ method: "DELETE", path: `/providers/${PID}/listings/${LID}/photos/${PHOTO}` });
    expect(h.keys()).toContainEqual(["providers", PID, "listing-sheet", LID, "es-BO"]);
    expect(h.keys()).toContainEqual(["providers", PID, "listings"]);
  });
});

describe("WhatsApp template (§5.8)", () => {
  it("finds the variables the server would refuse", () => {
    expect(hooks.unknownTemplateVariables("Hola {proveedor}, quiero {producto} para {invitado} y {invitado}")).toEqual(["{invitado}"]);
    expect(hooks.unknownTemplateVariables("Hola {proveedor}")).toEqual([]);
  });

  it("the preview drops a missing value without double spaces or empty parentheses", () => {
    const text = hooks.renderTemplatePreview("Hola {proveedor}, quiero {producto} ({version}) × {cantidad} para {celebracion}. {entrega}", { proveedor: "Tienda", producto: "Copas", cantidad: "2", celebracion: "la boda" });
    expect(text).toBe("Hola Tienda, quiero Copas × 2 para la boda.");
  });
});
