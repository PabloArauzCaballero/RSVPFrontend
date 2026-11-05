import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import {
  buildCateringCsv, classifyRsvpError, countdownTo, csvCell, maskSecret, newIdempotencyKey, queryKeys, rsvpReportRows, rsvpScreenFor, toCsv, tokenFingerprint,
  useChangeGuestGroup, useCompanionRequests, useGuestGroups, useGuestList, useGuestRsvp, useGuestSummary, useHostNotificationPreferences, useImportGuests, useIssueGuestToken, useRegisterGuest, useRegisterUnregistered,
  useMarkHostNotificationsRead, usePublicRegistrationSettings, useResolveCompanionRequest, useResolveGuestCredential, useRevokeGuestToken, useSaveGuestRsvp, useUpdateHostNotificationPreferences, type RsvpState
} from "../src/index.js";

const TOKEN = "T".repeat(43);
const CELEBRATION = "11111111-1111-4111-8111-111111111111";
interface Call { method: string; path: string; headers: Headers; body: unknown }
type Reply = { status?: number; body?: unknown; headers?: Record<string, string> } | "network";

function setup(reply: (call: Call) => Reply = () => ({ body: {} })) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Call = { method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const result = reply(call);
    if (result === "network") throw new TypeError("Failed to fetch");
    const status = result.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(result.body ?? {}), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json", ...result.headers } });
  }) as unknown as typeof fetch;
  const client = createApiClient({
    baseUrl: "http://gw.test", fetchFn, refreshSession: { refresh: async () => { throw new Error("no refresh"); } },
    tokenStore: { getAccessToken: async () => "host-jwt", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { client, calls, queryClient, wrapper };
}

const state = (patch: Partial<RsvpState> = {}): RsvpState => ({
  guestId: "g-1", celebrationId: CELEBRATION, status: "PENDING", dietaryNotes: null, message: null, version: 0, updatedAt: null, deadline: "2026-12-10T03:59:00.000Z",
  timeZone: "America/La_Paz", editable: true, requestedCompanions: 0, approvedCompanions: 0, respondedAt: null, ...patch
});

describe("REQ-F15-01 · the guest reads and writes the real contract routes with the opaque token as Bearer", () => {
  it("GET /rsvp/celebrations/{id}/rsvp: Authorization Bearer, no JWT, no token in the URL or the query key", async () => {
    const { client, calls, wrapper, queryClient } = setup(() => ({ body: state() }));
    const read = renderHook(() => useGuestRsvp(client, CELEBRATION, TOKEN), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(calls[0]).toMatchObject({ method: "GET", path: `/rsvp/celebrations/${CELEBRATION}/rsvp` });
    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(calls[0]?.path).not.toContain(TOKEN);
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.queryKey))).not.toContain(TOKEN);
  });

  it("a first answer is POST with status/requestedCompanions and an Idempotency-Key; the cache takes the server state", async () => {
    const saved = state({ status: "CONFIRMED", version: 1, requestedCompanions: 1 });
    const { client, calls, wrapper, queryClient } = setup(() => ({ status: 201, body: saved }));
    const save = renderHook(() => useSaveGuestRsvp(client, CELEBRATION, TOKEN), { wrapper });
    await act(() => save.result.current.mutateAsync({ current: state(), input: { status: "CONFIRMED", requestedCompanions: 1, dietaryNotes: "vegano", message: null }, idempotencyKey: "key-1" }));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "POST", path: `/rsvp/celebrations/${CELEBRATION}/rsvp`, body: { status: "CONFIRMED", requestedCompanions: 1, dietaryNotes: "vegano", message: null } });
    expect(calls[0]?.headers.get("idempotency-key")).toBe("key-1");
    expect(queryClient.getQueryData(queryKeys.guest.rsvp(CELEBRATION, tokenFingerprint(TOKEN)))).toEqual(saved);
  });

  it("an edit is PATCH; a create that lost the race to another tab (409 RsvpAlreadyExists) is re-applied as PATCH", async () => {
    const { client, calls, wrapper } = setup((call) => (call.method === "POST" ? { status: 409, body: { type: "x", title: "exists", status: 409, code: "RsvpAlreadyExists" } } : { body: state({ status: "DECLINED", version: 2 }) }));
    const save = renderHook(() => useSaveGuestRsvp(client, CELEBRATION, TOKEN), { wrapper });
    await act(() => save.result.current.mutateAsync({ current: state({ status: "CONFIRMED", version: 1 }), input: { status: "DECLINED", requestedCompanions: 0 }, idempotencyKey: "k" }));
    expect(calls.map((call) => call.method)).toEqual(["PATCH"]);
    await act(() => save.result.current.mutateAsync({ current: state(), input: { status: "DECLINED", requestedCompanions: 0 }, idempotencyKey: "k2" }));
    expect(calls.map((call) => call.method)).toEqual(["PATCH", "POST", "PATCH"]);
  });
});

describe("REQ-F15-02/03/04 · screen derivation and error taxonomy", () => {
  it("guest / confirmed / closed come from the backend state, not from the client clock", () => {
    expect(rsvpScreenFor(state())).toBe("guest");
    expect(rsvpScreenFor(state({ status: "CONFIRMED", version: 1 }))).toBe("confirmed");
    expect(rsvpScreenFor(state({ status: "CONFIRMED", version: 1, editable: false }))).toBe("closed");
    expect(rsvpScreenFor(state({ editable: false }))).toBe("closed");
  });

  it("countdown uses absolute instants and is null once the deadline passed", () => {
    const now = Date.parse("2026-12-08T00:00:00Z");
    expect(countdownTo("2026-12-10T03:59:00Z", now)).toEqual({ days: 2, hours: 3, minutes: 59 });
    expect(countdownTo("2026-12-07T00:00:00Z", now)).toBeNull();
    expect(countdownTo(null, now)).toBeNull();
  });

  it("maps 401/404 → invalid, 403 → restricted, 409 → closed (with deadlineLocal) / exists / conflict, 422 → validation, 429 → rate-limited, network → offline", async () => {
    const outcome = async (reply: Reply) => {
      const { client, wrapper } = setup(() => reply);
      const save = renderHook(() => useRegisterUnregistered(client, CELEBRATION), { wrapper });
      let failure: unknown;
      await act(async () => { try { await save.result.current.mutateAsync({ input: { name: "A", email: "a@b.co", consent: true }, idempotencyKey: "k" }); } catch (error) { failure = error; } });
      return classifyRsvpError(failure);
    };
    expect(await outcome({ status: 401, body: { title: "x", status: 401 } })).toEqual({ kind: "invalid" });
    expect(await outcome({ status: 404, body: { title: "x", status: 404 } })).toEqual({ kind: "invalid" });
    expect(await outcome({ status: 403, body: { title: "x", status: 403 } })).toEqual({ kind: "restricted" });
    expect(await outcome({ status: 409, body: { title: "x", status: 409, code: "RsvpWindowClosed", deadline: "2026-12-10T03:59:00Z", deadlineLocal: "9 dic 2026, 23:59", timeZone: "America/La_Paz" } }))
      .toEqual({ kind: "closed", deadline: "2026-12-10T03:59:00Z", deadlineLocal: "9 dic 2026, 23:59", timeZone: "America/La_Paz" });
    expect(await outcome({ status: 409, body: { title: "x", status: 409, code: "RsvpAlreadyExists" } })).toEqual({ kind: "exists" });
    expect(await outcome({ status: 409, body: { title: "x", status: 409, code: "IdempotencyConflict" } })).toEqual({ kind: "conflict" });
    expect(await outcome({ status: 422, body: { title: "x", status: 422, field: "email" } })).toEqual({ kind: "validation", field: "email" });
    expect(await outcome({ status: 429, body: { title: "x", status: 429 }, headers: { "retry-after": "17" } })).toEqual({ kind: "rate-limited", retryAfterSeconds: 17 });
    expect(await outcome({ status: 503, body: { title: "x", status: 503 } })).toEqual({ kind: "unavailable" });
    expect(await outcome("network")).toEqual({ kind: "offline" });
  });
});

describe("REQ-F15-05 · public registration", () => {
  it("POST /rsvp/celebrations/{id}/unregistered without any Authorization, with the mandatory Idempotency-Key", async () => {
    const { client, calls, wrapper } = setup(() => ({ status: 201, body: { receipt: "ACCEPTED", replayed: false, accessToken: { token: TOKEN, expiresAt: "2026-12-30T00:00:00Z" } } }));
    const register = renderHook(() => useRegisterUnregistered(client, CELEBRATION), { wrapper });
    const receipt = await act(() => register.result.current.mutateAsync({ input: { name: "Ana", email: "ana@example.com", consent: true, requestedCompanions: 0 }, idempotencyKey: "reg-1" }));
    expect(calls[0]).toMatchObject({ method: "POST", path: `/rsvp/celebrations/${CELEBRATION}/unregistered`, body: { name: "Ana", email: "ana@example.com", consent: true, requestedCompanions: 0 } });
    expect(calls[0]?.headers.get("idempotency-key")).toBe("reg-1");
    expect(calls[0]?.headers.get("authorization")).toBeNull();
    expect(receipt.accessToken?.token).toBe(TOKEN);
  });
});

describe("REQ-F15-06 · a lost connection keeps the draft and a retry reuses the Idempotency-Key", () => {
  it("first attempt fails offline, the retry carries the same key and succeeds once", async () => {
    let attempt = 0;
    const { client, calls, wrapper } = setup(() => (++attempt === 1 ? "network" : { status: 201, body: state({ status: "CONFIRMED", version: 1 }) }));
    const save = renderHook(() => useSaveGuestRsvp(client, CELEBRATION, TOKEN), { wrapper });
    const variables = { current: state(), input: { status: "CONFIRMED" as const, requestedCompanions: 0 }, idempotencyKey: newIdempotencyKey() };
    await act(async () => { await expect(save.result.current.mutateAsync(variables)).rejects.toBeTruthy(); });
    await act(() => save.result.current.mutateAsync(variables));
    expect(calls.map((call) => call.headers.get("idempotency-key"))).toEqual([variables.idempotencyKey, variables.idempotencyKey]);
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
  it("the token fingerprint is short and does not contain the token", () => {
    expect(tokenFingerprint(TOKEN)).not.toContain("T".repeat(5));
    expect(tokenFingerprint(TOKEN)).toBe(tokenFingerprint(TOKEN));
    expect(tokenFingerprint(TOKEN)).not.toBe(tokenFingerprint("U".repeat(43)));
  });
});

describe("REQ-F16 · host guest surface on /guests/celebrations/{id}/…", () => {
  it("REQ-F16-01 · list sends status/search/paging to the read model", async () => {
    const { client, calls, wrapper } = setup(() => ({ body: { items: [], total: 0, limit: 50, offset: 0, freshness: {} } }));
    renderHook(() => useGuestList(client, CELEBRATION, { status: "PENDING", search: "ana", limit: 50, offset: 0 }), { wrapper });
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.path).toBe(`/guests/celebrations/${CELEBRATION}/guest-list?status=PENDING&search=ana&limit=50&offset=0`);
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer host-jwt");
  });
  it("REQ-F16-02/03 · register one guest and import CSV; both refresh the list and summary", async () => {
    const { client, calls, wrapper, queryClient } = setup(() => ({ status: 201, body: {} }));
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const register = renderHook(() => useRegisterGuest(client, CELEBRATION), { wrapper });
    const importCsv = renderHook(() => useImportGuests(client, CELEBRATION), { wrapper });
    await act(async () => { await register.result.current.mutateAsync({ name: "Ana", email: "ana@example.com", allowedCompanions: 1 }); await importCsv.result.current.mutateAsync("name,email\n"); });
    const writes = calls.filter((call) => call.method !== "GET");
    // Each registration/import is followed by exactly ONE bulk recipient synchronization (PUT), never one call per guest.
    expect(writes.map((call) => `${call.method} ${call.path}`)).toEqual([
      `POST /guests/celebrations/${CELEBRATION}/guests`, `PUT /notifications/celebrations/${CELEBRATION}/recipients`,
      `POST /guests/celebrations/${CELEBRATION}/guests/import`, `PUT /notifications/celebrations/${CELEBRATION}/recipients`
    ]);
    expect(writes[2]?.body).toEqual({ csv: "name,email\n" });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.guest.summary(CELEBRATION) });
  });
  it("REQ-F16-05 · issue (POST) and revoke (DELETE) the personal link; the secret is not cached by the hook", async () => {
    const { client, calls, wrapper, queryClient } = setup((call) => (call.method === "DELETE" ? { status: 204 } : { status: 201, body: { token: TOKEN, expiresAt: "2026-12-30T00:00:00Z" } }));
    const issue = renderHook(() => useIssueGuestToken(client, CELEBRATION), { wrapper });
    const revoke = renderHook(() => useRevokeGuestToken(client, CELEBRATION), { wrapper });
    await act(async () => { await issue.result.current.mutateAsync("g-1"); await revoke.result.current.mutateAsync("g-1"); });
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([`POST /guests/celebrations/${CELEBRATION}/guests/g-1/access-token`, `DELETE /guests/celebrations/${CELEBRATION}/guests/g-1/access-token`]);
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.state.data))).not.toContain(TOKEN);
  });
  it("REQ-F16-06 · a secret is never rendered whole", () => {
    expect(maskSecret(TOKEN)).toBe("TTTT…TTTT");
    expect(maskSecret(TOKEN)).not.toBe(TOKEN);
    expect(maskSecret("short")).toBe("•••••");
  });
});

describe("REQ-F17 · summary, companion requests, CSV", () => {
  it("REQ-F17-06 · the summary is the backend read model, passed through untouched", async () => {
    const summary = { celebrationId: CELEBRATION, total: 10, confirmed: 4, declined: 1, pending: 5, companions: 3, openCompanionRequests: 7, freshness: { updatedAt: "2026-11-04T10:00:00Z", lastEventAt: null, pendingEvents: 2, oldestPendingAt: null, stale: false, consistencyWindowSeconds: 5 } };
    const { client, calls, wrapper } = setup(() => ({ body: summary }));
    const view = renderHook(() => useGuestSummary(client, CELEBRATION), { wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(view.result.current.data).toEqual(summary);
    expect(calls[0]?.path).toBe(`/guests/celebrations/${CELEBRATION}/guest-summary`);
  });
  it("REQ-F17-03 · list requests and decide APPROVED/REJECTED; a 409 still refreshes the list", async () => {
    const { client, calls, wrapper, queryClient } = setup((call) => (call.method === "POST" ? { status: 409, body: { title: "resolved", status: 409, code: "CompanionRequestResolved" } } : { body: { items: [], limit: 100, offset: 0 } }));
    renderHook(() => useCompanionRequests(client, CELEBRATION), { wrapper });
    await waitFor(() => expect(calls).toHaveLength(1));
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const decide = renderHook(() => useResolveCompanionRequest(client, CELEBRATION), { wrapper });
    await act(async () => { await expect(decide.result.current.mutateAsync({ requestId: "r-1", decision: "APPROVED" })).rejects.toBeTruthy(); });
    expect(calls[1]).toMatchObject({ method: "POST", path: `/guests/celebrations/${CELEBRATION}/companion-requests/r-1/decision`, body: { decision: "APPROVED" } });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.guest.companionRequests(CELEBRATION) });
  });
  it("REQ-F17-05 · CSV cells starting with = + - @ are neutralised and RFC 4180 quoting applies", () => {
    for (const evil of ["=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)", "\t=1", "\r=1"]) expect(csvCell(evil).replace(/^"/, "")).toMatch(/^'/);
    expect(csvCell("Ana, \"la\" novia")).toBe("\"Ana, \"\"la\"\" novia\"");
    expect(csvCell(null)).toBe("");
    expect(csvCell("normal")).toBe("normal");
    expect(csvCell(3)).toBe("3");
    expect(toCsv(["a", "b"], [["=cmd", "x\ny"]])).toBe("a,b\r\n'=cmd,\"x\ny\"\r\n");
  });
  it("REQ-F17-02 · the report joins the read-model list with each RSVP's dietary notes and message", () => {
    const guests = [{ guestId: "g1", celebrationId: CELEBRATION, name: "=Ana", email: "a@b.co", phone: null, locale: null, groupId: null, status: "CONFIRMED" as const, allowedCompanions: 2, requestedCompanions: 1, approvedCompanions: 1 }];
    const rsvps = [{ guestId: "g1", celebrationId: CELEBRATION, status: "CONFIRMED" as const, dietaryNotes: "vegano", message: "Felicidades", version: 1, updatedAt: null, requestedCompanions: 1, approvedCompanions: 1, respondedAt: null }];
    expect(toCsv(["name", "email", "phone", "status", "allowed", "requested", "approved", "dietaryNotes", "message"], rsvpReportRows(guests, rsvps))).toContain("'=Ana,a@b.co,,CONFIRMED,2,1,1,vegano,Felicidades");
  });
});

describe("REQ-F16-04 (contract v1.9.0) · groups are listed by the backend and a guest can be moved", () => {
  it("GET groups (with member counts) and PATCH guests/{id} {groupId} (null leaves the group)", async () => {
    const { client, calls, wrapper } = setup((call) => (call.method === "PATCH" ? { body: {} } : { body: { items: [{ id: "g1", celebrationId: CELEBRATION, name: "Familia", memberCount: 2 }], limit: 1000, offset: 0 } }));
    const groups = renderHook(() => useGuestGroups(client, CELEBRATION), { wrapper });
    await waitFor(() => expect(groups.result.current.isSuccess).toBe(true));
    expect(calls[0]?.path).toBe(`/guests/celebrations/${CELEBRATION}/groups?limit=1000`);
    const move = renderHook(() => useChangeGuestGroup(client, CELEBRATION), { wrapper });
    await act(async () => { await move.result.current.mutateAsync({ guestId: "gx", groupId: null }); });
    expect(calls.find((call) => call.method === "PATCH")).toMatchObject({ path: `/guests/celebrations/${CELEBRATION}/guests/gx`, body: { groupId: null } });
  });
});

describe("REQ-F17-05 (contract v1.9.0) · catering sheet from the keyset-paginated report, with no personal data", () => {
  it("follows nextCursor until it is null and writes safe CSV", async () => {
    const pages = [
      { items: [{ guestId: "a", groupId: null, status: "CONFIRMED", partySize: 2, dietaryNotes: "=SUM(1)" }], limit: 500, nextCursor: "a" },
      { items: [{ guestId: "b", groupId: "g1", status: "CONFIRMED", partySize: 1, dietaryNotes: "Sin gluten" }], limit: 500, nextCursor: null }
    ];
    const seen: unknown[] = [];
    const csv = await buildCateringCsv({ catering: async (_id, query) => { seen.push(query); return pages[seen.length - 1] as never; } }, CELEBRATION, ["k", "g", "s", "p", "d", "m"], { withNotesOnly: true, includeMessage: false });
    expect(seen).toEqual([{ status: "CONFIRMED", limit: 500, withNotesOnly: true, includeMessage: false }, { status: "CONFIRMED", limit: 500, withNotesOnly: true, includeMessage: false, cursor: "a" }]);
    expect(csv).toBe("k,g,s,p,d\r\na,,CONFIRMED,2,'=SUM(1)\r\nb,g1,CONFIRMED,1,Sin gluten\r\n");
  });
});

describe("REQ-F18 · notification preferences are read from and written to the backend, optimistically", () => {
  const prefs = { channels: { EMAIL: true, SMS: false, WHATSAPP: false, PUSH: true }, eventTypes: {}, quietHours: { start: 22, end: 8, source: "DEFAULT" as const } };
  it("REQ-F18-03/04 · PATCH /notifications/celebrations/{id}/preferences with the channel map; the saved answer wins", async () => {
    const { client, calls, wrapper, queryClient } = setup((call) => (call.method === "PATCH" ? { body: { ...prefs, channels: { ...prefs.channels, PUSH: false } } } : { body: prefs }));
    const read = renderHook(() => useHostNotificationPreferences(client, CELEBRATION), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    const update = renderHook(() => useUpdateHostNotificationPreferences(client, CELEBRATION), { wrapper });
    await act(() => update.result.current.mutateAsync({ channels: { PUSH: false } }));
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([`GET /notifications/celebrations/${CELEBRATION}/preferences`, `PATCH /notifications/celebrations/${CELEBRATION}/preferences`]);
    expect(calls[1]?.body).toEqual({ channels: { PUSH: false } });
    expect(queryClient.getQueryData<{ channels: Record<string, boolean> }>(queryKeys.notification.preferences(CELEBRATION))?.channels["PUSH"]).toBe(false);
  });
  it("REQ-F18-05 · optimistic toggle flips immediately and is reverted when the network fails", async () => {
    let fail = false;
    const { client, wrapper, queryClient } = setup((call) => (call.method === "PATCH" && fail ? "network" : { body: prefs }));
    const read = renderHook(() => useHostNotificationPreferences(client, CELEBRATION), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    fail = true;
    const update = renderHook(() => useUpdateHostNotificationPreferences(client, CELEBRATION), { wrapper });
    await act(async () => { update.result.current.mutate({ channels: { EMAIL: false } }); });
    await waitFor(() => expect(update.result.current.isError).toBe(true));
    expect(queryClient.getQueryData<{ channels: Record<string, boolean> }>(queryKeys.notification.preferences(CELEBRATION))?.channels["EMAIL"]).toBe(true);
  });
});

describe("contract 1.10.0 · POST /rsvp/resolve and GET public-settings", () => {
  it("resolves a legacy credential with the token only as Bearer (never in the URL or the key)", async () => {
    const { client, calls, wrapper, queryClient } = setup(() => ({ body: { celebrationId: CELEBRATION, slug: "ana-y-luis" } }));
    const read = renderHook(() => useResolveGuestCredential(client, TOKEN), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(calls[0]).toMatchObject({ method: "POST", path: "/rsvp/resolve" });
    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.queryKey))).not.toContain(TOKEN);
    expect(read.result.current.data).toEqual({ celebrationId: CELEBRATION, slug: "ana-y-luis" });
  });
  it("an unknown credential is the single 401 (no retry)", async () => {
    const { client, calls, wrapper } = setup(() => ({ status: 401, body: { title: "Unauthorized", status: 401 } }));
    const read = renderHook(() => useResolveGuestCredential(client, TOKEN), { wrapper });
    await waitFor(() => expect(read.result.current.isError).toBe(true));
    expect(calls).toHaveLength(1);
  });
  it("asks the public settings of the celebration without credentials", async () => {
    const { client, calls, wrapper } = setup(() => ({ body: { unregisteredRsvpMode: "RESTRICTED", publicRegistrationEnabled: false } }));
    const read = renderHook(() => usePublicRegistrationSettings(client, CELEBRATION), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(calls[0]).toMatchObject({ method: "GET", path: `/rsvp/celebrations/${CELEBRATION}/public-settings` });
    expect(calls[0]?.headers.get("authorization")).toBeNull();
    expect(read.result.current.data?.publicRegistrationEnabled).toBe(false);
  });
});

describe("contract 1.4.0 · read state lives on the server", () => {
  const inbox = { items: [{ id: "n-1", readAt: null }, { id: "n-2", readAt: null }] };
  it("marks each notice read with POST .../read; the inbox flips at once and is restored if it fails", async () => {
    let fail = false;
    const { client, calls, wrapper, queryClient } = setup((call) => (call.method === "POST" ? (fail ? { status: 500, body: {} } : { body: { id: "n", readAt: "2026-11-04T10:00:00Z" } }) : { body: inbox }));
    queryClient.setQueryData(queryKeys.notification.inbox(CELEBRATION), inbox);
    const mark = renderHook(() => useMarkHostNotificationsRead(client, CELEBRATION), { wrapper });
    await act(async () => { await mark.result.current.mutateAsync(["n-1", "n-2"]); });
    expect(calls.filter((call) => call.method === "POST").map((call) => call.path)).toEqual([`/notifications/celebrations/${CELEBRATION}/notifications/n-1/read`, `/notifications/celebrations/${CELEBRATION}/notifications/n-2/read`]);
    fail = true;
    queryClient.setQueryData(queryKeys.notification.inbox(CELEBRATION), inbox);
    await act(async () => { mark.result.current.mutate(["n-1"]); });
    await waitFor(() => expect(mark.result.current.isError).toBe(true));
    expect(queryClient.getQueryData<{ items: { readAt: string | null }[] }>(queryKeys.notification.inbox(CELEBRATION))?.items[0]?.readAt).toBeNull();
  });
});

import { useMyProviders, useUploadDocument } from "../src/index.js";
describe("provider-catalog 2.1.0 · mine and the three-step document upload", () => {
  it("GET /providers/mine", async () => {
    const { client, calls, wrapper } = setup(() => ({ body: { items: [{ id: "p1" }] } }));
    const read = renderHook(() => useMyProviders(client), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(calls[0]).toMatchObject({ method: "GET", path: "/providers/mine" });
  });
  it("registers, PUTs the bytes with the presigned headers, then completes", async () => {
    const order: string[] = [];
    const { client, calls, wrapper } = setup((call) => (call.path.endsWith("/documents") && call.method === "POST" ? { status: 201, body: { id: "d1", upload: { method: "PUT", url: "https://s3.test/x", headers: { "content-type": "application/pdf" }, expiresAt: "x" } } } : { body: { id: "d1", status: "UPLOADED" } }));
    const upload = renderHook(() => useUploadDocument(client, "p1"), { wrapper });
    await act(async () => { await upload.result.current.mutateAsync({ input: { kind: "TAX_ID", fileName: "nit.pdf", contentType: "application/pdf", sizeBytes: 10 }, put: async ({ url, headers }) => { order.push(`PUT ${url} ${headers["content-type"]}`); } }); });
    expect(order).toEqual(["PUT https://s3.test/x application/pdf"]);
    expect(calls.filter((call) => call.method !== "GET").map((call) => `${call.method} ${call.path}`)).toEqual(["POST /providers/p1/documents", "POST /providers/p1/documents/d1/complete"]);
  });
});
