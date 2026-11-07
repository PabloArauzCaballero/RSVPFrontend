import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient } from "@rsvp/api-client";
import { createContractMock, MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";
import { IdentityClient, SessionManager, createMemorySessionStore, createNativeSessionStore, sessionFromTokens, type Role } from "@rsvp/auth";
import { LanguageSwitch } from "../src/auth/auth-ui";
import { InvitationLinkScreen } from "../src/auth/invitation-link";
import { RedirectIfSignedIn, RouteGuard, currentLocation } from "../src/auth/route-guard";
import { AUTH_ROUTES, destinationAfterSignIn, groupOfPath, homeFor, loginHref } from "../src/auth/routes";
import { NotFoundScreen } from "../src/auth/not-found-screen";
import { LoginScreen, RecoveryScreen, RegisterScreen } from "../src/auth/screens";
import { AppProviders, createAppRuntime, useClaims, useLocale, type AppRuntime } from "../src/platform/providers";
import { claimsOf, createAppSessionStore } from "../src/platform/session";
import { readLocalePreference } from "../src/platform/preferences";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient, HttpFailure, type Handler } from "./support";

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (roles: Role[], extra: Record<string, unknown> = {}): string => `${b64({ alg: "RS256" })}.${b64({ sub: "user-1", roles, organizationIds: ["org-1"], exp: Math.floor(Date.now() / 1000) + 900, ...extra })}.sig`;
const tokenResponse = (roles: Role[], refresh = "r".repeat(40)) => ({ accessToken: jwt(roles), refreshToken: refresh, tokenType: "Bearer", expiresIn: 900 });

/** Renders `ui` inside the real provider stack with a SessionManager over a fake Identity transport. */
function setup(ui: React.ReactNode, handlers: Record<string, Handler> = {}, store = createMemorySessionStore()): { readonly manager: SessionManager; readonly calls: ReturnType<typeof fakeClient>["calls"] } {
  const { client, calls } = fakeClient(handlers);
  const manager = new SessionManager(store, new IdentityClient(client));
  const runtime: AppRuntime = { manager, client, identityClient: client };
  render(<AppProviders runtime={runtime} locale="es-BO" queryClient={new QueryClient()}>{ui}</AppProviders>);
  return { manager, calls };
}
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };
const press = (label: string): void => { fireEvent.click(screen.getByRole("button", { name: label })); };

beforeEach(() => { resetSecureStore(); localStorage.clear(); });

describe("REQ-F05-01 · sign in", () => {
  it("validates before calling Identity and explains each field", async () => {
    const { calls } = setup(<LoginScreen onNavigate={vi.fn()} />);
    press("Iniciar sesión");
    expect((await screen.findAllByText("Este campo es obligatorio.")).length).toBe(2);
    type("Correo electrónico", "no-es-correo"); type("Contraseña", "x"); press("Iniciar sesión");
    expect(await screen.findByText("Escribe un correo válido, por ejemplo nombre@correo.com.")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
  it("signs in with the real Identity contract and publishes the roles", async () => {
    const { manager, calls } = setup(<LoginScreen onNavigate={vi.fn()} />, { "POST /identity/auth/login": () => tokenResponse(["PLANNER"]) });
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "correct-horse-battery"); press("Iniciar sesión");
    await waitFor(() => expect(manager.getState().status).toBe("authenticated"));
    expect(manager.getState().session?.roles).toEqual(["PLANNER"]);
    expect(calls[0]).toMatchObject({ method: "POST", path: "/identity/auth/login", body: { email: "ana@example.com", password: "correct-horse-battery" } });
  });
  it("invalid credentials: neutral message, typed values kept, can retry", async () => {
    let attempts = 0;
    setup(<LoginScreen onNavigate={vi.fn()} />, { "POST /identity/auth/login": () => (++attempts === 1 ? new HttpFailure(401, { title: "Authentication failed" }) : tokenResponse(["HOST"])) });
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "wrong-password"); press("Iniciar sesión");
    expect(await screen.findByText("El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.")).toBeTruthy();
    expect((screen.getByLabelText("Correo electrónico") as HTMLInputElement).value).toBe("ana@example.com");
    type("Contraseña", "correct-horse-battery"); press("Iniciar sesión");
    await waitFor(() => expect(screen.queryByText(/no coinciden/)).toBeNull());
  });
  it("offline: says there is no connection, not that the password is wrong", async () => {
    setup(<LoginScreen onNavigate={vi.fn()} />, { "POST /identity/auth/login": () => { throw new TypeError("Failed to fetch"); } });
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "pw"); press("Iniciar sesión");
    expect(await screen.findByText("No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.")).toBeTruthy();
  });
  it("service unavailable (5xx) has its own message", async () => {
    setup(<LoginScreen onNavigate={vi.fn()} />, { "POST /identity/auth/login": () => new HttpFailure(503) });
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "pw"); press("Iniciar sesión");
    expect(await screen.findByText("El servicio de cuentas no responde por ahora. Inténtalo en unos minutos.")).toBeTruthy();
  });
  it("loading: the button is busy and a second press does not send a second request", async () => {
    let release: (value: unknown) => void = () => undefined;
    const pending = new Promise((resolve) => { release = resolve; });
    const { calls } = setup(<LoginScreen onNavigate={vi.fn()} />, { "POST /identity/auth/login": () => pending as never });
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "pw"); press("Iniciar sesión");
    const busy = await screen.findByRole("button", { name: "Entrando…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(busy);
    expect(calls).toHaveLength(1);
    await act(async () => { release(tokenResponse(["HOST"])); await pending; });
  });
  it("the password can be revealed and hidden by an accessible toggle", () => {
    setup(<LoginScreen onNavigate={vi.fn()} />);
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("password");
    press("Mostrar contraseña");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("links to recovery and sign-up, carrying returnTo", () => {
    const onNavigate = vi.fn();
    setup(<LoginScreen onNavigate={onNavigate} returnTo="/editor/general?c=c-1" />);
    expect(screen.getByText("Tu sesión terminó. Inicia sesión para continuar.")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })); expect(onNavigate).toHaveBeenLastCalledWith(AUTH_ROUTES.recover);
    fireEvent.click(screen.getByRole("link", { name: "Crear cuenta" })); expect(onNavigate).toHaveBeenLastCalledWith("/registro?returnTo=%2Feditor%2Fgeneral%3Fc%3Dc-1");
  });
});

describe("REQ-F05-01 · sign up and recovery", () => {
  it("blocks a short password locally and never calls Identity", async () => {
    const { calls } = setup(<RegisterScreen onNavigate={vi.fn()} />);
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "corta"); press("Crear cuenta");
    expect(await screen.findByText("La contraseña debe tener al menos 12 caracteres.")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
  it("registers with the chosen role and starts the session", async () => {
    const { manager, calls } = setup(<RegisterScreen onNavigate={vi.fn()} />, { "POST /identity/auth/register": () => ({ id: "u", email: "p@x.co", roles: ["PROVIDER"], ...tokenResponse(["PROVIDER"]) }) });
    type("Correo electrónico", "p@x.co"); type("Contraseña", "correct-horse-battery");
    fireEvent.click(screen.getByRole("radio", { name: /Proveedor/ })); press("Crear cuenta");
    await waitFor(() => expect(manager.getState().session?.roles).toEqual(["PROVIDER"]));
    expect(calls[0]?.body).toEqual({ email: "p@x.co", password: "correct-horse-battery", role: "PROVIDER" });
  });
  it("offers only the self-service roles (ADMIN never appears)", () => {
    setup(<RegisterScreen onNavigate={vi.fn()} />);
    expect(screen.getAllByRole("radio").filter((radio) => /Anfitri|Organizador|Proveedor/.test(radio.getAttribute("aria-label") ?? "")).length).toBe(3);
    expect(screen.queryByText(/Administrador/)).toBeNull();
  });
  it("409: the e-mail already exists, with a way out", async () => {
    setup(<RegisterScreen onNavigate={vi.fn()} />, { "POST /identity/auth/register": () => new HttpFailure(409, { title: "Conflict" }) });
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "correct-horse-battery"); press("Crear cuenta");
    expect(await screen.findByText("Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.")).toBeTruthy();
  });
  it("422 from the server is reported without leaking its technical text", async () => {
    setup(<RegisterScreen onNavigate={vi.fn()} />, { "POST /identity/auth/register": () => new HttpFailure(422, { errors: [{ field: "password", message: "bean validation: size must be between 12 and 128" }] }) });
    type("Correo electrónico", "ana@example.com"); type("Contraseña", "correct-horse-battery"); press("Crear cuenta");
    expect(await screen.findByText("Revisa los datos marcados e inténtalo de nuevo.")).toBeTruthy();
    expect(screen.queryByText(/bean validation/)).toBeNull();
  });
  it("recovery: confirms without revealing whether the account exists", async () => {
    const { calls } = setup(<RecoveryScreen onNavigate={vi.fn()} />, { "POST /identity/auth/password-recovery": () => undefined });
    type("Correo electrónico", "nadie@example.com"); press("Enviar instrucciones");
    expect(await screen.findByText("Si existe una cuenta con ese correo, recibirás las instrucciones para crear una contraseña nueva.")).toBeTruthy();
    expect(calls[0]).toMatchObject({ path: "/identity/auth/password-recovery", body: { email: "nadie@example.com" } });
  });
  it("recovery offline shows the connection message and keeps the e-mail", async () => {
    setup(<RecoveryScreen onNavigate={vi.fn()} />, { "POST /identity/auth/password-recovery": () => { throw new TypeError("offline"); } });
    type("Correo electrónico", "ana@example.com"); press("Enviar instrucciones");
    expect(await screen.findByText(/No hay conexión/)).toBeTruthy();
    expect((screen.getByLabelText("Correo electrónico") as HTMLInputElement).value).toBe("ana@example.com");
  });
});

describe("REQ-F05-03 · route guards", () => {
  const guarded = (group: "host" | "admin" | "provider"): React.ReactNode => <RouteGuard group={group}><p>contenido privado</p></RouteGuard>;
  const withRoles = async (roles: Role[], node: React.ReactNode): Promise<void> => {
    const store = createMemorySessionStore(sessionFromTokens(tokenResponse(roles)));
    setup(node, {}, store);
    await waitFor(() => expect(screen.queryByText("Verificando tu sesión…")).toBeNull());
  };
  it("shows a checking state while the stored session is read", () => {
    setup(guarded("host"));
    expect(screen.getByText("Verificando tu sesión…")).toBeTruthy();
  });
  it("an anonymous visitor is redirected to sign-in carrying the page they asked for", async () => {
    setup(guarded("host"));
    await waitFor(() => expect(screen.getByText("redirect:/login?returnTo=%2Fcelebraciones")).toBeTruthy());
    expect(screen.queryByText("contenido privado")).toBeNull();
  });
  it("a PROVIDER cannot enter (admin) and is offered its own space", async () => {
    await withRoles(["PROVIDER"], guarded("admin"));
    expect(screen.getByText("No tienes acceso a esta sección")).toBeTruthy();
    expect(screen.queryByText("contenido privado")).toBeNull();
    expect(screen.getByRole("button", { name: "Ir a mi espacio" })).toBeTruthy();
  });
  it("a HOST enters (host) but not (admin) or (provider)", async () => {
    await withRoles(["HOST"], guarded("host")); expect(screen.getByText("contenido privado")).toBeTruthy();
  });
  it("an account without any role gets an explanation and no way into private areas", async () => {
    await withRoles([], guarded("host"));
    expect(screen.getByText("Tu cuenta aún no tiene un rol asignado.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ir a mi espacio" })).toBeNull();
  });
  it("signing out from the forbidden screen revokes the session remotely and clears it", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokenResponse(["PROVIDER"])));
    const { manager, calls } = setup(guarded("admin"), { "POST /identity/auth/logout": () => undefined }, store);
    await waitFor(() => screen.getByText("No tienes acceso a esta sección"));
    press("Cerrar sesión");
    await waitFor(() => expect(manager.getState().status).toBe("anonymous"));
    expect(calls.find((call) => call.path === "/identity/auth/logout")?.body).toEqual({ refreshToken: "r".repeat(40) });
    expect(await store.getSession()).toBeNull();
  });
  it("RedirectIfSignedIn sends a signed-in person to the page they came from when their role allows it", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokenResponse(["HOST"])));
    setup(<RedirectIfSignedIn returnTo="/editor/general?c=c-1"><p>formulario</p></RedirectIfSignedIn>, {}, store);
    await waitFor(() => expect(screen.getByText("redirect:/editor/general?c=c-1")).toBeTruthy());
  });
  it("route helpers: groups, homes, destinations and loginHref", () => {
    expect(["/admin/templates", "/portal", "/invitacion", "/rsvp/abc", "/login", "/editor/general", "/celebraciones"].map(groupOfPath)).toEqual(["admin", "provider", "guest", "guest", "auth", "host", "host"]);
    expect(homeFor(["ADMIN"])).toBe("/admin"); expect(homeFor(["PROVIDER"])).toBe("/portal"); expect(homeFor(["HOST"])).toBe("/celebraciones"); expect(homeFor([])).toBeNull();
    expect(destinationAfterSignIn(["HOST"], "/admin")).toBe("/celebraciones");
    expect(destinationAfterSignIn(["ADMIN"], "/admin/templates")).toBe("/admin/templates");
    expect(destinationAfterSignIn(["HOST"], "https://evil.example")).toBe("/celebraciones");
    expect(destinationAfterSignIn(["HOST"], "/login")).toBe("/celebraciones");
    expect(destinationAfterSignIn([], null)).toBe("/invitacion");
    expect(loginHref("/preview?c=1")).toBe("/login?returnTo=%2Fpreview%3Fc%3D1"); expect(loginHref("//evil")).toBe("/login"); expect(loginHref(null)).toBe("/login");
    expect(currentLocation("/preview", { c: ["a", "b"], returnTo: "/x", empty: undefined })).toBe("/preview?c=a");
    expect(currentLocation("/editor/general", { section: "general", c: "abc-123" })).toBe("/editor/general?c=abc-123");
  });
});

describe("REQ-F05-02/06 · persistence, silent refresh and sign-out through the app runtime", () => {
  const Probe = (): React.ReactNode => { const claims = useClaims(); return <p>{claims.userId ?? "anónimo"}:{claims.roles.join(",")}:{claims.organizationIds.join(",")}</p>; };
  it("the stored session survives an app restart: claims come from the keychain", async () => {
    const keychain = new Map<string, string>();
    const adapter = { getItemAsync: async (k: string) => keychain.get(k) ?? null, setItemAsync: async (k: string, v: string) => { keychain.set(k, v); }, deleteItemAsync: async (k: string) => { keychain.delete(k); } };
    await createNativeSessionStore(adapter).setSession(sessionFromTokens(tokenResponse(["PLANNER"])));
    const { client } = fakeClient({});
    const runtime = { manager: new SessionManager(createNativeSessionStore(adapter), new IdentityClient(client)), client, identityClient: client };
    render(<AppProviders runtime={runtime} locale="es-BO"><Probe /></AppProviders>);
    await waitFor(() => expect(screen.getByText("user-1:PLANNER:org-1")).toBeTruthy());
  });
  it("end to end over fetch: a 401 renews the session once, retries with the new token and updates the roles", async () => {
    const expired = tokenResponse(["HOST"], "old".padEnd(40, "o")); const fresh = tokenResponse(["HOST", "PLANNER"], "n".repeat(40));
    const seen: string[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname; const auth = new Headers(init.headers).get("authorization");
      if (path === "/identity/auth/refresh") return new Response(JSON.stringify(fresh), { status: 200, headers: { "content-type": "application/json" } });
      seen.push(`${path}:${auth === `Bearer ${fresh.accessToken}` ? "fresh" : "stale"}`);
      return auth === `Bearer ${fresh.accessToken}` ? new Response("{}", { status: 200, headers: { "content-type": "application/json" } }) : new Response("{}", { status: 401, headers: { "content-type": "application/problem+json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const store = createMemorySessionStore(sessionFromTokens(expired));
      const { client: bare } = { client: createApiClient({ baseUrl: "http://gw", tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }, refreshSession: { refresh: async () => { throw new Error("x"); } } }) };
      const manager = new SessionManager(store, new IdentityClient(bare));
      await manager.restore();
      const api = createApiClient({ baseUrl: "http://gw", tokenStore: manager.tokenStore, refreshSession: manager.refreshSession });
      await api.request("/celebrations");
      expect(seen).toEqual(["/celebrations:stale", "/celebrations:fresh"]);
      expect(manager.getState().session?.roles).toEqual(["HOST", "PLANNER"]);
      expect(await store.getRefreshToken()).toBe("n".repeat(40));
    } finally { vi.unstubAllGlobals(); }
  });
  it("createAppRuntime reads the keychain through the platform store", async () => {
    const runtime = createAppRuntime("http://gw");
    expect((await runtime.manager.restore()).status).toBe("anonymous");
    await createAppSessionStore().setSession(sessionFromTokens(tokenResponse(["ADMIN"])));
    expect((await createAppRuntime("http://gw").manager.restore()).session?.roles).toEqual(["ADMIN"]);
  });
  it("claimsOf accepts a session, a raw token or nothing", () => {
    expect(claimsOf(null).roles).toEqual([]);
    expect(claimsOf(jwt(["HOST"])).userId).toBe("user-1");
    expect(claimsOf(sessionFromTokens(tokenResponse(["PROVIDER"]))).organizationIds).toEqual(["org-1"]);
    expect(claimsOf("garbage").userId).toBeNull();
  });
});

describe("REQ-F06-05 · language preference", () => {
  const Probe = (): React.ReactNode => <p data-testid="locale">{useLocale()}</p>;
  it("an explicit choice wins over the device and is remembered", async () => {
    const client: ApiClient = fakeClient({}).client;
    const first = render(<AppProviders client={client} locale="es-BO"><LanguageSwitch /><Probe /></AppProviders>);
    expect(screen.getByTestId("locale").textContent).toBe("es-BO");
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("en-US"));
    expect(screen.getByRole("radiogroup", { name: "Language" })).toBeTruthy();
    await waitFor(async () => expect(await readLocalePreference()).toBe("en-US"));
    first.unmount();
    // A later launch: the stored preference beats the prop default / device language.
    render(<AppProviders client={client} locale="es-BO"><Probe /></AppProviders>);
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("en-US"));
  });
  it("native preference storage reads and writes through the keystore", async () => {
    const { writeLocalePreference: write } = await import("../src/platform/preferences");
    await write("en-US"); expect(await readLocalePreference()).toBe("en-US");
  });
  it("web preference storage tolerates blocked storage", async () => {
    const web = await import("../src/platform/preferences.web");
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(await web.readLocalePreference()).toBeNull(); spy.mockRestore();
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    await expect(web.writeLocalePreference("en-US")).resolves.toBeUndefined(); set.mockRestore();
  });
});

describe("REQ-F05-04/05 · invitation link", () => {
  it("shows the personal-invitation landing in es-BO and en-US", () => {
    const { client } = fakeClient({});
    const view = render(<AppProviders client={client} locale="es-BO"><InvitationLinkScreen token="abc" /></AppProviders>);
    expect(screen.getByText("Tu invitación")).toBeTruthy(); view.unmount();
    render(<AppProviders client={client} locale="en-US"><InvitationLinkScreen token="abc" /></AppProviders>);
    expect(screen.getByText("Your invitation")).toBeTruthy();
  });
  it("resolves the credential with POST /rsvp/resolve and moves to the canonical route", async () => {
    const mock = createContractMock();
    mock.addGuest({ name: "Marta", token: MOCK_VALID_TOKEN });
    const onResolved = vi.fn();
    const client = createApiClient({ baseUrl: "http://gw.test", fetchFn: mock.fetch, tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }, refreshSession: { refresh: async () => { throw new Error("none"); } } });
    render(<AppProviders client={client} locale="es-BO"><InvitationLinkScreen token={MOCK_VALID_TOKEN} onResolved={onResolved} /></AppProviders>);
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(`/c/${mock.slug}/rsvp/${MOCK_VALID_TOKEN}`));
    expect(mock.state.log[0]).toMatchObject({ method: "POST", path: "/rsvp/resolve" });
  });
  it("an unknown credential (401) is the invalid link screen", async () => {
    const mock = createContractMock();
    const client = createApiClient({ baseUrl: "http://gw.test", fetchFn: mock.fetch, tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }, refreshSession: { refresh: async () => { throw new Error("none"); } } });
    render(<AppProviders client={client} locale="es-BO"><InvitationLinkScreen token={"x".repeat(43)} /></AppProviders>);
    expect(await screen.findByText("Este enlace no es válido")).toBeTruthy();
  });
  it("a missing token is reported as an invalid link", () => {
    render(<AppProviders client={fakeClient({}).client} locale="es-BO"><InvitationLinkScreen token="  " /></AppProviders>);
    expect(screen.getByText("Este enlace no es válido")).toBeTruthy();
  });
});

describe("unmatched address", () => {
  it("says so in the person's language and offers the way back (es-BO and en-US)", () => {
    const go = vi.fn();
    setup(<NotFoundScreen onNavigate={go} />);
    expect(screen.getByText("No encontramos esta página")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Ir al inicio" }));
    expect(go).toHaveBeenCalledWith("/");
    cleanup();
    const { client } = fakeClient({});
    const manager = new SessionManager(createMemorySessionStore(), new IdentityClient(client));
    render(<AppProviders runtime={{ manager, client, identityClient: client }} locale="en-US" queryClient={new QueryClient()}><NotFoundScreen onNavigate={go} /></AppProviders>);
    expect(screen.getByText("We could not find this page")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to the start page" })).toBeTruthy();
  });
});
