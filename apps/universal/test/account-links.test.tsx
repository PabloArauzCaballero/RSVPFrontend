import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityClient, SessionManager, createMemorySessionStore, sessionFromTokens, type Role } from "@rsvp/auth";
import { ResetPasswordScreen, VerifyEmailScreen } from "../src/auth/screens";
import { AppProviders, type AppRuntime } from "../src/platform/providers";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient, HttpFailure, type Handler } from "./support";

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (roles: Role[]): string => `${b64({ alg: "RS256" })}.${b64({ sub: "user-1", roles, organizationIds: [], exp: Math.floor(Date.now() / 1000) + 900 })}.sig`;
const TOKEN = "lnk_".padEnd(43, "x");
const INVALID_LINK = new HttpFailure(422, { title: "Validation failed", errors: [{ field: "token", message: "this link is invalid, was already used or has expired" }] });

function setup(ui: React.ReactNode, handlers: Record<string, Handler> = {}, signedIn = false, locale: "es-BO" | "en-US" = "es-BO") {
  const { client, calls } = fakeClient(handlers);
  const store = createMemorySessionStore(signedIn ? sessionFromTokens({ accessToken: jwt(["HOST"]), refreshToken: "r".repeat(40), expiresIn: 900 }) : null);
  const manager = new SessionManager(store, new IdentityClient(client));
  const runtime: AppRuntime = { manager, client, identityClient: client };
  render(<AppProviders runtime={runtime} locale={locale} queryClient={new QueryClient()}>{ui}</AppProviders>);
  return { manager, calls };
}
const press = (label: string): void => { fireEvent.click(screen.getByRole("button", { name: label })); };
const typeInto = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };

beforeEach(() => { resetSecureStore(); localStorage.clear(); });
afterEach(cleanup);

describe("B4 · new password from the recovery link", () => {
  it("both pages are public: signed in or not, and a signed-out person can come back to them", async () => {
    const { groupOfPath, loginHref } = await import("../src/auth/routes");
    expect(groupOfPath("/restablecer?token=x")).toBe("guest");
    expect(groupOfPath("/verificar-correo")).toBe("guest");
    expect(loginHref("/verificar-correo")).toBe("/login?returnTo=%2Fverificar-correo");
  });

  it("a cut link (no token) explains it and offers a new link, without calling Identity", async () => {
    const navigate = vi.fn();
    const { calls } = setup(<ResetPasswordScreen token={null} onNavigate={navigate} />);
    expect(await screen.findByText("Este enlace ya no sirve")).toBeTruthy();
    press("Pedir un enlace nuevo");
    expect(navigate).toHaveBeenCalledWith("/recuperar");
    expect(calls).toHaveLength(0);
  });

  it("checks the password policy before calling Identity", async () => {
    const { calls } = setup(<ResetPasswordScreen token={TOKEN} onNavigate={vi.fn()} />);
    typeInto("Contraseña nueva", "short"); press("Guardar contraseña");
    expect(await screen.findByText("Usa al menos 12 caracteres. Una frase corta funciona bien.")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("saves the new password with the link, signs this device out and sends the person to sign in", async () => {
    const navigate = vi.fn();
    const { calls, manager } = setup(<ResetPasswordScreen token={TOKEN} onNavigate={navigate} />, {
      "POST /identity/auth/password-reset": () => undefined, "POST /identity/auth/logout": () => undefined
    }, true);
    await waitFor(() => expect(manager.getState().status).toBe("authenticated"));
    typeInto("Contraseña nueva", "a brand new passphrase"); press("Guardar contraseña");
    expect(await screen.findByText("Tu contraseña cambió")).toBeTruthy();
    expect(calls.find((call) => call.path === "/identity/auth/password-reset")).toMatchObject({ method: "POST", body: { token: TOKEN, newPassword: "a brand new passphrase" } });
    await waitFor(() => expect(manager.getState().status).toBe("anonymous"));
    press("Ir a entrar");
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("a used or expired link (422 on token) says so instead of a generic error", async () => {
    setup(<ResetPasswordScreen token={TOKEN} onNavigate={vi.fn()} />, { "POST /identity/auth/password-reset": () => INVALID_LINK });
    typeInto("Contraseña nueva", "a brand new passphrase"); press("Guardar contraseña");
    expect(await screen.findByText(/Puede que ya lo hayas usado, que haya pasado más de media hora/)).toBeTruthy();
  });

  it("the server's password verdict lands on the field and the link stays usable", async () => {
    let attempts = 0;
    const { calls } = setup(<ResetPasswordScreen token={TOKEN} onNavigate={vi.fn()} />, {
      "POST /identity/auth/password-reset": () => (++attempts === 1 ? new HttpFailure(422, { errors: [{ field: "newPassword", message: "too long in bytes" }] }) : undefined)
    });
    typeInto("Contraseña nueva", "a brand new passphrase"); press("Guardar contraseña");
    expect(await screen.findByText("Usa al menos 12 caracteres. Una frase corta funciona bien.")).toBeTruthy();
    press("Guardar contraseña");
    expect(await screen.findByText("Tu contraseña cambió")).toBeTruthy();
    expect(calls.filter((call) => call.path === "/identity/auth/password-reset")).toHaveLength(2);
  });

  it("offline keeps the typed password and shows the connection message", async () => {
    setup(<ResetPasswordScreen token={TOKEN} onNavigate={vi.fn()} />, { "POST /identity/auth/password-reset": () => { throw new TypeError("offline"); } });
    typeInto("Contraseña nueva", "a brand new passphrase"); press("Guardar contraseña");
    expect(await screen.findByText(/Sin conexión por ahora/)).toBeTruthy();
    expect((screen.getByLabelText("Contraseña nueva") as HTMLInputElement).value).toBe("a brand new passphrase");
  });

  it("speaks en-US", async () => {
    setup(<ResetPasswordScreen token={TOKEN} onNavigate={vi.fn()} />, {}, false, "en-US");
    expect(await screen.findByText("Choose a new password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save password" })).toBeTruthy();
  });
});

describe("B4 · e-mail verification link", () => {
  it("confirms once on arrival and shows the result", async () => {
    const { calls } = setup(<VerifyEmailScreen token={TOKEN} onNavigate={vi.fn()} />, { "POST /identity/auth/email-verification/confirm": () => undefined });
    expect(await screen.findByText("Correo confirmado")).toBeTruthy();
    expect(calls.filter((call) => call.path === "/identity/auth/email-verification/confirm")).toEqual([expect.objectContaining({ body: { token: TOKEN } })]);
  });

  it("an invalid link signed out: sign in and come back here to ask for a new one", async () => {
    const navigate = vi.fn();
    setup(<VerifyEmailScreen token={TOKEN} onNavigate={navigate} />, { "POST /identity/auth/email-verification/confirm": () => INVALID_LINK });
    expect(await screen.findByText("Este enlace ya no sirve")).toBeTruthy();
    press("Ir a entrar");
    expect(navigate).toHaveBeenCalledWith("/login?returnTo=%2Fverificar-correo");
  });

  it("an invalid link signed in: sends a new one with the session's token", async () => {
    const { calls, manager } = setup(<VerifyEmailScreen token={null} onNavigate={vi.fn()} />, { "POST /identity/auth/email-verification": () => undefined }, true);
    await waitFor(() => expect(manager.getState().status).toBe("authenticated"));
    press("Enviar un enlace nuevo");
    expect(await screen.findByText(/te llegará un enlace nuevo/)).toBeTruthy();
    const resend = calls.find((call) => call.path === "/identity/auth/email-verification");
    expect(resend?.headers.get("authorization")).toMatch(/^Bearer /);
  });

  it("a network failure can be retried", async () => {
    let attempts = 0;
    setup(<VerifyEmailScreen token={TOKEN} onNavigate={vi.fn()} />, { "POST /identity/auth/email-verification/confirm": () => { if (++attempts === 1) throw new TypeError("offline"); return undefined; } });
    expect(await screen.findByText(/No pudimos confirmarlo ahora/)).toBeTruthy();
    press("Reintentar");
    expect(await screen.findByText("Correo confirmado")).toBeTruthy();
    expect(attempts).toBe(2);
  });
});
