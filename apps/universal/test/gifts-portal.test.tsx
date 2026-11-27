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
import { baseHandlers, CELEBRATION, fakeClient, GEO, HOST, HttpFailure, renderApp, type Handler, pickTime } from "./support";

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
    expect(screen.getByTestId("gift-status-Licuadora").textContent).toBe("Por revisar");
    expect(screen.getByTestId("gift-status-Mesa").textContent).toBe("Reservado");
    const order = screen.getAllByTestId(/^gift-(Torta|Licuadora|Mesa)$/).map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual(["gift-Torta", "gift-Mesa", "gift-Licuadora"]);
    fireEvent.click(screen.getByTestId("approve-proposal-Licuadora"));
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/items/Licuadora/approve") && call.method === "POST")).toBe(true));
  });
  it("backend problem codes reach the host in their own language, never the English title", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => GIFTS, "POST /gifts/celebrations/c-1/items/Licuadora/approve": () => new HttpFailure(409, { code: "GIFT_NOT_AVAILABLE", title: "Gift is not available" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("approve-proposal-Licuadora"));
    expect(await screen.findByText(/Alguien se te adelantó/)).toBeTruthy();
    expect(screen.queryByText(/Gift is not available/)).toBeNull();
  });
  it("a celebration that never had a gift (404 on the list) shows the empty state with the single action, not an error", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Tu lista empieza con un regalo")).toBeTruthy();
    fireEvent.click(screen.getByTestId("go-add"));
    expect(navigate).toHaveBeenCalledWith("/regalos/catalogo?c=c-1");
  });
  it("403 on the list shows the forbidden notice with a retry", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => new HttpFailure(403) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/Puedes ver esta celebración|No tienes permisos/i)).toBeTruthy();
  });
  it("an inaccessible celebration keeps its error on the list", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => new HttpFailure(404, { code: "NOT_FOUND" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("No encontramos esta celebración o no tienes acceso a ella.")).toBeTruthy();
    expect(screen.queryByText("Tu lista empieza con un regalo")).toBeNull();
  });
});

describe("R1 · M-6 · a gift that can no longer be given (UNAVAILABLE)", () => {
  const WITH_UNAVAILABLE = { items: [gift("Torta"), gift("Musica", { status: "UNAVAILABLE" }), gift("Mesa", { status: "COMMITTED" })], partnerPriorityEnabled: true };
  it("the host sees it marked with words, not only a color, and counted apart; no decision is offered on it, only the replacements (R7)", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => WITH_UNAVAILABLE }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-Musica");
    expect(screen.getByTestId("gift-status-Musica").textContent).toBe("No disponible");
    expect(screen.getByTestId("gift-unavailable-Musica").textContent).toMatch(/Tus invitados ya no lo ven/);
    expect(screen.queryByTestId("gift-unavailable-Torta")).toBeNull();
    expect(screen.getByTestId("gift-unavailable").getAttribute("aria-label")).toBe("No disponibles: 1");
    expect(screen.getByTestId("gift-available").getAttribute("aria-label")).toBe("Disponibles: 1");
    // R7: the single control of an unavailable gift is the one that opens its replacements; approve, reject and release are never offered.
    expect(within(screen.getByTestId("gift-Musica")).queryAllByRole("button").map((button) => button.getAttribute("data-testid"))).toEqual(["replacements-toggle-Musica"]);
  });
  it("without unavailable gifts the figure does not appear", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => GIFTS }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-Torta");
    expect(screen.queryByTestId("gift-unavailable")).toBeNull();
  });
  it("in English the mark and the note are translated", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => WITH_UNAVAILABLE }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client, HOST, "en-US");
    await screen.findByTestId("gift-Musica");
    expect(screen.getByTestId("gift-status-Musica").textContent).toBe("Unavailable");
    expect(screen.getByTestId("gift-unavailable-Musica").textContent).toMatch(/Your guests no longer see it/);
  });
  it("the guest never sees it, even if a response carried it", async () => {
    const { client } = fakeClient(handlers({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      "GET /gifts/celebrations/c-1/items": () => WITH_UNAVAILABLE
    }));
    renderApp(<GuestGiftsScreen slug="ana-luis" token={"T".repeat(43)} onNavigate={navigate} />, client);
    await screen.findByTestId("reserve-Torta");
    expect(screen.queryByText("Musica")).toBeNull();
    expect(screen.queryByText("No disponible")).toBeNull();
  });
});

describe("REQ-F23-01 · pending reservations inbox", () => {
  const RES = { items: [{ id: "r1", itemId: "Torta", celebrationId: "c-1", guestDisplayName: "Marta", message: "Felicidades", status: "PENDING_REVIEW", requestedAt: "2026-11-02T15:00:00Z" }] };
  it("names the requester in full, with the group, when the guest record can be read", async () => {
    const withGuest = { items: [{ ...RES.items[0], guestId: "g-1", guestDisplayName: "Óscar" }] };
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/reservations": () => withGuest, "GET /gifts/celebrations/c-1/items": () => GIFTS, "GET /guests/celebrations/c-1/guests/g-1": () => ({ id: "g-1", name: "Óscar Mamani Condori", groupId: "gr-1" }), "GET /guests/celebrations/c-1/groups": () => ({ items: [{ id: "gr-1", name: "Familia Mamani Apaza" }] }) }));
    renderApp(<GiftInboxScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Solicitó: Óscar Mamani Condori")).toBeTruthy();
    expect(await screen.findByText("Grupo: Familia Mamani Apaza")).toBeTruthy();
    expect(screen.getByText("Se anotó como: Óscar")).toBeTruthy();
  });
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
    expect(await screen.findByText("No hay reservas pendientes")).toBeTruthy();
    cleanup();
    const denied = fakeClient(handlers({ "GET /gifts/celebrations/c-1/reservations": () => new HttpFailure(403), "GET /gifts/celebrations/c-1/items": () => GIFTS }));
    renderApp(<GiftInboxScreen celebrationId="c-1" onNavigate={navigate} />, denied.client);
    expect(await screen.findByText(/Puedes ver esta celebración|No tienes permisos/i)).toBeTruthy();
  });
});

describe("REQ-F23-03 · external gift with explicit friction (PARTNER_CATALOG_FIRST)", () => {
  const listPath = "/gifts/celebrations/c-1/gift-list";
  const itemsPath = "/gifts/celebrations/c-1/items";
  const fillStore = async (): Promise<void> => {
    await screen.findByTestId("external-title");
    type("Nombre del regalo", "Licuadora");
    type("Enlace de la tienda", "https://tienda.example/l");
    type("Precio (BOB)", "150.50");
  };

  it.each(["created", "created concurrently"])("adds the first external gift when the list is %s", async (outcome) => {
    let hasList = false;
    const { client, calls } = fakeClient(handlers({
      [`POST ${listPath}`]: () => {
        hasList = true;
        return outcome === "created" ? { id: "l", celebrationId: "c-1" } : new HttpFailure(409, { code: "GIFT_LIST_EXISTS" });
      },
      [`POST ${itemsPath}`]: () => hasList
        ? gift("ext", { source: "EXTERNAL", status: "PROPOSED" })
        : new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" })
    }));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await fillStore();
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText(/queda por revisar/)).toBeTruthy();

    const posts = calls.filter((call) => call.method === "POST");
    expect(posts.map((call) => call.path)).toEqual([itemsPath, listPath, itemsPath]);
    expect(posts[0]?.body).toEqual({
      source: "EXTERNAL", title: "Licuadora", price: { amountMinor: 15050, currency: "BOB" }, url: "https://tienda.example/l"
    });
    expect(posts[1]?.body).toBeUndefined();
    expect(posts[2]?.body).toEqual(posts[0]?.body);
  });

  it("keeps the access error and the entered details for a different 404", async () => {
    const { client, calls } = fakeClient(handlers({
      [`POST ${itemsPath}`]: () => new HttpFailure(404, { code: "NOT_FOUND" })
    }));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await fillStore();
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText("No encontramos esta celebración o no tienes acceso a ella.")).toBeTruthy();
    expect(screen.getByDisplayValue("Licuadora")).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST").map((call) => call.path)).toEqual([itemsPath]);
  });

  it("shows a list error and retains the form if the list is still missing after recovery", async () => {
    const { client, calls } = fakeClient(handlers({
      [`POST ${listPath}`]: () => ({ id: "l", celebrationId: "c-1" }),
      [`POST ${itemsPath}`]: () => new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" })
    }));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await fillStore();
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText("La lista de regalos no está disponible. Vuelve a intentarlo.")).toBeTruthy();
    expect(screen.getByDisplayValue("Licuadora")).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST").map((call) => call.path)).toEqual([itemsPath, listPath, itemsPath]);
  });

  it("shows partner suggestions on the 409 and only adds anyway after acknowledging them", async () => {
    let attempts = 0;
    const { client, calls } = fakeClient(handlers({ "POST /gifts/celebrations/c-1/items": (call) => { attempts += 1; return (call.body as { partnerSuggestionsAcknowledged?: boolean }).partnerSuggestionsAcknowledged ? gift("ext", { source: "EXTERNAL", status: "PROPOSED" }) : new HttpFailure(409, { code: "PARTNER_CATALOG_FIRST", suggestions: [{ productListingId: LISTING, title: "Batidora" }] }); } }));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("external-title");
    type("Nombre del regalo", "Licuadora"); type("Enlace de la tienda", "https://tienda.example/l"); type("Precio (BOB)", "150.50");
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText("Batidora")).toBeTruthy();
    expect(screen.getByText(/Antes de seguir/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST")[0]?.body).toMatchObject({ source: "EXTERNAL", price: { amountMinor: 15050, currency: "BOB" } });
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText(/queda por revisar/)).toBeTruthy();
    expect(attempts).toBe(2);
    expect(calls.filter((call) => call.method === "POST")[1]?.body).toMatchObject({ partnerSuggestionsAcknowledged: true });
  });
  it("validates the URL and the price before sending anything", async () => {
    const { client, calls } = fakeClient(handlers({}));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("external-title");
    type("Nombre del regalo", "X"); type("Enlace de la tienda", "ftp://x"); type("Precio (BOB)", "10");
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText(/enlace válido/)).toBeTruthy();
    type("Enlace de la tienda", "https://x.example"); type("Precio (BOB)", "diez");
    fireEvent.click(screen.getByTestId("external-submit"));
    expect(await screen.findByText(/precio válido/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
  });
  it("money and url parsing", () => {
    expect(parseMinor("150.50")).toBe(15050); expect(parseMinor("150,5")).toBe(15050); expect(parseMinor("150")).toBe(15000); expect(parseMinor("1.234")).toBeNull(); expect(parseMinor("-1")).toBeNull();
    expect(isHttpUrl("https://a.example/x")).toBe(true); expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
  it("«De una tienda» states the partners-first rule and the current mode, and points to Control modes instead of duplicating the switches", async () => {
    const { client } = fakeClient(handlers({}));
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/Puedes agregar regalos de cualquier tienda sin pasos previos/)).toBeTruthy();
    expect(screen.getByText(/Tus regalos de tienda quedan por revisar/)).toBeTruthy();
    // changing the rule lives in the header's «⋯» menu, not in a second button inside the page
    fireEvent.click(screen.getByRole("button", { name: "Más opciones" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Cambiar en Modos de control" }));
    expect(navigate).toHaveBeenCalledWith("/modos?c=c-1");
    cleanup();
    const priority = fakeClient({ ...baseHandlers({ ...CELEBRATION, settings: { ...CELEBRATION.settings, partnerPriorityEnabled: true } }) });
    renderApp(<ExternalScreen celebrationId="c-1" onNavigate={navigate} />, priority.client);
    expect(await screen.findByText(/te mostramos productos parecidos de aliados/)).toBeTruthy();
  });
  it("the two origins are one flow: switching origin keeps the screen and shows that origin's form; «De un proveedor» is gone (A28)", async () => {
    const { client } = fakeClient(handlers({ "GET /providers/gift-ideas/recommendations": () => ({ eventType: "WEDDING", city: null, scope: "EVENT_TYPE", items: [] }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-assistant");
    expect(screen.queryByTestId("origin-provider")).toBeNull();
    expect(screen.queryByText("De un proveedor")).toBeNull();
    fireEvent.click(screen.getByTestId("origin-store"));
    expect(await screen.findByTestId("external-title")).toBeTruthy();
    expect(screen.queryByTestId("gift-assistant")).toBeNull();
    fireEvent.click(screen.getByTestId("origin-catalog"));
    expect(await screen.findByTestId("gift-assistant")).toBeTruthy();
  });

});

const profile = { id: PID, slug: "dulce-sol-4f0f2d", name: "Dulce Sol", status: "DRAFT", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const providerHandlers = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({
  [`GET /providers/${PID}`]: () => profile,
  "GET /providers/geo": () => GEO,
  "GET /providers/categories": () => ({ items: [
    { code: "VENUE", name: "Salones de eventos", listingType: "SERVICE" },
    { code: "DECORATION", name: "Decoración", listingType: null },
    { code: "PASTRY", name: "Pastelería", listingType: "PRODUCT" },
    { code: "KITCHENWARE", name: "Utensilios de cocina", listingType: "PRODUCT" },
    { code: "CLOTHING", name: "Ropa y accesorios", listingType: "PRODUCT" }
  ] }),
  ...extra
});
const withProvider = async (): Promise<void> => { await writeLocal("rsvp.provider.u-host", PID); };

describe("REQ-F28-01 · onboarding, verification and status", () => {
  it("without a registered provider the portal asks to register first", async () => {
    const { client } = fakeClient({});
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText("Primero registra tu negocio para ver esta sección.")).toBeTruthy();
  });
  it("DRAFT with a listing can be submitted for verification; the documents pointer is shown", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [{ id: "l1", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Torta", published: true }] }), [`GET /providers/${PID}/metrics`]: () => ({ providerId: PID, from: "a", to: "b", totals: { impressions: 100, clicks: 10, validLeads: 4, invalidLeads: 1, ctr: 0.1 } }), [`POST /providers/${PID}/submit`]: () => ({ ...profile, status: "PENDING_VERIFICATION" }) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect((await screen.findByTestId("provider-status")).textContent).toBe("Borrador");
    expect(await screen.findByText(/Puedes subir tus documentos en Perfil/)).toBeTruthy();
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
    // "Publicar" lives in each row's "⋯" menu: off (with the reason shown) for l2, usable for l1
    fireEvent.click(within(screen.getByTestId("listing-l2")).getByRole("button", { name: /Más opciones/ }));
    expect((await screen.findByRole("menuitem", { name: "Publicar" })).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(within(screen.getByTestId("listing-l2")).getByRole("button", { name: /Más opciones/ }));
    fireEvent.click(within(screen.getByTestId("listing-l1")).getByRole("button", { name: /Más opciones/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Publicar" }));
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/l1/publish"))).toBe(true));
    expect(calls.some((call) => call.path.endsWith("/l2/publish"))).toBe(false);
    fireEvent.click(screen.getByTestId("offer-new"));
    await screen.findByTestId("listing-category");
    fireEvent.click(screen.getByTestId("listing-submit"));
    expect(await screen.findByText(/nombre de la oferta/)).toBeTruthy();
    expect(screen.getByText(/al menos un destino/)).toBeTruthy();
    expect(screen.getByText(/ciudad de cobertura/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST" && call.path.endsWith("/listings"))).toHaveLength(0);
  });
  it("lists the categories of each offer type; a product goes to the step-by-step sheet (R2: no image link, 422 IMAGE_URL_NOT_ALLOWED)", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [] }) }));
    renderApp(<ProductsScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("offer-new"));
    const categories = await screen.findByTestId("listing-category");
    expect(within(categories).getAllByRole("option").map((option) => option.textContent)).toEqual(["Salones de eventos", "Decoración"]);
    expect(screen.queryByTestId("listing-image-url")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Producto" }));
    expect(screen.queryByTestId("listing-submit")).toBeNull();
    expect(screen.queryByTestId("listing-image-url")).toBeNull();
    expect(screen.getByTestId("product-start")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });
});

describe("REQ-F28-03 · services, products and delivery terms are ONE list of offers", () => {
  const listings = { items: [{ id: "p1", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Torta", published: true, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 3, transportCostMinor: 5000, conditions: "Montaje incluido", disclaimer: "d" } }, { id: "s1", providerId: PID, type: "SERVICE", category: "CATERING", city: "la-paz", title: "Catering", published: false }] };
  it("Services, Products and Delivery open the same list: every offer, with its state and terms", async () => {
    await withProvider();
    for (const Screen of [ServicesScreen, ProductsScreen, DeliveryScreen]) {
      const { client } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => listings }));
      const view = renderApp(<Screen />, client, HOST);
      expect(await screen.findByTestId("listing-p1")).toBeTruthy();
      expect(screen.getByTestId("listing-s1")).toBeTruthy();
      view.unmount();
    }
  });
  it("Delivery lists each offer's terms and flags an offer with none", async () => {
    await withProvider();
    const { client } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => listings }));
    renderApp(<DeliveryScreen />, client, HOST);
    const row = await screen.findByTestId("delivery-p1");
    expect(row.textContent).toMatch(/Entrega a cargo de: Yo \(el proveedor\)/);
    await waitFor(() => expect(row.textContent).toMatch(/Cobertura: La Paz/));
    expect(row.textContent).toMatch(/Plazo: 3 días/);
    // an offer without terms is flagged once (the reason it cannot be published), not twice
    expect(screen.getByTestId("publish-blocked-s1").textContent).toMatch(/declara sus condiciones de entrega/);
    expect(screen.getByTestId("delivery-s1").textContent).not.toMatch(/Cobertura/);
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
    fireEvent.click(screen.getByTestId("destinations-more"));
    type("Origen de la campaña", "bad source!");
    fireEvent.click(screen.getByTestId("destinations-save"));
    expect((await screen.findAllByText(/solo letras/i)).length).toBeGreaterThan(0);
    type("Origen de la campaña", "done");
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
    expect(within(totals).getByLabelText(/Veces que te vieron: 1.?200/)).toBeTruthy();
    expect(within(totals).getByLabelText(/Toques por cada vista: 5/)).toBeTruthy();
    expect(within(totals).getByLabelText(/Solicitudes válidas: 25/)).toBeTruthy();
    fireEvent.change(screen.getByTestId("metrics-period"), { target: { value: "custom" } });
    // a date picker cannot hold a day that does not exist: it stays empty, and an empty period is refused
    type("Desde", "2026-13-40");
    fireEvent.click(screen.getByTestId("metrics-apply"));
    expect(await screen.findByText(/Elige las dos fechas/)).toBeTruthy();
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
    pickTime("Hasta", "07:00");
    fireEvent.click(screen.getByTestId("agenda-save"));
    expect(await screen.findByText(/posterior a la de apertura/)).toBeTruthy();
    pickTime("Hasta", "19:00"); type("Fecha", "2027-03-15");
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

describe("A28 · the old «De un proveedor» route no longer adds provider offers", () => {
  it("/regalos/proveedores opens the product catalog and never lists GET /providers offers as gifts", async () => {
    const card = { listingId: "svc-1", providerId: PID, providerSlug: "dulce", providerName: "Dulce Sol", name: "Servicio de catering", category: "CATERING", city: "La Paz", verified: true, destinations: ["WHATSAPP"] };
    const { client, calls } = fakeClient(handlers({ "GET /providers": () => ({ items: [card], total: 1, page: 1, pageSize: 6 }), "GET /providers/gift-ideas/recommendations": () => ({ eventType: "WEDDING", city: null, scope: "EVENT_TYPE", items: [] }) }));
    renderApp(<ProvidersScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByTestId("gift-assistant")).toBeTruthy();
    expect(await screen.findByTestId("wizard-ideas-empty")).toBeTruthy();
    expect(screen.queryByTestId("provider-svc-1")).toBeNull();
    expect(screen.queryByTestId("add-provider-svc-1")).toBeNull();
    expect(calls.some((call) => call.path === "/providers")).toBe(false);
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
    renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("reserve-Torta"));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByTestId("gift-taken")).toBeTruthy();
    expect(screen.getByText("Alguien se adelantó")).toBeTruthy();
    expect(screen.getByText("Otros regalos disponibles")).toBeTruthy();
    expect(seen.every((value) => value === `Bearer ${TOKEN}`)).toBe(true);
  });
  it("reserves in the row itself (no dialog), draws the check, and explains the per-person limit when it is reached", async () => {
    const TOKEN = "T".repeat(43);
    const { client } = fakeClient(handlers({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      "GET /gifts/celebrations/c-1/items": () => ({ items: [gift("Torta"), gift("Mesa")], partnerPriorityEnabled: true }),
      "POST /gifts/celebrations/c-1/items/Torta/reservations": () => ({ id: "r1", itemId: "Torta", celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-02T15:00:00Z" }),
      "POST /gifts/celebrations/c-1/items/Mesa/reservations": () => new HttpFailure(422, { code: "RESERVATION_LIMIT_REACHED", title: "limit", status: 422 })
    }));
    renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} onNavigate={navigate} />, client);
    expect(await screen.findByText("Cada persona puede tener un máximo de regalos reservados a la vez.")).toBeTruthy();
    fireEvent.click(await screen.findByTestId("reserve-Torta"));
    expect(screen.queryByRole("alert", { name: /Reservar/ })).toBeNull();
    fireEvent.click(screen.getByTestId("reserve-confirm"));
    expect(await screen.findByTestId("gift-reserved")).toBeTruthy();
    expect(screen.getByText("Regalo reservado")).toBeTruthy();
    fireEvent.click(await screen.findByTestId("reserve-Mesa"));
    fireEvent.click(screen.getByTestId("reserve-confirm"));
    expect((await screen.findByTestId("reserve-error")).textContent).toMatch(/máximo de regalos que una persona puede reservar/);
  });
  it("an expired link is a calm dead end that says whom to ask", async () => {
    const { client } = fakeClient(handlers({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      "GET /gifts/celebrations/c-1/items": () => new HttpFailure(401)
    }));
    renderApp(<GuestGiftsScreen slug="ana-luis" token={"T".repeat(43)} onNavigate={navigate} />, client);
    expect(await screen.findByText("Tu enlace ya no funciona")).toBeTruthy();
    expect(screen.getByText("Pídele uno nuevo a quien te invitó.")).toBeTruthy();
    expect(screen.queryByTestId("gifts-retry")).toBeNull();
  });
});

describe("D-3 · the host releases a reserved gift", () => {
  const COMMITTED = { items: [{ id: "r9", itemId: "Mesa", celebrationId: "c-1", guestDisplayName: "Marta", status: "COMMITTED", requestedAt: "2026-11-02T15:00:00Z" }] };
  const base = (extra: Record<string, Handler> = {}) => handlers({ "GET /gifts/celebrations/c-1/items": () => GIFTS, "GET /gifts/celebrations/c-1/reservations": () => COMMITTED, "GET /gifts/celebrations/c-1/gift-settings": () => ({ showRequesterToHost: true, showRequesterToGuests: false, version: 1 }), ...extra });
  it("only a committed gift offers «Liberar regalo»; it asks first and sends one cancel with an Idempotency-Key", async () => {
    const { client, calls } = fakeClient(base({ "POST /gifts/celebrations/c-1/reservations/r9/cancel": () => ({ ...COMMITTED.items[0], status: "CANCELLED", cancellationReason: "HOST_CANCELLED" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("release-Mesa"));
    expect(screen.queryByTestId("release-Torta")).toBeNull();
    expect(screen.getByText("¿Liberar este regalo?")).toBeTruthy();
    fireEvent.click(screen.getByTestId("release-confirm"));
    expect(await screen.findByText("Liberaste «Mesa». Ya está disponible otra vez.")).toBeTruthy();
    const posts = calls.filter((call) => call.method === "POST");
    expect(posts.map((call) => call.path)).toEqual(["/gifts/celebrations/c-1/reservations/r9/cancel"]);
    expect(posts[0]?.headers.get("idempotency-key")).toBeTruthy();
  });
  it("«No, mantener la reserva» sends nothing; a reservation already ended (409) closes and explains", async () => {
    const { client, calls } = fakeClient(base({ "POST /gifts/celebrations/c-1/reservations/r9/cancel": () => new HttpFailure(409, { code: "RESERVATION_NOT_ACTIVE" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("release-Mesa"));
    fireEvent.click(screen.getByTestId("release-keep"));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("release-Mesa"));
    fireEvent.click(screen.getByTestId("release-confirm"));
    expect(await screen.findByText("Esa reserva ya no estaba activa. Actualizamos la lista.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("¿Liberar este regalo?")).toBeNull());
  });
});
