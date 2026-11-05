import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, ValidationError, createApiClient, toApiError } from "@rsvp/api-client";
import * as hooks from "../src/index.js";
import * as admin from "../src/admin/index.js";

/**
 * Every hook goes through the real fetch-based client; only `fetch` is a recorder. The assertions pin the method, path, query
 * and the headers each route needs (If-Match, Idempotency-Key, guest Bearer instead of the host session), which is the contract
 * the screens rely on and the part a refactor most easily breaks.
 */
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
  const last = (): Seen => calls[calls.length - 1] as Seen;
  return { client, calls, wrapper, queryClient, last };
}

async function runQuery<T>(h: ReturnType<typeof harness>, use: () => T): Promise<Seen> {
  const view = renderHook(use, { wrapper: h.wrapper });
  await waitFor(() => expect(h.calls.length).toBeGreaterThan(0));
  await waitFor(() => expect((view.result.current as { isFetching: boolean }).isFetching).toBe(false));
  return h.calls[0] as Seen;
}
async function runMutation<TVars>(h: ReturnType<typeof harness>, use: () => { mutateAsync: (vars: TVars) => Promise<unknown> }, vars: TVars): Promise<Seen> {
  const view = renderHook(use, { wrapper: h.wrapper });
  await act(async () => { await view.result.current.mutateAsync(vars); });
  return h.calls[0] as Seen;
}

describe("gift hooks", () => {
  it("guest list sends exactly the guest credential and no session; the host list uses the session", async () => {
    const guest = harness(() => ({ body: { items: [] } }));
    const seen = await runQuery(guest, () => hooks.useGiftList(guest.client, "c-1", "guest-token"));
    expect(seen.path).toBe("/gifts/celebrations/c-1/items");
    expect(seen.headers.get("authorization")).toBe("Bearer guest-token");
    const anonymous = harness(() => ({ body: { items: [] } }));
    expect((await runQuery(anonymous, () => hooks.useGiftList(anonymous.client, "c-1", null))).headers.get("authorization")).toBeNull();
    const host = harness(() => ({ body: { items: [] } }));
    expect((await runQuery(host, () => hooks.useGiftList(host.client, "c-1"))).headers.get("authorization")).toBe("Bearer session");
  });

  it("reserve carries the idempotency key and the guest credential; a 409 GIFT_NOT_AVAILABLE is 'taken'", async () => {
    const h = harness();
    const seen = await runMutation(h, () => hooks.useReserveGiftItem(h.client, "c-1", "tok"), { giftItemId: "g-1", input: { requesterName: "Ana" } as never, idempotencyKey: "key-1" });
    expect(seen).toMatchObject({ method: "POST", path: "/gifts/celebrations/c-1/items/g-1/reservations" });
    expect(seen.headers.get("idempotency-key")).toBe("key-1");
    expect(seen.headers.get("authorization")).toBe("Bearer tok");
    const taken = toApiError(409, "t", { title: "x", status: 409, code: "GIFT_NOT_AVAILABLE" });
    expect(hooks.isGiftTaken(taken)).toBe(true);
    expect(hooks.isGiftTaken(toApiError(409, "t", { title: "x", status: 409, code: "OTHER" }))).toBe(false);
    expect(hooks.isGiftTaken(new Error("net"))).toBe(false);
    expect(hooks.problemCode(taken)).toBe("GIFT_NOT_AVAILABLE");
    expect(hooks.problemCode("nope")).toBeUndefined();
  });

  it("host reservations, decisions, add, approve external and settings use the documented routes", async () => {
    const reservations = harness(); expect((await runQuery(reservations, () => hooks.useHostReservations(reservations.client, "c-1", "PENDING_REVIEW"))).path).toBe("/gifts/celebrations/c-1/reservations?status=PENDING_REVIEW");
    const all = harness(); expect((await runQuery(all, () => hooks.useHostReservations(all.client, "c-1"))).path).toBe("/gifts/celebrations/c-1/reservations");
    const approve = harness(); expect(await runMutation(approve, () => hooks.useDecideReservation(approve.client, "c-1"), { reservationId: "r-1", decision: "approve" as const })).toMatchObject({ method: "POST", path: "/gifts/celebrations/c-1/reservations/r-1/approve" });
    const reject = harness(); expect((await runMutation(reject, () => hooks.useDecideReservation(reject.client, "c-1"), { reservationId: "r-1", decision: "reject" as const })).path).toBe("/gifts/celebrations/c-1/reservations/r-1/reject");
    const add = harness(); expect(await runMutation(add, () => hooks.useAddGift(add.client, "c-1"), { title: "Licuadora" } as never)).toMatchObject({ method: "POST", path: "/gifts/celebrations/c-1/items", body: { title: "Licuadora" } });
    const external = harness(); expect(await runMutation(external, () => hooks.useApproveExternalGift(external.client, "c-1"), "g-9")).toMatchObject({ method: "POST", path: "/gifts/celebrations/c-1/items/g-9/approve" });
    const settings = harness(); expect((await runQuery(settings, () => hooks.useGiftSettings(settings.client, "c-1"))).path).toBe("/gifts/celebrations/c-1/gift-settings");
    const update = harness(); expect(await runMutation(update, () => hooks.useUpdateGiftSettings(update.client, "c-1"), { requesterHidden: true } as never)).toMatchObject({ method: "PUT", body: { requesterHidden: true } });
  });

  it("does not request anything without a celebration id; pure helpers keep order and hide host-only states", () => {
    const h = harness();
    renderHook(() => hooks.useGiftList(h.client, undefined), { wrapper: h.wrapper });
    renderHook(() => hooks.useHostReservations(h.client, undefined), { wrapper: h.wrapper });
    renderHook(() => hooks.useGiftSettings(h.client, undefined), { wrapper: h.wrapper });
    expect(h.calls).toHaveLength(0);
    const items = [{ source: "EXTERNAL", n: 1 }, { source: "CATALOGED", n: 2 }, { source: "EXTERNAL", n: 3 }];
    expect(hooks.catalogedFirst(items).map((item) => item.n)).toEqual([2, 1, 3]);
    expect(hooks.guestVisible([{ status: "AVAILABLE" }, { status: "PROPOSED" }, { status: "REJECTED" }, { status: "COMMITTED" }, { status: "PENDING_REVIEW" }]).map((item) => item.status)).toEqual(["AVAILABLE", "COMMITTED", "PENDING_REVIEW"]);
  });

  it("suggestionsOf reads the three shapes an ApiError can carry and ignores anything else", () => {
    const suggestion = [{ listingId: "l-1" }];
    expect(hooks.suggestionsOf({ problem: { suggestions: suggestion } })).toEqual(suggestion);
    expect(hooks.suggestionsOf({ details: { suggestions: suggestion } })).toEqual(suggestion);
    expect(hooks.suggestionsOf({ suggestions: suggestion })).toEqual(suggestion);
    expect(hooks.suggestionsOf({ suggestions: "x" })).toEqual([]);
    expect(hooks.suggestionsOf(null)).toEqual([]);
    expect(hooks.partnerSuggestionsOf(undefined)).toEqual([]);
  });

  it("the generic gift hooks hit the contract routes (list, add, reserve, approve)", async () => {
    const list = harness(); expect((await runQuery(list, () => hooks.useGiftItems(list.client, "c-2"))).path).toBe("/gifts/celebrations/c-2/items");
    const add = harness(); expect((await runMutation(add, () => hooks.useAddGiftItem(add.client, "c-2"), { title: "x" })).method).toBe("POST");
    const reserve = harness(); expect((await runMutation(reserve, () => hooks.useReserveGift(reserve.client, "c-2"), { giftItemId: "g-1", input: {} })).path).toBe("/gifts/celebrations/c-2/items/g-1/reservations");
    const approve = harness(); expect((await runMutation(approve, () => hooks.useApproveReservation(approve.client, "c-2"), "r-1")).path).toBe("/gifts/celebrations/c-2/reservations/r-1/approve");
  });
});

describe("provider hooks (portal, quotes, schedule, documents)", () => {
  it("portal reads: profile, listings with locale, leads paging, metrics grouping, availability, bookings, mine", async () => {
    const check = async (use: (h: ReturnType<typeof harness>) => unknown, path: string, respond?: () => { body: unknown }) => {
      const h = harness(respond); expect((await runQuery(h, () => use(h))).path).toBe(path);
    };
    await check((h) => hooks.useProviderProfile(h.client, "p-1"), "/providers/p-1");
    await check((h) => hooks.useOwnListings(h.client, "p-1", "es-BO"), "/providers/p-1/listings?locale=es-BO");
    await check((h) => hooks.useLeads(h.client, "p-1"), "/providers/p-1/leads?limit=50&offset=0");
    await check((h) => hooks.useMetrics(h.client, "p-1", "2026-10-01", "2026-10-31", "category"), "/providers/p-1/metrics?from=2026-10-01&to=2026-10-31&groupBy=category");
    await check((h) => hooks.useMetrics(h.client, "p-1", "2026-10-01", "2026-10-31"), "/providers/p-1/metrics?from=2026-10-01&to=2026-10-31");
    await check((h) => hooks.useAvailability(h.client, "p-1"), "/providers/p-1/availability");
    await check((h) => hooks.useProviderBookings(h.client, "p-1", "REQUESTED" as never), "/providers/p-1/bookings?status=REQUESTED");
    await check((h) => hooks.useProviderBookings(h.client, "p-1"), "/providers/p-1/bookings");
    await check((h) => hooks.useMyProviders(h.client), "/providers/mine");
    await check((h) => hooks.useMicrosite(h.client, "p-1"), "/providers/p-1/microsite");
    await check((h) => hooks.useProviderDocuments(h.client, "p-1"), "/providers/p-1/documents");
    await check((h) => hooks.useMonthCalendar(h.client, "p-1", "2026-12"), "/providers/p-1/calendar?month=2026-12");
  });

  it("calendar and discovery are public (no session); discovery drops empty filters and sends the locale", async () => {
    const cal = harness(); expect((await runQuery(cal, () => hooks.useMonthCalendar(cal.client, "p-1", "2026-12"))).headers.get("authorization")).toBeNull();
    const found = harness(() => ({ body: { items: [], total: 0, page: 1, pageSize: 20 } }));
    const seen = await runQuery(found, () => hooks.useProviderDiscovery(found.client, { category: "CATERING", city: "", page: 2 } as never, "en-US"));
    expect(seen.path).toBe("/providers?category=CATERING&page=2&locale=en-US");
    expect(seen.headers.get("authorization")).toBeNull();
  });

  it("writes: register, submit, listing create and publish, lead config, availability, microsite If-Match, booking decisions, quotes", async () => {
    const reg = harness(); expect(await runMutation(reg, () => hooks.useRegisterProviderAccount(reg.client), { name: "Dulce Sol" } as never)).toMatchObject({ method: "POST", path: "/providers" });
    const submit = harness(); expect((await runMutation(submit, () => hooks.useSubmitProvider(submit.client, "p-1"), undefined)).path).toBe("/providers/p-1/submit");
    const create = harness(); expect((await runMutation(create, () => hooks.useCreateOwnListing(create.client, "p-1", "es-BO"), { type: "PRODUCT" } as never)).path).toBe("/providers/p-1/listings?locale=es-BO");
    const publish = harness(); expect((await runMutation(publish, () => hooks.usePublishListing(publish.client, "p-1", "es-BO"), "l-1")).path).toBe("/providers/p-1/listings/l-1/publish?locale=es-BO");
    const leads = harness(); expect(await runMutation(leads, () => hooks.useConfigureLeads(leads.client, "p-1"), { destinations: {} } as never)).toMatchObject({ method: "PUT", path: "/providers/p-1/lead-config" });
    const avail = harness(); expect(await runMutation(avail, () => hooks.useSetAvailability(avail.client, "p-1"), { capacityPerDay: 2, rules: [], blackouts: [] })).toMatchObject({ method: "PUT", path: "/providers/p-1/availability", body: { capacityPerDay: 2 } });
    const site = harness(); const saved = await runMutation(site, () => hooks.useSaveMicrosite(site.client, "p-1"), { input: { descriptions: {} } as never, version: 4 });
    expect(saved).toMatchObject({ method: "PUT", path: "/providers/p-1/microsite" }); expect(saved.headers.get("if-match")).toBe("4");
    for (const action of ["confirm", "reject", "cancel"] as const) {
      const decide = harness(); expect((await runMutation(decide, () => hooks.useDecideBooking(decide.client, "p-1"), { bookingId: "b-1", action })).path).toBe(`/providers/p-1/bookings/b-1/${action}`);
    }
    const book = harness(); expect((await runMutation(book, () => hooks.useBookDate(book.client, "p-1"), { date: "2026-12-12" } as never)).path).toBe("/providers/p-1/bookings");
    const quote = harness(); expect((await runMutation(quote, () => hooks.useQuote(quote.client, "p-1", "en-US"), { message: "hi" } as never)).path).toBe("/providers/p-1/quotes?locale=en-US");
  });

  it("legacy generic provider hooks use the contract routes", async () => {
    const search = harness(); expect((await runQuery(search, () => hooks.useProviders(search.client, { category: "CATERING", city: undefined }))).path).toBe("/providers?category=CATERING");
    const cal = harness(); expect((await runQuery(cal, () => hooks.useProviderCalendar(cal.client, "p-1"))).path).toBe("/providers/p-1/calendar");
    const reg = harness(); expect((await runMutation(reg, () => hooks.useRegisterProvider(reg.client), { name: "x" })).path).toBe("/providers");
    const verify = harness(); expect((await runMutation(verify, () => hooks.useVerifyProvider(verify.client), "p-1")).path).toBe("/providers/p-1/verify");
    const listing = harness(); expect((await runMutation(listing, () => hooks.useCreateListing(listing.client, "p-1"), { type: "SERVICE" })).path).toBe("/providers/p-1/listings");
    const quote = harness(); expect((await runMutation(quote, () => hooks.useRequestQuote(quote.client, "p-1"), { message: "x" })).path).toBe("/providers/p-1/quotes");
    const booking = harness(); expect((await runMutation(booking, () => hooks.useRequestBooking(booking.client, "p-1"), { date: "2026-12-12" })).path).toBe("/providers/p-1/bookings");
  });

  it("document upload registers, PUTs the bytes to the presigned URL without a bearer, then completes", async () => {
    const order: string[] = [];
    const h = harness((seen) => ({ body: seen.path.endsWith("/documents") ? { id: "d-1", upload: { url: "https://minio.test/put", headers: { "content-type": "application/pdf" } } } : { id: "d-1", status: "UPLOADED" } }));
    const put = vi.fn(async (upload: { url: string; headers: Readonly<Record<string, string>> }) => { order.push(`put ${upload.url}`); });
    const view = renderHook(() => hooks.useUploadDocument(h.client, "p-1"), { wrapper: h.wrapper });
    await act(async () => { await view.result.current.mutateAsync({ input: { filename: "ruc.pdf", contentType: "application/pdf", sizeBytes: 10, kind: "TAX_ID" } as never, put }); });
    expect(h.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["POST /providers/p-1/documents", "POST /providers/p-1/documents/d-1/complete"]);
    expect(put).toHaveBeenCalledWith({ url: "https://minio.test/put", headers: { "content-type": "application/pdf" } });
    expect(order).toEqual(["put https://minio.test/put"]);
  });

  it("downloadDocument and decide-by-service helpers use the documented paths", async () => {
    const h = harness();
    await hooks.providerService(h.client).downloadDocument("p-1", "d-1");
    await hooks.providerService(h.client).myBookings();
    expect(h.calls.map((call) => call.path)).toEqual(["/providers/p-1/documents/d-1/download", "/providers/me/bookings"]);
  });

  it("listing search uses /listings and falls back to the public cards only when the gateway has no such route", async () => {
    const routed = harness(() => ({ body: { items: [{ id: "l-1", providerId: "p-1", title: "Torta" }] } }));
    expect(await hooks.providerService(routed.client).searchListings("torta")).toEqual({ items: [{ id: "l-1", providerId: "p-1", title: "Torta" }], viaFallback: false });
    expect(routed.last().path).toBe("/listings?q=torta&type=PRODUCT&limit=20&locale=es-BO");

    const cards = { items: [
      { listingId: "l-1", providerSlug: "dulce-sol", name: "Torta de bodas", summary: "Hecha a mano", category: "CATERING", priceFrom: { amountMinor: 45000, currency: "BOB" } },
      { listingId: "l-2", providerSlug: "foto", name: "Fotografía" }
    ] };
    const fallback = harness((seen) => (seen.path.startsWith("/listings") ? { status: 404, body: { title: "no route", status: 404 } } : { body: cards }));
    const result = await hooks.providerService(fallback.client).searchListings("torta");
    expect(result.viaFallback).toBe(true);
    expect(result.items).toEqual([{ id: "l-1", providerId: "dulce-sol", title: "Hecha a mano", category: "CATERING", priceFromMinor: 45000, currency: "BOB" }]);
    const everything = await hooks.providerService(fallback.client).searchListings("");
    expect(everything.items.map((item) => item.id)).toEqual(["l-1", "l-2"]);

    const broken = harness(() => ({ status: 500, body: { title: "boom", status: 500 } }));
    await expect(hooks.providerService(broken.client).searchListings("torta")).rejects.toBeInstanceOf(ApiError);
  });

  it("useListingSearch waits for two characters and useMyProviders can be disabled", async () => {
    const h = harness(() => ({ body: { items: [] } }));
    renderHook(() => hooks.useListingSearch(h.client, "t"), { wrapper: h.wrapper });
    renderHook(() => hooks.useMyProviders(h.client, false), { wrapper: h.wrapper });
    expect(h.calls).toHaveLength(0);
    expect((await runQuery(h, () => hooks.useListingSearch(h.client, "to"))).path).toContain("/listings?q=to");
  });
});

describe("celebration, template, media and event-type hooks", () => {
  const target = { id: "c-1", version: 3 };

  it("writes carry the edited version as If-Match", async () => {
    const edit = harness(); const seen = await runMutation(edit, () => hooks.useEditCelebration(edit.client, "c-1"), { target, patch: { title: "Boda" } as never });
    expect(seen).toMatchObject({ method: "PATCH", path: "/celebrations/c-1" }); expect(seen.headers.get("if-match")).toBe('"3"');
    const settings = harness(); expect((await runMutation(settings, () => hooks.useUpdateSettings(settings.client, "c-1"), { target, patch: {} as never })).path).toBe("/celebrations/c-1/settings");
    const type = harness(); expect(await runMutation(type, () => hooks.useAssignEventType(type.client, "c-1"), { target, code: "WEDDING" })).toMatchObject({ method: "PUT", path: "/celebrations/c-1/event-type", body: { eventTypeCode: "WEDDING" } });
    const tpl = harness(); expect(await runMutation(tpl, () => hooks.useSelectTemplate(tpl.client, "c-1"), { target, templateId: "t-1" })).toMatchObject({ path: "/celebrations/c-1/template", body: { templateId: "t-1" } });
    const create = harness(); expect((await runMutation(create, () => hooks.useCreateCelebration(create.client), { title: "x" } as never)).path).toBe("/celebrations");
  });

  it("publication actions pick the right route; missing fields come only from a ValidationError", async () => {
    for (const [action, path, body] of [[{ kind: "publish" }, "/celebrations/c-1/publish", undefined], [{ kind: "unpublish", reason: "typo" }, "/celebrations/c-1/unpublish", { reason: "typo" }], [{ kind: "archive" }, "/celebrations/c-1/archive", undefined]] as const) {
      const h = harness(); const seen = await runMutation(h, () => hooks.usePublicationAction(h.client, "c-1"), { target, action });
      expect(seen).toMatchObject({ method: "POST", path, body }); expect(seen.headers.get("if-match")).toBe('"3"');
    }
    expect(hooks.missingFieldsOf(toApiError(422, "t", { title: "x", status: 422, missingFields: ["title", 4, "eventDate"] }))).toEqual(["title", "eventDate"]);
    expect(hooks.missingFieldsOf(toApiError(422, "t", { title: "x", status: 422 }))).toEqual([]);
    expect(hooks.missingFieldsOf(new Error("x"))).toEqual([]);
    expect(toApiError(422, "t", { title: "x", status: 422 })).toBeInstanceOf(ValidationError);
  });

  it("reads: detail, public (no session), check, audit, event types, templates, media", async () => {
    const check = async (use: (h: ReturnType<typeof harness>) => unknown, path: string, authorized = true) => {
      const h = harness(() => ({ body: { items: [] } })); const seen = await runQuery(h, () => use(h));
      expect(seen.path).toBe(path); expect(seen.headers.get("authorization")).toBe(authorized ? "Bearer session" : null);
    };
    await check((h) => hooks.usePublishCheck(h.client, "c-1"), "/celebrations/c-1/publish-check");
    await check((h) => hooks.useAuditLog(h.client, "c-1"), "/celebrations/c-1/audit");
    await check((h) => hooks.useEventTypes(h.client, "en-US"), "/celebrations/event-types", false);
    await check((h) => hooks.useAdminEventTypes(h.client), "/celebrations/admin/event-types");
    await check((h) => hooks.useCompatibleTemplates(h.client, ["wedding", "classic"]), "/media/templates?eventTypeTags=wedding%2Cclassic", false);
    await check((h) => hooks.useTemplate(h.client, "t-1"), "/media/templates/t-1", false);
    await check((h) => hooks.useAdminTemplates(h.client), "/media/admin/templates");
    await check((h) => hooks.useMediaAssets(h.client, "c-1"), "/media/celebrations/c-1/assets");
    const none = harness();
    renderHook(() => hooks.useCompatibleTemplates(none.client, []), { wrapper: none.wrapper });
    renderHook(() => hooks.useTemplate(none.client, null), { wrapper: none.wrapper });
    expect(none.calls).toHaveLength(0);
    const types = harness(); const sent = await runQuery(types, () => hooks.useEventTypes(types.client, "en-US")); expect(sent.headers.get("accept-language")).toBe("en-US");
  });

  it("template save creates or edits, transitions publish/archive, event types upsert, media reorder/delete", async () => {
    const create = harness(); expect((await runMutation(create, () => hooks.useSaveTemplate(create.client), { input: { name: "N" } as never })).method).toBe("POST");
    const edit = harness(); const edited = await runMutation(edit, () => hooks.useSaveTemplate(edit.client), { target: { id: "t-1", version: 2 }, input: { name: "N" } as never });
    expect(edited).toMatchObject({ method: "PATCH", path: "/media/templates/t-1" }); expect(edited.headers.get("if-match")).toBe('"2"');
    const publish = harness(); expect((await runMutation(publish, () => hooks.useTemplateTransition(publish.client), { target: { id: "t-1", version: 2 }, action: "publish" as const })).path).toBe("/media/templates/t-1/publish");
    const archive = harness(); expect((await runMutation(archive, () => hooks.useTemplateTransition(archive.client), { target: { id: "t-1", version: 2 }, action: "archive" as const })).path).toBe("/media/templates/t-1/archive");
    const upsert = harness(); expect(await runMutation(upsert, () => hooks.useUpsertEventType(upsert.client), { code: "WEDDING", status: "ACTIVE" } as never)).toMatchObject({ method: "PUT", path: "/celebrations/admin/event-types/WEDDING", body: { status: "ACTIVE" } });
    const reorder = harness(); expect(await runMutation(reorder, () => hooks.useReorderMedia(reorder.client, "c-1"), { assetIds: ["a", "b"], coverAssetId: "b" })).toMatchObject({ method: "PUT", body: { assetIds: ["a", "b"], coverAssetId: "b" } });
    const remove = harness(() => ({ status: 204 })); expect(await runMutation(remove, () => hooks.useDeleteMedia(remove.client, "c-1"), "a-1")).toMatchObject({ method: "DELETE", path: "/media/assets/a-1" });
  });

  it("celebrationApi collaborator and replay routes", async () => {
    const h = harness();
    const api = hooks.celebrationApi(h.client);
    await api.setCollaborator(target, "u-2", "CO_HOST");
    await api.removeCollaborator(target, "u-2");
    await api.replayPublicProjection();
    await api.eventType("WEDDING", "es-BO");
    await api.get("c-1");
    expect(h.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["PUT /celebrations/c-1/collaborators/u-2", "DELETE /celebrations/c-1/collaborators/u-2", "POST /celebrations/admin/projections/public/replay", "GET /celebrations/event-types/WEDDING", "GET /celebrations/c-1"]);
  });

  it("upload: presign, PUT to storage with progress, then complete; storage failure is surfaced", async () => {
    const intent = { assetId: "a-1", uploadUrl: "https://minio.test/up", method: "PUT", requiredHeaders: { "content-type": "image/png" } };
    const h = harness((seen) => ({ body: seen.path.endsWith("/presign") ? intent : { id: "a-1", status: "READY" } }));
    const progress: number[] = [];
    const sent: unknown[] = [];
    class FakeXhr {
      upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
      onload?: () => void; onerror?: () => void; status = 200;
      headers: Record<string, string> = {};
      open(method: string, url: string) { sent.push([method, url]); }
      setRequestHeader(name: string, value: string) { this.headers[name] = value; }
      send() { this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 }); this.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 }); this.onload?.(); }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    try {
      const view = renderHook(() => hooks.useUploadMedia(h.client, "c-1"), { wrapper: h.wrapper });
      const file = new Blob(["x"], { type: "image/png" });
      await act(async () => { await view.result.current.mutateAsync({ file, filename: "a.png", onProgress: (fraction) => progress.push(fraction) }); });
      expect(sent).toEqual([["PUT", "https://minio.test/up"]]);
      expect(progress).toEqual([0.5, 1]);
      expect(h.calls.map((call) => call.path)).toEqual(["/media/uploads/presign", "/media/uploads/a-1/complete"]);

      FakeXhr.prototype.send = function send(this: FakeXhr) { this.status = 403; this.onload?.(); };
      await expect(hooks.uploadToPresignedUrl(intent as never, file, () => undefined)).rejects.toMatchObject({ name: "UploadError", status: 403 });
      FakeXhr.prototype.send = function send(this: FakeXhr) { this.onerror?.(); };
      await expect(hooks.uploadToPresignedUrl(intent as never, file, () => undefined)).rejects.toThrow("HTTP 0");
    } finally { vi.unstubAllGlobals(); }
  });
});

describe("guest and notification hooks", () => {
  it("guest credential is a Bearer on rsvp reads and never part of the cache key", async () => {
    const h = harness(() => ({ body: { status: "PENDING", editable: true } }));
    const seen = await runQuery(h, () => hooks.useGuestRsvp(h.client, "c-1", "secret-token"));
    expect(seen.path).toBe("/rsvp/celebrations/c-1/rsvp"); expect(seen.headers.get("authorization")).toBe("Bearer secret-token");
    expect(JSON.stringify(h.queryClient.getQueryCache().getAll().map((query) => query.queryKey))).not.toContain("secret-token");
    const resource = harness(); expect((await runQuery(resource, () => hooks.useGuestResource(resource.client, "c-1", "t"))).path).toBe("/rsvp/celebrations/c-1/guest");
    const resolve = harness(); expect(await runQuery(resolve, () => hooks.useResolveGuestCredential(resolve.client, "t"))).toMatchObject({ method: "POST", path: "/rsvp/resolve" });
    const settings = harness(); expect((await runQuery(settings, () => hooks.usePublicRegistrationSettings(settings.client, "c-1"))).path).toBe("/rsvp/celebrations/c-1/public-settings");
    const bySlug = harness(); expect((await runQuery(bySlug, () => hooks.useCelebrationBySlug(bySlug.client, "ana-y-luis"))).path).toBe("/celebrations/public/ana-y-luis");
  });

  it("first answer is a POST; an answer that already exists turns into a PATCH with the same key; edits are PATCH", async () => {
    const first = harness();
    const seen = await runMutation(first, () => hooks.useSaveGuestRsvp(first.client, "c-1", "tok"), { current: { status: "PENDING", editable: true } as never, input: { status: "CONFIRMED" } as never, idempotencyKey: "k-1" });
    expect(seen).toMatchObject({ method: "POST", path: "/rsvp/celebrations/c-1/rsvp" }); expect(seen.headers.get("idempotency-key")).toBe("k-1");

    const raced = harness((call) => (call.method === "POST" ? { status: 409, body: { title: "exists", status: 409, code: "RsvpAlreadyExists" } } : { body: { status: "CONFIRMED", editable: true } }));
    await runMutation(raced, () => hooks.useSaveGuestRsvp(raced.client, "c-1", "tok"), { current: { status: "PENDING", editable: true } as never, input: { status: "CONFIRMED" } as never, idempotencyKey: "k-2" });
    expect(raced.calls.map((call) => call.method)).toEqual(["POST", "PATCH"]);
    expect(raced.calls[1]?.headers.get("idempotency-key")).toBe("k-2");

    const edit = harness();
    await runMutation(edit, () => hooks.useSaveGuestRsvp(edit.client, "c-1", "tok"), { current: { status: "CONFIRMED", editable: true } as never, input: { status: "DECLINED" } as never, idempotencyKey: "k-3" });
    expect(edit.calls[0]?.method).toBe("PATCH");

    const closed = harness(() => ({ status: 409, body: { title: "closed", status: 409, code: "RsvpWindowClosed" } }));
    const view = renderHook(() => hooks.useSaveGuestRsvp(closed.client, "c-1", "tok"), { wrapper: closed.wrapper });
    await act(async () => { await expect(view.result.current.mutateAsync({ current: { status: "PENDING", editable: true } as never, input: {} as never, idempotencyKey: "k-4" })).rejects.toBeInstanceOf(ApiError); });
    expect(closed.calls).toHaveLength(1);
  });

  it("public registration sends the idempotency key without any session", async () => {
    const h = harness();
    const seen = await runMutation(h, () => hooks.useRegisterUnregistered(h.client, "c-1"), { input: { name: "Pedro", email: "p@x.com", consent: true } as never, idempotencyKey: "k-9" });
    expect(seen).toMatchObject({ method: "POST", path: "/rsvp/celebrations/c-1/unregistered" });
    expect(seen.headers.get("idempotency-key")).toBe("k-9"); expect(seen.headers.get("authorization")).toBeNull();
  });

  it("host guest reads and writes use the /guests routes; registering and importing sync recipients once", async () => {
    const reads: [string, (h: ReturnType<typeof harness>) => unknown][] = [
      ["/guests/celebrations/c-1/guest-list?status=CONFIRMED&limit=10", (h) => hooks.useGuestList(h.client, "c-1", { status: "CONFIRMED", limit: 10 })],
      ["/guests/celebrations/c-1/guest-summary", (h) => hooks.useGuestSummary(h.client, "c-1")],
      ["/guests/celebrations/c-1/rsvps?limit=1000&offset=0", (h) => hooks.useHostRsvps(h.client, "c-1")],
      ["/guests/celebrations/c-1/guests/g-1", (h) => hooks.useGuestDetail(h.client, "c-1", "g-1")],
      ["/guests/celebrations/c-1/groups?limit=1000", (h) => hooks.useGuestGroups(h.client, "c-1")],
      ["/guests/celebrations/c-1/companion-requests?limit=100", (h) => hooks.useCompanionRequests(h.client, "c-1")]
    ];
    for (const [path, use] of reads) { const h = harness(() => ({ body: { items: [], total: 0 } })); expect((await runQuery(h, () => use(h))).path).toBe(path); }

    const register = harness();
    await runMutation(register, () => hooks.useRegisterGuest(register.client, "c-1"), { name: "Ana" } as never);
    await waitFor(() => expect(register.calls.map((call) => `${call.method} ${call.path}`)).toContain("PUT /notifications/celebrations/c-1/recipients"));
    expect(register.calls[0]).toMatchObject({ method: "POST", path: "/guests/celebrations/c-1/guests" });

    const failingSync = harness((call) => (call.path.includes("/recipients") ? { status: 500, body: { title: "x", status: 500 } } : { body: {} }));
    await runMutation(failingSync, () => hooks.useImportGuests(failingSync.client, "c-1"), "name\nAna");
    expect(failingSync.calls[0]).toMatchObject({ path: "/guests/celebrations/c-1/guests/import", body: { csv: "name\nAna" } });
  });

  it("group, token and companion decisions", async () => {
    const group = harness(); expect(await runMutation(group, () => hooks.useChangeGuestGroup(group.client, "c-1"), { guestId: "g-1", groupId: null })).toMatchObject({ method: "PATCH", body: { groupId: null } });
    const created = harness(); expect(await runMutation(created, () => hooks.useCreateGuestGroup(created.client, "c-1"), "Familia")).toMatchObject({ path: "/guests/celebrations/c-1/groups", body: { name: "Familia" } });
    const issue = harness(); expect((await runMutation(issue, () => hooks.useIssueGuestToken(issue.client, "c-1"), "g-1")).path).toBe("/guests/celebrations/c-1/guests/g-1/access-token");
    const revoke = harness(() => ({ status: 204 })); expect((await runMutation(revoke, () => hooks.useRevokeGuestToken(revoke.client, "c-1"), "g-1")).method).toBe("DELETE");
    const decide = harness(); expect(await runMutation(decide, () => hooks.useResolveCompanionRequest(decide.client, "c-1"), { requestId: "r-1", decision: "APPROVED" as const })).toMatchObject({ path: "/guests/celebrations/c-1/companion-requests/r-1/decision", body: { decision: "APPROVED" } });
  });

  it("retryTransient only retries network and 5xx failures once", () => {
    expect(hooks.retryTransient(0, toApiError(404, "t", { title: "x", status: 404 }))).toBe(false);
    expect(hooks.retryTransient(0, toApiError(429, "t", { title: "x", status: 429 }))).toBe(true);
    expect(hooks.retryTransient(0, toApiError(503, "t", { title: "x", status: 503 }))).toBe(true);
    expect(hooks.retryTransient(1, toApiError(503, "t", { title: "x", status: 503 }))).toBe(false);
    expect(hooks.retryTransient(0, new TypeError("network"))).toBe(true);
  });

  it("notifications: inbox, preferences (optimistic, rolled back on failure), mark read, devices", async () => {
    const inbox = harness(() => ({ body: { items: [] } })); expect((await runQuery(inbox, () => hooks.useHostNotifications(inbox.client, "c-1"))).path).toBe("/notifications/celebrations/c-1/notifications?limit=50");
    const devices = harness(() => ({ body: { items: [] } })); expect((await runQuery(devices, () => hooks.useHostDevices(devices.client, "c-1"))).path).toBe("/notifications/celebrations/c-1/devices");
    const register = harness(); expect(await runMutation(register, () => hooks.useRegisterHostDevice(register.client, "c-1"), { token: "x" } as never)).toMatchObject({ method: "POST", path: "/notifications/celebrations/c-1/devices" });
    const unregister = harness(() => ({ status: 204 })); expect(await runMutation(unregister, () => hooks.useUnregisterHostDevice(unregister.client, "c-1"), "d-1")).toMatchObject({ method: "DELETE", path: "/notifications/celebrations/c-1/devices/d-1" });
    const sync = harness(); expect(await runMutation(sync, () => hooks.useSyncHostRecipients(sync.client, "c-1"), undefined)).toMatchObject({ method: "PUT", path: "/notifications/celebrations/c-1/recipients" });

    const prefs = { channels: { EMAIL: true, PUSH: true }, eventTypes: { rsvpReceived: true }, quietHours: { start: "22:00", end: "07:00", source: "DEFAULT" } };
    const ok = harness((call) => ({ body: call.method === "PATCH" ? { ...prefs, channels: { EMAIL: false, PUSH: true } } : prefs }));
    const view = renderHook(() => ({ read: hooks.useHostNotificationPreferences(ok.client, "c-1"), update: hooks.useUpdateHostNotificationPreferences(ok.client, "c-1") }), { wrapper: ok.wrapper });
    await waitFor(() => expect(view.result.current.read.isSuccess).toBe(true));
    await act(async () => { await view.result.current.update.mutateAsync({ channels: { EMAIL: false }, quietHours: { start: "23:00", end: "07:00" } } as never); });
    expect(ok.calls.some((call) => call.method === "PATCH")).toBe(true);
    await waitFor(() => expect(view.result.current.read.data?.channels?.EMAIL).toBe(false));

    const failing = harness((call) => (call.method === "PATCH" ? { status: 500, body: { title: "x", status: 500 } } : { body: prefs }));
    const failView = renderHook(() => ({ read: hooks.useHostNotificationPreferences(failing.client, "c-1"), update: hooks.useUpdateHostNotificationPreferences(failing.client, "c-1") }), { wrapper: failing.wrapper });
    await waitFor(() => expect(failView.result.current.read.isSuccess).toBe(true));
    await act(async () => { await expect(failView.result.current.update.mutateAsync({ channels: { EMAIL: false }, quietHours: null } as never)).rejects.toBeInstanceOf(ApiError); });
    expect(failView.result.current.read.data?.channels?.EMAIL).toBe(true);

    const items = { items: [{ id: "n-1", readAt: null }, { id: "n-2", readAt: "2026-11-01T00:00:00Z" }] };
    const read = harness((call) => ({ body: call.method === "GET" ? items : {} }));
    const readView = renderHook(() => ({ inbox: hooks.useHostNotifications(read.client, "c-1"), mark: hooks.useMarkHostNotificationsRead(read.client, "c-1") }), { wrapper: read.wrapper });
    await waitFor(() => expect(readView.result.current.inbox.isSuccess).toBe(true));
    await act(async () => { await readView.result.current.mark.mutateAsync(["n-1", "n-2"]); });
    expect(read.calls.filter((call) => call.method === "POST").map((call) => call.path)).toEqual(["/notifications/celebrations/c-1/notifications/n-1/read", "/notifications/celebrations/c-1/notifications/n-2/read"]);
  });
});

describe("csv exports", () => {
  it("neutralizes formula starters and quotes per RFC 4180", () => {
    expect(hooks.csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(hooks.csvCell("+591")).toBe("'+591");
    expect(hooks.csvCell("@user")).toBe("'@user");
    expect(hooks.csvCell('di "hola", amigo')).toBe('"di ""hola"", amigo"');
    expect(hooks.csvCell(null)).toBe(""); expect(hooks.csvCell(7)).toBe("7");
    expect(hooks.csvCell("=1,2")).toBe("\"'=1,2\"");
    expect(hooks.toCsv(["a", "b"], [[1, "x,y"]])).toBe("a,b\r\n1,\"x,y\"\r\n");
  });

  it("report rows join dietary notes by guest and the pending filter keeps only reviewable requests", () => {
    const guests = [{ guestId: "g-1", name: "Ana", email: null, phone: "+59170000000", status: "CONFIRMED", allowedCompanions: 2, requestedCompanions: 1, approvedCompanions: 1 }, { guestId: "g-2", name: "Luis", email: "l@x.com", status: "PENDING", allowedCompanions: 0, requestedCompanions: 0, approvedCompanions: 0 }] as never;
    const rsvps = [{ guestId: "g-1", dietaryNotes: "vegano", message: "felicidades" }] as never;
    expect(hooks.rsvpReportRows(guests, rsvps)).toEqual([["Ana", "", "+59170000000", "CONFIRMED", 2, 1, 1, "vegano", "felicidades"], ["Luis", "l@x.com", "", "PENDING", 0, 0, 0, "", ""]]);
    expect(hooks.pendingRequests([{ status: "PENDING_REVIEW" }, { status: "APPROVED" }] as never)).toHaveLength(1);
  });

  it("walks every page of guests and RSVPs, then builds the report with the status filter", async () => {
    const guest = (n: number) => ({ guestId: `g-${n}`, name: `Invitado ${n}`, email: null, phone: null, status: "CONFIRMED", allowedCompanions: 0, requestedCompanions: 0, approvedCompanions: 0 });
    const list = vi.fn(async (_id: string, query: { limit: number; offset: number; status?: string }) => ({ total: 150, items: Array.from({ length: Math.min(query.limit, 150 - query.offset) }, (_, i) => guest(query.offset + i)) }));
    const rsvps = vi.fn(async () => ({ items: [{ guestId: "g-0", dietaryNotes: "sin gluten", message: null }] }));
    const csv = await hooks.buildRsvpReportCsv({ list, rsvps } as never, "c-1", [...hooks.RSVP_REPORT_COLUMNS], "CONFIRMED");
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1]?.[1]).toMatchObject({ offset: 100, status: "CONFIRMED" });
    expect(csv.split("\r\n")).toHaveLength(150 + 2);
    expect(csv).toContain("Invitado 0,,,CONFIRMED,0,0,0,sin gluten,");
  });

  it("catering sheet follows the cursor and drops the message column when it is not requested", async () => {
    const pages = [{ items: [{ guestId: "k-1", groupId: "G", status: "CONFIRMED", partySize: 2, dietaryNotes: "vegano", message: "hola" }], nextCursor: "c2" }, { items: [{ guestId: "k-2", groupId: null, status: "CONFIRMED", partySize: 1, dietaryNotes: null, message: null }] }];
    const catering = vi.fn(async (_id: string, _query: unknown) => pages[catering.mock.calls.length - 1] as never);
    const withMessage = await hooks.buildCateringCsv({ catering }, "c-1", [...hooks.CATERING_COLUMNS], { withNotesOnly: false, includeMessage: true });
    expect(catering.mock.calls[1]?.[1]).toMatchObject({ cursor: "c2", status: "CONFIRMED" });
    expect(withMessage).toBe("guestKey,group,status,partySize,dietaryNotes,message\r\nk-1,G,CONFIRMED,2,vegano,hola\r\nk-2,,CONFIRMED,1,,\r\n");
    catering.mockClear();
    const without = await hooks.buildCateringCsv({ catering }, "c-1", [...hooks.CATERING_COLUMNS], { withNotesOnly: true, includeMessage: false });
    expect(without.split("\r\n")[0]).toBe("guestKey,group,status,partySize,dietaryNotes");
  });
});

describe("platform admin hooks (expected contract, ADMIN only)", () => {
  it("reads: categories, geography, queues by status, metrics range, users search, organizations, summaries", async () => {
    const check = async (use: (h: ReturnType<typeof harness>) => unknown, path: string) => { const h = harness(() => ({ body: { items: [] } })); expect((await runQuery(h, () => use(h))).path).toBe(path); };
    await check((h) => admin.useAdminCategories(h.client), "/providers/admin/categories");
    await check((h) => admin.useAdminGeography(h.client), "/providers/admin/geography");
    await check((h) => admin.useVerificationQueue(h.client), "/providers/admin/verification-queue?status=PENDING");
    await check((h) => admin.useVerificationQueue(h.client, "SUSPENDED"), "/providers/admin/verification-queue?status=SUSPENDED");
    await check((h) => admin.useModerationQueue(h.client, "REJECTED"), "/providers/admin/moderation?status=REJECTED");
    await check((h) => admin.useLeadMetrics(h.client, { groupBy: "category", from: "2026-10-01", to: "2026-10-31" }), "/providers/admin/metrics/leads?groupBy=category&from=2026-10-01&to=2026-10-31");
    await check((h) => admin.useAdminUsers(h.client, "  ana "), "/identity/admin/users?query=ana");
    await check((h) => admin.useAdminUsers(h.client, ""), "/identity/admin/users");
    await check((h) => admin.useAdminOrganizations(h.client), "/identity/admin/organizations");
    await check((h) => admin.useOrganization(h.client, "o 1"), "/identity/organizations/o%201");
    await check((h) => admin.useProviderSummary(h.client), "/providers/admin/summary");
    await check((h) => admin.useIdentitySummary(h.client), "/identity/admin/summary");
    const off = harness(); renderHook(() => admin.useLeadMetrics(off.client, { groupBy: "partner", from: "a", to: "b", enabled: false }), { wrapper: off.wrapper }); renderHook(() => admin.useOrganization(off.client, ""), { wrapper: off.wrapper });
    expect(off.calls).toHaveLength(0);
  });

  it("writes: upserts strip the code from the body; verification and moderation send a reason only when rejecting/suspending", async () => {
    const cat = harness(); expect(await runMutation(cat, () => admin.useUpsertCategory(cat.client), { code: "FLORISTS", names: { "es-BO": "Floristerías" }, active: true })).toMatchObject({ method: "PUT", path: "/providers/admin/categories/FLORISTS", body: { names: { "es-BO": "Floristerías" }, active: true } });
    const geo = harness(); expect(await runMutation(geo, () => admin.useUpsertGeoEntry(geo.client), { code: "nueva", kind: "CITY", parentCode: "CB", names: { "es-BO": "Nueva" }, active: true, latitude: -17.5, longitude: -66.1 })).toMatchObject({ path: "/providers/admin/geography/nueva", body: { kind: "CITY", latitude: -17.5, longitude: -66.1 } });
    const verify = harness(); const verified = await runMutation(verify, () => admin.useVerificationAction(verify.client), { providerId: "p-1", action: "verify" as const });
    expect(verified).toMatchObject({ method: "POST", path: "/providers/p-1/verify" }); expect(verified.body).toBeUndefined();
    const reject = harness(); expect(await runMutation(reject, () => admin.useVerificationAction(reject.client), { providerId: "p-1", action: "reject" as const, reason: "Falta RUC" })).toMatchObject({ path: "/providers/p-1/reject", body: { reason: "Falta RUC" } });
    const suspend = harness(); expect((await runMutation(suspend, () => admin.useVerificationAction(suspend.client), { providerId: "p-1", action: "suspend" as const })).body).toEqual({ reason: "" });
    const approve = harness(); const approved = await runMutation(approve, () => admin.useModerationDecision(approve.client), { id: "m-1", decision: "approve" as const });
    expect(approved).toMatchObject({ path: "/providers/admin/moderation/m-1/approve" }); expect(approved.body).toBeUndefined();
    const decline = harness(); expect(await runMutation(decline, () => admin.useModerationDecision(decline.client), { id: "m-1", decision: "reject" as const, reason: "Spam" })).toMatchObject({ path: "/providers/admin/moderation/m-1/reject", body: { reason: "Spam" } });
  });

  it("a 403 reaches the screen as an ApiError (non-admin) and is not retried", async () => {
    const h = harness(() => ({ status: 403, body: { title: "Forbidden", status: 403 } }));
    const view = renderHook(() => admin.useProviderSummary(h.client), { wrapper: h.wrapper });
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    expect((view.result.current.error as ApiError).status).toBe(403);
    expect(h.calls).toHaveLength(1);
  });
});
