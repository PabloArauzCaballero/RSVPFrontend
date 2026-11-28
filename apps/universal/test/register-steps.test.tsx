import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityClient, SessionManager, createMemorySessionStore, type Role } from "@rsvp/auth";
import { ILLUSTRATIONS, ILLUSTRATION_GROUPS, ILLUSTRATION_PASTEL } from "../../../packages/ui/src/illustrations";
import { tones } from "@rsvp/design-tokens";
import { LoginScreen, RegisterScreen } from "../src/auth/screens";
import { AppProviders, type AppRuntime } from "../src/platform/providers";
import { EMPTY_REGISTRATION_DRAFT, clearLoginEmail, clearRegistrationDraft, readRegistrationDraft, writeRegistrationDraft } from "../src/auth/registration-draft";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient, HttpFailure, type Handler } from "./support";

/** MV-D2 / MV-D3 / MV-D4: the sign-up in four steps, rendered whole against a fake gateway that answers what Identity 2.3.0 answers. */
const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (roles: Role[]): string => `${b64({ alg: "RS256" })}.${b64({ sub: "user-1", roles, organizationIds: [], exp: Math.floor(Date.now() / 1000) + 900 })}.sig`;
const account = (roles: Role[]) => ({ id: "u", email: "ana@example.com", roles, accessToken: jwt(roles), refreshToken: "r".repeat(40), tokenType: "Bearer", expiresIn: 900, emailVerified: true });
const PROOF = "p".repeat(43);
const EMAIL = "ana@example.com";
const PASSWORD = "correct-horse-battery";

const OK: Record<string, Handler> = {
  "POST /identity/auth/registration/email-code": () => undefined,
  "POST /identity/auth/registration/email-code/verify": () => ({ proof: PROOF, expiresIn: 1800 }),
  "POST /identity/auth/register": () => account(["HOST"])
};

function setup(ui: React.ReactNode = <RegisterScreen onNavigate={vi.fn()} />, handlers: Record<string, Handler> = {}) {
  const { client, calls } = fakeClient({ ...OK, ...handlers });
  const manager = new SessionManager(createMemorySessionStore(), new IdentityClient(client));
  const runtime: AppRuntime = { manager, client, identityClient: client };
  const view = render(<AppProviders runtime={runtime} locale="es-BO" queryClient={new QueryClient()}>{ui}</AppProviders>);
  return { manager, calls, view };
}
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };
const press = (name: string): void => { fireEvent.click(screen.getByRole("button", { name })); };
const step = (): string => screen.getByRole("progressbar").getAttribute("aria-valuenow") ?? "";

/** Step 1 to the code screen. */
async function askForCode(email = EMAIL): Promise<void> {
  type("Correo", email); press("Enviar código");
  await screen.findByLabelText("Código de 6 dígitos");
}
/** Steps 1 to 2: asks for the code, types it and lands on "Cuéntanos quién eres". */
async function verified(email = EMAIL): Promise<void> {
  await askForCode(email);
  type("Código de 6 dígitos", "123456"); press("Verificar código");
  await screen.findByText("Cuéntanos quién eres");
}
const fillAccount = (): void => { type("Nombre", "Ana"); type("Apellido", "Rojas"); press("Siguiente"); };
const fillContact = (): void => { type("Celular", "+591 7123 4567"); press("Siguiente"); };
const acceptTerms = (): void => { fireEvent.click(screen.getByRole("checkbox", { name: "Acepto los Términos de uso y la Política de privacidad." })); };
async function toStep4(email = EMAIL): Promise<void> {
  await verified(email); fillAccount();
  await screen.findByText("¿Cómo te contactamos?"); fillContact();
  await screen.findByText("Crea tu contraseña");
}
/** What the app sends to Identity besides the credentials (the test renders es-BO). */
const PROFILE = { termsVersion: "2026-11-21-borrador", givenName: "Ana", familyName: "Rojas", phone: "+59171234567", city: "La Paz", country: "BO", locale: "es-BO", marketingOptIn: false, timeZone: expect.any(String) };

beforeEach(() => { resetSecureStore(); localStorage.clear(); sessionStorage.clear(); clearRegistrationDraft(); clearLoginEmail(); });
afterEach(() => { vi.useRealTimers(); });

describe("MV-D2 · step 1: e-mail, then the 6-digit code", () => {
  it("starts on step 1 of 4 with only the e-mail asked, a progress bar on top and the action to send the code", () => {
    setup();
    expect(step()).toBe("1");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("4");
    expect(screen.getByText("Paso 1 de 4 · Tu correo")).toBeTruthy();
    expect(screen.getByLabelText("Correo")).toBeTruthy();
    expect(screen.queryByLabelText("Contraseña")).toBeNull(); expect(screen.queryByLabelText("Nombre")).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar código" })).toBeTruthy();
  });
  it("a malformed e-mail is stopped here and nothing is sent", async () => {
    const { calls } = setup();
    type("Correo", "no-es-correo"); press("Enviar código");
    expect(await screen.findByText("Revisa el correo: debe verse como nombre@correo.com.")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
  it("asks Identity for the code in the app's language, then shows a screen that says the same thing to everyone", async () => {
    const { calls } = setup();
    await askForCode();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "POST", path: "/identity/auth/registration/email-code", body: { email: EMAIL } });
    expect(calls[0]?.headers.get("accept-language")).toBe("es-BO");
    expect(screen.getByText("Si el correo es válido, te enviamos un código de 6 dígitos. Escríbelo aquí.")).toBeTruthy();
    const field = screen.getByLabelText("Código de 6 dígitos") as HTMLInputElement;
    expect(field.getAttribute("autocomplete")).toBe("one-time-code");
    expect(field.getAttribute("inputmode")).toBe("numeric");
  });
  it("MV-D3 (structural only): the code screen has no branch on the answer, so two renders with the same 202 are identical. This does NOT prove Identity answers alike: that is L2 in registro-4-pasos.mjs, in Chrome against the real service", async () => {
    // Identity answers the same bare 202 for both; the screen has nothing else to go on. The live run repeats this against the real service.
    const snapshotFor = async (email: string): Promise<string> => {
      const { view } = setup();
      await askForCode(email);
      // The entrance animation is in flight at different moments in two renders: compare structure, text and attributes, not its inline style.
      const html = view.container.innerHTML.replaceAll(email, "<correo>").replace(/ style="[^"]*"/g, "").replace(/ data-enter="\w+"/g, "");
      cleanup(); clearRegistrationDraft();
      return html;
    };
    const fresh = await snapshotFor("nueva-cuenta@example.com");
    const existing = await snapshotFor("cuenta-existente@example.com");
    expect(existing).toBe(fresh);
    expect(fresh).not.toMatch(/ya existe|ya tiene una cuenta|already exists|no pudimos crear/i);
  });
  it("MV-D3: a wrong, expired or exhausted code is one neutral message, and the same for a correct code of an address with an account", async () => {
    setup(undefined, { "POST /identity/auth/registration/email-code/verify": () => new HttpFailure(422, { errors: [{ field: "code", message: "invalid" }] }) });
    await askForCode();
    type("Código de 6 dígitos", "654321"); press("Verificar código");
    expect(await screen.findByText("Código incorrecto o vencido. Pide otro.")).toBeTruthy();
    expect(step()).toBe("1");
    expect((screen.getByLabelText("Código de 6 dígitos") as HTMLInputElement).value).toBe("654321");
  });
  it("the code field takes only digits, at most six, and pasting '123 456' works", async () => {
    setup(); await askForCode();
    type("Código de 6 dígitos", "12a3 4567890");
    expect((screen.getByLabelText("Código de 6 dígitos") as HTMLInputElement).value).toBe("123456");
    type("Código de 6 dígitos", "123 456");
    expect((screen.getByLabelText("Código de 6 dígitos") as HTMLInputElement).value).toBe("123456");
  });
  it("fewer than six digits is stopped locally and Identity is not asked", async () => {
    const { calls } = setup(); await askForCode();
    type("Código de 6 dígitos", "123"); press("Verificar código");
    expect(await screen.findByText("Escribe los 6 dígitos del código.")).toBeTruthy();
    expect(calls).toHaveLength(1);
  });
  it("another code can be asked for only after the wait, and the wait is the same for everyone", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const { calls } = setup(); type("Correo", EMAIL); press("Enviar código");
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByRole("link", { name: "Pedir otro código en 60 s" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Pedir otro código en 60 s" }));
    expect(calls).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    fireEvent.click(screen.getByRole("link", { name: "Pedir otro código" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(calls).toHaveLength(2);
    expect(screen.getByText("Listo. Si el correo es válido, te enviamos otro código.")).toBeTruthy();
  });
  it("'Cambiar el correo' goes back to the e-mail with what was typed", async () => {
    setup(); await askForCode();
    fireEvent.click(screen.getByRole("link", { name: "Cambiar el correo" }));
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe(EMAIL);
    expect(screen.queryByLabelText("Código de 6 dígitos")).toBeNull();
  });
  it("429 shows the wait and blocks the button; offline says there is no connection and keeps the e-mail", async () => {
    const limited = setup(undefined, { "POST /identity/auth/registration/email-code": () => new HttpFailure(429, { title: "Too many" }) });
    type("Correo", EMAIL); press("Enviar código");
    expect(await screen.findByText(/Hubo muchos intentos/)).toBeTruthy();
    limited.view.unmount(); clearRegistrationDraft();
    setup(undefined, { "POST /identity/auth/registration/email-code": () => { throw new TypeError("Failed to fetch"); } });
    type("Correo", EMAIL); press("Enviar código");
    expect(await screen.findByText(/Sin conexión por ahora/)).toBeTruthy();
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe(EMAIL);
    expect(step()).toBe("1");
  });
  it("loading: a second press while the code is being asked does not send a second request", async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<undefined>((resolve) => { release = () => resolve(undefined); });
    const { calls } = setup(undefined, { "POST /identity/auth/registration/email-code": () => pending as never });
    type("Correo", EMAIL); press("Enviar código");
    const busy = await screen.findByRole("button", { name: "Enviando…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(busy);
    expect(calls).toHaveLength(1);
    await act(async () => { release(); await pending; });
  });
});

describe("MV-D2 · steps 2 and 3", () => {
  it("a proven e-mail opens step 2: the account type, first and last name", async () => {
    setup(); await verified();
    expect(step()).toBe("2");
    expect(screen.getAllByRole("radio").filter((radio) => /Organizo|Ofrezco|Ayudo/.test(radio.getAttribute("aria-label") ?? ""))).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Organizo una celebración/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("Nombre")).toBeTruthy(); expect(screen.getByLabelText("Apellido")).toBeTruthy();
    expect(screen.queryByLabelText("Celular")).toBeNull();
  });
  it("step 2 names every missing field; nothing is sent to Identity", async () => {
    const { calls } = setup(); await verified();
    press("Siguiente");
    expect(await screen.findAllByText("Falta este dato.")).toHaveLength(2);
    expect(step()).toBe("2");
    expect(calls.filter((call) => call.path === "/identity/auth/register")).toHaveLength(0);
  });
  it("a planner must name the company or team (the planner's behaviour is unchanged); a provider gets no business field (A24, DP-2)", async () => {
    setup(); await verified();
    fireEvent.click(screen.getByRole("radio", { name: /Ayudo a organizar/ }));
    type("Nombre", "Ana"); type("Apellido", "Rojas"); press("Siguiente");
    expect(await screen.findByText("Falta este dato.")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Ofrezco servicios/ }));
    expect(screen.queryByLabelText("Nombre de tu empresa o equipo")).toBeNull();
  });
  it("step 3 asks for mobile and city; the prefix alone, a number without country code and an empty other city are refused", async () => {
    setup(); await verified(); fillAccount(); await screen.findByText("¿Cómo te contactamos?");
    expect(step()).toBe("3");
    press("Siguiente");
    expect(await screen.findByText("Falta este dato.")).toBeTruthy();
    type("Celular", "71234567"); press("Siguiente");
    expect(await screen.findByText("Revisa el celular: escribe el código de país, por ejemplo +591 71234567.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ciudad"), { target: { value: "OTHER" } });
    type("Celular", "+59171234567"); press("Siguiente");
    expect(await screen.findByText("Falta este dato.")).toBeTruthy();
    expect(step()).toBe("3");
    type("¿En qué ciudad estás?", "Montero"); press("Siguiente");
    await screen.findByText("Crea tu contraseña");
  });
  it("'Atrás' goes back one step and keeps everything typed; the verified e-mail needs no new code", async () => {
    setup(); await verified(); type("Nombre", "Ana"); type("Apellido", "Rojas");
    press("Atrás");
    expect(step()).toBe("1");
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe(EMAIL);
    expect(screen.getByText("Correo verificado")).toBeTruthy();
    press("Siguiente");
    await screen.findByText("Cuéntanos quién eres");
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana");
    expect((screen.getByLabelText("Apellido") as HTMLInputElement).value).toBe("Rojas");
  });
  it("changing the e-mail after it was proven voids the proof: a new code is needed", async () => {
    const { calls } = setup(); await verified(); press("Atrás");
    type("Correo", "otra@example.com");
    expect(screen.getByRole("button", { name: "Enviar código" })).toBeTruthy();
    press("Enviar código");
    await screen.findByLabelText("Código de 6 dígitos");
    expect(calls.filter((call) => call.path.endsWith("/email-code"))).toHaveLength(2);
  });
});

describe("MV-D2 · step 4: one password, the terms and the news", () => {
  it("has one password with a show toggle (no confirmation), the terms and the optional news", async () => {
    setup(); await toStep4();
    expect(step()).toBe("4");
    expect(screen.getAllByLabelText("Contraseña")).toHaveLength(1);
    expect(screen.queryByLabelText("Repite la contraseña")).toBeNull();
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("password");
    press("Mostrar");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("text");
    expect(screen.getByRole("checkbox", { name: "Quiero recibir novedades y consejos por correo (opcional)." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear mi cuenta" })).toBeTruthy();
  });
  it("a short password is stopped locally; the terms are required (B6, PF-10); nothing reaches Identity", async () => {
    const { calls } = setup(); await toStep4();
    type("Contraseña", "corta"); press("Crear mi cuenta");
    expect(await screen.findByText("Usa al menos 12 caracteres. Una frase corta funciona bien.")).toBeTruthy();
    expect(screen.getByText("Para crear tu cuenta necesitas aceptar los términos y la política de privacidad.")).toBeTruthy();
    expect(calls.filter((call) => call.path === "/identity/auth/register")).toHaveLength(0);
  });
  it("creates the account with the proof, the whole profile and the terms version; there is no password confirmation in the body", async () => {
    const { manager, calls } = setup(); await toStep4();
    type("Contraseña", PASSWORD); acceptTerms();
    fireEvent.click(screen.getByRole("checkbox", { name: "Quiero recibir novedades y consejos por correo (opcional)." }));
    press("Crear mi cuenta");
    await waitFor(() => expect(manager.getState().session?.roles).toEqual(["HOST"]));
    const register = calls.find((call) => call.path === "/identity/auth/register");
    expect(register?.body).toEqual({ email: EMAIL, password: PASSWORD, role: "HOST", ...PROFILE, marketingOptIn: true, registrationProof: PROOF });
    expect(JSON.stringify(register?.body)).not.toMatch(/onfirmation/);
    expect(register?.url).toBe("/identity/auth/register");
    expect(readRegistrationDraft()).toBeNull();
  });
  it("a provider is created without any business or organization (A24, DP-2)", async () => {
    const { calls } = setup(undefined, { "POST /identity/auth/register": () => account(["PROVIDER"]) }); await verified();
    fireEvent.click(screen.getByRole("radio", { name: /Ofrezco servicios/ })); fillAccount();
    await screen.findByText("¿Cómo te contactamos?"); fillContact(); await screen.findByText("Crea tu contraseña");
    type("Contraseña", PASSWORD); acceptTerms(); press("Crear mi cuenta");
    await waitFor(() => expect(calls.some((call) => call.path === "/identity/auth/register")).toBe(true));
    expect(calls.find((call) => call.path === "/identity/auth/register")?.body).toMatchObject({ role: "PROVIDER", registrationProof: PROOF });
    expect(calls.some((call) => call.path === "/identity/organizations")).toBe(false);
  });
  it("a planner's company is created with the new session before anyone sees the session, as before", async () => {
    const { manager, calls } = setup(undefined, {
      "POST /identity/auth/register": () => account(["PLANNER"]),
      "POST /identity/organizations": () => { expect(manager.getState().session).toBeNull(); return { id: "org-9", name: "Eventos Illimani", ownerUserId: "u", members: [] }; }
    }); await verified();
    fireEvent.click(screen.getByRole("radio", { name: /Ayudo a organizar/ })); type("Nombre de tu empresa o equipo", "Eventos Illimani"); fillAccount();
    await screen.findByText("¿Cómo te contactamos?"); fillContact(); await screen.findByText("Crea tu contraseña");
    type("Contraseña", PASSWORD); acceptTerms(); press("Crear mi cuenta");
    await waitFor(() => expect(manager.getState().session?.roles).toEqual(["PLANNER"]));
    expect(calls.find((call) => call.path === "/identity/organizations")).toMatchObject({ method: "POST", body: { name: "Eventos Illimani" } });
  });
  it("409 (the address gained an account between the steps) keeps everything and offers the way in; it never names an account", async () => {
    setup(undefined, { "POST /identity/auth/register": () => new HttpFailure(409, { title: "Conflict" }) }); await toStep4();
    type("Contraseña", PASSWORD); acceptTerms(); press("Crear mi cuenta");
    expect(await screen.findByText("No pudimos crear la cuenta con esos datos. Prueba con otro correo, o entra si ya tienes cuenta.")).toBeTruthy();
    expect(step()).toBe("4");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe(PASSWORD);
    expect(screen.getByRole("link", { name: "Entrar" })).toBeTruthy();
  });
  it("an expired or spent proof (422 on registrationProof) goes back to ask for a new code, with the rest kept", async () => {
    const { calls } = setup(undefined, { "POST /identity/auth/register": () => new HttpFailure(422, { errors: [{ field: "registrationProof", message: "invalid" }] }) }); await toStep4();
    type("Contraseña", PASSWORD); acceptTerms(); press("Crear mi cuenta");
    expect(await screen.findByText("La verificación del correo venció. Pide un código nuevo para seguir.")).toBeTruthy();
    expect(step()).toBe("1");
    expect(readRegistrationDraft()).toMatchObject({ givenName: "Ana", proof: null, email: EMAIL });
    expect(calls.filter((call) => call.path === "/identity/auth/register")).toHaveLength(1);
  });
  it("another 422 and a dead network are reported without leaking server text, and the typed password stays", async () => {
    const invalid = setup(undefined, { "POST /identity/auth/register": () => new HttpFailure(422, { errors: [{ field: "password", message: "bean validation: size must be between 12 and 128" }] }) }); await toStep4();
    type("Contraseña", PASSWORD); acceptTerms(); press("Crear mi cuenta");
    expect(await screen.findByText("Algunos datos no son válidos. Revisa los campos marcados.")).toBeTruthy();
    expect(screen.queryByText(/bean validation/)).toBeNull();
    invalid.view.unmount(); clearRegistrationDraft();
    setup(undefined, { "POST /identity/auth/register": () => { throw new TypeError("offline"); } }); await toStep4();
    type("Contraseña", PASSWORD); acceptTerms(); press("Crear mi cuenta");
    expect(await screen.findByText(/Sin conexión por ahora/)).toBeTruthy();
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe(PASSWORD);
  });
  it("B6/PF-10: the terms and the privacy policy are one tap away from step 4", async () => {
    const navigate = vi.fn();
    setup(<RegisterScreen onNavigate={navigate} />); await toStep4();
    fireEvent.click(screen.getByRole("link", { name: "Términos de uso" })); fireEvent.click(screen.getByRole("link", { name: "Política de privacidad" }));
    expect(navigate.mock.calls.map(([href]) => href)).toEqual(["/terminos", "/privacidad"]);
  });
});

describe("MV-D2 · the draft lives in memory only (R6, PF-1)", () => {
  it("reading the terms (leaving the screen) and coming back keeps the verified e-mail and the typed data, but never the password", async () => {
    const first = setup(); await toStep4(); type("Contraseña", PASSWORD); acceptTerms();
    first.view.unmount();
    const { calls } = setup();
    expect(step()).toBe("4");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("checkbox", { name: "Acepto los Términos de uso y la Política de privacidad." }).getAttribute("aria-checked")).toBe("true");
    type("Contraseña", PASSWORD); press("Crear mi cuenta");
    await waitFor(() => expect(calls.some((call) => call.path === "/identity/auth/register")).toBe(true));
    expect(calls.find((call) => call.path === "/identity/auth/register")?.body).toMatchObject({ email: EMAIL, givenName: "Ana", registrationProof: PROOF });
  });
  it("nothing of the draft, the code or the proof is written to localStorage, sessionStorage or the URL", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    setup(); await toStep4(); type("Contraseña", PASSWORD);
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
    expect(window.location.href).not.toMatch(/@|123456|p{20}/);
    setItem.mockRestore();
  });
  it("a restored draft past step 1 without a proof degrades to step 1 and keeps what was typed (it cannot reach the last button without a verified e-mail)", () => {
    writeRegistrationDraft({ ...EMPTY_REGISTRATION_DRAFT, step: 3, proof: null, email: EMAIL, givenName: "Ana", familyName: "Rojas", city: "La Paz" });
    setup();
    expect(step()).toBe("1");
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe(EMAIL);
    expect(screen.getByRole("button", { name: "Enviar código" })).toBeTruthy();
    expect(readRegistrationDraft()).toMatchObject({ step: 1, givenName: "Ana" });
  });
});

describe("MV-D3 · 'I already have an account'", () => {
  it("leads to /login with the e-mail already typed, and the e-mail is NOT in the URL (PF-1)", () => {
    const navigate = vi.fn();
    setup(<RegisterScreen onNavigate={navigate} />);
    type("Correo", "  Ana@Example.com ");
    fireEvent.click(screen.getByRole("link", { name: "Entrar" }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(String(navigate.mock.calls[0]?.[0])).not.toMatch(/@|email|correo/i);
    cleanup();
    setup(<LoginScreen onNavigate={vi.fn()} />);
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe("Ana@Example.com");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe("");
  });
  it("a sign-in opened any other way starts empty, and the handed-over e-mail is used once", () => {
    setup(<LoginScreen onNavigate={vi.fn()} />);
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe("");
    cleanup();
    const navigate = vi.fn();
    setup(<RegisterScreen onNavigate={navigate} />); type("Correo", "ana@example.com"); fireEvent.click(screen.getByRole("link", { name: "Entrar" })); cleanup();
    setup(<LoginScreen onNavigate={vi.fn()} />); cleanup();
    setup(<LoginScreen onNavigate={vi.fn()} />);
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe("");
  });
  it("keeps returnTo in the sign-in link, still without the e-mail", () => {
    const navigate = vi.fn();
    setup(<RegisterScreen onNavigate={navigate} returnTo="/editor/general?c=c-1" />);
    type("Correo", "ana@example.com"); fireEvent.click(screen.getByRole("link", { name: "Entrar" }));
    expect(navigate).toHaveBeenCalledWith("/login?returnTo=%2Feditor%2Fgeneral%3Fc%3Dc-1");
  });
});

describe("MV-D2 · accessibility, focus and the figure of each step", () => {
  it("moving to another step moves focus to it and announces it ('Paso 2 de 4: Tu cuenta'); the progress bar says where the person is", async () => {
    setup(); await verified();
    const group = screen.getByRole("group", { name: "Paso 2 de 4: Tu cuenta" });
    await waitFor(() => expect(document.activeElement).toBe(group));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 2 de 4: Tu cuenta");
    fillAccount(); await screen.findByText("¿Cómo te contactamos?");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("group", { name: "Paso 3 de 4: Cómo contactarte" })));
  });
  it("the code screen takes focus when it appears, so a screen reader reads it", async () => {
    setup(); await askForCode();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("group", { name: "Revisa tu correo" })));
  });
  it("errors are tied to their field and announced", async () => {
    setup(); await verified(); press("Siguiente");
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("Nombre").getAttribute("aria-invalid")).toBe("true");
  });
  it("MV-D4: each step draws its own figure (envelope with code, badge, city pin, key), decorative, never yellow and without a face", async () => {
    const { view } = setup();
    const figure = (): string[] => [...view.container.querySelectorAll("svg[data-illustration]")].map((svg) => svg.getAttribute("data-illustration") ?? "");
    expect(figure()).toEqual(["emailCode"]);
    await verified(); expect(figure()).toEqual(["nameBadge"]);
    fillAccount(); await screen.findByText("¿Cómo te contactamos?"); expect(figure()).toEqual(["cityPin"]);
    fillContact(); await screen.findByText("Crea tu contraseña"); expect(figure()).toEqual(["accessKey"]);
    for (const svg of view.container.querySelectorAll("svg[data-illustration]")) expect(svg.getAttribute("aria-hidden")).toBe("true");
    const html = view.container.innerHTML.toUpperCase();
    expect(html).not.toContain(tones.light.yellow.bg.toUpperCase());
    expect(html).not.toContain(tones.dark.yellow.bg.toUpperCase());
  });
  it("the four new drawings follow the scene grammar, carry exactly ONE pastel piece, use the blue group and contain no eye-sized dots (no faces)", () => {
    const smallCircle = /a(\d+(?:\.\d+)?) \1 0 1 0/g;
    for (const name of ["emailCode", "nameBadge", "cityPin", "accessKey"] as const) {
      const shapes = ILLUSTRATIONS[name];
      expect(shapes.slice(0, 2).map((shape) => shape.layer)).toEqual(["ground", "shadow"]);
      expect(shapes.filter((shape) => shape.layer === "soft")).toHaveLength(1);
      expect(ILLUSTRATION_PASTEL[ILLUSTRATION_GROUPS[name]]).toBe("blue");
      // A face needs two eye-sized dots: none of these has a circle of radius 4 or less (the ground and the shadow are not dots).
      const dots = shapes.flatMap((shape) => [...shape.d.matchAll(smallCircle)].map((match) => Number(match[1]))).filter((radius) => radius <= 4);
      expect(dots, `${name} has eye-sized dots`).toEqual([]);
    }
  });
  it("the page works at the width of a phone and of a desktop (the action follows the layout, never disappears)", async () => {
    for (const width of [360, 1280]) {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      window.dispatchEvent(new Event("resize"));
      const { view } = setup();
      expect(within(view.container).getByRole("button", { name: "Enviar código" })).toBeTruthy();
      cleanup(); clearRegistrationDraft();
    }
  });
});
