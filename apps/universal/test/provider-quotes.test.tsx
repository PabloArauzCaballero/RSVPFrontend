import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuotesScreen } from "../src/provider/quotes-screen";
import { portalNav } from "../src/provider/frame";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** B11 · The provider reads the quote requests it received (provider-catalog 2.5.0): inbox without contact data, contact on demand. */
const PID = "4f0f2d3d-0000-4000-8000-0000000000bb";
const profile = { id: PID, slug: "dulce-sol", name: "Dulce Sol", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const summary = (id: string, n: number) => ({ id, providerId: PID, status: "REQUESTED", eventDate: "2027-03-20", guestCount: 80 + n, budget: n % 2 ? null : { amountMinor: 1_500_000, currency: "BOB" }, eventCity: "sacaba", listingIds: ["5e0f2d3d-0000-4000-8000-0000000000aa"], locale: "es-BO", contactName: `Cliente ${n}`, hasMessage: n === 0, createdAt: "2026-11-20T15:00:00Z" });
const base = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({ [`GET /providers/${PID}`]: () => profile, ...extra });
beforeEach(async () => { resetSecureStore(); await writeLocal("rsvp.provider.u-host", PID); });
afterEach(() => { cleanup(); });

describe("provider quote inbox (B11)", () => {
  it("lists the requests newest first without e-mail or phone and loads the contact only when opened", async () => {
    const { client, calls } = fakeClient(base({
      [`GET /providers/${PID}/quotes`]: () => ({ items: [summary("q0", 0), summary("q1", 1)], nextCursor: null }),
      [`GET /providers/${PID}/quotes/q0`]: () => ({ ...summary("q0", 0), contact: { name: "Cliente 0", email: "cliente0@correo.bo", phone: "+591 700 00000" }, message: "Boda civil en marzo", leadId: null })
    }));
    renderApp(<QuotesScreen />, client, HOST);
    const row = await screen.findByTestId("quote-q0");
    expect(screen.getAllByTestId(/^quote-q\d$/)).toHaveLength(2);
    expect(within(row).getByText("Cliente 0")).toBeTruthy();
    expect(within(row).getByText("80 invitados")).toBeTruthy();
    expect(within(row).getByText(/Presupuesto: Bs/)).toBeTruthy();
    expect(within(screen.getByTestId("quote-q1")).getByText("Sin presupuesto indicado")).toBeTruthy();
    expect(document.body.textContent).not.toContain("cliente0@correo.bo");
    expect(calls.some((call) => call.path === `/providers/${PID}/quotes/q0`)).toBe(false);
    fireEvent.click(within(row).getByTestId("quote-toggle-q0"));
    const contact = await screen.findByTestId("quote-contact-q0");
    expect(within(contact).getByText("Correo: cliente0@correo.bo")).toBeTruthy();
    expect(within(contact).getByText("Teléfono: +591 700 00000")).toBeTruthy();
    expect(screen.getByTestId("quote-message-q0").textContent).toBe("Boda civil en marzo");
    expect(within(contact).getByRole("button", { name: /Escribir a cliente0@correo.bo/ })).toBeTruthy();
    expect(within(contact).getByRole("button", { name: /Llamar al \+591 700 00000/ })).toBeTruthy();
    expect(screen.getByTestId("quotes-shown").textContent).toBe("2 cotizaciones");
  });

  it("shows an honest empty state and pages with the cursor", async () => {
    const empty = fakeClient(base({ [`GET /providers/${PID}/quotes`]: () => ({ items: [], nextCursor: null }) }));
    renderApp(<QuotesScreen />, empty.client, HOST);
    expect(await screen.findByText("Aún no tienes cotizaciones")).toBeTruthy();
    cleanup();
    let page = 0;
    const paged = fakeClient(base({ [`GET /providers/${PID}/quotes`]: () => (page++ === 0 ? { items: [summary("q0", 0)], nextCursor: "c1" } : { items: [summary("q1", 1)], nextCursor: null }) }));
    renderApp(<QuotesScreen />, paged.client, HOST);
    await screen.findByTestId("quote-q0");
    fireEvent.click(screen.getByTestId("quotes-more"));
    await screen.findByTestId("quote-q1");
    await waitFor(() => expect(screen.queryByTestId("quotes-more")).toBeNull());
  });

  it("a contact that cannot be loaded says so and can be retried; a forbidden inbox shows the portal error", async () => {
    const { client } = fakeClient(base({
      [`GET /providers/${PID}/quotes`]: () => ({ items: [summary("q0", 0)], nextCursor: null }),
      [`GET /providers/${PID}/quotes/q0`]: () => new HttpFailure(503, { code: "UNAVAILABLE" })
    }));
    renderApp(<QuotesScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("quote-toggle-q0"));
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeTruthy();
    cleanup();
    const forbidden = fakeClient(base({ [`GET /providers/${PID}/quotes`]: () => new HttpFailure(403, { code: "PROVIDER_OWNER_REQUIRED" }) }));
    renderApp(<QuotesScreen />, forbidden.client, HOST);
    expect(await screen.findByText(/Solo el titular de la ficha/)).toBeTruthy();
  });

  it("the quote inbox is the first tab of Clients in both languages", () => {
    const clients = portalNav((key: string) => key).find((item) => item.key === "clients");
    expect(clients?.tabs?.map((tab) => tab.href)).toEqual(["/portal/cotizaciones", "/portal/leads", "/portal/metricas"]);
  });

  it("renders in en-US", async () => {
    const { client } = fakeClient(base({ [`GET /providers/${PID}/quotes`]: () => ({ items: [summary("q1", 1)], nextCursor: null }) }));
    renderApp(<QuotesScreen />, client, HOST, "en-US");
    expect(await screen.findByText("No budget given")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Show contact/ })).toBeTruthy();
  });
});
