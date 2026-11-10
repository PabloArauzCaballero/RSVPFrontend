import type * as ExpoRouter from "expo-router";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { Linking } from "react-native";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClient } from "@rsvp/api-client";
import { GuestGiftsScreen } from "../src/guest/gifts-screen";
import { AppProviders } from "../src/platform/providers";
import { HOST, HttpFailure, renderApp, type Call, type Handler } from "./support";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("expo-router", async (original) => ({ ...await original<typeof ExpoRouter>(), useRouter: () => ({ push: navigate, replace: navigate, dismissTo: navigate }) }));

const token = "T".repeat(43);
const cid = "11111111-1111-4111-8111-111111111111";
const gid = "22222222-2222-4222-8222-222222222222";
const listing = "33333333-3333-4333-8333-333333333333";
const prefix = `/gifts/celebrations/${cid}`;
const item = { id: gid, listId: gid, celebrationId: cid, title: "Vajilla de cerámica", description: "Para compartir", source: "CATALOGED", status: "AVAILABLE", productListingId: listing, externalUrl: "https://partner.invalid/direct", price: { amountMinor: 25000, currency: "BOB" }, version: 1, createdAt: "2026-11-07T02:00:00Z" };
const reservation = { id: gid, itemId: gid, celebrationId: cid, status: "PENDING_REVIEW", requestedAt: "2026-11-07T02:00:00Z" };

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => { cleanup(); server.resetHandlers(); vi.restoreAllMocks(); navigate.mockClear(); });
function setup({ empty = false, getError = 0, postError = 0, status = "PENDING_REVIEW" } = {}) {
  let reject = postError;
  let committed = false;
  const handlers: Record<string, Handler> = {
    "GET /celebrations/public/ana-luis": () => ({ celebrationId: cid, slug: "ana-luis", content: { title: "Ana y Luis" } }),
    [`GET ${prefix}/items`]: ({ headers }) => {
      if (headers.get("authorization") !== `Bearer ${token}`) return new HttpFailure(401);
      if (getError) return new HttpFailure(getError);
      return { items: empty ? [] : [{ ...item, status: committed ? "COMMITTED" : "AVAILABLE" }], partnerPriorityEnabled: true };
    },
    [`POST ${prefix}/items/${gid}/reservations`]: () => {
      if (reject === -1) throw new TypeError("network lost");
      if (reject) return new HttpFailure(reject, { code: reject === 409 ? "GIFT_NOT_AVAILABLE" : "ERROR" });
      committed = true; return { ...reservation, status };
    }
  };
  const calls: Call[] = [];
  server.use(http.all("http://f21-gifts.test/*", async ({ request }) => {
    const url = new URL(request.url);
    const raw = request.method === "GET" ? "" : await request.text();
    const call: Call = { method: request.method, path: url.pathname, body: raw ? JSON.parse(raw) : undefined, headers: new Headers(request.headers) };
    calls.push(call);
    try {
      const reply = handlers[`${call.method} ${call.path}`]?.(call) ?? new HttpFailure(404);
      if (reply instanceof HttpFailure) return HttpResponse.json({ title: "Failure", status: reply.status, ...reply.problem }, { status: reply.status });
      return HttpResponse.json(reply);
    } catch { return HttpResponse.error(); }
  }));
  const client = createApiClient({ baseUrl: "http://f21-gifts.test",
    // Normalize the jsdom signal brand for Node fetch; cancellation is outside this transport test.
    fetchFn: (input, init) => { const options = { ...init }; delete options.signal; return fetch(input, options); },
    tokenStore: { getAccessToken: async () => "host-session", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined },
    refreshSession: { refresh: async () => { throw new Error("no host refresh in guest flow"); } }
  });
  const transport = { client, calls };
  const view = renderApp(<GuestGiftsScreen slug="ana-luis" token={token} />, transport.client);
  return { ...transport, view, allow: () => { reject = 0; } };
}

describe("F21 · guest gifts", () => {
  it.each(["PENDING_REVIEW", "COMMITTED"])("reserves once with the guest credential: %s", async (status) => {
    const { calls } = setup({ status });
    fireEvent.click(await screen.findByTestId(`reserve-${gid}`));
    fireEvent.change(screen.getByTestId("reserve-name"), { target: { value: " María " } });
    fireEvent.change(screen.getByTestId("reserve-message"), { target: { value: " ¡Felicidades! " } });
    fireEvent.click(screen.getByTestId("guest-reserve-submit")); fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    await screen.findByText(status === "COMMITTED" ? "¡Regalo reservado!" : "Solicitud enviada");
    const writes = calls.filter((row) => row.method === "POST");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(writes[0]?.headers.get("idempotency-key")).toBeTruthy();
    expect(writes[0]?.body).toEqual({ guestDisplayName: "María", message: "¡Felicidades!" });
    expect(screen.queryByTestId("guest-reservation-form")).toBeNull();
  });

  it("validates the contract limits before sending and keeps editable fields", async () => {
    const { calls } = setup();
    fireEvent.click(await screen.findByTestId(`reserve-${gid}`));
    fireEvent.change(screen.getByTestId("reserve-name"), { target: { value: "a".repeat(121) } });
    fireEvent.change(screen.getByTestId("reserve-message"), { target: { value: "b".repeat(501) } });
    fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    expect(await screen.findByText("El nombre admite hasta 120 caracteres.")).toBeTruthy();
    expect(screen.getByText("El mensaje admite hasta 500 caracteres.")).toBeTruthy();
    expect(calls.filter((row) => row.method === "POST")).toHaveLength(0);
  });

  it.each([-1, 422, 429, 503])("failed POST %s preserves the draft and reuses the key for an identical retry", async (postError) => {
    const { calls, allow } = setup({ postError });
    fireEvent.click(await screen.findByTestId(`reserve-${gid}`));
    fireEvent.change(screen.getByTestId("reserve-name"), { target: { value: "María" } });
    fireEvent.change(screen.getByTestId("reserve-message"), { target: { value: "Con cariño" } });
    fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    await screen.findByText(/Lo que escribiste sigue en esta pantalla/);
    expect((screen.getByTestId("reserve-message") as HTMLTextAreaElement).value).toBe("Con cariño");
    allow(); fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    await screen.findByText("Solicitud enviada");
    const writes = calls.filter((row) => row.method === "POST");
    expect(writes).toHaveLength(2);
    expect(writes[1]?.headers.get("idempotency-key")).toBe(writes[0]?.headers.get("idempotency-key"));
  });

  it("a changed draft gets its own idempotency key after validation failure", async () => {
    const { calls, allow } = setup({ postError: 422 });
    fireEvent.click(await screen.findByTestId(`reserve-${gid}`));
    fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    await screen.findByText(/Lo que escribiste sigue en esta pantalla/);
    fireEvent.change(screen.getByTestId("reserve-message"), { target: { value: "Nuevo mensaje" } });
    allow(); fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    await screen.findByText("Solicitud enviada");
    const writes = calls.filter((row) => row.method === "POST");
    expect(writes[1]?.headers.get("idempotency-key")).not.toBe(writes[0]?.headers.get("idempotency-key"));
  });

  it("409 shows a clear outcome without offering the same taken item again", async () => {
    setup({ postError: 409 });
    fireEvent.click(await screen.findByTestId(`reserve-${gid}`));
    fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    await screen.findByText("Alguien se adelantó");
    expect(screen.queryByTestId(`reserve-${gid}`)).toBeNull();
    expect(screen.getByText(/Ya no quedan regalos disponibles/)).toBeTruthy();
  });

  it.each([401, 403, 404, 409, 422, 429, 503])("GET %s has recovery and never displays a blank screen", async (getError) => {
    setup({ getError });
    await screen.findByRole("alert", {}, { timeout: 5000 });
    expect(screen.getByRole("button", { name: "Volver a mi respuesta" })).toBeTruthy();
    expect(screen.queryByText("Vajilla de cerámica")).toBeNull();
    expect(screen.queryByText("Iniciar sesión")).toBeNull();
  });

  it.each([401, 403, 404])("POST %s hides private gift content and asks for the right link, never a login", async (postError) => {
    setup({ postError });
    fireEvent.click(await screen.findByTestId(`reserve-${gid}`));
    fireEvent.click(screen.getByTestId("guest-reserve-submit"));
    await waitFor(() => expect(screen.queryByText("Vajilla de cerámica")).toBeNull());
    expect(screen.queryByTestId("guest-reservation-form")).toBeNull();
    expect(screen.queryByText("Iniciar sesión")).toBeNull();
  });

  it("a second invitation cannot see the first one's cached data or form", async () => {
    const { client, view, calls } = setup();
    fireEvent.click(await screen.findByTestId(`reserve-${gid}`));
    fireEvent.change(screen.getByTestId("reserve-name"), { target: { value: "Nombre privado" } });
    view.rerender(<AppProviders client={client} claims={HOST}><GuestGiftsScreen slug="ana-luis" token={"X".repeat(43)} /></AppProviders>);
    await screen.findByText("Tu enlace venció");
    expect(view.container.textContent).not.toMatch(/Nombre privado|Vajilla de cerámica/);
    expect(calls.filter((row) => row.path === `${prefix}/items`)).toHaveLength(2);
  });

  it("empty explains the state; back navigation stays in the guest RSVP", async () => {
    setup({ empty: true });
    await screen.findByText("Aún no hay regalos");
    expect(screen.getByText("Los anfitriones todavía no agregaron regalos. Vuelve pronto.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Volver a mi respuesta" }));
    expect(navigate).toHaveBeenCalledWith(`/c/ana-luis/rsvp/${token}`);
  });

  it("partner navigation always goes through the redirector and handles open failure", async () => {
    const open = vi.spyOn(Linking, "openURL").mockRejectedValue(new Error("unavailable"));
    setup();
    fireEvent.click(await screen.findByTestId(`partner-${gid}`));
    await screen.findByText(/No pudimos abrir la tienda del aliado/);
    const target = String(open.mock.calls[0]?.[0]);
    expect(new URL(target).pathname).toBe(`/r/${listing}`);
    expect(target).not.toContain("partner.invalid");
    expect(target).not.toContain(token);
  });
});
