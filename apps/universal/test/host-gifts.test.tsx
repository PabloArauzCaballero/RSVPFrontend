import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { Linking } from "react-native";
import { AppProviders } from "../src/platform/providers";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClient, toApiError } from "@rsvp/api-client";
import { CatalogScreen } from "../src/host/gifts/catalog-screen";
import { GiftsScreen } from "../src/host/gifts/gifts-screen";
import { ExternalScreen } from "../src/host/gifts/external-screen";
import { GiftInboxScreen } from "../src/host/gifts/inbox-screen";
import { ProvidersScreen } from "../src/host/gifts/providers-screen";
import { GuestGiftsScreen } from "../src/guest/gifts-screen";
import { createHostGiftFixture, GUEST_TOKEN, LISTING_A, LISTING_B } from "./fixtures/host-gifts";
import { HOST, renderApp } from "./support";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { cleanup(); server.resetHandlers(); navigate.mockClear(); vi.restoreAllMocks(); });
afterAll(() => server.close());
const navigate = vi.fn();

function setup(locale: "es-BO" | "en-US" = "es-BO") {
  const fixture = createHostGiftFixture();
  server.use(http.all("http://f23.test/*", async ({ request }) => {
    const url = new URL(request.url), raw = request.method === "GET" ? "" : await request.text();
    const response = fixture.handle({ method: request.method, path: url.pathname + url.search, headers: Object.fromEntries(request.headers.entries()), body: raw ? JSON.parse(raw) : undefined });
    return new HttpResponse(response.body === undefined ? null : JSON.stringify(response.body), { status: response.status, headers: response.headers as Record<string, string> });
  }));
  const client = createApiClient({ baseUrl: "http://f23.test",
    // jsdom signals have a different brand from Node fetch; this bridge exercises HTTP, not cancellation.
    fetchFn: (input, init) => { const options = { ...init }; delete options.signal; return fetch(input, options); },
    tokenStore: { getAccessToken: async () => "f23-host", getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined },
    refreshSession: { refresh: async () => { throw toApiError(401, "f23-refresh", { status: 401, title: "Expired" }); } }
  });
  const props = { celebrationId: fixture.state.celebration.id, onNavigate: navigate };
  const showCatalog = () => renderApp(<CatalogScreen {...props} />, client, undefined, locale);
  return { fixture, client, props, showCatalog };
}

describe("F23 slice 1 · create a catalog gift and see its public state", () => {
  it("creates once, shows backend publication in the host list, and the guest sees the same item without an account", async () => {
    const { fixture, client, props, showCatalog } = setup();
    showCatalog();
    fireEvent.click(await screen.findByTestId(`add-${LISTING_A}`)); fireEvent.click(screen.getByTestId(`add-${LISTING_A}`));
    await screen.findByText("Agregado: Vajilla de cerámica");
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
    expect(screen.getByText("Publicado: los invitados ya pueden verlo.")).toBeTruthy();
    cleanup(); renderApp(<GiftsScreen {...props} />, client);
    const item = fixture.state.items[0]!;
    await screen.findByTestId(`gift-${item.id}`);
    expect(screen.getByTestId(`gift-status-${item.id}`).textContent).toBe("Disponible");
    cleanup(); renderApp(<GuestGiftsScreen slug={fixture.state.celebration.slug} token={GUEST_TOKEN} />, client);
    await screen.findByTestId(`gift-${item.id}`);
    expect(screen.queryByLabelText("Contraseña")).toBeNull();
  });

  it("does not claim success on a 422 and preserves search/filter input", async () => {
    const { fixture, showCatalog } = setup();
    fixture.state.failures.set(`POST ${fixture.prefix}/items`, 422);
    showCatalog();
    fireEvent.change(await screen.findByTestId("catalog-query"), { target: { value: "vajilla" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    fireEvent.click(await screen.findByTestId(`add-${LISTING_A}`));
    await screen.findByText("Revisa los datos del regalo. Conservamos lo que escribiste.");
    expect((screen.getByTestId("catalog-query") as HTMLInputElement).value).toBe("vajilla");
    expect(fixture.state.items).toHaveLength(0);
    expect(screen.queryByText(/Agregado:/)).toBeNull();
  });

  it("filters category and exact maximum price, and rejects unsafe prices", async () => {
    const { showCatalog } = setup(); showCatalog();
    await screen.findByTestId(`hit-${LISTING_A}`);
    fireEvent.click(screen.getByTestId("catalog-category-CATERING"));
    expect(screen.queryByTestId(`hit-${LISTING_A}`)).toBeNull();
    expect(screen.getByTestId(`hit-${LISTING_B}`)).toBeTruthy();
    fireEvent.change(screen.getByTestId("catalog-max-price"), { target: { value: "300" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    await screen.findByText("No encontramos productos con esa búsqueda.");
    fireEvent.change(screen.getByTestId("catalog-max-price"), { target: { value: "1e20" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    await screen.findByText("Escribe un importe válido, con hasta dos decimales.");
  });

  it("requests the guest's current UI language and validates short or long queries", async () => {
    const { fixture, showCatalog } = setup("en-US"); showCatalog();
    await screen.findByTestId(`hit-${LISTING_A}`);
    expect(fixture.state.calls.find((call) => call.path.startsWith("/listings"))?.path).toContain("locale=en-US");
    fireEvent.change(screen.getByTestId("catalog-query"), { target: { value: "a" } });
    fireEvent.click(screen.getByTestId("catalog-search"));
    await screen.findByText("Use 2 to 100 characters, or leave the search empty.");
  });

  it("requires a real agreed price when the catalog omitted it", async () => {
    const { fixture, showCatalog } = setup();
    fixture.state.listings[0] = { ...fixture.state.listings[0]!, priceFromMinor: undefined };
    showCatalog(); fireEvent.click(await screen.findByTestId(`add-${LISTING_A}`));
    await screen.findByText("Escribe un importe válido, con hasta dos decimales.");
    expect(fixture.state.items).toHaveLength(0);
    fireEvent.change(screen.getByTestId(`catalog-price-${LISTING_A}`), { target: { value: "180,50" } });
    fireEvent.click(screen.getByTestId(`add-${LISTING_A}`));
    await waitFor(() => expect(fixture.state.items[0]?.price.amountMinor).toBe(18050));
  });
});

function pendingFixture() {
  const result = setup(); const { fixture } = result;
  fixture.handle({ method: "POST", path: fixture.prefix + "/items", headers: { authorization: "Bearer host" }, body: { source: "CATALOGED", title: "Vajilla", price: { amountMinor: 25000, currency: "BOB" }, productListingId: LISTING_A } });
  const item = fixture.state.items[0]!;
  fixture.state.items[0] = { ...item, status: "PENDING_REVIEW", reservedByName: "María privada" };
  const reservation = { id: "88888888-8888-4888-8888-888888888888", itemId: item.id, celebrationId: item.celebrationId, guestDisplayName: "María privada", message: "Mensaje privado", status: "PENDING_REVIEW" as const, requestedAt: "2026-11-08T02:00:00Z" };
  fixture.state.reservations.push(reservation);
  fixture.state.calls.length = 0;
  return { ...result, item, reservation };
}

describe("F23 slice 3 · decisions, preferences and discovery", () => {
  it.each(["approve", "reject"] as const)("%s once, removes the pending row and reflects the backend item state", async (decision) => {
    const { fixture, client, props, reservation } = pendingFixture();
    renderApp(<GiftInboxScreen {...props} />, client);
    await screen.findByText("Solicitó: María privada");
    fireEvent.click(screen.getByTestId(`${decision}-${reservation.id}`)); fireEvent.click(screen.getByTestId(`${decision}-${reservation.id}`));
    await screen.findByText(decision === "approve" ? "Reserva aprobada." : "Reserva rechazada.");
    await waitFor(() => expect(screen.queryByTestId(`reservation-${reservation.id}`)).toBeNull());
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
    expect(fixture.state.items[0]?.status).toBe(decision === "approve" ? "COMMITTED" : "AVAILABLE");
  });

  it("blocks overlapping decisions on different rows", async () => {
    const { fixture, client, props, reservation } = pendingFixture();
    const other = { ...reservation, id: "77777777-7777-4777-8777-777777777777" }; fixture.state.reservations.push(other);
    renderApp(<GiftInboxScreen {...props} />, client);
    fireEvent.click(await screen.findByTestId(`approve-${reservation.id}`)); fireEvent.click(screen.getByTestId(`reject-${other.id}`));
    await screen.findByText("Reserva aprobada.");
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("handles an approval race with a 409 and rereads the authoritative inbox", async () => {
    const { fixture, client, props, reservation } = pendingFixture();
    server.use(http.post(`http://f23.test${fixture.prefix}/reservations/${reservation.id}/approve`, () => {
      fixture.state.reservations = [{ ...reservation, status: "COMMITTED" }];
      return HttpResponse.json({ status: 409, code: "RESERVATION_NOT_PENDING" }, { status: 409 });
    }));
    renderApp(<GiftInboxScreen {...props} />, client);
    fireEvent.click(await screen.findByTestId(`approve-${reservation.id}`));
    await screen.findByText("Esta reserva ya no estaba pendiente; actualizamos la lista.");
    await screen.findByText("No hay reservas pendientes.");
    expect(screen.queryByText("Reserva aprobada.")).toBeNull();
  });

  it.each([401, 403, 422, 503])("decision HTTP %s never reports success", async (status) => {
    const { fixture, client, props, reservation } = pendingFixture();
    fixture.state.failures.set(`POST ${fixture.prefix}/reservations/${reservation.id}/approve`, status);
    renderApp(<GiftInboxScreen {...props} />, client);
    fireEvent.click(await screen.findByTestId(`approve-${reservation.id}`));
    await screen.findByRole("alert");
    expect(fixture.state.reservations[0]?.status).toBe("PENDING_REVIEW");
    expect(screen.queryByText("Reserva aprobada.")).toBeNull();
  });

  it("persists an opt-out once, reads it back and masks names in both the gift list and inbox", async () => {
    const { fixture, client, props, reservation } = pendingFixture();
    renderApp(<GiftsScreen {...props} />, client);
    await screen.findByText("Reservado por María privada");
    const toggle = screen.getByRole("switch", { name: "Ver el nombre en mi panel" });
    fireEvent.click(toggle); fireEvent.click(toggle);
    expect(screen.queryByText("Reservado por María privada")).toBeNull();
    await screen.findByText("La preferencia se guardó. Actualizamos las reservas y los regalos.");
    expect(fixture.state.settings).toMatchObject({ showRequesterToHost: false, showRequesterToGuests: false });
    const writes = fixture.state.calls.filter((call) => call.method === "PUT"); expect(writes).toHaveLength(1);
    expect(fixture.state.calls.slice(fixture.state.calls.indexOf(writes[0]!) + 1).some((call) => call.method === "GET" && call.path.endsWith("/gift-settings"))).toBe(true);
    cleanup(); renderApp(<GiftInboxScreen {...props} />, client);
    await screen.findByTestId(`hidden-${reservation.id}`);
    expect(screen.queryByText(/María privada|Mensaje privado/)).toBeNull();
    fireEvent.click(screen.getByTestId(`approve-${reservation.id}`));
    await screen.findByText("Reserva aprobada.");
  });

  it("a failed preference write restores the authoritative switch without claiming success", async () => {
    const { fixture, client, props } = pendingFixture(); fixture.state.failures.set(`PUT ${fixture.prefix}/gift-settings`, 503);
    renderApp(<GiftsScreen {...props} />, client);
    fireEvent.click(await screen.findByRole("switch", { name: "Ver el nombre en mi panel" }));
    await screen.findByRole("alert");
    expect(fixture.state.settings.showRequesterToHost).toBe(true);
    await screen.findByText("Reservado por María privada");
    expect((screen.getByRole("switch", { name: "Ver el nombre en mi panel" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText("La preferencia se guardó. Actualizamos las reservas y los regalos.")).toBeNull();
  });

  it("does not reveal an incoherent hidden payload's name or message", async () => {
    const { fixture, client, props, reservation } = pendingFixture();
    server.use(http.get(`http://f23.test${fixture.prefix}/reservations`, () => HttpResponse.json({ items: [{ ...reservation, requesterHidden: true }] })));
    renderApp(<GiftInboxScreen {...props} />, client);
    await screen.findByTestId(`hidden-${reservation.id}`);
    expect(screen.queryByText(/María privada|Mensaje privado/)).toBeNull();
  });

  it("keeps names and messages hidden when the preference cannot be read", async () => {
    const { fixture, client, props } = pendingFixture(); fixture.state.failures.set(`GET ${fixture.prefix}/gift-settings`, 503);
    renderApp(<GiftInboxScreen {...props} />, client);
    await screen.findByText("No pudimos consultar tu preferencia. Ocultamos nombres y mensajes hasta recuperarla.");
    expect(screen.queryByText(/María privada|Mensaje privado/)).toBeNull();
  });

  it.each(["list", "inbox"])("%s has an actionable empty state", async (kind) => {
    const { client, props } = setup(); renderApp(kind === "list" ? <GiftsScreen {...props} /> : <GiftInboxScreen {...props} />, client);
    await screen.findByText(kind === "list" ? "Todavía no agregaste regalos." : "No hay reservas pendientes.");
  });

  it.each([401, 403, 422, 429, 503])("list HTTP %s never reveals stale gift rows", async (status) => {
    const { fixture, client, props } = pendingFixture(); fixture.state.failures.set(`GET ${fixture.prefix}/items`, status);
    renderApp(<GiftsScreen {...props} />, client);
    await screen.findByRole("alert", {}, { timeout: 5000 }); expect(screen.queryByText("Vajilla")).toBeNull();
    expect(screen.queryByText("Contract fixture failure")).toBeNull();
  });

  it("discovers in the current language, validates price and applies category/city/price filters", async () => {
    const { fixture, client, props } = setup("en-US"); renderApp(<ProvidersScreen {...props} />, client, undefined, "en-US");
    await screen.findByTestId(`provider-${LISTING_A}`);
    expect(fixture.state.calls.find((call) => call.path.startsWith("/providers?"))?.path).toContain("locale=en-US");
    fireEvent.change(screen.getByTestId("providers-max-price"), { target: { value: "-1" } }); fireEvent.click(screen.getByTestId("providers-search"));
    await screen.findByText("Enter a valid amount with up to two decimal places.");
    fireEvent.click(screen.getByTestId("category-CATERING"));
    await screen.findByTestId(`provider-${LISTING_B}`);
    fireEvent.change(screen.getByTestId("providers-city"), { target: { value: "La Paz" } });
    fireEvent.change(screen.getByTestId("providers-max-price"), { target: { value: "600,50" } }); fireEvent.click(screen.getByTestId("providers-search"));
    await waitFor(() => expect(fixture.state.calls.some((call) => call.path.includes("maxPriceMinor=60050") && call.path.includes("city=la-paz") && call.path.includes("category=CATERING"))).toBe(true));
  });

  it("adds from discovery without overlapping writes and handles a failed native partner launch", async () => {
    const { fixture, client, props } = setup(); vi.spyOn(Linking, "openURL").mockRejectedValue(new Error("device unavailable"));
    renderApp(<ProvidersScreen {...props} />, client);
    fireEvent.click(await screen.findByTestId(`dest-${LISTING_A}-PRODUCT_PAGE`));
    expect(screen.getAllByRole("button", { name: "Ver producto", exact: true })).toHaveLength(2);
    expect(screen.queryByText(/partner\.destination\./)).toBeNull();
    await screen.findByText("No pudimos abrir el enlace del aliado. Inténtalo otra vez.");
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining(`/r/${LISTING_A}?destination=PRODUCT_PAGE`));
    fireEvent.click(screen.getByTestId(`add-provider-${LISTING_A}`)); fireEvent.click(screen.getByTestId(`add-provider-${LISTING_B}`));
    await screen.findByText("Agregado: Vajilla de cerámica");
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("changes celebration without carrying the previous external draft or review", async () => {
    const { fixture, client, props } = setup();
    const view = renderApp(<ExternalScreen {...props} />, client);
    await screen.findByTestId("external-title"); fillExternal("Primer evento"); reviewExternal();
    const other = "66666666-6666-4666-8666-666666666666";
    server.use(http.get(`http://f23.test/celebrations/${other}`, () => HttpResponse.json({ ...fixture.state.celebration, id: other, slug: "otra-celebracion" })));
    view.rerender(<AppProviders client={client} claims={HOST}><ExternalScreen celebrationId={other} onNavigate={navigate} /></AppProviders>);
    await waitFor(() => expect((screen.getByTestId("external-title") as HTMLInputElement).value).toBe(""));
    fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByText("Revisa las alternativas y confirma que prefieres un regalo externo.");
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(0);
  });

  it("paginates the provider results using server totals", async () => {
    const { fixture, client, props } = setup();
    const card = fixture.state.providers[0]!;
    fixture.state.providers = Array.from({ length: 8 }, (_, index) => ({ ...card, listingId: `55555555-5555-4555-8555-${String(index).padStart(12, "0")}`, name: `Proveedor ${index}` }));
    renderApp(<ProvidersScreen {...props} />, client);
    await screen.findByText("Página 1 de 2");
    fireEvent.click(screen.getByTestId("providers-next"));
    await screen.findByText("Página 2 de 2");
    expect(fixture.state.calls.some((call) => call.path.includes("page=2"))).toBe(true);
    expect(screen.queryByText("Proveedor 0")).toBeNull();
    expect(screen.getByText("Proveedor 7")).toBeTruthy();
  });

  it("catalog load failures have a retry and an empty result has guidance", async () => {
    const { fixture, showCatalog } = setup(); fixture.state.failures.set("GET /listings", 503);
    showCatalog(); await screen.findByRole("alert");
    fixture.state.failures.clear(); fixture.state.listings.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "Actualizar", exact: true }));
    await screen.findByText("No encontramos productos con esa búsqueda.");
  });

  it("discovery errors recover to an empty result", async () => {
    const { fixture, client, props } = setup(); fixture.state.failures.set("GET /providers", 503);
    renderApp(<ProvidersScreen {...props} />, client); await screen.findByRole("alert");
    fixture.state.failures.clear(); fixture.state.providers.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "Actualizar", exact: true }));
    await screen.findByText("Ningún proveedor coincide con estos filtros.");
  });
});

function fillExternal(title = "Regalo externo"): void {
  fireEvent.change(screen.getByTestId("external-title"), { target: { value: title } });
  fireEvent.change(screen.getByTestId("external-url"), { target: { value: "https://store.example/gift" } });
  fireEvent.change(screen.getByTestId("external-price"), { target: { value: "125,50" } });
}
const reviewExternal = (): void => fireEvent.click(screen.getByRole("checkbox", { name: "Revisé las alternativas y prefiero un regalo externo" }));

describe("F23 slice 2 · deliberate external flow and publication", () => {
  it("requires review, handles the partner-first challenge once and keeps PROPOSED out of the public list until approved", async () => {
    const { fixture, client, props } = setup();
    renderApp(<ExternalScreen {...props} />, client);
    await screen.findByTestId("external-title"); fillExternal();
    fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByText("Revisa las alternativas y confirma que prefieres un regalo externo.");
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(0);
    reviewExternal(); fireEvent.click(screen.getByTestId("external-submit")); fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByTestId(`suggestion-${LISTING_A}`);
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("external-submit")); fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByText("Regalo propuesto: queda pendiente de tu aprobación.");
    expect(fixture.state.items[0]?.status).toBe("PROPOSED");
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(2);
    cleanup(); renderApp(<GuestGiftsScreen slug={fixture.state.celebration.slug} token={GUEST_TOKEN} />, client);
    await screen.findByText("Aún no hay regalos");
    expect(screen.queryByText("Regalo externo")).toBeNull();
    cleanup(); renderApp(<GiftsScreen {...props} />, client);
    const item = fixture.state.items[0]!;
    fireEvent.click(await screen.findByTestId(`approve-proposal-${item.id}`));
    await waitFor(() => expect(fixture.state.items[0]?.status).toBe("AVAILABLE"));
    cleanup(); renderApp(<GuestGiftsScreen slug={fixture.state.celebration.slug} token={GUEST_TOKEN} />, client);
    await screen.findByTestId(`gift-${item.id}`);
  });

  it("routes a suggestion to the catalog to obtain its real price, and a draft edit invalidates its old acknowledgment", async () => {
    const { fixture, client, props } = setup(); renderApp(<ExternalScreen {...props} />, client);
    await screen.findByTestId("external-title"); fillExternal(); reviewExternal(); fireEvent.click(screen.getByTestId("external-submit"));
    fireEvent.click(await screen.findByTestId(`review-suggestion-${LISTING_A}`));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("&q=Vajilla%20de%20cer%C3%A1mica"));
    expect(fixture.state.items).toHaveLength(0);
    fireEvent.change(screen.getByTestId("external-title"), { target: { value: "Otro regalo" } });
    fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByText("Revisa las alternativas y confirma que prefieres un regalo externo.");
    reviewExternal(); fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByTestId(`suggestion-${LISTING_A}`);
    const writes = fixture.state.calls.filter((call) => call.method === "POST");
    expect(writes).toHaveLength(2);
    expect(writes[1]?.body).not.toHaveProperty("partnerSuggestionsAcknowledged");
  });

  it.each([401, 403, 422, 503])("POST %s preserves all external input and reports no false success", async (status) => {
    const { fixture, client, props } = setup(); fixture.state.failures.set(`POST ${fixture.prefix}/items`, status);
    renderApp(<ExternalScreen {...props} />, client);
    await screen.findByTestId("external-title"); fillExternal(); reviewExternal(); fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByRole("alert");
    expect((screen.getByTestId("external-title") as HTMLInputElement).value).toBe("Regalo externo");
    expect((screen.getByTestId("external-url") as HTMLInputElement).value).toBe("https://store.example/gift");
    expect((screen.getByTestId("external-price") as HTMLInputElement).value).toBe("125,50");
    expect(fixture.state.items).toHaveLength(0);
    expect(screen.queryByText(/Regalo propuesto:/)).toBeNull();
  });

  it("rejects URL credentials locally before any creation request", async () => {
    const { fixture, client, props } = setup();
    renderApp(<ExternalScreen {...props} />, client);
    await screen.findByTestId("external-title"); fillExternal();
    fireEvent.change(screen.getByTestId("external-url"), { target: { value: "https://name:password@store.example/gift" } });
    reviewExternal(); fireEvent.click(screen.getByTestId("external-submit"));
    await screen.findByText("Usa un enlace http o https válido, sin usuario ni contraseña.");
    expect(fixture.state.calls.filter((call) => call.method === "POST")).toHaveLength(0);
  });
});
