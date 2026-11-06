// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Agenda, dayState, shiftMonth } from "../components/provider/agenda";
import { QuoteCart, quoteFailure } from "../components/provider/quote-cart";
import { FulfillmentNotice } from "../components/provider/fulfillment-notice";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "@rsvp/i18n/server";

const PID = "4f0f2d3d-0000-4000-8000-0000000000aa";
const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
const days = Array.from({ length: 28 }, (_, index) => { const day = String(index + 1).padStart(2, "0"); return { date: `2027-02-${day}`, weekday: (index + 1) % 7, available: index !== 4 && index !== 9, ...(index === 4 ? { reason: "BLACKOUT" } : index === 9 ? { reason: "FULL" } : {}) }; });

beforeEach(() => { window.sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("REQ-F26-03 · availability calendar", () => {
  it("maps blackout and full days apart from free days and shifts months across years", () => {
    expect(dayState({ date: "x", weekday: 0, available: true })).toBe("free");
    expect(dayState({ date: "x", weekday: 0, available: false, reason: "BLACKOUT" })).toBe("blocked");
    expect(dayState({ date: "x", weekday: 0, available: false, reason: "FULL" })).toBe("full");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
});

describe("REQ-F26-04/05 · date request: 422 blocked and 409 no capacity read differently", () => {
  const agenda = () => render(<Agenda slug="dulce-sol" providerId={PID} providerName="Dulce Sol" timeZone="America/La_Paz" locale="es-BO" initialMonth="2027-02" />);
  const stub = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === "POST" ? json(status, body) : json(200, { providerId: PID, timeZone: "America/La_Paz", month: "2027-02", days })));
  it.each([[422, "el proveedor la bloqueó"], [409, "Alguien tomó el último cupo"], [401, "Inicia sesión para solicitar una fecha"]] as const)("%i shows its own message", async (status, text) => {
    stub(status, { type: "x", title: "t", status });
    window.sessionStorage.setItem("rsvp.visitor.token", "tok");
    agenda();
    fireEvent.click(await screen.findByLabelText(/2027, sábado: Libre|Libre/, { selector: '[data-date="2027-02-01"]' }));
    fireEvent.click(screen.getByRole("button", { name: "Solicitar esta fecha" }));
    expect(await screen.findByText(new RegExp(text))).toBeTruthy();
  });
  it("a blocked day cannot be picked and says why", async () => {
    stub(201, {});
    agenda();
    const blocked = await screen.findByRole("button", { name: /No disponible/, hidden: false });
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(blocked);
    expect((screen.getByRole("button", { name: "Solicitar esta fecha" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("REQ-F26-01/02 · quote cart and sent confirmation", () => {
  const offers = [{ listingId: LISTING, title: "Torta", priceFrom: { amountMinor: 45000, currency: "BOB" }, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 3 } }];
  const cart = () => render(<QuoteCart slug="dulce-sol" providerId={PID} providerName="Dulce Sol" timeZone="America/La_Paz" offers={offers} preselected={LISTING} locale="es-BO" today="2026-11-05" cities={[{ slug: "la-paz", name: "La Paz" }, { slug: "sucre", name: "Sucre" }]} />);
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Fecha del evento"), { target: { value: "2027-03-10" } });
    fireEvent.change(screen.getByLabelText("Cantidad de invitados"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "ana@example.com" } });
  };
  it("shows fulfillment per offer and validates before sending", async () => {
    cart();
    expect(screen.getByText(/3 días de anticipación/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByText("Escribe tu nombre.")).toBeTruthy();
  });
  it("sends integer minor units and shows the receipt; 401 asks to sign in keeping the form", async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => { body = JSON.parse(String(init?.body)); return window.sessionStorage.getItem("rsvp.visitor.token") ? json(201, { id: "3ac2bdf8-db0f-4350-805c-0c70214ba5e8", status: "REQUESTED", leadId: "l", disclaimer: "Deslinde", listings: [] }) : json(401, { type: "x", title: "t", status: 401 }); }));
    cart(); fill();
    fireEvent.change(screen.getByLabelText("Presupuesto aproximado (Bs.)"), { target: { value: "5000" } });
    // Provider Catalog only accepts a city SLUG as eventCity (422 "eventCity must be a city slug"): the field is a list of slugs, not free text.
    fireEvent.change(screen.getByLabelText("Ciudad del evento"), { target: { value: "la-paz" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByText("Inicia sesión para enviar tu solicitud")).toBeTruthy();
    expect((screen.getByLabelText("Tu nombre") as HTMLInputElement).value).toBe("Ana");
    window.sessionStorage.setItem("rsvp.visitor.token", "tok");
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
    expect(body).toMatchObject({ budgetMinor: 500000, guestCount: 80, listingIds: [LISTING], contact: { email: "ana@example.com" }, eventCity: "la-paz" });
  });
});

describe("Anonymous quote · honeypot, no account needed, 429/403/422 messages", () => {
  const offers = [{ listingId: LISTING, title: "Torta" }];
  const cart = () => render(<QuoteCart slug="dulce-sol" providerId={PID} providerName="Dulce Sol" timeZone="America/La_Paz" offers={offers} preselected={LISTING} locale="es-BO" today="2026-11-05" cities={[{ slug: "la-paz", name: "La Paz" }, { slug: "sucre", name: "Sucre" }]} />);
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Fecha del evento"), { target: { value: "2027-03-10" } });
    fireEvent.change(screen.getByLabelText("Cantidad de invitados"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "ana@example.com" } });
  };
  it("sends without a session and without Authorization; the honeypot is hidden from assistive tech and omitted when empty", async () => {
    let headers = new Headers(); let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => { headers = new Headers(init?.headers); body = JSON.parse(String(init?.body)); return json(201, { id: "3ac2bdf8-db0f-4350-805c-0c70214ba5e8", status: "REQUESTED", leadId: "l", disclaimer: "d", listings: [] }); }));
    cart(); fill();
    const trap = document.getElementById("website") as HTMLInputElement;
    expect(trap.closest("[aria-hidden='true']")).not.toBeNull();
    expect(trap.tabIndex).toBe(-1);
    expect(screen.getByTestId("quote-anon-note").textContent).toMatch(/No necesitas una cuenta/);
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
    expect(headers.get("authorization")).toBeNull();
    expect(body).not.toHaveProperty("website");
    expect(body).not.toHaveProperty("captchaToken");
  });
  it("a bot that fills the honeypot sends it (the backend rejects it with 422 QUOTE_REJECTED)", async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => { body = JSON.parse(String(init?.body)); return json(422, { type: "x", title: "t", status: 422, code: "QUOTE_REJECTED" }); }));
    cart(); fill();
    fireEvent.change(document.getElementById("website") as HTMLInputElement, { target: { value: "http://spam.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByText(/No pudimos aceptar la solicitud/)).toBeTruthy();
    expect(body).toMatchObject({ website: "http://spam.example" });
  });
  it("maps each failure to its own copy", () => {
    const t = createTranslator("es-BO");
    expect(quoteFailure(429, undefined, 1800, t)).toMatch(/30 minutos/);
    expect(quoteFailure(429, undefined, undefined, t)).toMatch(/Espera un momento/);
    expect(quoteFailure(429, "QUOTE_LIMIT_REACHED", undefined, t)).toMatch(/máximo de solicitudes hoy/);
    expect(quoteFailure(403, "CAPTCHA_FAILED", undefined, t)).toMatch(/verificar que eres una persona/);
    expect(quoteFailure(422, "QUOTE_REJECTED", undefined, t)).toMatch(/No pudimos aceptar/);
    expect(quoteFailure(422, undefined, undefined, t)).toMatch(/El proveedor no pudo aceptar/);
  });
});

describe("REQ-F25-04 · fulfillment is visible: who is responsible, coverage, transport, lead time", () => {
  it("renders every field and a gentle fallback when the provider reported none", () => {
    const t = createTranslator("es-BO");
    const html = renderToStaticMarkup(<FulfillmentNotice t={t} locale="es-BO" currency="BOB" fulfillment={{ responsible: "PROVIDER", coverageZones: ["la-paz", "el-alto"], transportCostMinor: 5000, leadTimeDays: 3, conditions: "Montaje incluido", disclaimer: "Deslinde" }} />);
    for (const text of ["El proveedor", "la-paz, el-alto", "50", "3 días de anticipación", "Montaje incluido", "Deslinde"]) expect(html).toContain(text);
    expect(renderToStaticMarkup(<FulfillmentNotice t={t} locale="es-BO" currency="BOB" fulfillment={undefined} />)).toContain("aún no informó");
  });
});
