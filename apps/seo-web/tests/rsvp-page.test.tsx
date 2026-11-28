// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { createContractMock, MOCK_VALID_TOKEN, type ContractMock, type MockResponse } from "@rsvp/testing/contract-mock";

const route = vi.hoisted(() => ({ params: {} as Record<string, string> }));
vi.mock("next/navigation", () => ({ useParams: () => route.params }));

import { RsvpExperience } from "../components/rsvp/rsvp-experience";
import { credentialKey } from "../lib/guest-credential";

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
// The guest credential has its own, single home (`credentialKey`, sessionStorage of this tab); everything else must never hold the token.
const storageDump = () => JSON.stringify(Object.fromEntries(Object.entries({ ...window.sessionStorage, ...window.localStorage }).filter(([key]) => !key.startsWith(credentialKey("")))));

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); window.sessionStorage.clear(); window.localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const YES = "Voy";
const NO = "No puedo";
const openExtras = () => fireEvent.click(screen.getByRole("button", { name: "Añadir una restricción alimentaria o un mensaje" }));
const DIETARY = "Restricción alimentaria (opcional)";
const MESSAGE = "Mensaje para quien te invita (opcional)";

describe("M21 · la web pública habla como la app: portada, «Voy / No puedo», acompañantes", () => {
  it("the invitation sits on the cover (title, who invites, when and where) above the question", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    const question = await screen.findByRole("heading", { level: 2, name: "¿Nos acompañas?" });
    const cover = screen.getByRole("heading", { level: 1, name: "Ana y Luis" });
    expect(cover.compareDocumentPosition(question) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Te invitan Ana y Luis")).toBeTruthy();
    expect(screen.getByText(/Hacienda El Prado/)).toBeTruthy();
    expect(screen.getByText("Un toque para responder. Sin cuenta ni contraseña.")).toBeTruthy();
    // The old web wording is gone.
    for (const old of ["¿Podrás acompañarnos?", "Sí, asistiré", "No podré asistir", "Invitación a Ana y Luis"]) expect(screen.queryByText(old)).toBeNull();
  });

  it("«Voy» / «No puedo» are one radio group named by the question; the stepper only appears for «Voy» and stays within 0..20", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    const group = await screen.findByRole("group", { name: "¿Nos acompañas?" });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Agregar un acompañante" })).toBeNull();
    fireEvent.click(screen.getByLabelText(YES));
    expect((screen.getByLabelText(YES) as HTMLInputElement).checked).toBe(true);
    const minus = screen.getByRole("button", { name: "Quitar un acompañante" }) as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
    expect(screen.getByText("Incluidos en tu invitación: 2. Si pides más, quien te invita decide.")).toBeTruthy();
    for (let n = 0; n < 25; n += 1) fireEvent.click(screen.getByRole("button", { name: "Agregar un acompañante" }));
    expect(screen.getByTestId("companions-count").textContent).toBe("20");
    expect((screen.getByRole("button", { name: "Agregar un acompañante" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(NO));
    expect(screen.queryByRole("button", { name: "Agregar un acompañante" })).toBeNull();
    expect(screen.getByRole("button", { name: "Avisar que no puedo" })).toBeTruthy();
  });

  it("diet and message stay folded until asked for, and the toggle says whether it is open", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText(YES));
    const toggle = screen.getByRole("button", { name: "Añadir una restricción alimentaria o un mensaje" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText(DIETARY)).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Ocultar restricción y mensaje" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText(DIETARY)).toBeTruthy();
  });
});

describe("REQ-F15-01 · A9 formulario de RSVP por token (contrato real)", () => {
  it("confirms with companions and diet, and sends POST status/requestedCompanions with an Idempotency-Key", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByRole("heading", { name: "¿Nos acompañas?" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ver la lista de regalos" })).toBeNull();
    fireEvent.click(screen.getByLabelText(YES));
    fireEvent.click(screen.getByRole("button", { name: "Agregar un acompañante" }));
    openExtras();
    fireEvent.change(screen.getByLabelText(DIETARY), { target: { value: "Vegetariana" } });
    fireEvent.change(screen.getByLabelText(MESSAGE), { target: { value: "¡Felicidades!" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    expect(await screen.findByRole("heading", { name: "Listo, estás dentro." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver la lista de regalos" })).toBeTruthy();
    const post = mock.state.log.find((call) => call.method === "POST");
    expect(post).toMatchObject({ path: `/rsvp/celebrations/${mock.celebrationId}/rsvp`, body: { status: "CONFIRMED", requestedCompanions: 1, dietaryNotes: "Vegetariana", message: "¡Felicidades!" } });
    expect(post?.headers["idempotency-key"]).toBeTruthy();
    expect(post?.headers["authorization"]).toBe(`Bearer ${MOCK_VALID_TOKEN}`);
    expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("Quedó tu respuesta. Puedes cambiarla hasta el"))).toBe(true);
  });

  it("declining sends DECLINED with 0 companions and thanks with the app's drawing", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText(NO));
    fireEvent.click(screen.getByRole("button", { name: "Avisar que no puedo" }));
    expect(await screen.findByRole("heading", { name: "Gracias por avisar." })).toBeTruthy();
    expect(document.querySelector('[data-art="welcomeGuest"]')).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "POST")?.body).toMatchObject({ status: "DECLINED", requestedCompanions: 0 });
  });

  it("negative: nothing is sent without a choice; the group explains it, in an alert, and nothing hits the API", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    await screen.findByRole("heading", { name: "¿Nos acompañas?" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));
    expect(await screen.findByText("Revisa los campos marcados.")).toBeTruthy();
    expect(screen.getAllByText("Elige una opción para continuar.").length).toBe(1);
    expect(mock.state.log.some((call) => call.method === "POST")).toBe(false);
  });

  it("the page copy follows en-US", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN, undefined, "en-US");
    expect(await screen.findByRole("heading", { name: "Are you coming?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send answer" })).toBeTruthy();
  });
});

describe("REQ-F15-02 · A10 confirmado y editable con cuenta atrás", () => {
  it("shows the answer on record, the countdown to the deadline and PATCHes an edit", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1, requestedCompanions: 1, approvedCompanions: 1, dietaryNotes: "Sin gluten" });
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByRole("heading", { name: "Tu asistencia está confirmada" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver la lista de regalos" })).toBeTruthy();
    expect(screen.getByText("Restricción alimentaria: Sin gluten")).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toMatch(/Quedan 5 d \d+ h \d+ min/);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar mi respuesta" }));
    fireEvent.click(screen.getByLabelText(NO));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("heading", { name: "Quedó registrado que no podrás venir" })).toBeTruthy();
    expect(screen.getByText("Cambios guardados.")).toBeTruthy();
    expect(mock.state.log.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it("«Dejarlo como está» closes the edit without sending anything", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1 });
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar mi respuesta" }));
    fireEvent.click(screen.getByRole("button", { name: "Dejarlo como está" }));
    expect(screen.getByRole("button", { name: "Cambiar mi respuesta" })).toBeTruthy();
    expect(mock.state.log.some((call) => call.method === "PATCH" || call.method === "POST")).toBe(false);
  });

  it("companions above the allowed number show as waiting for the host's approval", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1, requestedCompanions: 4, approvedCompanions: 2 });
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByText("2 por aprobar: lo decide quien te invita")).toBeTruthy();
    expect(screen.getByText("Acompañantes aprobados: 2")).toBeTruthy();
  });

  it("a deadline weeks away is said as a date, without a countdown (the app's rule)", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1 }, { deadline: "2027-01-30T03:59:00.000Z" });
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByText(/Puedes cambiar tu respuesta hasta el/)).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
  });
});

describe("REQ-F15-03 · A11 fuera de plazo", () => {
  it("explains when it closed (celebration time zone) and whom to write to, read-only, under the invitation's cover", async () => {
    const mock = seeded({ status: "CONFIRMED", version: 1 }, { deadline: "2026-12-01T03:59:00.000Z" });
    open(mock, MOCK_VALID_TOKEN);
    expect(await screen.findByRole("heading", { level: 2, name: "El plazo para responder terminó" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Ana y Luis" })).toBeTruthy();
    expect(document.querySelector('[data-art="deadlineClosed"]')).toBeTruthy(); // the app's drawing for this state
    expect(screen.getByText(/Las respuestas cerraron el .*30 nov.*America\/La_Paz/s)).toBeTruthy();
    expect(screen.getByText("¿Necesitas cambiar algo? Escríbele a Ana y Luis.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Enviar|Guardar|Cambiar|Confirmar/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Ver la lista de regalos" })).toBeTruthy();
  });

  it("a 409 RsvpWindowClosed at send time (the deadline passed while the form was open) moves to the closed screen and keeps nothing sent", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText(YES));
    mock.state.deadline = "2026-12-04T11:00:00.000Z";
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    expect(await screen.findByRole("heading", { name: "El plazo para responder terminó" })).toBeTruthy();
    expect(screen.getByText(/4 de diciembre/)).toBeTruthy();
    expect(mock.listGuests()[0]?.status).toBe("PENDING");
  });
});

describe("REQ-F15-04 · A12 token inválido o revocado, sin filtrar datos", () => {
  it.each([["unknown token", "x".repeat(43)], ["revoked token", MOCK_VALID_TOKEN]])("%s: same screen, no celebration title, no hosts, no token on the page", async (name, token) => {
    const mock = seeded({ token: name === "revoked token" ? null : MOCK_VALID_TOKEN });
    const view = open(mock, token);
    expect(await screen.findByRole("heading", { level: 1, name: "Este enlace ya no funciona" })).toBeTruthy();
    expect(document.querySelector('[data-art="linkExpired"]')).toBeTruthy(); // the app's drawing for this state
    expect(screen.getByText("Pídele un nuevo enlace a quien te invitó.")).toBeTruthy();
    const text = view.container.textContent ?? "";
    for (const secret of ["Ana y Luis", "Hacienda", "Marta", token, "Te invitan"]) expect(text).not.toContain(secret);
    expect(storageDump()).not.toContain(token);
  });

  it("an unknown celebration slug gets the very same screen", async () => {
    const mock = seeded();
    route.params = { token: MOCK_VALID_TOKEN };
    render(<RsvpExperience slug="no-existe" token={MOCK_VALID_TOKEN} locale="es-BO" siteOrigin="https://done.example" client={setup(mock)} />);
    expect(await screen.findByRole("heading", { name: "Este enlace ya no funciona" }, { timeout: 3000 })).toBeTruthy();
  });

  it("a token revoked while the form is open is detected on send (401) and the draft is not leaked", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText(YES));
    mock.listGuests()[0]!.token = null;
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    expect(await screen.findByRole("heading", { name: "Este enlace ya no funciona" })).toBeTruthy();
  });
});

describe("REQ-F15-05 · A13 RSVP de no registrado", () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Pedro Mamani" } });
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "pedro@example.com" } });
  };

  it("AUTO_ACCEPT: validates, requires consent, registers once and shows the one-time personal link (canonical format) without storing it", async () => {
    const mock = createContractMock({ now: () => NOW, unregisteredMode: "AUTO_ACCEPT" });
    open(mock, undefined);
    await screen.findByRole("heading", { name: "Confirma que vienes" });
    expect(screen.getByRole("heading", { level: 1, name: "Ana y Luis" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    expect(await screen.findByText("Necesitamos tu permiso para guardar tu respuesta.")).toBeTruthy();
    expect(screen.getAllByText("Falta este dato.")).toHaveLength(2);
    expect(mock.state.log.some((call) => call.method === "POST")).toBe(false);
    fill();
    fireEvent.click(screen.getByLabelText(/Acepto que quienes me invitan/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    expect(await screen.findByRole("heading", { name: "Listo, estás dentro." })).toBeTruthy();
    expect(screen.getByTestId("rsvp-email-notice").textContent).toContain("Quizá no llegue un correo");
    const link = (screen.getByLabelText("Tu enlace personal") as HTMLInputElement).value;
    const issued = mock.listGuests()[0]!;
    expect(link).toBe(`https://done.example/c/${mock.slug}/rsvp/${issued.token}`);
    expect(storageDump()).not.toContain(issued.token ?? "never");
    expect(mock.state.log.find((call) => call.method === "POST")?.headers["idempotency-key"]).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "POST")?.body).toMatchObject({ name: "Pedro Mamani", email: "pedro@example.com", consent: true, locale: "es-BO" });
  });

  it("REQ-F15-05 (1.10.0) · RESTRICTED: public-settings is asked first, the form never appears, the invitation stays on the cover and the page names the published hostContact", async () => {
    const mock = createContractMock({ now: () => NOW, unregisteredMode: "RESTRICTED" });
    open(mock, undefined);
    const state = await screen.findByRole("heading", { level: 2, name: "Esta celebración solo recibe respuestas con enlace personal" });
    // M21: the cover of the invitation sits above the "only with a link" state, as in the app.
    const cover = screen.getByRole("heading", { level: 1, name: "Ana y Luis" });
    expect(cover.compareDocumentPosition(state) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Te invitan Ana y Luis")).toBeTruthy();
    expect(document.querySelector('[data-art="noAccess"]')).toBeTruthy(); // the app's drawing for this state
    expect(screen.queryByRole("button", { name: "Confirmar que voy" })).toBeNull();
    expect(screen.getByText("¿Necesitas cambiar algo? Escríbele a Ana y Luis.")).toBeTruthy();
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
    await screen.findByRole("heading", { name: "Confirma que vienes" });
    mock.state.unregisteredMode = "RESTRICTED";
    fill();
    fireEvent.click(screen.getByLabelText(/Acepto que quienes me invitan/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    expect(await screen.findByRole("heading", { name: "Esta celebración solo recibe respuestas con enlace personal" })).toBeTruthy();
    expect(mock.listGuests()).toHaveLength(0);
  });

  it("a failing public-settings call is a retryable error, not a blank form", async () => {
    const mock = createContractMock({ now: () => NOW });
    open(mock, undefined);
    await screen.findByRole("heading", { name: "Confirma que vienes" });
    cleanup();
    const failing = createContractMock({ now: () => NOW });
    const base = failing.fetch;
    open(failing, undefined, (async (input: RequestInfo | URL, init?: RequestInit) => (String(input).endsWith("/public-settings") ? new Response("{}", { status: 503, headers: { "content-type": "application/problem+json" } }) : base(input, init))) as typeof fetch);
    expect(await screen.findByRole("heading", { name: "No pudimos abrir tu invitación" }, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("an unknown slug on the public page is the generic unavailable screen", async () => {
    const mock = createContractMock({ now: () => NOW });
    route.params = {};
    render(<RsvpExperience slug="otro" locale="es-BO" siteOrigin="https://done.example" client={setup(mock)} />);
    expect(await screen.findByRole("heading", { name: "Este enlace ya no funciona" }, { timeout: 3000 })).toBeTruthy();
  });
});

describe("REQ-F15-06 · conexión lenta o caída: el formulario no se pierde", () => {
  it("offline on send keeps every field, offers a retry, and the retry reuses the Idempotency-Key and succeeds once", async () => {
    const mock = seeded();
    let offline = false;
    open(mock, MOCK_VALID_TOKEN, mock.slowFetch(() => offline, 5));
    fireEvent.click(await screen.findByLabelText(YES));
    openExtras();
    fireEvent.change(screen.getByLabelText(DIETARY), { target: { value: "Sin lactosa" } });
    offline = true;
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    const alert = await screen.findByText("Sin conexión por ahora. Cuando vuelva internet, reintenta.");
    expect(alert).toBeTruthy();
    expect((screen.getByLabelText(DIETARY) as HTMLTextAreaElement).value).toBe("Sin lactosa");
    expect((screen.getByLabelText(YES) as HTMLInputElement).checked).toBe(true);
    // The draft survives a reload (sessionStorage), keyed without the token.
    expect(storageDump()).toContain("Sin lactosa");
    expect(storageDump()).not.toContain(MOCK_VALID_TOKEN);
    offline = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Listo, estás dentro." })).toBeTruthy();
    const posts = mock.state.log.filter((call) => call.method === "POST");
    expect(posts).toHaveLength(1);
    expect(mock.listGuests()[0]?.version).toBe(1);
    // Only the guest credential stays (the personal link opened it); the draft is gone.
    expect(Object.keys(window.sessionStorage)).toEqual([credentialKey(mock.slug)]);
  });

  it("a restored draft is shown again (extras open) after the page is reopened", async () => {
    const mock = seeded();
    let offline = false;
    const first = open(mock, MOCK_VALID_TOKEN, mock.slowFetch(() => offline));
    fireEvent.click(await screen.findByLabelText(YES));
    openExtras();
    fireEvent.change(screen.getByLabelText(MESSAGE), { target: { value: "Llegamos tarde" } });
    first.unmount();
    open(mock, MOCK_VALID_TOKEN);
    expect(((await screen.findByLabelText(MESSAGE)) as HTMLTextAreaElement).value).toBe("Llegamos tarde");
    offline = false;
  });

  it.each<[string, MockResponse, RegExp]>([
    ["429 with Retry-After", { status: 429, headers: { "content-type": "application/problem+json", "retry-after": "17" }, body: { title: "slow", status: 429 } }, /Espera 17 s y reintenta/],
    ["429 with a long Retry-After", { status: 429, headers: { "content-type": "application/problem+json", "retry-after": "3000" }, body: { title: "slow", status: 429 } }, /en unos 50 min/],
    ["503", { status: 503, headers: { "content-type": "application/problem+json" }, body: { title: "down", status: 503 } }, /No pudimos enviar tu respuesta ahora/],
    ["422", { status: 422, headers: { "content-type": "application/problem+json" }, body: { title: "bad", status: 422, field: "message" } }, /Algunos datos no se aceptaron/]
  ])("%s keeps the draft and says what to do", async (_name, reply, message) => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText(YES));
    openExtras();
    fireEvent.change(screen.getByLabelText(MESSAGE), { target: { value: "hola" } });
    mock.state.failNext.push(reply);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect((screen.getByLabelText(MESSAGE) as HTMLTextAreaElement).value).toBe("hola");
    expect(within(screen.getByRole("alert")).getByText("Tu respuesta sigue aquí.")).toBeTruthy();
  });

  it("a lost first read offers a retry instead of a blank page", async () => {
    const mock = seeded();
    let offline = true;
    open(mock, MOCK_VALID_TOKEN, mock.slowFetch(() => offline));
    expect(await screen.findByRole("heading", { name: "Sin conexión por ahora" }, { timeout: 3000 })).toBeTruthy();
    expect(document.querySelector('[data-art="offline"]')).toBeTruthy(); // the app's drawing for this state
    offline = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "¿Nos acompañas?" })).toBeTruthy());
  });
});

describe("REQ-F15 · privacidad del enlace personal", () => {
  it("the token never appears in the URL of any request, in storage or in the DOM", async () => {
    const mock = seeded();
    const view = open(mock, MOCK_VALID_TOKEN);
    fireEvent.click(await screen.findByLabelText(YES));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar que voy" }));
    await screen.findByRole("heading", { name: "Listo, estás dentro." });
    expect(mock.state.log.every((call) => !call.path.includes(MOCK_VALID_TOKEN))).toBe(true);
    expect(view.container.innerHTML).not.toContain(MOCK_VALID_TOKEN);
    expect(storageDump()).not.toContain(MOCK_VALID_TOKEN);
    // The one place the personal link leaves its token: this tab's credential, so `/c/{slug}/rsvp` can reopen the answer.
    expect(window.sessionStorage.getItem(credentialKey(mock.slug))).toBe(MOCK_VALID_TOKEN);
  });
});

describe("PL-114-R6 · «Confirmar asistencia» abre la respuesta del invitado, no un registro nuevo", () => {
  const openWithoutRoute = (mock: ContractMock) => {
    route.params = {};
    return render(<RsvpExperience slug={mock.slug} locale="es-BO" siteOrigin="https://done.example" client={setup(mock)} />);
  };

  it("/c/{slug}/rsvp with the stored credential shows the guest's own form, and the token stays out of the URL, the requests and the DOM", async () => {
    const mock = seeded({}, { unregisteredMode: "AUTO_ACCEPT" });
    window.sessionStorage.setItem(credentialKey(mock.slug), MOCK_VALID_TOKEN);
    const view = openWithoutRoute(mock);
    expect(await screen.findByRole("heading", { level: 2, name: "¿Nos acompañas?" })).toBeTruthy();
    expect(screen.queryByTestId("rsvp-register")).toBeNull();
    expect(screen.queryByLabelText("Tu nombre")).toBeNull();
    expect(mock.state.log.some((call) => call.path.includes("public-settings"))).toBe(false);
    expect(view.container.innerHTML).not.toContain(MOCK_VALID_TOKEN);
    expect(window.location.href).not.toContain(MOCK_VALID_TOKEN);
    expect(storageDump()).not.toContain(MOCK_VALID_TOKEN);
  });

  it("/c/{slug}/rsvp/{token} stores the credential so the next /c/{slug}/rsvp finds it", async () => {
    const mock = seeded();
    open(mock, MOCK_VALID_TOKEN);
    await screen.findByRole("heading", { level: 2, name: "¿Nos acompañas?" });
    expect(window.sessionStorage.getItem(credentialKey(mock.slug))).toBe(MOCK_VALID_TOKEN);
    cleanup();
    openWithoutRoute(mock);
    expect(await screen.findByRole("heading", { level: 2, name: "¿Nos acompañas?" })).toBeTruthy();
    expect(screen.queryByTestId("rsvp-register")).toBeNull();
  });

  it("PL-114-a1 · an expired stored credential is dropped and the same visit falls to the registration flow, not to «Este enlace ya no funciona»", async () => {
    const mock = seeded({ token: null }, { unregisteredMode: "AUTO_ACCEPT" });
    window.sessionStorage.setItem(credentialKey(mock.slug), MOCK_VALID_TOKEN);
    openWithoutRoute(mock);
    expect(await screen.findByRole("heading", { name: "Confirma que vienes" })).toBeTruthy();
    expect(screen.getByTestId("rsvp-register")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: "Este enlace ya no funciona" })).toBeNull();
    expect(window.sessionStorage.getItem(credentialKey(mock.slug))).toBeNull();
  });

  it("without a credential the registration flow is unchanged (negative case)", async () => {
    const mock = seeded({}, { unregisteredMode: "AUTO_ACCEPT" });
    openWithoutRoute(mock);
    expect(await screen.findByRole("heading", { name: "Confirma que vienes" })).toBeTruthy();
    expect(screen.getByTestId("rsvp-register")).toBeTruthy();
    expect(window.sessionStorage.length).toBe(0);
  });
});

describe("REG-01 · after replying, the line under the gift list invites to reserve only while it is open", () => {
  const withGifts = (mock: ContractMock, closed: boolean): typeof fetch => (input, init) => (/\/gifts\/celebrations\/[^/]+\/items/.test(String(input))
    ? Promise.resolve(new Response(JSON.stringify({ items: [{ id: "g-1", status: "AVAILABLE", source: "EXTERNAL", title: "Torta", price: { amountMinor: 100, currency: "BOB" } }], partnerPriorityEnabled: true, closed }), { status: 200, headers: { "content-type": "application/json" } }))
    : mock.fetch(input, init));
  const INVITE = "¿Quieres regalar algo? Reserva uno en un toque.";
  const CLOSED = "La lista de regalos está cerrada: ya no se pueden reservar.";

  it.each([[true, CLOSED, INVITE], [false, INVITE, CLOSED]] as const)("closed=%s", async (closed, shown, hidden) => {
    const mock = seeded({ status: "CONFIRMED", version: 1 });
    open(mock, MOCK_VALID_TOKEN, withGifts(mock, closed));
    expect(await screen.findByText(shown)).toBeTruthy();
    expect(screen.queryByText(hidden)).toBeNull();
    // The way into the list stays: the guest can still see, and cancel, what they reserved.
    expect(screen.getByRole("button", { name: "Ver la lista de regalos" })).toBeTruthy();
  });
});
