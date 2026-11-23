import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTranslator, LANDING_FAQ, LANDING_GUESTS, LANDING_STYLES, LANDING_TYPES } from "@rsvp/i18n";
import Index from "../app/index";
import { LandingScreen } from "../src/landing/landing-screen";
import { AnonymousHome as NativeAnonymousHome } from "../src/landing/anonymous-home";
import { AnonymousHome as WebAnonymousHome } from "../src/landing/anonymous-home.web";
import type { SessionClaims } from "../src/platform/session";
import { ADMIN, HOST, fakeClient, renderApp } from "./support";

const ANONYMOUS: SessionClaims = { userId: null, roles: [], organizationIds: [] };
const es = createTranslator("es-BO");
const en = createTranslator("en-US");

function show(locale: "es-BO" | "en-US" = "es-BO") {
  const onNavigate = vi.fn();
  renderApp(<LandingScreen onNavigate={onNavigate} />, fakeClient({}).client, ANONYMOUS, locale);
  return { onNavigate };
}

describe("Portada en la web · `/` sin sesión muestra la misma portada que el sitio público", () => {
  it("the promise, the three taps, who it is for, what is true and what is not, one way in — every section of the site, in its order", () => {
    show();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(es("landing.hero.title"));
    const order = [...document.querySelectorAll("[data-testid^='landing-']")].map((node) => node.getAttribute("data-testid"));
    for (const id of ["landing-nav", "landing-create", "landing-scene", "landing-styles", "landing-steps", "landing-guests", "landing-gifts", "landing-providers", "landing-roles", "landing-types", "landing-faq", "landing-closing"]) expect(order).toContain(id);
    expect(order.indexOf("landing-styles")).toBeLessThan(order.indexOf("landing-steps"));
    expect(order.indexOf("landing-faq")).toBeLessThan(order.indexOf("landing-closing"));
    expect(screen.getByTestId("landing-scene").getAttribute("aria-label")).toBe(es("landing.scene.label"));
  });

  it("draws one decorative scene per side of the party, the same three as the site", () => {
    show();
    const art = [...screen.getByTestId("landing-roles").querySelectorAll("svg[data-illustration]")];
    expect(art.map((svg) => svg.getAttribute("data-illustration"))).toEqual(["welcomeHost", "welcomeGuest", "welcomeProvider"]);
    for (const svg of art) expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the same sample content as the site (shared @rsvp/i18n landing content)", () => {
    show();
    expect(screen.getByTestId("landing-styles").querySelectorAll("[data-testid^='landing-style-']")).toHaveLength(LANDING_STYLES.length);
    expect(within(screen.getByTestId("landing-types")).getAllByText(/./)).toHaveLength(LANDING_TYPES.length);
    expect(screen.getByTestId("landing-guests-panel").textContent).toContain(es(`landing.guests.${LANDING_GUESTS[0].key}`));
    expect(within(screen.getByTestId("landing-faq")).getAllByRole("button")).toHaveLength(LANDING_FAQ.length);
  });

  it("one way in: create goes to the app's sign-up, sign-in to its login, and the directory to /proveedores", () => {
    const { onNavigate } = show();
    fireEvent.click(screen.getByTestId("landing-create"));
    expect(onNavigate).toHaveBeenLastCalledWith("/registro");
    fireEvent.click(screen.getByTestId("landing-sign-in"));
    expect(onNavigate).toHaveBeenLastCalledWith("/login");
    fireEvent.click(screen.getByTestId("landing-directory"));
    expect(onNavigate).toHaveBeenLastCalledWith("/proveedores");
    fireEvent.click(screen.getByTestId("landing-closing-cta"));
    expect(onNavigate).toHaveBeenLastCalledWith("/registro");
  });

  it("a question opens to its answer and announces it", () => {
    show();
    const question = screen.getByRole("button", { name: es("landing.faq.accountQ") });
    expect(question.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(es("landing.faq.accountA"))).toBeNull();
    fireEvent.click(question);
    expect(question.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(es("landing.faq.accountA"))).toBeTruthy();
  });

  it("in English with the same keys", () => {
    show("en-US");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(en("landing.hero.title"));
    expect(screen.getByTestId("landing-closing-cta").textContent).toBe(en("landing.closing.cta"));
  });
});

describe("Portada en la web, login en el celular · `/` por plataforma y sesión", () => {
  it("web without a session: the public home", () => {
    renderApp(<WebAnonymousHome />, fakeClient({}).client, ANONYMOUS);
    expect(screen.getByTestId("landing-screen")).toBeTruthy();
  });

  it("iOS/Android without a session: sign-in, never the home", () => {
    const { container } = render(<NativeAnonymousHome />);
    expect(container.textContent).toBe("redirect:/login");
  });

  it("with a session, on every platform: the home of the role", () => {
    const host = renderApp(<Index />, fakeClient({}).client, HOST);
    expect(host.container.textContent).toBe("redirect:/celebraciones");
    host.unmount();
    const admin = renderApp(<Index />, fakeClient({}).client, ADMIN);
    expect(admin.container.textContent).toBe("redirect:/admin");
  });

  it("without a session the entry defers to the platform's anonymous home (here the native one: sign-in)", () => {
    const { container } = renderApp(<Index />, fakeClient({}).client, ANONYMOUS);
    expect(container.textContent).toBe("redirect:/login");
  });
});
