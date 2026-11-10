import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GiftRequestScreen } from "../src/push/request-screen";
import { giftRequestPath } from "../src/push/actions";
import { loginHref, destinationAfterSignIn } from "../src/auth/routes";
import { RouteGuard } from "../src/auth/route-guard";
import { AppProviders } from "../src/platform/providers";
import { baseHandlers, CELEBRATION, fakeClient, HttpFailure, renderApp } from "./support";

const celebrationId = "11111111-1111-4111-8111-111111111111";
const reservationId = "22222222-2222-4222-8222-222222222222";
const itemId = "33333333-3333-4333-8333-333333333333";
const target = { celebrationId, reservationId };
const prefix = `/gifts/celebrations/${celebrationId}`;
const pending = { id: reservationId, celebrationId, itemId, status: "PENDING_REVIEW", requestedAt: "2026-11-07T02:00:00Z", guestDisplayName: "María José", message: "Con mucho cariño" };
const navigate = vi.fn();
function setup({ status = "PENDING_REVIEW", readError = 0, postError = 0, hidden = false, empty = false, locale = "es-BO" as "es-BO" | "en-US" } = {}) {
  let current = { ...pending, status, requesterHidden: hidden };
  const data = fakeClient({
    ...baseHandlers({ ...CELEBRATION, id: celebrationId }),
    [`GET ${prefix}/reservations`]: () => readError ? new HttpFailure(readError) : ({ items: empty ? [] : [current] }),
    [`GET ${prefix}/items`]: () => ({ items: [{ id: itemId, title: "Vajilla para celebrar" }], partnerPriorityEnabled: true }),
    [`POST ${prefix}/reservations/${reservationId}/approve`]: () => postError ? new HttpFailure(postError) : (current = { ...current, status: "COMMITTED" }),
    [`POST ${prefix}/reservations/${reservationId}/reject`]: () => postError ? new HttpFailure(postError) : (current = { ...current, status: "REJECTED" })
  });
  renderApp(<GiftRequestScreen {...target} onNavigate={navigate} />, data.client, undefined, locale);
  return data;
}
afterEach(() => { cleanup(); navigate.mockClear(); });

describe("F20 · authorized request detail", () => {
  it.each([["push-approve", "Reserva aprobada"], ["push-reject", "Reserva rechazada"]])("%s persists a decision and removes both controls", async (button, status) => {
    const { calls } = setup();
    expect(screen.queryByTestId("push-request-detail")).toBeNull();
    await screen.findByText("Vajilla para celebrar");
    expect(screen.getByText("Solicitó: María José")).toBeTruthy();
    expect(screen.getByText(/Solicitada el 6 nov.*2026.*10:00/)).toBeTruthy();
    fireEvent.click(screen.getByTestId(button)); fireEvent.click(screen.getByTestId(button));
    await waitFor(() => expect(screen.getByTestId("push-request-status").textContent).toBe(status));
    expect(screen.queryByTestId("push-approve")).toBeNull();
    expect(screen.queryByTestId("push-reject")).toBeNull();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("an already resolved reservation is read-only and provides a return to inbox", async () => {
    const { calls } = setup({ status: "COMMITTED" });
    await screen.findByText("Reserva aprobada");
    expect(screen.queryByTestId("push-approve")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver bandeja de regalos" }));
    expect(navigate).toHaveBeenCalledWith(`/bandeja/regalos?c=${celebrationId}`);
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
  });

  it("an expired session preserves the exact destination across sign-in and never auto-decides", async () => {
    const { calls } = setup({ postError: 401 });
    fireEvent.click(await screen.findByTestId("push-approve"));
    await screen.findByText(/Tu sesión venció/);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión para continuar" }));
    expect(navigate).toHaveBeenCalledWith(loginHref(giftRequestPath(target)));
    expect(destinationAfterSignIn(["HOST"], giftRequestPath(target))).toBe(giftRequestPath(target));
    expect(screen.queryByTestId("push-approve")).toBeNull();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it.each([403, 409, 422, 503])("POST %s keeps actionable feedback without a success announcement", async (postError) => {
    setup({ postError });
    fireEvent.click(await screen.findByTestId("push-approve"));
    await screen.findByText(postError === 403 ? /No tienes permiso para decidir/ : postError === 409 ? /La solicitud cambió/ : postError === 422 ? /No se pudo procesar esta decisión/ : /No pudimos confirmar el resultado/);
    expect(screen.queryByText(/Tu decisión se guardó/)).toBeNull();
  });

  it.each([401, 403, 404, 422, 503])("GET %s is an explained state, not a blank detail", async (readError) => {
    setup({ readError });
    await screen.findByRole("alert", {}, { timeout: 5000 });
    expect(screen.queryByTestId("push-approve")).toBeNull();
    expect(screen.getByRole("button", { name: "Ver bandeja de regalos" })).toBeTruthy();
  });

  it("empty results explain how to find current requests", async () => {
    setup({ empty: true });
    await screen.findByText(/Esta solicitud no está disponible/);
    expect(screen.queryByTestId("push-approve")).toBeNull();
  });

  it("respects hidden identity and uses English copy", async () => {
    setup({ hidden: true, locale: "en-US" });
    await screen.findByText("Requested by: Identity hidden");
    expect(screen.queryByText(/María José/)).toBeNull();
    expect(screen.getByRole("button", { name: "Approve reservation" })).toBeTruthy();
  });

  it("invalid route IDs never reach the reservation API", async () => {
    const { client, calls } = fakeClient({});
    renderApp(<GiftRequestScreen celebrationId={celebrationId} reservationId="../approve" onNavigate={navigate} />, client);
    await screen.findByText(/Esta solicitud no está disponible/);
    expect(calls).toHaveLength(0);
  });

  it("the F20 guard destination survives an intermediate router render while signing in", () => {
    const { client } = fakeClient({});
    const anonymous = { userId: null, roles: [], organizationIds: [] };
    const view = renderApp(<RouteGuard group="host" returnTo={giftRequestPath(target)}>detail</RouteGuard>, client, anonymous);
    expect(screen.getByText(`redirect:${loginHref(giftRequestPath(target))}`)).toBeTruthy();
    view.rerender(<AppProviders client={client} claims={anonymous}><RouteGuard group="host">detail</RouteGuard></AppProviders>);
    expect(screen.getByText(`redirect:${loginHref(giftRequestPath(target))}`)).toBeTruthy();
  });
});
