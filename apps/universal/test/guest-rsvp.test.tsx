import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { createContractMock, MOCK_VALID_TOKEN, type ContractMock } from "@rsvp/testing/contract-mock";
import { GuestRsvpScreen } from "../src/guest/rsvp-screen";
import { resolveDeepLink } from "../src/deep-links/router";
import { redirectSystemPath } from "../app/+native-intent";
import { destinationAfterSignIn, groupOfPath } from "../src/auth/routes";
import { GUEST, renderApp } from "./support";

const NOW = new Date("2026-12-04T12:00:00Z");
const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
const clientFor = (mock: ContractMock, fetchFn: typeof fetch = mock.fetch) => createApiClient({ baseUrl: "http://gw.test", fetchFn, tokenStore: anonymous, refreshSession: { refresh: async () => { throw new Error("none"); } } });
const seeded = (overrides: Partial<ReturnType<ContractMock["addGuest"]>> = {}, options: Parameters<typeof createContractMock>[0] = {}) => {
  const mock = createContractMock({ now: () => NOW, ...options });
  mock.addGuest({ name: "Marta Quispe", allowedCompanions: 2, token: MOCK_VALID_TOKEN, ...overrides });
  return mock;
};
const show = (mock: ContractMock, props: { slug?: string; token?: string }, fetchFn?: typeof fetch) => renderApp(<GuestRsvpScreen slug={props.slug ?? mock.slug} token={props.token} />, clientFor(mock, fetchFn), GUEST);

describe("REQ-F21-01 · deep link router", () => {
  it("resolves canonical, native and legacy links using the published credential format", () => {
    const route = `/c/ana-y-luis/rsvp/${MOCK_VALID_TOKEN}`;
    expect(resolveDeepLink(`https://done.bo${route}`, { trustedOrigins: ["https://done.bo"] })).toBe(route);
    expect(resolveDeepLink(`rsvp://c/ana-y-luis/rsvp/${MOCK_VALID_TOKEN}`)).toBe(route);
    expect(resolveDeepLink(`https://done.bo/rsvp/${MOCK_VALID_TOKEN}`, { trustedOrigins: ["https://done.bo"] })).toBe(`/rsvp/${MOCK_VALID_TOKEN}`);
    expect(resolveDeepLink("rsvp://rsvp/tok%2F1")).toBeNull();
  });
  it("negative: links of other apps, other paths and garbage are not ours", () => {
    for (const url of ["https://done.bo/c/ana-y-luis", "https://done.bo/proveedores", "mailto:a@b.co", "nope", ""]) expect(resolveDeepLink(url)).toBeNull();
  });
  it("the native-intent hook handles both cold and warm guest paths and preserves host paths", () => {
    const route = `/c/ana-y-luis/rsvp/${MOCK_VALID_TOKEN}`;
    expect(redirectSystemPath({ path: `rsvp://c/ana-y-luis/rsvp/${MOCK_VALID_TOKEN}`, initial: true })).toBe(route);
    expect(redirectSystemPath({ path: route, initial: false })).toBe(route);
    expect(redirectSystemPath({ path: "/celebraciones", initial: false })).toBe("/celebraciones");
  });
  it("REQ-F21-06 · the personal-link routes belong to the public guest group; the host report does not", () => {
    expect(groupOfPath("/c/ana-y-luis/rsvp/tok-1")).toBe("guest");
    expect(groupOfPath("/rsvp/tok-1")).toBe("guest");
    expect(groupOfPath("/rsvp/reporte")).toBe("host");
    expect(destinationAfterSignIn(["HOST"], "/rsvp/reporte?c=1")).toBe("/rsvp/reporte?c=1");
  });
});

describe("REQ-F21-04 · the five RSVP states, in native components, against the contract", () => {
  it("A9 guest: confirms with the real POST and shows the confirmed state", async () => {
    const mock = seeded();
    show(mock, { token: MOCK_VALID_TOKEN });
    expect(await screen.findByText("¿Podrás acompañarnos?")).toBeTruthy();
    expect(screen.getByText("Invitación a Ana y Luis")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Sí, asistiré" }));
    fireEvent.change(screen.getByLabelText("Restricciones alimentarias"), { target: { value: "Vegano" } });
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    expect(await screen.findByText("Tu asistencia está confirmada")).toBeTruthy();
    const post = mock.state.log.find((call) => call.method === "POST");
    expect(post).toMatchObject({ path: `/rsvp/celebrations/${mock.celebrationId}/rsvp`, body: { status: "CONFIRMED", dietaryNotes: "Vegano" } });
    expect(post?.headers["authorization"]).toBe(`Bearer ${MOCK_VALID_TOKEN}`);
    expect(post?.headers["idempotency-key"]).toBeTruthy();
  });

  it("A9 negative: no choice → field error, nothing sent", async () => {
    const mock = seeded();
    show(mock, { token: MOCK_VALID_TOKEN });
    await screen.findByText("¿Podrás acompañarnos?");
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    expect(await screen.findByText("Revisa los campos marcados.")).toBeTruthy();
    expect(mock.state.log.some((call) => call.method === "POST")).toBe(false);
  });

  it("A10 confirmed: shows the answer and the countdown, and edits with PATCH", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1, requestedCompanions: 1, approvedCompanions: 1 });
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
    show(mock, { token: MOCK_VALID_TOKEN });
    expect(await screen.findByText("Tu asistencia está confirmada")).toBeTruthy();
    expect(screen.getByText(/Quedan 5 d/)).toBeTruthy();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar mi respuesta" }));
    fireEvent.click(screen.getByRole("radio", { name: "No podré asistir" }));
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    expect(await screen.findByText("Registramos que no podrás asistir")).toBeTruthy();
    expect(mock.state.log.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it("A11 closed: when it closed and whom to write to", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1 }, { deadline: "2026-12-01T03:59:00.000Z" });
    show(mock, { token: MOCK_VALID_TOKEN });
    expect(await screen.findByText("El plazo para responder terminó")).toBeTruthy();
    expect(screen.getByText("Si necesitas cambiar tu respuesta, escribe a Ana y Luis.")).toBeTruthy();
    expect(screen.queryByTestId("rsvp-submit")).toBeNull();
  });

  it("A12 invalid: no celebration data at all", async () => {
    const mock = seeded();
    const { container } = show(mock, { token: "x".repeat(43) });
    expect(await screen.findByText("Este enlace no está disponible")).toBeTruthy();
    expect(container.textContent).not.toMatch(/Ana y Luis|Hacienda|Marta/);
  });

  it("A13 unregistered: AUTO_ACCEPT registers and offers the canonical personal link; RESTRICTED shows the 403 explanation", async () => {
    const open = createContractMock({ now: () => NOW, unregisteredMode: "AUTO_ACCEPT" });
    const first = show(open, {});
    await screen.findByText("Confirma tu asistencia");
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Pedro" } });
    fireEvent.change(screen.getByLabelText("Tu correo electrónico"), { target: { value: "pedro@example.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByTestId("rsvp-register"));
    expect(await screen.findByText("Listo: confirmamos tu asistencia")).toBeTruthy();
    expect(screen.getByTestId("rsvp-email-notice").textContent).toContain("No te prometemos un correo");
    expect((screen.getByLabelText("Tu enlace personal") as HTMLInputElement).value).toMatch(new RegExp(`/c/${open.slug}/rsvp/[A-Za-z0-9_-]{43}$`));
    first.unmount();
    const restricted = createContractMock({ now: () => NOW, unregisteredMode: "RESTRICTED" });
    show(restricted, {});
    // public-settings (1.10.0) is asked first: the form never appears and hostContact says who to write to.
    expect(await screen.findByText("Esta celebración solo admite invitados con enlace personal")).toBeTruthy();
    expect(screen.queryByTestId("rsvp-register")).toBeNull();
    expect(screen.getByTestId("host-contact-email").textContent).toContain("anayluis@example.com");
    expect(restricted.state.log.some((call) => call.path.endsWith("/public-settings"))).toBe(true);
    expect(restricted.state.log.some((call) => call.path.endsWith("/unregistered"))).toBe(false);
  });

  it("offline send keeps the draft; the retry reuses the Idempotency-Key and creates exactly one RSVP", async () => {
    const mock = seeded();
    let offline = false;
    show(mock, { token: MOCK_VALID_TOKEN }, mock.slowFetch(() => offline));
    fireEvent.click(await screen.findByRole("radio", { name: "Sí, asistiré" }));
    fireEvent.change(screen.getByLabelText("Mensaje para los anfitriones (opcional)"), { target: { value: "Hasta pronto" } });
    offline = true;
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    expect(await screen.findByText(/No hay conexión\. Tu respuesta sigue aquí/)).toBeTruthy();
    expect((screen.getByLabelText("Mensaje para los anfitriones (opcional)") as HTMLTextAreaElement).value).toBe("Hasta pronto");
    offline = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByText("Tu asistencia está confirmada")).toBeTruthy());
    expect(mock.listGuests()[0]?.version).toBe(1);
  });

  it("429 explains the wait and keeps the draft", async () => {
    const mock = createContractMock({ now: () => NOW, rateLimitAfter: 2 });
    mock.addGuest({ name: "Marta", token: MOCK_VALID_TOKEN });
    show(mock, { token: MOCK_VALID_TOKEN });
    fireEvent.click(await screen.findByRole("radio", { name: "Sí, asistiré" }));
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    expect(await screen.findByText(/Espera 17 segundos/)).toBeTruthy();
  });

  it("en-US copy", async () => {
    const mock = seeded();
    renderApp(<GuestRsvpScreen slug={mock.slug} token={MOCK_VALID_TOKEN} />, clientFor(mock), GUEST, "en-US");
    expect(await screen.findByText("Can you join us?")).toBeTruthy();
  });
});
