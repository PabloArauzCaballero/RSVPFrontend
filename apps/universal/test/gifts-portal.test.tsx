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
  // gift-list 1.14.0: availability is its own field; status never says UNAVAILABLE and keeps the gift's own value.
  const WITH_UNAVAILABLE = { items: [gift("Torta", { availability: "AVAILABLE" }), gift("Musica", { status: "AVAILABLE", availability: "UNAVAILABLE" }), gift("Mesa", { status: "COMMITTED", availability: "AVAILABLE" })], partnerPriorityEnabled: true };
  it("the host sees it marked with words, in its own section «No disponibles (n)», outside the total; no action is offered on it", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => WITH_UNAVAILABLE }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-Musica");
    expect(screen.getByTestId("gift-status-Musica").textContent).toBe("No disponible");
    expect(screen.getByTestId("gift-unavailable-Musica").textContent).toMatch(/Tus invitados ya no lo ven/);
    expect(screen.queryByTestId("gift-unavailable-Torta")).toBeNull();
    expect(screen.getByRole("region", { name: /No disponibles/ })).toBe(screen.getByTestId("gift-unavailable-section"));
    expect(screen.getByTestId("gift-unavailable").textContent).toBe("No disponibles (1)");
    expect(within(screen.getByTestId("gift-unavailable-section")).getByTestId("gift-Musica")).toBeTruthy();
    expect(within(screen.getByTestId("gift-unavailable-section")).queryByTestId("gift-Torta")).toBeNull();
    // the total excludes it: Torta and Mesa count, Musica does not
    expect(screen.getByTestId("gift-count").getAttribute("aria-label")).toBe("Regalos: 2");
    expect(screen.getByTestId("gift-available").getAttribute("aria-label")).toBe("Disponibles: 1");
    expect(within(screen.getByTestId("gift-Musica")).queryAllByRole("button")).toEqual([]);
  });
  it("the mark follows availability, not status: a legacy status UNAVAILABLE no longer marks anything", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => ({ items: [gift("Vieja", { status: "UNAVAILABLE" })], partnerPriorityEnabled: true }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-Vieja");
    expect(screen.queryByTestId("gift-unavailable")).toBeNull();
  });
  it("when every gift is unavailable the list shows the zero total and the section, not the empty state", async () => {
    const { client } = fakeClient(handlers({ "GET /gifts/celebrations/c-1/items": () => ({ items: [gift("Musica", { availability: "UNAVAILABLE" })], partnerPriorityEnabled: true }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-unavailable-section");
    expect(screen.getByTestId("gift-count").getAttribute("aria-label")).toBe("Regalos: 0");
    expect(screen.queryByText("Tu lista empieza con un regalo")).toBeNull();
    expect(screen.queryByTestId("gift-list")).toBeNull();
  });
  it("a reserved gift that becomes unavailable keeps its «Liberar» action: the host can still free it", async () => {
    const { client } = fakeClient(handlers({
      "GET /gifts/celebrations/c-1/items": () => ({ items: [gift("Mesa", { status: "COMMITTED", availability: "UNAVAILABLE" })], partnerPriorityEnabled: true }),
      "GET /gifts/celebrations/c-1/reservations": () => ({ items: [{ id: "r1", itemId: "Mesa", celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-02T00:00:00Z" }] })
    }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-Mesa");
    expect(within(screen.getByTestId("gift-unavailable-section")).getByTestId("gift-Mesa")).toBeTruthy();
    expect(await screen.findByTestId("release-Mesa")).toBeTruthy();
  });
  it("without unavailable gifts the section does not appear", async () => {
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
    expect(screen.getByTestId("gift-unavailable").textContent).toBe("Unavailable (1)");
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
    expect(screen.queryByText(/No disponibles/)).toBeNull();
  });
  it("422 GIFT_LISTING_NOT_PRODUCT on add says it is a service, in the host's language", async () => {
    const itemsPath = "/gifts/celebrations/c-1/items";
    const { client } = fakeClient(handlers({ "GET /listings": () => ({ items: [{ id: LISTING, providerId: PID, title: "Torta", type: "PRODUCT" }] }), [`POST ${itemsPath}`]: () => new HttpFailure(422, { code: "GIFT_LISTING_NOT_PRODUCT", title: "Listing is not a product" }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    fireEvent.click(screen.getByTestId("catalog-search"));
    fireEvent.click(await screen.findByTestId(`add-${LISTING}`));
    expect(await screen.findByText(/Eso es un servicio, no un producto/)).toBeTruthy();
    expect(screen.queryByText(/Listing is not a product/)).toBeNull();
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

describe("REQ-F23-02 · build the list from the partner catalog", () => {
  const listPath = "/gifts/celebrations/c-1/gift-list";
  const itemsPath = "/gifts/celebrations/c-1/items";

  it.each([
    { existingList: true, expectedPaths: [itemsPath] },
    { existingList: false, expectedPaths: [itemsPath, listPath, itemsPath] }
  ])("adds a search result at the published price (existing list: $existingList)", async ({ existingList, expectedPaths }) => {
    let hasList = existingList;
    const price = { amountMinor: 45000, currency: "BOB" };
    const { client, calls } = fakeClient(handlers({
      "GET /listings": () => ({ items: [{ id: LISTING, providerId: PID, title: "Torta de bodas", type: "PRODUCT", priceFrom: price }] }),
      [`POST ${listPath}`]: () => {
        hasList = true;
        return { id: "l", celebrationId: "c-1" };
      },
      [`POST ${itemsPath}`]: () => hasList
        ? gift("n1", { price })
        : new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" })
    }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    fireEvent.change(screen.getByTestId("catalog-query"), { target: { value: "torta" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    fireEvent.click(await screen.findByTestId(`add-${LISTING}`));
    expect(await screen.findByText("Agregado: Torta de bodas")).toBeTruthy();
    const posts = calls.filter((call) => call.method === "POST");
    expect(posts.map((call) => call.path)).toEqual(expectedPaths);
    for (const post of posts.filter((call) => call.path === itemsPath)) {
      expect(post.body).toEqual({ source: "CATALOGED", title: "Torta de bodas", price, productListingId: LISTING });
    }
    expect(within(screen.getByTestId(`hit-${LISTING}`)).getByText(/Desde.*450/)).toBeTruthy();
  });
  it("A27 · when GET /listings fails it shows the error with «Reintentar» and never reads another source", async () => {
    let routed = false;
    const card = { listingId: LISTING, providerSlug: "s", name: "Torta", summary: "Torta de bodas", priceFrom: { amountMinor: 45000, currency: "BOB" } };
    const { client, calls } = fakeClient(handlers({
      "GET /listings": () => routed ? { items: [{ id: LISTING, providerId: PID, title: "Torta de bodas", type: "PRODUCT" }] } : new HttpFailure(404, { title: "no route" }),
      "GET /providers": () => ({ items: [card], total: 1, page: 1, pageSize: 50 })
    }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    fireEvent.change(screen.getByTestId("catalog-query"), { target: { value: "torta" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    const error = await screen.findByTestId("catalog-error");
    expect(error.textContent).toMatch(/No pudimos cargar los productos del catálogo/);
    // One message and one retry, not the generic notice repeating both.
    // (Before, the generic notice added «No encontramos esta celebración…», which is false for a missing /listings route.)
    expect(error.textContent).toBe("No pudimos cargar los productos del catálogo.Reintentar");
    expect(within(error).getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByTestId(`hit-${LISTING}`)).toBeNull();
    expect(screen.queryByText(/catálogo público de proveedores/)).toBeNull();
    expect(calls.some((call) => call.path === "/providers")).toBe(false);
    routed = true;
    fireEvent.click(within(error).getByText("Reintentar"));
    expect(await screen.findByTestId(`hit-${LISTING}`)).toBeTruthy();
    expect(screen.queryByTestId("catalog-error")).toBeNull();
    expect(calls.some((call) => call.path === "/providers")).toBe(false);
  });
  it("no network says so apart from a server error, with one retry (catalog and categories)", async () => {
    const { client } = fakeClient(handlers({
      "GET /providers/categories": () => { throw new TypeError("offline"); },
      "GET /listings": () => { throw new TypeError("offline"); }
    }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const categories = await screen.findByTestId("catalog-categories-error");
    expect(categories.textContent).toBe("Sin conexión por ahora: no pudimos cargar las categorías. Revisa tu internet; puedes buscar igual.Reintentar");
    fireEvent.click(screen.getByTestId("catalog-search"));
    const error = await screen.findByTestId("catalog-error");
    expect(error.textContent).toBe("Sin conexión por ahora: no pudimos cargar los productos del catálogo. Revisa tu internet y vuelve a intentarlo.Reintentar");
    expect(within(error).getAllByRole("button")).toHaveLength(1);
  });
  it("M23 · a failed category read says so once, keeps the search usable and retries with one button", async () => {
    let fail = true;
    const { client, calls } = fakeClient(handlers({
      "GET /providers/categories": () => (fail ? new HttpFailure(503, { title: "down" }) : { items: [{ code: "PASTRY", name: "Repostería", listingType: "PRODUCT" }] }),
      "GET /listings": () => ({ items: [{ id: LISTING, providerId: PID, title: "Torta", type: "PRODUCT" }] })
    }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const error = await screen.findByTestId("catalog-categories-error");
    expect(error.textContent).toBe("No pudimos cargar las categorías; puedes buscar igual.Reintentar");
    expect(within(error).getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("catalog-search"));
    expect(await screen.findByTestId(`hit-${LISTING}`)).toBeTruthy();
    fail = false;
    fireEvent.click(within(error).getByText("Reintentar"));
    expect(await screen.findByTestId("catalog-category")).toBeTruthy();
    expect(screen.queryByTestId("catalog-categories-error")).toBeNull();
    expect(calls.filter((call) => call.path === "/providers/categories").length).toBeGreaterThanOrEqual(2);
  });
  it("A27 · no product at all is an honest empty state, not provider cards", async () => {
    const { client, calls } = fakeClient(handlers({ "GET /listings": () => ({ items: [] }), "GET /providers": () => ({ items: [{ listingId: LISTING, providerSlug: "s", name: "Catering" }], total: 1, page: 1, pageSize: 50 }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect((await screen.findByTestId("catalog-empty")).textContent).toMatch(/Todavía no hay productos de proveedores verificados/);
    expect(calls.find((call) => call.path === "/listings")?.url).toContain("type=PRODUCT");
    expect(calls.some((call) => call.path === "/providers")).toBe(false);
  });
  it("A28 · asks only for products and never offers a SERVICE hit as a gift", async () => {
    const { client } = fakeClient(handlers({ "GET /listings": () => ({ items: [
      { id: LISTING, providerId: PID, title: "Torta de bodas", type: "PRODUCT", category: "PASTRY" },
      { id: "svc-1", providerId: PID, title: "Servicio de catering", type: "SERVICE", category: "CATERING" }
    ] }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByTestId(`hit-${LISTING}`)).toBeTruthy();
    expect(screen.queryByTestId("hit-svc-1")).toBeNull();
    expect(screen.queryByTestId("add-svc-1")).toBeNull();
  });
  it("M23 · the categories come from GET /providers/categories?type=PRODUCT in the host's language and narrow the products", async () => {
    const { client, calls } = fakeClient(handlers({
      "GET /providers/categories": () => ({ items: [
        { code: "VENUE", name: "Salones de eventos", listingType: "SERVICE" },
        { code: "DECORATION", name: "Decoración", listingType: null },
        { code: "PASTRY", name: "Pastelería", listingType: "PRODUCT" },
        { code: "KITCHENWARE", name: "Utensilios de cocina", listingType: "PRODUCT" }
      ] }),
      "GET /listings": () => ({ items: [
        { id: LISTING, providerId: PID, title: "Torta de bodas", type: "PRODUCT", category: "PASTRY" },
        { id: "k-1", providerId: PID, title: "Juego de platos", type: "PRODUCT", category: "KITCHENWARE" }
      ] })
    }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const select = await screen.findByTestId("catalog-category");
    const options = Array.from(select.querySelectorAll("option")).map((option) => option.textContent);
    expect(options).toEqual(["Todas", "Decoración", "Pastelería", "Utensilios de cocina"]);
    const read = calls.find((call) => call.path === "/providers/categories");
    expect(read?.url).toContain("type=PRODUCT");
    expect(read?.url).toContain("locale=es-BO");
    expect(await screen.findByTestId("hit-k-1")).toBeTruthy();
    fireEvent.change(select, { target: { value: "PASTRY" } });
    expect(screen.getByTestId(`hit-${LISTING}`)).toBeTruthy();
    expect(screen.queryByTestId("hit-k-1")).toBeNull();
    fireEvent.change(select, { target: { value: "DECORATION" } });
    expect((await screen.findByTestId("catalog-empty")).textContent).toMatch(/esa búsqueda o categoría/);
  });
  it("422 CATALOG_PRODUCT_UNAVAILABLE explains and keeps the search", async () => {
    const { client, calls } = fakeClient(handlers({ "GET /listings": () => ({ items: [{ id: LISTING, providerId: PID, title: "Torta", type: "PRODUCT" }] }), [`POST ${itemsPath}`]: () => new HttpFailure(422, { code: "CATALOG_PRODUCT_UNAVAILABLE" }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    fireEvent.click(screen.getByTestId("catalog-search"));
    fireEvent.click(await screen.findByTestId(`add-${LISTING}`));
    expect(await screen.findByText(/ya no está en el catálogo/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST").map((call) => call.path)).toEqual([itemsPath]);
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
    const { client } = fakeClient(handlers({ "GET /listings": () => ({ items: [] }) }));
    renderApp(<CatalogScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("catalog-query");
    expect(screen.queryByTestId("origin-provider")).toBeNull();
    expect(screen.queryByText("De un proveedor")).toBeNull();
    fireEvent.click(screen.getByTestId("origin-store"));
    expect(await screen.findByTestId("external-title")).toBeTruthy();
    expect(screen.queryByTestId("catalog-query")).toBeNull();
    fireEvent.click(screen.getByTestId("origin-catalog"));
    expect(await screen.findByTestId("catalog-query")).toBeTruthy();
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
  it("R1 · a listing the platform hid for a type/category mismatch says so, in both languages; a normal one says nothing", async () => {
    await withProvider();
    const items = [{ id: "h1", providerId: PID, type: "SERVICE", category: "DECORATION", city: "la-paz", title: "Torta mal categorizada", published: false, hiddenReason: "CATEGORY_TYPE_MISMATCH" }, { id: "h2", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Normal", published: false, hiddenReason: null }];
    const { client } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items }) }));
    renderApp(<ProductsScreen />, client, HOST);
    expect((await screen.findByTestId("listing-hidden-h1")).textContent).toMatch(/Oculto: el tipo no coincide con la categoría/);
    expect(screen.queryByTestId("listing-hidden-h2")).toBeNull();
    // hidden: the chip says «Oculto» and there is no «Publicar» in its row; the normal draft keeps it
    expect(screen.getByTestId("listing-state-h1").textContent).toBe("Oculto");
    expect(within(screen.getByTestId("listing-h1")).queryByRole("button", { name: /Más opciones/ })).toBeNull();
    expect(within(screen.getByTestId("listing-h2")).getByRole("button", { name: /Más opciones/ })).toBeTruthy();
    cleanup();
    const second = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items }) }));
    renderApp(<ProductsScreen />, second.client, HOST, "en-US");
    expect((await screen.findByTestId("listing-hidden-h1")).textContent).toMatch(/Hidden: the type does not match the category/);
    expect(screen.getByTestId("listing-state-h1").textContent).toBe("Hidden");
  });
  it("lists product categories and creates a product with an HTTPS photo and fulfillment in minor units", async () => {
    await withProvider();
    const { client, calls } = fakeClient(providerHandlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [] }), [`POST /providers/${PID}/listings`]: () => ({ id: "n" }) }));
    renderApp(<ProductsScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("offer-new"));
    const categories = await screen.findByTestId("listing-category");
    const names = () => within(categories).getAllByRole("option").map((option) => option.textContent);
    expect(names()).toEqual(["Salones de eventos", "Decoración"]);
    expect(screen.queryByTestId("listing-image-url")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Producto" }));
    expect(names()).toEqual(["Decoración", "Pastelería", "Utensilios de cocina", "Ropa y accesorios"]);
    fireEvent.change(categories, { target: { value: "PASTRY" } });
    fireEvent.click(screen.getByTestId("offer-more"));
    type("Nombre del producto", "Torta");
    type("WhatsApp (enlace https://wa.me/…)", "https://wa.me/59170000000");
    // Coverage and city are picked by name (QA 2026-11-13: typing "la-paz" was the only way and "Santa Cruz De la Sierra" came back 422).
    fireEvent.click(await screen.findByRole("checkbox", { name: "La Paz" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "El Alto" }));
    expect(screen.queryByText(/la-paz/)).toBeNull();
    expect(within(screen.getByTestId("listing-city")).getByRole("option", { name: "Santa Cruz de la Sierra (Santa Cruz)" })).toBeTruthy();
    fireEvent.change(screen.getByTestId("listing-city"), { target: { value: "santa-cruz" } });
    type("Costo de traslado (Bs.)", "50");
    type("Plazo (días de anticipación)", "3");
    type("Condiciones", "Montaje incluido");
    type("Precio del producto (Bs.)", "450");
    type("URL de la foto (opcional)", "http://images.example/torta.jpg");
    fireEvent.click(screen.getByTestId("listing-submit"));
    expect(await screen.findByText(/Escribe un enlace HTTPS válido/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);

    type("URL de la foto (opcional)", "https://images.example/torta.jpg");
    fireEvent.click(screen.getByTestId("listing-submit"));
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({
      type: "PRODUCT", category: "PASTRY", city: "santa-cruz", priceFromMinor: 45000,
      imageUrl: "https://images.example/torta.jpg", destinations: { WHATSAPP: "https://wa.me/59170000000" },
      fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz", "el-alto"], transportCostMinor: 5000, leadTimeDays: 3 }
    }));
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
    const { client, calls } = fakeClient(handlers({ "GET /providers": () => ({ items: [card], total: 1, page: 1, pageSize: 6 }), "GET /listings": () => ({ items: [] }) }));
    renderApp(<ProvidersScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByTestId("catalog-query")).toBeTruthy();
    expect(await screen.findByTestId("catalog-empty")).toBeTruthy();
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
