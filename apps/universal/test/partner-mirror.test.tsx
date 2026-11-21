import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgendaScreen, CatalogScreen, OfferScreen, PartnerScreen, QuoteScreen } from "../src/partner/partner-screens";
import { GUEST, HttpFailure, fakeClient, renderApp, type Handler } from "./support";

const PROVIDER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const L1 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a01";
const L2 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a02";
const card = (listingId: string, over: Record<string, unknown> = {}) => ({
  listingId, providerSlug: "dulce-sol", name: "Torta de bodas", category: "PASTRY", city: "La Paz", department: "La Paz", verified: true, summary: "Torta de tres pisos",
  priceFrom: { amountMinor: 120000, currency: "BOB" }, coverage: ["la-paz"], destinations: ["WHATSAPP"],
  fulfillment: { responsible: "PROVIDER", coverageZones: ["La Paz"], transportCostMinor: 5000, leadTimeDays: 3, conditions: "Pago al confirmar", disclaimer: "DOne no presta el servicio." }, ...over
});
const DAYS = [
  { date: "2027-02-01", weekday: 1, available: true },
  { date: "2027-02-02", weekday: 2, available: false, reason: "BLACKOUT" },
  { date: "2027-02-03", weekday: 3, available: false, reason: "FULL" }
];

function world(extra: Readonly<Record<string, Handler>> = {}) {
  return fakeClient({
    "GET /providers": () => ({ items: [card(L1), card(L2, { name: "Bocaditos", summary: "Bocaditos dulces", destinations: [] }), { ...card("x"), providerSlug: "otro" }], total: 3, page: 1, pageSize: 12 }),
    [`GET /listings/${L1}`]: () => ({ id: L1, providerId: PROVIDER }),
    [`GET /providers/${PROVIDER}`]: () => ({ id: PROVIDER, name: "Dulce Sol Pastelería", currency: "BOB", timeZone: "America/La_Paz", status: "VERIFIED" }),
    "GET /providers/categories": () => ({ items: [{ code: "PASTRY", name: "Pastelería" }] }),
    [`GET /providers/${PROVIDER}/calendar`]: () => ({ providerId: PROVIDER, timeZone: "America/La_Paz", month: "2027-02", days: DAYS }),
    ...extra
  });
}
function show(ui: (go: (path: string) => void) => JSX.Element, extra: Readonly<Record<string, Handler>> = {}) {
  const { client, calls } = world(extra);
  const onNavigate = vi.fn();
  renderApp(ui(onNavigate), client, GUEST);
  return { calls, onNavigate };
}

describe("Espejo web · B5 the partner microsite (/p/{slug})", () => {
  it("the business name, its verified offers only, coverage, and contact after the disclaimer, through the redirector", async () => {
    const { onNavigate } = show((go) => <PartnerScreen slug="dulce-sol" onNavigate={go} />);
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Dulce Sol Pastelería");
    // The category name is the one the catalogue publishes (PASTRY has no static translation).
    expect(await screen.findByText("Pastelería · La Paz")).toBeTruthy();
    const services = within(screen.getByTestId("partner-services"));
    expect(services.getByText("Torta de bodas")).toBeTruthy();
    expect(services.getByText("Bocaditos")).toBeTruthy();
    expect(screen.getByTestId("partner-coverage").textContent).toContain("La Paz");
    const contact = screen.getByTestId("partner-contact");
    const order = [...contact.querySelectorAll("[data-testid]")].map((node) => node.getAttribute("data-testid"));
    expect(order.indexOf("partner-disclaimer")).toBeLessThan(order.indexOf("contact-WHATSAPP"));
    fireEvent.click(screen.getByTestId("partner-quote"));
    expect(onNavigate).toHaveBeenCalledWith("/p/dulce-sol/cotizar");
  });

  it("negative: a slug with no verified listings is not found and reveals nothing", async () => {
    show((go) => <PartnerScreen slug="nadie" onNavigate={go} />);
    expect(await screen.findByTestId("partner-not-found")).toBeTruthy();
  });

  it("negative: an unverified provider is not found even if a card slipped through", async () => {
    show((go) => <PartnerScreen slug="dulce-sol" onNavigate={go} />, { [`GET /providers/${PROVIDER}`]: () => ({ id: PROVIDER, name: "X", currency: "BOB", timeZone: "America/La_Paz", status: "SUSPENDED" }) });
    expect(await screen.findByTestId("partner-not-found")).toBeTruthy();
  });

  it("negative: an unreachable catalogue is 'unavailable' with retry, never 'not found'", async () => {
    show((go) => <PartnerScreen slug="dulce-sol" onNavigate={go} />, { "GET /providers": () => new HttpFailure(503) });
    expect(await screen.findByTestId("partner-unavailable", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("Espejo web · B6/B7 catalogue and offer", () => {
  it("the catalogue lists every offer and opens its page at the web's address", async () => {
    const { onNavigate } = show((go) => <CatalogScreen slug="dulce-sol" onNavigate={go} />);
    expect(await screen.findByTestId(`offer-${L1}`)).toBeTruthy();
    fireEvent.click(within(screen.getByTestId(`offer-${L1}`)).getByRole("button"));
    expect(onNavigate).toHaveBeenCalledWith(`/p/dulce-sol/catalogo/${L1}`);
  });

  it("an offer shows its fulfillment before quote, agenda and contact; the quote preselects it", async () => {
    const { onNavigate } = show((go) => <OfferScreen slug="dulce-sol" sku={L1} onNavigate={go} />);
    const fulfillment = await screen.findByTestId("fulfillment");
    expect(fulfillment.textContent).toContain("3");
    expect(fulfillment.textContent).toContain("Pago al confirmar");
    const page = screen.getByTestId("offer-screen");
    const ids = [...page.querySelectorAll("[data-testid]")].map((node) => node.getAttribute("data-testid"));
    expect(ids.indexOf("fulfillment")).toBeLessThan(ids.indexOf("offer-quote"));
    expect(ids.indexOf("partner-disclaimer")).toBeLessThan(ids.indexOf("contact-WHATSAPP"));
    fireEvent.click(screen.getByTestId("offer-quote"));
    expect(onNavigate).toHaveBeenCalledWith(`/p/dulce-sol/cotizar?l=${L1}`);
  });

  it("negative: an offer that is not this partner's is not found", async () => {
    show((go) => <OfferScreen slug="dulce-sol" sku="no-existe" onNavigate={go} />);
    expect(await screen.findByTestId("offer-not-found")).toBeTruthy();
  });
});

describe("Espejo web · B10/B11 agenda", () => {
  it("free, blocked and full days read differently; a free day is requested with the date", async () => {
    let body: unknown;
    show((go) => <AgendaScreen slug="dulce-sol" onNavigate={go} />, { [`POST /providers/${PROVIDER}/bookings`]: (call) => { body = call.body; return { id: "b1", providerId: PROVIDER, requesterId: "u", date: "2027-02-01", status: "REQUESTED", expiresAt: "2027-01-30T12:00:00Z" }; } });
    await screen.findByTestId("agenda-grid");
    expect((screen.getByTestId("day-2027-02-02") as HTMLElement).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("day-2027-02-01"));
    fireEvent.click(screen.getByTestId("agenda-request"));
    expect((await screen.findByTestId("agenda-outcome")).textContent).toContain("Fecha solicitada");
    expect(body).toEqual({ date: "2027-02-01" });
  });

  it("409 says the last slot is gone; 401 offers this app's sign-in and the way back", async () => {
    let answer: HttpFailure = new HttpFailure(409);
    const { onNavigate } = show((go) => <AgendaScreen slug="dulce-sol" onNavigate={go} />, { [`POST /providers/${PROVIDER}/bookings`]: () => answer });
    await screen.findByTestId("agenda-grid");
    fireEvent.click(screen.getByTestId("day-2027-02-01"));
    fireEvent.click(screen.getByTestId("agenda-request"));
    expect(await screen.findByText("Alguien tomó el último cupo de esta fecha. Elige otro día libre; el calendario se actualizó.")).toBeTruthy();
    answer = new HttpFailure(401);
    fireEvent.click(screen.getByTestId("day-2027-02-01"));
    fireEvent.click(screen.getByTestId("agenda-request"));
    fireEvent.click(await screen.findByTestId("agenda-signin"));
    expect(onNavigate).toHaveBeenCalledWith(`/login?returnTo=${encodeURIComponent("/p/dulce-sol/agenda")}`);
  });
});

describe("Espejo web · B8/B9 quote", () => {
  const fill = (): void => {
    fireEvent.change(screen.getByLabelText("Fecha del evento"), { target: { value: "2099-05-10" } });
    fireEvent.change(screen.getByTestId("quote-guests"), { target: { value: "120" } });
    fireEvent.change(screen.getByTestId("quote-name"), { target: { value: "Ana Quispe" } });
    fireEvent.change(screen.getByTestId("quote-email"), { target: { value: "ana@example.com" } });
  };

  it("negative: nothing chosen or missing fields → errors per field, nothing sent, typed values kept", async () => {
    const { calls } = show((go) => <QuoteScreen slug="dulce-sol" onNavigate={go} />);
    await screen.findByTestId("quote-items");
    fireEvent.change(screen.getByTestId("quote-name"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByTestId("quote-submit"));
    expect(await screen.findByTestId("quote-items-error")).toBeTruthy();
    expect((screen.getByTestId("quote-name") as HTMLInputElement).value).toBe("Ana");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("the preselected offer, the request with integer minor units, and the sent confirmation", async () => {
    let body: Record<string, unknown> = {};
    show((go) => <QuoteScreen slug="dulce-sol" preselected={L1} onNavigate={go} />, { [`POST /providers/${PROVIDER}/quotes`]: (call) => { body = call.body as Record<string, unknown>; return { id: "q1234567890", status: "REQUESTED", leadId: "l", disclaimer: "DOne conecta.", listings: [] }; } });
    await screen.findByTestId("quote-items");
    expect(screen.getByTestId("quote-summary").textContent).toContain("Torta de tres pisos");
    fill();
    fireEvent.change(screen.getByTestId("quote-budget"), { target: { value: "1500.50" } });
    fireEvent.click(screen.getByTestId("quote-submit"));
    expect(await screen.findByTestId("quote-sent")).toBeTruthy();
    expect(body).toMatchObject({ listingIds: [L1], eventDate: "2099-05-10", guestCount: 120, budgetMinor: 150050, contact: { name: "Ana Quispe", email: "ana@example.com" }, locale: "es-BO" });
  });

  it("429 says how long to wait; 401 offers this app's sign-in", async () => {
    let answer: HttpFailure = new HttpFailure(429, { code: "RATE_LIMITED" });
    const { onNavigate } = show((go) => <QuoteScreen slug="dulce-sol" preselected={L1} onNavigate={go} />, { [`POST /providers/${PROVIDER}/quotes`]: () => answer });
    await screen.findByTestId("quote-items");
    fill();
    fireEvent.click(screen.getByTestId("quote-submit"));
    expect(await screen.findByTestId("quote-error")).toBeTruthy();
    answer = new HttpFailure(401);
    fireEvent.click(screen.getByTestId("quote-submit"));
    fireEvent.click(await screen.findByTestId("quote-signin"));
    expect(onNavigate).toHaveBeenCalledWith(`/login?returnTo=${encodeURIComponent("/p/dulce-sol/cotizar")}`);
  });
});
