import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient, toApiError } from "@rsvp/api-client";
import { createTranslator } from "@rsvp/i18n";
import { queryKeys, type GiftReservation } from "@rsvp/query-hooks";
import type { NotificationResponse } from "expo-notifications";
import { createGiftActionHandler, giftRequestPath, handleGiftPushAction, refreshGiftActionQueries } from "../src/push/actions";
import { GIFT_APPROVE, GIFT_REJECT, GIFT_CATEGORY, giftDecision, registerGiftCategories } from "../src/push/categories";
import { fakeClient, HttpFailure } from "./support";

const celebrationId = "11111111-1111-4111-8111-111111111111";
const reservationId = "22222222-2222-4222-8222-222222222222";
const target = { celebrationId, reservationId };
const prefix = `/gifts/celebrations/${celebrationId}`;
const pending: GiftReservation = { id: reservationId, celebrationId, itemId: "33333333-3333-4333-8333-333333333333", status: "PENDING_REVIEW", requestedAt: "2026-11-07T01:00:00Z" };
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("F20 · notification adapter with a fake platform driver and an explicit server resolver", () => {
  function native(actionIdentifier: string) {
    const response: NotificationResponse = { actionIdentifier, notification: { date: 0, request: { identifier: "delivery-1", trigger: null, content: {
      title: null, subtitle: null, body: null, badge: null, sound: null, categoryIdentifier: GIFT_CATEGORY, launchImageName: null, attachments: [], threadIdentifier: null,
      data: { notificationId: reservationId, url: "https://untrusted.invalid/approve", reservationId: "another-resource" }
    } } } };
    const driver = { defaultActionIdentifier: "DEFAULT", resolveTarget: vi.fn(async () => target), execute: vi.fn(async () => ({ kind: "applied" as const })), open: vi.fn() };
    return { response, driver };
  }
  it("a quick action uses the resolved target, executes and never opens the app", async () => {
    const { response, driver } = native(GIFT_APPROVE);
    expect(await handleGiftPushAction(response, driver)).toEqual({ kind: "applied" });
    expect(driver.execute).toHaveBeenCalledWith(target, GIFT_APPROVE);
    expect(driver.open).not.toHaveBeenCalled();
  });
  it("a body tap opens the exact detail from the resolver, ignoring URLs in push data", async () => {
    const { response, driver } = native("DEFAULT");
    expect(await handleGiftPushAction(response, driver)).toEqual({ kind: "opened" });
    expect(driver.open).toHaveBeenCalledWith(giftRequestPath(target));
    expect(driver.execute).not.toHaveBeenCalled();
  });
  it("without the server association it fails closed instead of guessing an event or reservation ID", async () => {
    const { response, driver } = native(GIFT_APPROVE);
    const missing = { ...driver, resolveTarget: vi.fn(async () => null) };
    expect(await handleGiftPushAction(response, missing)).toEqual({ kind: "missing" });
    expect(driver.execute).not.toHaveBeenCalled(); expect(driver.open).not.toHaveBeenCalled();
  });
  it("unrecognized categories/actions are ignored and a malformed notification ID is never resolved", async () => {
    const { response, driver } = native("arbitrary-action");
    expect(await handleGiftPushAction(response, driver)).toEqual({ kind: "ignored" });
    response.actionIdentifier = GIFT_APPROVE;
    response.notification.request.content.data.notificationId = "../id";
    expect(await handleGiftPushAction(response, driver)).toEqual({ kind: "invalid" });
    expect(driver.resolveTarget).not.toHaveBeenCalled();
  });
  it("an expired resolver session does not execute or navigate automatically", async () => {
    const { response, driver } = native(GIFT_APPROVE);
    driver.resolveTarget.mockRejectedValue(toApiError(401, "f20", { status: 401, title: "Session expired" }));
    expect(await handleGiftPushAction(response, driver)).toEqual({ kind: "sessionExpired" });
    expect(driver.execute).not.toHaveBeenCalled(); expect(driver.open).not.toHaveBeenCalled();
  });
});

describe("F20 · decision engine with explicit authorized resource reference", () => {
  it.each([[GIFT_APPROVE, "approve", "COMMITTED"], [GIFT_REJECT, "reject", "REJECTED"]] as const)("%s checks the resource, posts once and synchronizes", async (identifier, decision, status) => {
    const { client, calls } = fakeClient({
      [`GET ${prefix}/reservations`]: () => ({ items: [pending] }),
      [`POST ${prefix}/reservations/${reservationId}/${decision}`]: () => ({ ...pending, status })
    });
    const effects = { synchronize: vi.fn(async () => undefined), present: vi.fn(async () => undefined) };
    const result = await createGiftActionHandler(client, effects)(target, identifier);
    expect(result).toMatchObject({ kind: "applied", reservation: { id: reservationId, status } });
    expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(effects.synchronize).toHaveBeenCalledWith(celebrationId);
    expect(effects.present).toHaveBeenCalledWith(result);
  });

  it("coalesces a duplicate delivery and refuses an opposite in-flight action", async () => {
    const { client, calls } = fakeClient({
      [`GET ${prefix}/reservations`]: () => ({ items: [pending] }),
      [`POST ${prefix}/reservations/${reservationId}/approve`]: () => ({ ...pending, status: "COMMITTED" })
    });
    const execute = createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) });
    const first = execute(target, GIFT_APPROVE);
    expect(execute(target, GIFT_APPROVE)).toBe(first);
    expect(await execute(target, GIFT_REJECT)).toEqual({ kind: "busy" });
    expect((await first).kind).toBe("applied");
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("does not send a second decision for a resource already resolved on the server", async () => {
    const { client, calls } = fakeClient({ [`GET ${prefix}/reservations`]: () => ({ items: [{ ...pending, status: "REJECTED" }] }) });
    const result = await createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) })(target, GIFT_APPROVE);
    expect(result).toMatchObject({ kind: "resolved", reservation: { status: "REJECTED" } });
    expect(calls).toHaveLength(1);
  });

  it.each([false, true])("409 rereads the server; resolved=%s does not report a false success", async (resolved) => {
    let reads = 0;
    const { client, calls } = fakeClient({
      [`GET ${prefix}/reservations`]: () => ({ items: [{ ...pending, status: ++reads > 1 && resolved ? "COMMITTED" : "PENDING_REVIEW" }] }),
      [`POST ${prefix}/reservations/${reservationId}/approve`]: () => new HttpFailure(409, { code: "RESERVATION_NOT_PENDING" })
    });
    const result = await createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) })(target, GIFT_APPROVE);
    expect(result.kind).toBe(resolved ? "resolved" : "changed");
    expect(reads).toBe(2);
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("does not mutate a missing or foreign-celebration reservation", async () => {
    const { client, calls } = fakeClient({ [`GET ${prefix}/reservations`]: () => ({ items: [{ ...pending, celebrationId: reservationId }] }) });
    expect(await createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) })(target, GIFT_APPROVE)).toEqual({ kind: "missing" });
    expect(calls).toHaveLength(1);
  });

  it("rejects arbitrary action identifiers and malformed paths before transport", async () => {
    const { client, calls } = fakeClient({});
    const execute = createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) });
    expect(await execute(target, "https://example.invalid/approve")).toEqual({ kind: "invalid" });
    expect(await execute({ ...target, reservationId: "../approve" }, GIFT_APPROVE)).toEqual({ kind: "invalid" });
    expect(calls).toHaveLength(0);
  });

  it("keeps a committed result when synchronization or OS confirmation fails", async () => {
    const { client } = fakeClient({ [`GET ${prefix}/reservations`]: () => ({ items: [pending] }), [`POST ${prefix}/reservations/${reservationId}/approve`]: () => ({ ...pending, status: "COMMITTED" }) });
    const result = await createGiftActionHandler(client, { synchronize: async () => { throw new Error("offline"); }, present: async () => { throw new Error("system"); } })(target, GIFT_APPROVE);
    expect(result.kind).toBe("applied");
  });
});

describe("F20 · real API client + MSW transport (not live backend)", () => {
  function transport() {
    let access = "old-session";
    const refresh = vi.fn(async () => ({ accessToken: "renewed-session", refreshToken: "refresh-2", expiresIn: 3600 }));
    const client = createApiClient({ baseUrl: "https://f20.test", tokenStore: {
      getAccessToken: async () => access, getRefreshToken: async () => "refresh-1", setTokens: async (tokens) => { access = tokens.accessToken; }, clear: async () => { access = ""; }
    }, refreshSession: { refresh } });
    server.use(http.get(`https://f20.test${prefix}/reservations`, () => HttpResponse.json({ items: [pending] })));
    return { client, refresh };
  }

  it.each([[401, "sessionExpired"], [403, "forbidden"], [404, "missing"], [409, "changed"], [422, "invalid"], [429, "failed"], [503, "failed"]] as const)("POST %s yields %s and never reports approved", async (status, kind) => {
    const { client, refresh } = transport();
    refresh.mockRejectedValue(toApiError(401, "f20", { status: 401, title: "Expired" }));
    server.use(http.post(`https://f20.test${prefix}/reservations/${reservationId}/approve`, () => HttpResponse.json({ status, title: "Failure" }, { status })));
    expect((await createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) })(target, GIFT_APPROVE)).kind).toBe(kind);
  });

  it("a stale access token renews once and the retried request uses the new session", async () => {
    const { client, refresh } = transport();
    const authorizations: (string | null)[] = [];
    server.use(http.post(`https://f20.test${prefix}/reservations/${reservationId}/approve`, ({ request }) => {
      const auth = request.headers.get("authorization"); authorizations.push(auth);
      return auth === "Bearer renewed-session" ? HttpResponse.json({ ...pending, status: "COMMITTED" }) : HttpResponse.json({ status: 401 }, { status: 401 });
    }));
    expect((await createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) })(target, GIFT_APPROVE)).kind).toBe("applied");
    expect(refresh).toHaveBeenCalledOnce();
    expect(authorizations).toEqual(["Bearer old-session", "Bearer renewed-session"]);
  });

  it("a network loss returns an uncertain result; a subsequent delivery rereads committed state", async () => {
    const { client } = transport();
    let committed = false;
    server.use(
      http.get(`https://f20.test${prefix}/reservations`, () => HttpResponse.json({ items: [{ ...pending, status: committed ? "COMMITTED" : "PENDING_REVIEW" }] })),
      http.post(`https://f20.test${prefix}/reservations/${reservationId}/approve`, () => { committed = true; return HttpResponse.error(); })
    );
    const execute = createGiftActionHandler(client, { synchronize: vi.fn(async () => undefined) });
    expect((await execute(target, GIFT_APPROVE)).kind).toBe("failed");
    expect((await execute(target, GIFT_APPROVE)).kind).toBe("resolved");
  });

  it("two independent clients racing to approve observe one commit and an already-resolved outcome", async () => {
    const { client } = transport();
    let commits = 0;
    let reads = 0;
    let release = (): void => undefined;
    const bothReading = new Promise<void>((done) => { release = done; });
    server.use(
      http.get(`https://f20.test${prefix}/reservations`, async () => {
        const snapshot = { ...pending, status: commits ? "COMMITTED" : "PENDING_REVIEW" };
        reads += 1;
        if (reads === 2) release();
        if (reads <= 2) await bothReading;
        return HttpResponse.json({ items: [snapshot] });
      }),
      http.post(`https://f20.test${prefix}/reservations/${reservationId}/approve`, () => {
        if (commits) return HttpResponse.json({ status: 409, code: "RESERVATION_NOT_PENDING" }, { status: 409 });
        commits += 1;
        return HttpResponse.json({ ...pending, status: "COMMITTED" });
      })
    );
    const effects = { synchronize: vi.fn(async () => undefined) };
    const first = createGiftActionHandler(client, effects);
    const second = createGiftActionHandler(client, effects);
    const results = await Promise.all([first(target, GIFT_APPROVE), second(target, GIFT_APPROVE)]);
    expect(commits).toBe(1);
    expect(results.map((result) => result.kind).sort()).toEqual(["applied", "resolved"]);
  });
});

it("F20 · driver categories localize actions without forcing the UI into the foreground", async () => {
  const driver = { setNotificationCategoryAsync: vi.fn(async () => null) };
  await registerGiftCategories(createTranslator("es-BO"), driver);
  expect(driver.setNotificationCategoryAsync).toHaveBeenCalledWith(GIFT_CATEGORY, [
    expect.objectContaining({ identifier: GIFT_APPROVE, buttonTitle: "Aprobar reserva", options: { opensAppToForeground: false, isAuthenticationRequired: true } }),
    expect.objectContaining({ identifier: GIFT_REJECT, options: { opensAppToForeground: false, isAuthenticationRequired: true, isDestructive: true } })
  ]);
  expect(giftDecision(GIFT_APPROVE)).toBe("approve"); expect(giftDecision(GIFT_REJECT)).toBe("reject"); expect(giftDecision("OTHER")).toBeUndefined();
  expect(giftRequestPath(target)).toBe(`/bandeja/${reservationId}?c=${celebrationId}`);
});

it("F20 · synchronizes active and inactive gift/inbox caches without changing another celebration", async () => {
  const queries = new QueryClient();
  const spy = vi.spyOn(queries, "invalidateQueries");
  await refreshGiftActionQueries(queries, celebrationId);
  expect(spy.mock.calls.map(([options]) => options)).toEqual([
    { queryKey: queryKeys.gift.list(celebrationId), refetchType: "all" },
    { queryKey: queryKeys.notification.inbox(celebrationId), refetchType: "all" }
  ]);
  queries.clear();
});
