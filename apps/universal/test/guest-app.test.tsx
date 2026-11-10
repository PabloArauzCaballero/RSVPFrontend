import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClient } from "@rsvp/api-client";
import { createContractMock, MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";
import { GuestRsvpScreen } from "../src/guest/rsvp-screen";
import { resolveDeepLink, guestSystemPath } from "../src/deep-links/router";
import { AppProviders } from "../src/platform/providers";
import { HOST, renderApp } from "./support";

const options = { trustedOrigins: ["https://invites.test"] };
const canonical = `/c/ana-y-luis/rsvp/${MOCK_VALID_TOKEN}`;
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

describe("F21 · guest links are exact routes from an allowed origin", () => {
  it.each([
    [`https://invites.test${canonical}`, canonical],
    [`https://invites.test${canonical}?utm_source=message#guest`, canonical],
    [`rsvp://c/ana-y-luis/rsvp/${MOCK_VALID_TOKEN}`, canonical],
    [canonical, canonical],
    [`rsvp:///c/ana-y-luis/rsvp/${MOCK_VALID_TOKEN}`, canonical],
    [`rsvp://rsvp/${MOCK_VALID_TOKEN}`, `/rsvp/${MOCK_VALID_TOKEN}`],
    [`rsvp://regalos/${MOCK_VALID_TOKEN}`, `/regalos/${MOCK_VALID_TOKEN}`]
  ])("maps %s to an app destination", (input, expected) => {
    expect(resolveDeepLink(input, options)).toBe(expected);
  });

  it.each([
    `https://other.test${canonical}`, `https://invites.test.evil.example${canonical}`,
    `https://user@invites.test${canonical}`, `http://invites.test${canonical}`,
    `https://invites.test:444${canonical}`, `${canonical}/extra`, canonical.replace("/rsvp/", "//rsvp/"),
    canonical.replace(MOCK_VALID_TOKEN, "short"), canonical.replace("ana-y-luis", "ana%2Fluis"),
    canonical.replace(MOCK_VALID_TOKEN, "%2F".repeat(43)), canonical.replace("ana-y-luis", "%2E%2E"),
    `//invites.test${canonical}`, `javascript:alert(1)`, `https://invites.test${canonical}\\extra`,
    "not a link", "", `rsvp://rsvp/${MOCK_VALID_TOKEN}/extra`
  ])("rejects ambiguous or foreign input: %s", (input) => {
    expect(resolveDeepLink(input, options)).toBeNull();
  });

  it("routes malformed guest links to public recovery while retaining unrelated app routes", () => {
    expect(guestSystemPath("/c/ana/rsvp/short")).toBe("/invitacion");
    expect(guestSystemPath("https://untrusted.test/c/ana/rsvp/" + MOCK_VALID_TOKEN)).toBe("/invitacion");
    expect(guestSystemPath("/c/ana/rsvp")).toBe("/c/ana/rsvp");
    expect(guestSystemPath("/rsvp/reporte?c=one")).toBe("/rsvp/reporte?c=one");
    expect(guestSystemPath("/bandeja/request?c=one")).toBe("/bandeja/request?c=one");
    expect(guestSystemPath("rsvp://bandeja/request?c=one")).toBe("rsvp://bandeja/request?c=one");
  });
});

function setup(locale: "es-BO" | "en-US" = "es-BO") {
  const mock = createContractMock({ now: () => new Date("2026-12-04T12:00:00Z") });
  mock.addGuest({ name: "María José", token: MOCK_VALID_TOKEN, allowedCompanions: 2 });
  server.use(http.all("http://f21.test/*", async ({ request }) => {
    const url = new URL(request.url);
    const raw = request.method === "GET" ? undefined : await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const reply = mock.handle({ method: request.method, path: url.pathname + url.search, headers, body: raw ? JSON.parse(raw) : undefined });
    return new HttpResponse((reply.body === undefined || reply.body === null) ? null : JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json", ...reply.headers } });
  }));
  const hostToken = vi.fn(async () => "host-session-must-not-be-used");
  const refresh = vi.fn(async () => { throw new Error("guest calls cannot refresh a host session"); });
  const client = createApiClient({ baseUrl: "http://f21.test",
    // jsdom's AbortSignal has a different brand from Node fetch; HTTP assertions do not exercise cancellation.
    fetchFn: (input, init) => { const options = { ...init }; delete options.signal; return fetch(input, options); },
    tokenStore: {
    getAccessToken: hostToken, getRefreshToken: async () => "host-refresh", setTokens: async () => undefined, clear: async () => undefined
  }, refreshSession: { refresh } });
  const view = renderApp(<GuestRsvpScreen slug={mock.slug} token={MOCK_VALID_TOKEN} />, client, HOST, locale);
  return { mock, client, view, hostToken, refresh };
}

describe("F21 · RSVP through the real API client and MSW", () => {
  it("confirms once without borrowing the signed-in host's credentials", async () => {
    const { mock, hostToken, refresh } = setup();
    fireEvent.click(await screen.findByRole("radio", { name: "Sí, asistiré" }, { timeout: 5000 }));
    fireEvent.click(screen.getByTestId("rsvp-submit")); fireEvent.click(screen.getByTestId("rsvp-submit"));
    await screen.findByText("Tu asistencia está confirmada");
    const writes = mock.state.log.filter((row) => row.method === "POST");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.headers.authorization).toBe(`Bearer ${MOCK_VALID_TOKEN}`);
    expect(writes[0]?.headers["idempotency-key"]).toBeTruthy();
    expect(hostToken).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
  });

  it("declining discards an invalid hidden companions value before validation", async () => {
    const { mock } = setup();
    await screen.findByLabelText("Acompañantes");
    fireEvent.change(screen.getByLabelText("Acompañantes"), { target: { value: "diez" } });
    fireEvent.click(screen.getByRole("radio", { name: "No podré asistir" }));
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    await screen.findByText("Registramos que no podrás asistir");
    expect(mock.state.log.find((row) => row.method === "POST")?.body).toMatchObject({ status: "DECLINED", requestedCompanions: 0 });
  });

  it("switching invitations clears the previous form and its revoked state", async () => {
    const { mock, client, view } = setup();
    const second = "S".repeat(43);
    mock.addGuest({ name: "Otro invitado", token: second });
    await screen.findByTestId("rsvp-submit");
    fireEvent.change(screen.getByLabelText("Mensaje para los anfitriones (opcional)"), { target: { value: "Mensaje privado de María" } });
    server.use(http.post(`http://f21.test/rsvp/celebrations/${mock.celebrationId}/rsvp`, () => HttpResponse.json({ status: 401, title: "Revoked" }, { status: 401 })));
    fireEvent.click(screen.getByRole("radio", { name: "Sí, asistiré" }));
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    await screen.findByText("Este enlace no está disponible");
    view.rerender(<AppProviders client={client} claims={HOST}><GuestRsvpScreen slug={mock.slug} token={second} /></AppProviders>);
    await screen.findByText("¿Podrás acompañarnos?");
    expect((screen.getByLabelText("Mensaje para los anfitriones (opcional)") as HTMLTextAreaElement).value).toBe("");
  });

  it.each([403, 409, 422, 503])("POST %s keeps a useful state and never reports a false confirmation", async (status) => {
    const { mock } = setup();
    server.use(http.post(`http://f21.test/rsvp/celebrations/${mock.celebrationId}/rsvp`, () => HttpResponse.json({
      status, title: "Failure", ...(status === 409 ? { code: "RsvpWindowClosed", deadline: "2026-12-04T03:00:00Z", timeZone: "America/La_Paz" } : {})
    }, { status })));
    fireEvent.click(await screen.findByRole("radio", { name: "Sí, asistiré" }, { timeout: 5000 }));
    fireEvent.change(screen.getByLabelText("Mensaje para los anfitriones (opcional)"), { target: { value: "Con cariño" } });
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    if (status === 409) await screen.findByText("El plazo para responder terminó");
    else {
      await screen.findByRole("alert");
      expect((screen.getByLabelText("Mensaje para los anfitriones (opcional)") as HTMLTextAreaElement).value).toBe("Con cariño");
    }
    expect(screen.queryByText("Tu asistencia está confirmada")).toBeNull();
  });

  it("a credential from another celebration reveals no invitation data", async () => {
    const { client, view, mock } = setup();
    view.rerender(<AppProviders client={client} claims={HOST}><GuestRsvpScreen slug={mock.slug} token={"X".repeat(43)} /></AppProviders>);
    await screen.findByText("Este enlace no está disponible");
    expect(view.container.textContent).not.toContain("Ana y Luis");
    await waitFor(() => expect(screen.queryByTestId("rsvp-submit")).toBeNull());
  });
});

it("F21 · a closed-window error formats the raw deadline in the guest language and celebration timezone", async () => {
  const { mock } = setup("en-US");
  server.use(http.post(`http://f21.test/rsvp/celebrations/${mock.celebrationId}/rsvp`, () => HttpResponse.json({
    status: 409, code: "RsvpWindowClosed", deadline: "2026-12-04T03:00:00Z", deadlineLocal: "3 de diciembre de 2026, 23:00", timeZone: "America/La_Paz"
  }, { status: 409 })));
  fireEvent.click(await screen.findByRole("radio", { name: "Yes, I will attend" }, { timeout: 5000 }));
  fireEvent.click(screen.getByTestId("rsvp-submit"));
  await screen.findByText(/Dec 3, 2026/);
  expect(screen.queryByText(/3 de diciembre de 2026/)).toBeNull();
});
