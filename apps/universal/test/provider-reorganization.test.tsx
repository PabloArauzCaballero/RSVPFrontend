import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LeadsScreen } from "../src/provider/leads-screen";
import { MetricsScreen } from "../src/provider/metrics-screen";
import { OverviewScreen } from "../src/provider/overview-screen";
import { ServicesScreen } from "../src/provider/services-screen";
import { DocumentsScreen } from "../src/provider/documents-screen";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient, HOST, renderApp, type Handler } from "./support";

/** Reorganisation of the provider portal: one primary action in the header, secondary ones behind "⋯", selectors above 3 options, no repeated data. */
const PID = "4f0f2d3d-0000-4000-8000-0000000000bb";
const profile = { id: PID, slug: "dulce-sol", name: "Dulce Sol", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const totals = { impressions: 12, clicks: 4, validLeads: 3, invalidLeads: 1, ctr: 0.33 };
const portal = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({ [`GET /providers/${PID}`]: () => profile, [`GET /providers/${PID}/listings`]: () => ({ items: [] }), [`GET /providers/${PID}/metrics`]: () => ({ providerId: PID, from: "", to: "", totals }), ...extra });
beforeEach(async () => { resetSecureStore(); await writeLocal("rsvp.provider.u-host", PID); });
afterEach(() => { cleanup(); });
const listing = (id: string, published: boolean) => ({ id, providerId: PID, type: "SERVICE", category: "DECORATION", city: "la-paz", title: `Oferta ${id}`, published, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 2, conditions: "ok" } });

describe("provider reorganisation · one primary action in the header", () => {
  it("Ofertas: «Nueva oferta» is the only primary, once, even with the list empty; Publicar is not a button in the row", async () => {
    const { client } = fakeClient(portal());
    renderApp(<ServicesScreen />, client, HOST);
    await screen.findByText("Aquí viven tus ofertas");
    expect(screen.getAllByTestId("offer-new")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Publicar" })).toBeNull();
  });
  it("Ofertas: the category is a selector with all 11 options, not a row of radios", async () => {
    const { client } = fakeClient(portal());
    renderApp(<ServicesScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("offer-new"));
    const select = (await screen.findByTestId("listing-category")) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.options).toHaveLength(11);
    expect(screen.queryByTestId("offer-new")).toBeNull(); // the form has its own bar: no second primary
    expect(screen.getByTestId("listing-submit")).toBeTruthy();
  });
  it("Ofertas: a draft row puts «Publicar» behind its menu and the terms on one line", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/listings`]: () => ({ items: [listing("l1", false), listing("l2", true)] }) }));
    renderApp(<ServicesScreen />, client, HOST);
    const row = await screen.findByTestId("listing-l1");
    expect(within(row).getAllByRole("button", { name: /Más opciones/ })).toHaveLength(1);
    expect(within(screen.getByTestId("listing-l2")).queryByRole("button", { name: /Más opciones/ })).toBeNull(); // published: nothing left to do
    expect(within(screen.getByTestId("delivery-l1")).getByText(/Cobertura: la-paz · Traslado: .* · Plazo: 2 días/)).toBeTruthy();
  });
  it("Resumen: DRAFT with an offer shows «Enviar a verificación» once, as the header action, and the status text only in the band", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}`]: () => ({ ...profile, status: "DRAFT" }), [`GET /providers/${PID}/listings`]: () => ({ items: [listing("l1", false)] }) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findAllByTestId("submit-verification")).toHaveLength(1);
    expect(screen.getByTestId("step-verify")).toBeTruthy(); // while the path is open, its steps are listed
    expect(await screen.findByText("Falta un paso: enviar tu ficha a verificación.")).toBeTruthy();
    expect(screen.queryByText("Aún no es pública. Completa los pasos y envíala a verificación.")).toBeNull(); // the milestone already says it: the band does not repeat it
  });
  it("Resumen: a verified provider has no primary action, a one-line summary instead of the five-row metrics, and no internal slug", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/listings`]: () => ({ items: [listing("l1", true)] }) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText("Últimos 30 días: 3 solicitudes válidas y 12 veces que te vieron.")).toBeTruthy();
    expect(screen.queryByTestId("submit-verification")).toBeNull();
    expect(screen.queryByTestId("step-offer-action")).toBeNull();
    // The path is finished: the three done steps are not listed again under the "3 of 3" header.
    expect(screen.queryByTestId("step-profile")).toBeNull();
    expect(screen.queryByTestId("step-verify")).toBeNull();
    expect(screen.queryByText(/dulce-sol/)).toBeNull();
    expect(screen.queryByTestId("metric-totals")).toBeNull();
  });
  it("Documentos: the document type is a selector (5 options) and the upload is the header action", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/documents`]: () => ({ items: [] }) }));
    renderApp(<DocumentsScreen />, client, HOST);
    const select = (await screen.findByTestId("document-kind")) as HTMLSelectElement;
    expect(select.options).toHaveLength(5);
    expect(screen.getAllByTestId("document-upload")).toHaveLength(1);
  });
});

describe("provider reorganisation · filters", () => {
  it("Resultados: the period is a selector; presets hide the dates and «Personalizado» shows them with the header action", async () => {
    const { client } = fakeClient(portal());
    renderApp(<MetricsScreen />, client, HOST);
    const select = (await screen.findByTestId("metrics-period")) as HTMLSelectElement;
    expect(select.options).toHaveLength(4);
    expect(screen.queryByTestId("metrics-from")).toBeNull();
    expect(screen.queryByTestId("metrics-apply")).toBeNull();
    fireEvent.change(select, { target: { value: "custom" } });
    expect(await screen.findByTestId("metrics-from")).toBeTruthy();
    expect(screen.getAllByTestId("metrics-apply")).toHaveLength(1);
  });
  it("Solicitudes: one list with a 3-option filter (chips), no second list and no second empty state", async () => {
    const lead = (id: string, kind: string) => ({ id, listingId: "x", kind, valid: true, occurredAt: "2026-11-01T10:00:00Z", destination: "WHATSAPP" });
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/leads`]: () => ({ items: [lead("a", "FORM"), lead("b", "REDIRECT"), lead("c", "REDIRECT")], total: 3 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    await screen.findByTestId("lead-a");
    expect(screen.getAllByTestId(/^lead-/)).toHaveLength(3);
    fireEvent.click(screen.getByRole("radio", { name: "Cotizaciones" }));
    await waitFor(() => expect(screen.getAllByTestId(/^lead-/)).toHaveLength(1));
    fireEvent.click(screen.getByRole("radio", { name: "Toques" }));
    await waitFor(() => expect(screen.getAllByTestId(/^lead-/)).toHaveLength(2));
    expect(screen.getByTestId("leads-shown").textContent).toBe("Mostrando 3 de 3");
  });
});
