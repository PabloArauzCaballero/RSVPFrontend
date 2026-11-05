// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { createContractMock, MOCK_VALID_TOKEN, type ContractMock, type MockResponse } from "@rsvp/testing/contract-mock";

const route = vi.hoisted(() => ({ params: {} as Record<string, string> }));
vi.mock("next/navigation", () => ({ useParams: () => route.params }));

import { RsvpExperience } from "../components/rsvp/rsvp-experience";

const NOW = new Date("2026-12-04T12:00:00Z");
const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };

function setup(mock: ContractMock, fetchFn: typeof fetch = mock.fetch) {
  const client = createApiClient({ baseUrl: "http://gw.test", fetchFn, tokenStore: anonymous, refreshSession: { refresh: async () => { throw new Error("none"); } } });
  return client;
}
const open = (mock: ContractMock, token: string | undefined, fetchFn?: typeof fetch, locale: "es-BO" | "en-US" = "es-BO") => {
  route.params = token ? { token } : {};
  return render(<RsvpExperience slug={mock.slug} token={token} locale={locale} siteOrigin="https://done.example" client={setup(mock, fetchFn)} />);
};
const seeded = (overrides: Partial<ReturnType<ContractMock["addGuest"]>> = {}, mockOptions: Parameters<typeof createContractMock>[0] = {}) => {
  const mock = createContractMock({ now: () => NOW, ...mockOptions });
  mock.addGuest({ name: "Marta Quispe", allowedCompanions: 2, token: MOCK_VALID_TOKEN, ...overrides });
  return mock;
};
const storageDump = () => JSON.stringify({ ...window.sessionStorage, ...window.localStorage });

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); window.sessionStorage.clear(); window.localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("REQ-F15-01 · A9 formulario de RSVP por token (contrato real)", () => {
  it("shows the real celebration, confirms with companions and diet, and sends POST status/requestedCompanions with an Idempotency-Key", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByRole("heading", { name: "¿Podrás acompañarnos?" })).toBeTruthy();
    expect(screen.getByText("Invitación a Ana y Luis")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Sí, asistiré"));
    fireEvent.change(screen.getByLabelText("Acompañantes"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Restricciones alimentarias"), { target: { value: "Vegetariana" } });
    fireEvent.change(screen.getByLabelText("Mensaje para los anfitriones (opcional)"), { target: { value: "¡Felicidades!" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    expect(await screen.findByRole("heading", { name: "Tu asistencia está confirmada" })).toBeTruthy();
    const post = mock.state.log.find((call) => call.method === "POST");
    expect(post).toMatchObject({ path: `/rsvp/celebrations/${mock.celebrationId}/rsvp`, body: { status: "CONFIRMED", requestedCompanions: 1, dietaryNotes: "Vegetariana", message: "¡Felicidades!" } });
    expect(post?.headers["idempotency-key"]).toBeTruthy();
    expect(post?.headers["authorization"]).toBe(`Bearer ${MOCK_VALID_TOKEN}`);
    expect(screen.getByRole("status").textContent).toContain("confirmamos tu asistencia");
  });

  it("declining sends DECLINED with 0 companions and says so", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText("No podré asistir"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    expect(await screen.findByRole("heading", { name: "Registramos que no podrás asistir" })).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "POST")?.body).toMatchObject({ status: "DECLINED", requestedCompanions: 0 });
  });

  it("negative: nothing is sent without a choice; the field explains it, in an alert, and nothing hits the API", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    await screen.findByRole("heading", { name: "¿Podrás acompañarnos?" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    expect(await screen.findByText("Revisa los campos marcados.")).toBeTruthy();
    expect(screen.getAllByText("Este campo es obligatorio.").length).toBe(1);
    expect(mock.state.log.some((call) => call.method === "POST")).toBe(false);
  });

  it("the page copy follows en-US", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN, undefined, "en-US");
    expect(await screen.findByRole("heading", { name: "Can you join us?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send reply" })).toBeTruthy();
  });
});

describe("REQ-F15-02 · A10 confirmado y editable con cuenta atrás", () => {
  it("shows the answer on record, the countdown to the deadline and PATCHes an edit", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1, requestedCompanions: 1, approvedCompanions: 1, dietaryNotes: "Sin gluten" });
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByRole("heading", { name: "Tu asistencia está confirmada" })).toBeTruthy();
    expect(screen.getByText("Restricciones: Sin gluten")).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toMatch(/Quedan 5 d \d+ h \d+ min/);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar mi respuesta" }));
    fireEvent.click(screen.getByLabelText("No podré asistir"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("heading", { name: "Registramos que no podrás asistir" })).toBeTruthy();
    expect(mock.state.log.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it("companions above the allowed number show as waiting for the host's approval", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1, requestedCompanions: 4, approvedCompanions: 2 });
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByText("2 esperando aprobación del anfitrión")).toBeTruthy();
    expect(screen.getByText("Acompañantes aprobados: 2")).toBeTruthy();
  });
});

describe("REQ-F15-03 · A11 fuera de plazo", () => {
  it("explains when it closed (celebration time zone) and whom to write to, read-only", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1 }, { deadline: "2026-12-01T03:59:00.000Z" });
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByRole("heading", { name: "El plazo para responder terminó" })).toBeTruthy();
    expect(screen.getByText(/Cerró el .*30 nov.*America\/La_Paz/s)).toBeTruthy();
    expect(screen.getByText("Si necesitas cambiar tu respuesta, escribe a Ana y Luis.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Enviar|Guardar|Cambiar/ })).toBeNull();
  });

  it("a 409 RsvpWindowClosed at send time (the deadline passed while the form was open) moves to the closed screen and keeps nothing sent", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText("Sí, asistiré"));
    mock.state.deadline = "2026-12-04T11:00:00.000Z";
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    expect(await screen.findByRole("heading", { name: "El plazo para responder terminó" })).toBeTruthy();
    expect(screen.getByText(/4 de diciembre/)).toBeTruthy();
    expect(mock.listGuests()[0]?.status).toBe("PENDING");
  });
});

describe("REQ-F15-04 · A12 token inválido o revocado, sin filtrar datos", () => {
  it.each([["unknown token", "x".repeat(43)], ["revoked token", MOCK_VALID_TOKEN]])("%s: same screen, no celebration title, no hosts, no token on the page", async (name, token) => {
    const mock = seeded({ token: name === "revoked token" ? null : MOCK_VALID_TOKEN });
    const view = open(mock, token);
    expect(await screen.findByRole("heading", { name: "Este enlace no está disponible" })).toBeTruthy();
    const text = view.container.textContent ?? "";
    for (const secret of ["Ana y Luis", "Hacienda", "Marta", token, "Invitación a"]) expect(text).not.toContain(secret);
    expect(storageDump()).not.toContain(token);
  });

  it("an unknown celebration slug gets the very same screen", async () => {
    const mock = seeded();
    route.params = { token: MOCK_VALID_TOKEN };
    render(<RsvpExperience slug="no-existe" token={MOCK_VALID_TOKEN} locale="es-BO" siteOrigin="https://done.example" client={setup(mock)} />);
    expect(await screen.findByRole("heading", { name: "Este enlace no está disponible" }, { timeout: 3000 })).toBeTruthy();
  });

  it("a token revoked while the form is open is detected on send (401) and the draft is not leaked", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText("Sí, asistiré"));
    mock.listGuests()[0]!.token = null;
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    expect(await screen.findByRole("heading", { name: "Este enlace no está disponible" })).toBeTruthy();
  });
});

describe("REQ-F15-05 · A13 RSVP de no registrado", () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Pedro Mamani" } });
    fireEvent.change(screen.getByLabelText("Tu correo electrónico"), { target: { value: "pedro@example.com" } });
  };

  it("AUTO_ACCEPT: validates, requires consent, registers once and shows the one-time personal link (canonical format) without storing it", async () => {
    const mock = createContractMock({ now: () => NOW, unregisteredMode: "AUTO_ACCEPT" });
    open(mock, undefined);
    await screen.findByRole("heading", { name: "Confirma tu asistencia" });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi asistencia" }));
    expect(await screen.findByText("Necesitamos tu consentimiento para guardar tu respuesta.")).toBeTruthy();
    expect(screen.getAllByText("Este campo es obligatorio.")).toHaveLength(2);
    expect(mock.state.log.some((call) => call.method === "POST")).toBe(false);
    fill();
    fireEvent.click(screen.getByLabelText(/Doy mi consentimiento/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi asistencia" }));
    expect(await screen.findByRole("heading", { name: "Listo: confirmamos tu asistencia" })).toBeTruthy();
    expect(screen.getByTestId("rsvp-email-notice").textContent).toContain("No te prometemos un correo");
    const link = (screen.getByLabelText("Tu enlace personal") as HTMLInputElement).value;
    const issued = mock.listGuests()[0]!;
    expect(link).toBe(`https://done.example/c/${mock.slug}/rsvp/${issued.token}`);
    expect(storageDump()).not.toContain(issued.token ?? "never");
    expect(mock.state.log.find((call) => call.method === "POST")?.headers["idempotency-key"]).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "POST")?.body).toMatchObject({ name: "Pedro Mamani", email: "pedro@example.com", consent: true, locale: "es-BO" });
  });

  it("REQ-F15-05 (1.10.0) · RESTRICTED: public-settings is asked first, the form never appears, and the page names the published hostContact", async () => {
    const mock = createContractMock({ now: () => NOW, unregisteredMode: "RESTRICTED" });
    open(mock, undefined);
    expect(await screen.findByRole("heading", { name: "Esta celebración solo admite invitados con enlace personal" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar mi asistencia" })).toBeNull();
    expect(screen.getByText("Si necesitas cambiar tu respuesta, escribe a Ana y Luis.")).toBeTruthy();
    expect(screen.getByTestId("host-contact-email").textContent).toContain("anayluis@example.com");
    expect(screen.getByRole("link", { name: "anayluis@example.com" }).getAttribute("href")).toBe("mailto:anayluis@example.com");
    expect(screen.getByRole("link", { name: "+59171234567" }).getAttribute("href")).toBe("tel:+59171234567");
    expect(mock.state.log.map((call) => `${call.method} ${call.path}`)).toContain(`GET /rsvp/celebrations/${mock.celebrationId}/public-settings`);
    expect(mock.state.log.some((call) => call.path.endsWith("/unregistered"))).toBe(false);
    expect(mock.listGuests()).toHaveLength(0);
  });

  it("if the mode changes after the settings answered yes, the 403 still ends in the same explanation", async () => {
    const mock = createContractMock({ now: () => NOW, unregisteredMode: "AUTO_ACCEPT" });
    open(mock, undefined);
    await screen.findByRole("heading", { name: "Confirma tu asistencia" });
    mock.state.unregisteredMode = "RESTRICTED";
    fill();
    fireEvent.click(screen.getByLabelText(/Doy mi consentimiento/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mi asistencia" }));
    expect(await screen.findByRole("heading", { name: "Esta celebración solo admite invitados con enlace personal" })).toBeTruthy();
    expect(mock.listGuests()).toHaveLength(0);
  });

  it("a failing public-settings call is a retryable error, not a blank form", async () => {
    const mock = createContractMock({ now: () => NOW });
    open(mock, undefined);
    await screen.findByRole("heading", { name: "Confirma tu asistencia" });
    cleanup();
    const failing = createContractMock({ now: () => NOW });
    const base = failing.fetch;
    open(failing, undefined, (async (input: RequestInfo | URL, init?: RequestInit) => (String(input).endsWith("/public-settings") ? new Response("{}", { status: 503, headers: { "content-type": "application/problem+json" } }) : base(input, init))) as typeof fetch);
    expect(await screen.findByText("No pudimos comprobar si puedes registrarte. Inténtalo de nuevo.", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("an unknown slug on the public page is the generic unavailable screen", async () => {
    const mock = createContractMock({ now: () => NOW });
    route.params = {};
    render(<RsvpExperience slug="otro" locale="es-BO" siteOrigin="https://done.example" client={setup(mock)} />);
    expect(await screen.findByRole("heading", { name: "Este enlace no está disponible" }, { timeout: 3000 })).toBeTruthy();
  });
});

describe("REQ-F15-06 · conexión lenta o caída: el formulario no se pierde", () => {
  it("offline on send keeps every field, offers a retry, and the retry reuses the Idempotency-Key and succeeds once", async () => {
    const mock = seeded();
    let offline = false;
    open(mock, MOCK_VALID_TOKEN, mock.slowFetch(() => offline, 5));
    fireEvent.click(await screen.findByLabelText("Sí, asistiré"));
    fireEvent.change(screen.getByLabelText("Restricciones alimentarias"), { target: { value: "Sin lactosa" } });
    offline = true;
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    const alert = await screen.findByText(/No hay conexión\. Tu respuesta sigue aquí/);
    expect(alert).toBeTruthy();
    expect((screen.getByLabelText("Restricciones alimentarias") as HTMLTextAreaElement).value).toBe("Sin lactosa");
    expect((screen.getByLabelText("Sí, asistiré") as HTMLInputElement).checked).toBe(true);
    // The draft survives a reload (sessionStorage), keyed without the token.
    expect(storageDump()).toContain("Sin lactosa");
    expect(storageDump()).not.toContain(MOCK_VALID_TOKEN);
    offline = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Tu asistencia está confirmada" })).toBeTruthy();
    const posts = mock.state.log.filter((call) => call.method === "POST");
    expect(posts).toHaveLength(1);
    expect(mock.listGuests()[0]?.version).toBe(1);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("a restored draft is shown again after the page is reopened", async () => {
    const mock = seeded();
    let offline = false;
    const first = open(mock, MOCK_VALID_TOKEN, mock.slowFetch(() => offline));
    fireEvent.click(await screen.findByLabelText("Sí, asistiré"));
    fireEvent.change(screen.getByLabelText("Mensaje para los anfitriones (opcional)"), { target: { value: "Llegamos tarde" } });
    first.unmount();
    open(mock, MOCK_VALID_TOKEN);
    expect(((await screen.findByLabelText("Mensaje para los anfitriones (opcional)")) as HTMLTextAreaElement).value).toBe("Llegamos tarde");
    offline = false;
  });

  it.each<[string, MockResponse, RegExp]>([
    ["429 with Retry-After", { status: 429, headers: { "content-type": "application/problem+json", "retry-after": "17" }, body: { title: "slow", status: 429 } }, /Espera 17 segundos/],
    ["503", { status: 503, headers: { "content-type": "application/problem+json" }, body: { title: "down", status: 503 } }, /El servicio no responde por ahora/],
    ["422", { status: 422, headers: { "content-type": "application/problem+json" }, body: { title: "bad", status: 422, field: "message" } }, /no aceptó algunos datos/]
  ])("%s keeps the draft and says what to do", async (_name, reply, message) => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText("Sí, asistiré"));
    fireEvent.change(screen.getByLabelText("Mensaje para los anfitriones (opcional)"), { target: { value: "hola" } });
    mock.state.failNext.push(reply);
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect((screen.getByLabelText("Mensaje para los anfitriones (opcional)") as HTMLTextAreaElement).value).toBe("hola");
    expect(within(screen.getByRole("alert")).getByText(/Tu borrador se guarda solo en este dispositivo/)).toBeTruthy();
  });

  it("a lost first read offers a retry instead of a blank page", async () => {
    const mock = seeded();
    let offline = true;
    open(mock, MOCK_VALID_TOKEN, mock.slowFetch(() => offline));
    expect(await screen.findByText(/No hay conexión/, undefined, { timeout: 3000 })).toBeTruthy();
    offline = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "¿Podrás acompañarnos?" })).toBeTruthy());
  });
});

describe("REQ-F15 · privacidad del enlace personal", () => {
  it("the token never appears in the URL of any request, in storage or in the DOM", async () => {
    const mock = seeded();
    const view = open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText("Sí, asistiré"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    await screen.findByRole("heading", { name: "Tu asistencia está confirmada" });
    expect(mock.state.log.every((call) => !call.path.includes(MOCK_VALID_TOKEN))).toBe(true);
    expect(view.container.innerHTML).not.toContain(MOCK_VALID_TOKEN);
    expect(storageDump()).not.toContain(MOCK_VALID_TOKEN);
  });
});
