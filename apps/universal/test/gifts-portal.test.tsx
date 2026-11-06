import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftsScreen } from "../src/host/gifts/gifts-screen";
import { CatalogScreen } from "../src/host/gifts/catalog-screen";
import { ExternalScreen } from "../src/host/gifts/external-screen";
import { GiftInboxScreen } from "../src/host/gifts/inbox-screen";
import { parseMinor, isHttpUrl } from "../src/host/gifts/money";
import { OverviewScreen } from "../src/provider/overview-screen";
import { DestinationsScreen } from "../src/provider/destinations-screen";
import { AgendaScreen } from "../src/provider/agenda-screen";
import { MetricsScreen, validRange } from "../src/provider/metrics-screen";
import { ServicesScreen, ProductsScreen } from "../src/provider/services-screen";
import { GuestGiftsScreen } from "../src/guest/gifts-screen";
import { ProvidersScreen } from "../src/host/gifts/providers-screen";
import { DeliveryScreen } from "../src/provider/delivery-screen";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { baseHandlers, CELEBRATION, fakeClient, HOST, HttpFailure, renderApp, type Handler } from "./support";

const PID = "4f0f2d3d-0000-4000-8000-0000000000aa";
const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const navigate = vi.fn();
const gift = (id: string, over: Record<string, unknown> = {}) => ({ id, listId: "l", celebrationId: "c-1", title: id, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", productListingId: LISTING, ...over });
const GIFTS = { items: [gift("Torta"), gift("Licuadora", { source: "EXTERNAL", status: "PROPOSED", productListingId: null }), gift("Mesa", { status: "COMMITTED" })], partnerPriorityEnabled: true };
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };
const handlers = (extra: Record<string, Handler>) => baseHandlers(CELEBRATION) && { ...baseHandlers(CELEBRATION), ...extra };

beforeEach(() => { navigate.mockClear(); resetSecureStore(); });
afterEach(() => { cleanup(); });

describe("REQ-F23-04 · status of each gift", () => {
  it("lists cataloged gifts first with their status and offers the proposal approval", async () => {
    const { client, calls } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => GIFTS, "POST /gifts/celebrations/c-1/items/Licuadora/approve": () => gift("Licuadora") }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-Torta");
    expect(screen.getByTestId("gift-status-Torta").textContent).toBe("Disponible");
    expect(screen.getByTestId("gift-status-Licuadora").textContent).toBe("Propuesto, por revisar");
    expect(screen.getByTestId("gift-status-Mesa").textContent).toBe("Comprometido");
    const order = screen.getAllByTestId(/^gift-(Torta|Licuadora|Mesa)$/).map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual(["gift-Torta", "gift-Mesa", "gift-Licuadora"]);
    fireEvent.click(screen.getByTestId("approve-proposal-Licuadora"));
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/items/Licuadora/approve") && call.method === "POST")).toBe(true));
  });
  it("403 on the list shows the forbidden notice with a retry", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => new HttpFailure(403) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/Puedes ver esta celebración|No tienes permisos/i)).toBeTruthy();
  });
});

describe("REQ-F23-01 · pending reservations inbox", () => {
  const RES = { items: [{ id: "r1", itemId: "Torta", celebrationId: "c-1", guestDisplayName: "Marta", message: "Felicidades", status: "PENDING_REVIEW", requestedAt: "2026-11-02T15:00:00Z" }] };
  it("shows who asked and approves", async () => {
    const { client, calls } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/reservations": () => RES, "GET /gifts/celebrations/c-1/items": () => GIFTS, "POST /gifts/celebrations/c-1/reservations/r1/approve": () => ({ ...RES.items[0], status: "COMMITTED" }) }));
    renderApp(<GiftInboxScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Solicitó: Marta")).toBeTruthy();
    expect(screen.getByText("Regalo: Torta")).toBeTruthy();
    fireEvent.click(screen.getByTestId("approve-r1"));
    expect(await screen.findByText("Reserva aprobada.")).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });
  it("rejects, and a reservation already decided (409) refreshes instead of failing", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/reservations": () => RES, "GET /gifts/celebrations/c-1/items": () => GIFTS, "POST /gifts/celebrations/c-1/reservations/r1/reject": () => new HttpFailure(409, { code: "RESERVATION_NOT_PENDING" }) }));
    renderApp(<GiftInboxScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("reject-r1"));
    expect(await screen.findByText(/ya no estaba pendiente/)).toBeTruthy();
  });
  it("empty inbox and 403", async () => {
    const empty = fakeClient(handlers({ "GET /gifts/celebrations/c-1/reservations": () => ({ items: [] }), "GET /gifts/celebrations/c-1/items": () => GIFTS }));
    renderApp(<GiftInboxScreen celebrationId="c-1" onNavigate={navigate} />, empty.client);
    expect(await screen.findByText("No hay reservas pendientes.")).toBeTruthy();
    cleanup();
    const denied = fakeClient(handlers({ "GET /gifts/celebrations/c-1/reservations": () => new HttpFailure(403), "GET /gifts/celebrations/c-1/items": () => GIFTS }));
    renderApp(<GiftInboxScreen celebrationId="c-1" onNavigate={navigate} />, denied.client);
    expect(await screen.findByText(/Puedes ver esta celebración|No tienes permisos/i)).toBeTruthy();
  });
});

describe("REQ-F23-02 · build the list from the partner catalog", () => {
  it("searches GET /listings?q= and adds the product as CATALOGED", async () => {
    const { client, calls } = fakeClient(handlers({ "GET /listings": () => ({ items: [{ id: LISTING, providerId: PID, title: "Torta de bodas", priceFromMinor: 45000, currency: "BOB" }] }), "POST /gifts/celebrations/c-1/items": () => gift("n1") }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    fireEvent.change(screen.getByTestId("catalog-query"), { target: { value: "torta" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    fireEvent.click(await screen.findByTestId(`add-${LISTING}`));
    expect(await screen.findByText("Agregado: Torta de bodas")).toBeTruthy();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({ source: "CATALOGED", title: "Torta de bodas", price: { amountMinor: 45000, currency: "BOB" }, productListingId: LISTING });
  });
  it("falls back to the public catalog when the gateway does not route /listings, and says so", async () => {
    const { client } = fakeClient(handlers({ "GET /providers": () => ({ items: [{ listingId: LISTING, providerSlug: "s", name: "Torta", summary: "Torta de bodas", priceFrom: { amountMinor: 45000, currency: "BOB" } }] }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    fireEvent.change(screen.getByTestId("catalog-query"), { target: { value: "torta" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    expect(await screen.findByText(/catálogo público de proveedores/)).toBeTruthy();
    expect(await screen.findByTestId(`hit-${LISTING}`)).toBeTruthy();
  });
  it("422 CATALOG_PRODUCT_UNAVAILABLE explains and keeps the search", async () => {
    const { client } = fakeClient(handlers({ "GET /listings": () => ({ items: [{ id: LISTING, providerId: PID, title: "Torta" }] }), "POST /gifts/celebrations/c-1/items": () => new HttpFailure(422, { code: "CATALOG_PRODUCT_UNAVAILABLE" }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    fireEvent.click(screen.getByTestId("catalog-search"));
    fireEvent.click(await screen.findByTestId(`add-${LISTING}`));
    expect(await screen.findByText(/ya no está disponible en el catálogo/)).toBeTruthy();
  });
});

describe("REQ-F23-03 · external gift with explicit friction (PARTNER_CATALOG_FIRST)", () => {
  it("shows partner suggestions on the 409 and only adds anyway after acknowledging them", async () => {
    let attempts = 0;
    const { client, calls } = fakeClient(handlers({ "POST /gifts/celebrations/c-1/items": (call) => { attempts += 1; return (call.body as { partnerSuggestionsAcknowledged?: boolean }).partnerSuggestionsAcknowledged ? gift("ext", { source: "EXTERNAL", status: "PROPOSED" }) : new HttpFailure(409, { code: "PARTNER_CATALOG_FIRST", suggestions: [{ productListingId: LISTING, title: "Batidora" }] }); } }));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("external-title");
    type("Nombre del regalo", "Licuadora"); type("Enlace de la tienda", "https://tienda.example/l"); type("Precio (Bs.)", "150.50");
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText("Batidora")).toBeTruthy();
    expect(screen.getByText(/Antes de continuar/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST")[0]?.body).toMatchObject({ source: "EXTERNAL", price: { amountMinor: 15050, currency: "BOB" } });
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText(/queda pendiente de tu aprobación/)).toBeTruthy();
    expect(attempts).toBe(2);
    expect(calls.filter((call) => call.method === "POST")[1]?.body).toMatchObject({ partnerSuggestionsAcknowledged: true });
  });
  it("validates the URL and the price before sending anything", async () => {
    const { client, calls } = fakeClient(handlers({}));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("external-title");
    type("Nombre del regalo", "X"); type("Enlace de la tienda", "ftp://x"); type("Precio (Bs.)", "10");
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText(/enlace válido/)).toBeTruthy();
    type("Enlace de la tienda", "https://x.example"); type("Precio (Bs.)", "diez");
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText(/precio válido/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
  });
  it("money and url parsing", () => {
    expect(parseMinor("150.50")).toBe(15050); expect(parseMinor("150,5")).toBe(15050); expect(parseMinor("150")).toBe(15000); expect(parseMinor("1.234")).toBeNull(); expect(parseMinor("-1")).toBeNull();
    expect(isHttpUrl("https://a.example/x")).toBe(true); expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
  it("the external-mode switch writes the celebration settings with If-Match", async () => {
    const { client, calls } = fakeClient(handlers({ "PUT /celebrations/c-1/settings": () => CELEBRATION }));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Se publican al instante" }));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ externalGiftMode: "AUTO_ACCEPT" }));
    expect(calls.find((call) => call.method === "PUT")?.headers.get("if-match")).toBeTruthy();
  });
});

const profile = { id: PID, slug: "dulce-sol-4f0f2d", name: "Dulce Sol", status: "DRAFT", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const providerHandlers = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({ [`GET /providers/${PID}`]: () => profile, ...extra });
const withProvider = async (): Promise<void> => { await writeLocal("rsvp.provider.u-host", PID); };

describe("REQ-F28-01 · onboarding, verification and status", () => {
  it("without a registered provider the portal asks to register first", async () => {
    const { client } = fakeClient({});
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText("Primero registra tu negocio.")).toBeTruthy();
  });
  it("DRAFT with a listing can be submitted for verification; the documents pointer is shown", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [{ id: "l1", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Torta", published: true }] }), [`GET /providers/${PID}/metrics`]: () => ({ providerId: PID, from: "a", to: "b", totals: { impressions: 100, clicks: 10, validLeads: 4, invalidLeads: 1, ctr: 0.1 } }), [`POST /providers/${PID}/submit`]: () => ({ ...profile, status: "PENDING_VERIFICATION" }) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect((await screen.findByTestId("provider-status")).textContent).toBe("Borrador");
    expect(screen.getByText(/Sube tus documentos en la sección Documentos de verificación/)).toBeTruthy();
    await waitFor(() => expect((screen.getByTestId("submit-verification") as HTMLButtonElement).disabled ?? false).toBe(false));
    fireEvent.click(screen.getByTestId("submit-verification"));
    await waitFor(() => expect(calls.some((call) => call.method === "POST" && call.path.endsWith("/submit"))).toBe(true));
  });
  it("shows each verification state's own explanation", async () => {
    await withProvider();
    const { client } = fakeClient(providerHandlers({ [`GET /providers/${PID}`]: () => ({ ...profile, status: "SUSPENDED" }), [`GET /providers/${PID}/listings`]: () => ({ items: [] }), [`GET /providers/${PID}/metrics`]: () => new HttpFailure(403) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText(/está suspendida/)).toBeTruthy();
  });
});

describe("REQ-F28-03/05 · services with delivery conditions", () => {
  it("lists real listings, publishes a draft and validates the form (coverage, conditions, destination)", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [{ id: "l1", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Torta", published: false, priceFromMinor: 45000, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 1, conditions: "ok", disclaimer: "d" } }, { id: "l2", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Sin condiciones", published: false }] }), [`POST /providers/${PID}/listings/l1/publish`]: () => ({}) }));
    renderApp(<ProductsScreen />, client, HOST);
    expect((await screen.findByTestId("listing-state-l1")).textContent).toBe("Borrador");
    expect(screen.getByTestId("publish-blocked-l2").textContent).toMatch(/condiciones de entrega/);
    fireEvent.click(screen.getByTestId("publish-l2"));
    fireEvent.click(screen.getByTestId("publish-l1"));
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/l1/publish"))).toBe(true));
    expect(calls.some((call) => call.path.endsWith("/l2/publish"))).toBe(false);
    fireEvent.click(screen.getByTestId("listing-submit"));
    expect(await screen.findByText(/nombre de la oferta/)).toBeTruthy();
    expect(screen.getByText(/al menos un destino/)).toBeTruthy();
    expect(screen.getByText(/zona de cobertura/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST" && call.path.endsWith("/listings"))).toHaveLength(0);
  });
  it("creates a listing with fulfillment in minor units", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [] }), [`POST /providers/${PID}/listings`]: () => ({ id: "n" }) }));
    renderApp(<ProductsScreen />, client, HOST);
    await screen.findByText("Aún no creaste productos.");
    type("Nombre", "Torta"); type("WhatsApp (enlace https://wa.me/…)", "https://wa.me/59170000000"); type("Zonas de cobertura", "la-paz, el-alto"); type("Costo de traslado (Bs.)", "50"); type("Plazo (días de anticipación)", "3"); type("Condiciones", "Montaje incluido"); type("Precio desde (Bs.)", "450");
    fireEvent.click(screen.getByTestId("listing-submit"));
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({ type: "PRODUCT", priceFromMinor: 45000, destinations: { WHATSAPP: "https://wa.me/59170000000" }, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz", "el-alto"], transportCostMinor: 5000, leadTimeDays: 3 } }));
  });
});

describe("REQ-F28-03 · services and products have their own screens, delivery terms too", () => {
  const listings = { items: [{ id: "p1", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Torta", published: true, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 3, transportCostMinor: 5000, conditions: "Montaje incluido", disclaimer: "d" } }, { id: "s1", providerId: PID, type: "SERVICE", category: "CATERING", city: "la-paz", title: "Catering", published: false }] };
  it("Products shows only products, Services only services", async () => {
    await withProvider();
    const { client } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => listings }));
    const first = renderApp(<ProductsScreen />, client, HOST);
    expect(await screen.findByTestId("listing-p1")).toBeTruthy();
    expect(screen.queryByTestId("listing-s1")).toBeNull();
    first.unmount();
    const { client: second } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => listings }));
    renderApp(<ServicesScreen />, second, HOST);
    expect(await screen.findByTestId("listing-s1")).toBeTruthy();
    expect(screen.queryByTestId("listing-p1")).toBeNull();
  });
  it("Delivery lists each offer's terms and flags an offer with none", async () => {
    await withProvider();
    const { client } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => listings }));
    renderApp(<DeliveryScreen />, client, HOST);
    const row = await screen.findByTestId("delivery-p1");
    expect(row.textContent).toMatch(/Entrega a cargo de: Yo \(el proveedor\)/);
    expect(row.textContent).toMatch(/Cobertura: la-paz/);
    expect(row.textContent).toMatch(/Plazo: 3 días/);
    expect(screen.getByTestId("delivery-s1").textContent).toMatch(/no declara condiciones/);
  });
  it("has no edit button: provider-catalog has no route to edit an offer, and the screen says how to change the terms", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => listings }));
    renderApp(<DeliveryScreen />, client, HOST);
    await screen.findByTestId("delivery-p1");
    expect(screen.queryByTestId("delivery-edit-p1")).toBeNull();
    expect(screen.getByText(/el servidor todavía no permite editarlas/)).toBeTruthy();
    expect(calls.some((call) => call.method === "PUT")).toBe(false);
  });
});

describe("REQ-F28-04 · destinations and UTM need at least one destination", () => {
  it("rejects zero destinations and bad UTM, then saves the lead config", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`PUT /providers/${PID}/lead-config`]: () => profile }));
    renderApp(<DestinationsScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("destination-OFFICIAL_SITE"));
    fireEvent.click(screen.getByTestId("destinations-save"));
    expect(await screen.findByText("Elige al menos un destino.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("destination-WHATSAPP"));
    type("utm_source", "bad source!");
    fireEvent.click(screen.getByTestId("destinations-save"));
    expect((await screen.findAllByText(/solo letras/i)).length).toBeGreaterThan(0);
    type("utm_source", "done");
    fireEvent.click(screen.getByTestId("destinations-save"));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({ enabledDestinations: ["WHATSAPP"], utmSource: "done", billingModel: "CPC" }));
  });
});

describe("REQ-F28-06 · lead metrics", () => {
  it("shows impressions, clicks, CTR and valid leads and refuses an invalid period", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/metrics`]: () => ({ providerId: PID, from: "a", to: "b", totals: { impressions: 1200, clicks: 60, validLeads: 25, invalidLeads: 5, ctr: 0.05 }, groups: [{ key: "WHATSAPP", clicks: 40 }] }) }));
    renderApp(<MetricsScreen />, client, HOST);
    const totals = await screen.findByTestId("metric-totals");
    expect(within(totals).getByLabelText(/Impresiones: 1.?200/)).toBeTruthy();
    expect(within(totals).getByLabelText(/CTR: 5/)).toBeTruthy();
    expect(within(totals).getByLabelText(/Leads válidos: 25/)).toBeTruthy();
    type("Desde (AAAA-MM-DD)", "2026-13-40");
    fireEvent.click(screen.getByTestId("metrics-apply"));
    expect(await screen.findByText(/formato AAAA-MM-DD/)).toBeTruthy();
    expect(validRange("2026-01-01", "2026-01-31")).toBe(true);
    expect(validRange("2026-02-01", "2026-01-31")).toBe(false);
    expect(calls.every((call) => !call.path.includes("2026-13"))).toBe(true);
  });
});

describe("REQ-F28 · availability and date requests", () => {
  it("validates the schedule, saves it and confirms or rejects requests (409 refreshes)", async () => {
    await withProvider();
    const booking = { id: "b1", providerId: PID, requesterId: "u", date: "2027-03-10", status: "REQUESTED", expiresAt: "2026-11-07T12:00:00Z" };
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/availability`]: () => ({ timeZone: "America/La_Paz", capacityPerDay: 1, rules: [{ weekdays: [1, 2], start: "08:00", end: "20:00" }], blackouts: [] }), [`PUT /providers/${PID}/availability`]: () => ({}), [`GET /providers/${PID}/bookings`]: () => ({ items: [booking] }), [`POST /providers/${PID}/bookings/b1/confirm`]: () => new HttpFailure(409) }));
    renderApp(<AgendaScreen />, client, HOST);
    await screen.findByTestId("booking-b1");
    await waitFor(() => expect((screen.getByLabelText("Cupos por día") as HTMLInputElement).value).toBe("1"));
    type("Hasta", "07:00");
    fireEvent.click(screen.getByTestId("agenda-save"));
    expect(await screen.findByText(/posterior a la de apertura/)).toBeTruthy();
    type("Hasta", "19:00"); type("Fecha (AAAA-MM-DD)", "2027-03-15");
    fireEvent.click(screen.getByTestId("blackout-add"));
    expect(await screen.findByTestId("blackout-2027-03-15")).toBeTruthy();
    fireEvent.click(screen.getByTestId("agenda-save"));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({ capacityPerDay: 1, blackouts: [{ start: "2027-03-15" }] }));
    fireEvent.click(screen.getByTestId("confirm-b1"));
    expect(await screen.findByText(/ya cambió de estado/)).toBeTruthy();
  });
});

describe("REQ-F23-06 · who sees the requester", () => {
  it("the switches read and write /gift-settings and the inbox says when the name is hidden", async () => {
    const put: unknown[] = [];
    const { client } = fakeClient(handlers({
      "GET /gifts/celebrations/c-1/items": () => GIFTS,
      "GET /gifts/celebrations/c-1/gift-settings": () => ({ showRequesterToHost: true, showRequesterToGuests: false, version: 0 }),
      "PUT /gifts/celebrations/c-1/gift-settings": ({ body }) => { put.push(body); return { ...(body as object), version: 1 }; }
    }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const guests = await screen.findByRole("switch", { name: "Mostrar el nombre a otros invitados" });
    fireEvent.click(guests);
    await waitFor(() => expect(put).toEqual([{ showRequesterToHost: true, showRequesterToGuests: true }]));
    expect(await screen.findByText("Preferencia guardada. Aplica desde ahora.")).toBeTruthy();
  });
  it("requesterHidden shows 'Nombre oculto' instead of an anonymous guest", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/reservations": () => ({ items: [{ id: "r9", itemId: "Torta", celebrationId: "c-1", guestDisplayName: null, requesterHidden: true, status: "PENDING_REVIEW", requestedAt: "2026-11-02T15:00:00Z" }] }), "GET /gifts/celebrations/c-1/items": () => GIFTS }));
    renderApp(<GiftInboxScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Solicitó: Nombre oculto por tu ajuste")).toBeTruthy();
    expect(screen.getByTestId("hidden-r9")).toBeTruthy();
  });
});

describe("REQ-F23-05 · discover providers from the panel", () => {
  it("lists GET /providers cards with delivery terms and adds the offer as a CATALOGED gift", async () => {
    const card = { listingId: LISTING, providerId: PID, providerSlug: "dulce", providerName: "Dulce Sol", name: "Torta de bodas", category: "CATERING", city: "La Paz", department: "La Paz", verified: true, destinations: ["WHATSAPP"], priceFrom: { amountMinor: 45000, currency: "BOB" }, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 3, conditions: "x", disclaimer: "d" }, address: { line: "Av. Arce 100" }, hours: { weekly: [{ weekdays: [1], opens: "09:00", closes: "18:00" }] } };
    const { client, calls } = fakeClient(handlers({ "GET /providers": () => ({ items: [card], total: 1, page: 1, pageSize: 6 }), "POST /gifts/celebrations/c-1/items": () => gift("n1") }));
    renderApp(<ProvidersScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const row = await screen.findByTestId(`provider-${LISTING}`);
    expect(row.textContent).toMatch(/De Dulce Sol/); expect(row.textContent).toMatch(/Plazo: 3 días/); expect(row.textContent).toMatch(/Av\. Arce 100/); expect(row.textContent).toMatch(/09:00-18:00/);
    fireEvent.click(screen.getByTestId(`add-provider-${LISTING}`));
    expect(await screen.findByText("Agregado: Torta de bodas")).toBeTruthy();
    expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({ source: "CATALOGED", productListingId: LISTING });
  });
});

describe("REQ-F21-05 · gifts inside the guest app with the link credential", () => {
  it("sends the link token as Bearer, reserves, and a taken gift shows the 409 with alternatives", async () => {
    const TOKEN = "T".repeat(43);
    const seen: (string | undefined)[] = [];
    const { client } = fakeClient(handlers({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      "GET /gifts/celebrations/c-1/items": ({ headers }) => { seen.push(headers.get("authorization") ?? undefined); return { items: [gift("Torta"), gift("Mesa")], partnerPriorityEnabled: true }; },
      "POST /gifts/celebrations/c-1/items/Torta/reservations": () => new HttpFailure(409, { code: "GIFT_NOT_AVAILABLE", title: "taken", status: 409 })
    }));
    renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} />, client);
    fireEvent.click(await screen.findByTestId("reserve-Torta"));
    fireEvent.click(await screen.findByRole("button", { name: "Reservar regalo" }));
    expect(await screen.findByTestId("gift-taken")).toBeTruthy();
    expect(seen.every((value) => value === `Bearer ${TOKEN}`)).toBe(true);
  });
});
