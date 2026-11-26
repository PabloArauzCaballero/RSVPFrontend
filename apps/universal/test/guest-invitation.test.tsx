import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicCelebrationView } from "@rsvp/celebration-theme";
import type { Template } from "@rsvp/query-hooks";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { InvitationScreen, invitationPath } from "../src/guest/invitation-screen";
import { clearGiftCredential, saveGiftCredential } from "../src/guest/gift-credential";
import { groupOfPath } from "../src/auth/routes";
import { GUEST, HttpFailure, TEMPLATES, fakeClient, renderApp, type Handler } from "./support";

/** GET /celebrations/public/{slug} as the Celebration API returns it (es-BO). */
const VIEW: PublicCelebrationView = {
  celebrationId: "c-1", slug: "ana-y-luis", locale: "es-BO", availableLocales: ["es-BO", "en-US"],
  eventType: { code: "WEDDING", name: "Boda", hostRoles: [{ role: "BRIDE", label: "Novia" }, { role: "GROOM", label: "Novio" }] },
  enabledSections: ["story", "schedule", "venues", "gallery", "faq", "recommendations", "rsvp"], timeZone: "America/La_Paz", currency: "BOB", templateId: "t-classic",
  content: {
    title: "Ana y Luis", eventDate: "2026-12-19T23:00:00.000Z", venueName: "Salón Las Palmas", hosts: { BRIDE: "Ana", GROOM: "Luis" },
    story: "Nos conocimos en La Paz.", schedule: [{ id: "s1", title: "Ceremonia", startsAt: "2026-12-19T23:00:00.000Z" }],
    faq: [{ question: "¿Pueden ir niños?", answer: "Sí, son bienvenidos." }],
    recommendations: [{ kind: "lodging", name: "Hotel Partner", listingId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" }, { kind: "transport", name: "Taxi sin ficha", listingId: "not-a-uuid" }]
  },
  localTimes: {}, rsvpDeadline: null, publishedAt: "2026-10-17T12:00:00.000Z", version: 4
};
const PHOTOS = { items: [{ id: "p1", width: 1200, height: 800, isCover: true, variants: { thumb: "https://media.test/p1-t.webp", medium: "https://media.test/p1-m.webp", full: "https://media.test/p1-f.webp" } }] };

/** The classic look with every section the invitation fills, in the order the template places them. */
const TEMPLATE: Template = { ...(TEMPLATES[0] as Template), sectionOrder: ["story", "schedule", "venues", "gallery", "faq", "recommendations", "rsvp"] };

// The language a guest picks is remembered on the device; every case starts from Spanish.
beforeEach(() => { resetSecureStore(); });

function gateway(overrides: Readonly<Record<string, Handler>> = {}) {
  return fakeClient({
    "GET /celebrations/public/ana-y-luis": (call) => (call.headers.get("accept-language") === "en-US" ? { ...VIEW, locale: "en-US", content: { ...VIEW.content, title: "Ana and Luis" } } : VIEW),
    "GET /media/templates/t-classic": () => TEMPLATE,
    "GET /media/public/celebrations/c-1/assets": () => PHOTOS,
    ...overrides
  });
}

function show(props: { readonly section?: string; readonly slug?: string } = {}, handlers: Readonly<Record<string, Handler>> = {}) {
  const { client, calls } = gateway(handlers);
  const onNavigate = vi.fn();
  const openUrl = vi.fn();
  renderApp(<InvitationScreen slug={props.slug ?? "ana-y-luis"} {...(props.section !== undefined ? { section: props.section } : {})} onNavigate={onNavigate} openUrl={openUrl} />, client, GUEST);
  return { calls, onNavigate, openUrl };
}

describe("Espejo web · A1 the public invitation in the app (/c/{slug})", () => {
  it("renders the same invitation as the public page: cover, photo, sections and their navigation, from the public reads without a session", async () => {
    const { calls } = show();
    expect(await screen.findByTestId("invitation-screen")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ana y Luis");
    expect(screen.getByTestId("celebration-cover-photo")).toBeTruthy();
    const nav = within(screen.getByTestId("celebration-nav"));
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual(["Inicio", "Nuestra historia", "Itinerario", "Lugares", "Galería", "Preguntas frecuentes", "Recomendaciones", "Regalos"]);
    expect(screen.getByText("Los horarios están en la hora local del evento", { exact: false })).toBeTruthy();
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(expect.arrayContaining(["GET /celebrations/public/ana-y-luis", "GET /media/templates/t-classic", "GET /media/public/celebrations/c-1/assets"]));
    expect(calls.every((call) => !call.headers.has("authorization"))).toBe(true);
    // The classic layout's column (720 px), as the web page caps it.
    expect(getComputedStyle(screen.getByTestId("invitation-column")).maxWidth).toBe("720px");
  });

  it("navigation goes to the same addresses as the public site", async () => {
    const { onNavigate } = show();
    await screen.findByTestId("invitation-screen");
    fireEvent.click(within(screen.getByTestId("celebration-nav")).getByText("Lugares"));
    expect(onNavigate).toHaveBeenCalledWith("/c/ana-y-luis/lugares");
    expect(invitationPath("ana y luis", "dressCode")).toBe("/c/ana%20y%20luis/dress-code");
    expect(invitationPath("ana-y-luis", null)).toBe("/c/ana-y-luis");
  });

  it("how to get there opens maps; a partner opens through the redirector with the app surface; an unlinkable listing shows no link", async () => {
    const { openUrl } = show();
    await screen.findByTestId("invitation-screen");
    fireEvent.click(screen.getByText("Cómo llegar"));
    expect(openUrl).toHaveBeenCalledWith("https://www.google.com/maps/search/?api=1&query=Sal%C3%B3n%20Las%20Palmas");
    const views = screen.getAllByText("Ver opción");
    expect(views).toHaveLength(1);
    fireEvent.click(views[0] as HTMLElement);
    const partner = new URL(String(openUrl.mock.lastCall?.[0]));
    expect(partner.pathname).toBe("/r/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b");
    expect(partner.searchParams.get("surface")).toBe("APP");
    expect(partner.searchParams.get("celebrationId")).toBe("c-1");
    expect(screen.getByText("Taxi sin ficha")).toBeTruthy();
  });

  it("P22 · the gifts button is always there, even when the template and the event type omit gifts; it opens /c/{slug}/regalos with no token", async () => {
    const { onNavigate } = show();
    await screen.findByTestId("invitation-screen");
    const button = screen.getByTestId("celebration-gifts-cta");
    expect(button.textContent).toBe("Ver regalos");
    fireEvent.click(button);
    expect(onNavigate).toHaveBeenLastCalledWith("/c/ana-y-luis/regalos");
    fireEvent.click(within(screen.getByTestId("celebration-nav")).getByText("Regalos"));
    expect(onNavigate).toHaveBeenLastCalledWith("/c/ana-y-luis/regalos");
    expect(onNavigate.mock.calls.every(([path]) => !String(path).includes("token"))).toBe(true);
  });

  it("PL-A11 · the reply leads to the help to find the personal link, or to «Confirmar asistencia» when the session holds it", async () => {
    const first = show();
    await screen.findByTestId("invitation-screen");
    expect(screen.getByTestId("celebration-rsvp-cta").textContent).toBe("Busca tu enlace personal");
    fireEvent.click(screen.getByTestId("celebration-rsvp-cta"));
    expect(first.onNavigate).toHaveBeenLastCalledWith("/c/ana-y-luis/rsvp");
    cleanup();
    saveGiftCredential("ana-y-luis", "tok-1234567890abcdef");
    try {
      show();
      await screen.findByTestId("invitation-screen");
      expect(screen.getByTestId("celebration-rsvp-cta").textContent).toBe("Confirmar asistencia");
    } finally { clearGiftCredential("ana-y-luis"); }
  });

  it("the celebration's languages: choosing English reads the invitation again with Accept-Language en-US", async () => {
    const { calls } = show();
    await screen.findByTestId("invitation-screen");
    fireEvent.click(within(screen.getByTestId("invitation-languages")).getByRole("radio", { name: "English" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ana and Luis"));
    expect(within(screen.getByTestId("celebration-nav")).getByText("Our story")).toBeTruthy();
    expect(calls.some((call) => call.path === "/celebrations/public/ana-y-luis" && call.headers.get("accept-language") === "en-US")).toBe(true);
  });

  it("the language choice is written in the invitation's ink, whatever the app's scheme (regression: light on light in dark mode)", async () => {
    show();
    await screen.findByTestId("invitation-screen");
    const english = within(screen.getByTestId("invitation-languages")).getByText("English");
    expect(getComputedStyle(english).color).toBe("rgb(48, 44, 40)");
  });

  it("a celebration in one language shows no language choice", async () => {
    show({}, { "GET /celebrations/public/ana-y-luis": () => ({ ...VIEW, availableLocales: ["es-BO"] }) });
    await screen.findByTestId("invitation-screen");
    expect(screen.queryByTestId("invitation-languages")).toBeNull();
  });

  it("the template and the photos only dress the page: if media fails the invitation still renders with the default look", async () => {
    show({}, { "GET /media/templates/t-classic": () => new HttpFailure(503), "GET /media/public/celebrations/c-1/assets": () => new HttpFailure(502) });
    expect(await screen.findByTestId("invitation-screen")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ana y Luis");
    expect(screen.queryByTestId("celebration-cover-photo")).toBeNull();
  });

  it("negative 404: an unknown or unpublished slug says so kindly and offers the way home", async () => {
    const { onNavigate } = show({ slug: "no-existe" }, { "GET /celebrations/public/no-existe": () => new HttpFailure(404) });
    expect(await screen.findByText("Esta celebración no está disponible")).toBeTruthy();
    fireEvent.click(screen.getByTestId("invitation-home"));
    expect(onNavigate).toHaveBeenCalledWith("/");
  });

  it("negative 503: the server failing is not a 404; it says so and retries on demand", async () => {
    let fail = true;
    show({}, { "GET /celebrations/public/ana-y-luis": () => (fail ? new HttpFailure(503) : VIEW) });
    // One retry for a 5xx happens first (retryTransient), then the failure is shown.
    expect(await screen.findByTestId("guest-retry", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByText("Esta celebración no está disponible")).toBeNull();
    fail = false;
    fireEvent.click(screen.getByTestId("guest-retry"));
    expect(await screen.findByTestId("invitation-screen")).toBeTruthy();
  });
});

describe("Espejo web · A2–A8 a section's own page in the app (/c/{slug}/{section})", () => {
  it("shows only that section under a header named after it, current in the navigation", async () => {
    show({ section: "faq" });
    await screen.findByTestId("invitation-screen");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Preguntas frecuentes");
    expect([...document.querySelectorAll("[data-testid^='section-']")].map((node) => node.getAttribute("data-testid"))).toEqual(["section-faq"]);
    const question = screen.getByRole("button", { name: "¿Pueden ir niños?" });
    fireEvent.click(question);
    expect(screen.getByText("Sí, son bienvenidos.")).toBeTruthy();
  });

  it("negative: a path that is not a section is not a page (no request made)", async () => {
    const { calls } = show({ section: "inventado" });
    expect(await screen.findByText("Esta celebración no está disponible")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("negative: a section the celebration left empty, or its template does not place, is not a page", async () => {
    show({ section: "dress-code" });
    expect(await screen.findByText("Esta celebración no está disponible")).toBeTruthy();
  });

  it("the invitation routes belong to the public guest group: no sign-in is asked", () => {
    expect(groupOfPath("/c/ana-y-luis")).toBe("guest");
    expect(groupOfPath("/c/ana-y-luis/lugares")).toBe("guest");
  });
});
