import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityClient, SessionManager, createMemorySessionStore } from "@rsvp/auth";
import { toApiError } from "@rsvp/api-client";
import { RegisterScreen } from "../src/auth/screens";
import { AppProviders, type AppRuntime } from "../src/platform/providers";
import { isSelfServiceDisabled, providerSelfServiceEnabled } from "../src/platform/provider-self-service";
import { OnboardingScreen, OverviewScreen } from "../src/provider/overview-screen";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** Phase 4 of the partner handover (A24, DP-2, DP-14, DPA-1): EXPO_PUBLIC_PROVIDER_SELF_SERVICE closes the self-service partner sign-up. */
const CLOSED = "Tu cuenta aún no tiene un partner. El equipo de DOne crea los partners después de verificar tu documentación (KYP). Escríbenos para empezar.";
const NO_PARTNERS: Record<string, Handler> = { "GET /providers/mine": () => ({ items: [] }) };
const selfService = (value: string): void => { vi.stubEnv("EXPO_PUBLIC_PROVIDER_SELF_SERVICE", value); };

beforeEach(() => { resetSecureStore(); localStorage.clear(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe("the switch", () => {
  it("explicit values win; unset follows the build (open in development, closed in production); anything else fails closed", () => {
    selfService("");
    expect(providerSelfServiceEnabled(true)).toBe(true);
    expect(providerSelfServiceEnabled(false)).toBe(false);
    selfService("true");
    expect(providerSelfServiceEnabled(false)).toBe(true);
    selfService("1");
    expect(providerSelfServiceEnabled(false)).toBe(true);
    selfService("false");
    expect(providerSelfServiceEnabled(true)).toBe(false);
    selfService("yes");
    expect(providerSelfServiceEnabled(true)).toBe(false);
  });
  it("recognises 403 SELF_SERVICE_DISABLED only", () => {
    expect(isSelfServiceDisabled(toApiError(403, "c", { title: "x", status: 403, code: "SELF_SERVICE_DISABLED" }))).toBe(true);
    expect(isSelfServiceDisabled(toApiError(403, "c", { title: "x", status: 403, code: "PROVIDER_FORBIDDEN" }))).toBe(false);
    expect(isSelfServiceDisabled(new TypeError("offline"))).toBe(false);
  });
});

describe("/portal/alta", () => {
  it("off: no create or connect form, only the explanation", async () => {
    selfService("false");
    const { client, calls } = fakeClient(NO_PARTNERS);
    renderApp(<OnboardingScreen onDone={vi.fn()} />, client, HOST);
    expect(await screen.findByText(CLOSED)).toBeTruthy();
    expect(screen.getByTestId("self-service-closed")).toBeTruthy();
    expect(screen.queryByTestId("provider-name")).toBeNull();
    expect(screen.queryByTestId("provider-code")).toBeNull();
    expect(screen.queryByTestId("provider-create")).toBeNull();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });
  it("on: today's create and connect forms", async () => {
    selfService("true");
    const { client } = fakeClient(NO_PARTNERS);
    renderApp(<OnboardingScreen onDone={vi.fn()} />, client, HOST);
    expect(await screen.findByTestId("provider-name")).toBeTruthy();
    expect(screen.getByTestId("provider-code")).toBeTruthy();
    expect(screen.queryByText(CLOSED)).toBeNull();
  });
  it("on, but the backend answers 403 SELF_SERVICE_DISABLED (an older build): the same explanation replaces the form", async () => {
    selfService("true");
    const { client, calls } = fakeClient({ ...NO_PARTNERS, "POST /providers": () => new HttpFailure(403, { code: "SELF_SERVICE_DISABLED" }) });
    renderApp(<OnboardingScreen onDone={vi.fn()} />, client, HOST);
    fireEvent.change(await screen.findByTestId("provider-name"), { target: { value: "Flores Sol" } });
    fireEvent.click(await screen.findByTestId("provider-create"));
    expect(await screen.findByText(CLOSED)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST" && call.path === "/providers")).toHaveLength(1);
    expect(screen.queryByTestId("provider-name")).toBeNull();
    await waitFor(() => expect(screen.queryByTestId("provider-create")).toBeNull());
  });
});

describe("portal without a partner (noProvider)", () => {
  it("off: the same explanation, and the button leads to it", async () => {
    selfService("false");
    const { client } = fakeClient(NO_PARTNERS);
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText(CLOSED)).toBeTruthy();
    expect(screen.queryByText("Primero registra tu negocio para ver esta sección.")).toBeNull();
    expect(screen.getByTestId("go-onboarding").textContent).toContain("Ver cómo empezar");
  });
  it("on: today's notice and «Registrar mi negocio»", async () => {
    selfService("true");
    const { client } = fakeClient(NO_PARTNERS);
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText("Primero registra tu negocio para ver esta sección.")).toBeTruthy();
    expect(screen.getByTestId("go-onboarding").textContent).toContain("Registrar mi negocio");
  });
});

describe("sign-up (DPA-1)", () => {
  function setup(handlers: Record<string, Handler> = {}) {
    const { client, calls } = fakeClient(handlers);
    const manager = new SessionManager(createMemorySessionStore(), new IdentityClient(client));
    const runtime: AppRuntime = { manager, client, identityClient: client };
    render(<AppProviders runtime={runtime} locale="es-BO" queryClient={new QueryClient()}><RegisterScreen onNavigate={vi.fn()} /></AppProviders>);
    return calls;
  }
  /** The role choices only (the language switch also renders radios). */
  const radios = (): string[] => [...document.querySelectorAll('[data-testid^="register-role-"]')].map((radio) => radio.getAttribute("aria-label") ?? "");

  it("off: PROVIDER is not offered and the request never carries it", async () => {
    selfService("false");
    const calls = setup({ "POST /identity/auth/register": () => new HttpFailure(409, { code: "EMAIL_TAKEN" }) });
    expect(radios()).toHaveLength(2);
    expect(radios().some((label) => /Ofrezco servicios/.test(label))).toBe(false);
    expect(screen.queryByTestId("register-role-PROVIDER")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Ayudo a organizar/ }));
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "p@x.co" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "correct-horse-battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.body).toEqual({ email: "p@x.co", password: "correct-horse-battery", role: "PLANNER" });
  });
  it("on: the three roles, PROVIDER included", () => {
    selfService("true");
    setup();
    expect(radios()).toHaveLength(3);
    expect(screen.getByTestId("register-role-PROVIDER")).toBeTruthy();
  });
});
