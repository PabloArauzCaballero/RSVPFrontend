import { createContractMock, MOCK_VALID_TOKEN, type MockRequest, type MockResponse } from "@rsvp/testing/contract-mock";
import type { AddGiftInput, Celebration, GiftItem, GiftReservation, GiftSettings, ListingHit, ProviderCard } from "@rsvp/query-hooks";

export const LISTING_A = "11111111-1111-4111-8111-111111111111";
export const LISTING_B = "22222222-2222-4222-8222-222222222222";
export const PROVIDER_ID = "33333333-3333-4333-8333-333333333333";
export const GUEST_TOKEN = MOCK_VALID_TOKEN;
const reply = (status: number, body?: unknown): MockResponse => ({ status, body, headers: { "content-type": "application/json" } });
const failure = (status: number, code = "TEST_FAILURE"): MockResponse => reply(status, { status, code, title: "Contract fixture failure" });

/** F23-only HTTP fixture. Shared F21/F22 mocks and production contracts remain unchanged. */
export function createHostGiftFixture() {
  const base = createContractMock({ now: () => new Date("2026-11-08T14:00:00Z") });
  base.addGuest({ token: GUEST_TOKEN, name: "María José", allowedCompanions: 2 });
  const celebration: Celebration = {
    id: base.celebrationId, slug: base.slug, ownerId: "host", organizationId: null, eventTypeCode: "WEDDING", status: "PUBLISHED", version: 1,
    defaultLocale: "es-BO", supportedLocales: ["es-BO", "en-US"], timeZone: "America/La_Paz", currency: "BOB",
    content: { title: "Ana y Luis", eventDate: "2026-12-19T23:00:00Z", hosts: { BRIDE: "Ana", GROOM: "Luis" } }, translations: {},
    settings: { giftReservationMode: "RESTRICTED", unregisteredRsvpMode: "RESTRICTED", extraCompanionMode: "RESTRICTED", externalGiftMode: "RESTRICTED", partnerPriorityEnabled: true, rsvpDeadline: null, settingsVersion: 1, effectiveFrom: "2026-11-08T14:00:00Z" },
    templateId: "classic", collaborators: [], publishedAt: "2026-11-08T14:00:00Z", createdAt: "2026-11-08T14:00:00Z", updatedAt: "2026-11-08T14:00:00Z", access: "MANAGE"
  };
  const listings: ListingHit[] = [
    { id: LISTING_A, providerId: PROVIDER_ID, title: "Vajilla de cerámica", type: "PRODUCT", category: "DECORATION", published: true, providerStatus: "VERIFIED", priceFromMinor: 25000, currency: "BOB" },
    { id: LISTING_B, providerId: PROVIDER_ID, title: "Torta para celebrar", type: "PRODUCT", category: "CATERING", published: true, providerStatus: "VERIFIED", priceFromMinor: 50000, currency: "BOB" }
  ];
  const providers: ProviderCard[] = listings.map((listing) => ({ listingId: listing.id, providerSlug: "taller-aliado", providerId: PROVIDER_ID, providerName: "Taller Aliado", name: listing.title, category: listing.category ?? "DECORATION", city: "la-paz", department: "la-paz", verified: true,
    priceFrom: { amountMinor: listing.priceFromMinor ?? 0, currency: "BOB" }, destinations: ["PRODUCT_PAGE", "WHATSAPP"], summary: "Hecho para compartir una celebración.",
    fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], transportCostMinor: 1500, leadTimeDays: 3, conditions: "Entrega coordinada" },
    address: { line: "Calle de la celebración 123" }, hours: { weekly: [{ weekdays: [1, 2, 3, 4, 5], opens: "09:00", closes: "18:00" }] } }));
  const state = { celebration, listings, providers, items: [] as GiftItem[], reservations: [] as GiftReservation[], settings: { showRequesterToHost: true, showRequesterToGuests: false, version: 0 } as GiftSettings,
    failures: new Map<string, number>(), calls: [] as MockRequest[], counter: 10 };
  const nextId = (): string => `99999999-9999-4999-8999-${String(state.counter++).padStart(12, "0")}`;
  const reservationKeys = new Map<string, GiftReservation>();
  const prefix = `/gifts/celebrations/${celebration.id}`;

  const handle = (request: MockRequest): MockResponse => {
    state.calls.push(request);
    const url = new URL(request.path, "http://f23.test"), path = url.pathname;
    const forced = state.failures.get(`${request.method} ${path}`);
    if (forced) return failure(forced);
    if (request.method === "GET" && path === `/celebrations/${celebration.id}`) return reply(200, state.celebration);
    if (request.method === "GET" && path === "/celebrations") return reply(200, { items: [state.celebration] });
    if (request.method === "PUT" && path === `/celebrations/${celebration.id}/settings`) {
      state.celebration = { ...state.celebration, version: state.celebration.version + 1, settings: { ...state.celebration.settings, ...request.body as object } }; return reply(200, state.celebration);
    }
    if (request.method === "GET" && path === "/listings") {
      const query = url.searchParams.get("q")?.toLocaleLowerCase() ?? "";
      return reply(200, { items: state.listings.filter((listing) => listing.title.toLocaleLowerCase().includes(query)).slice(0, Number(url.searchParams.get("limit") ?? 50)) });
    }
    if (request.method === "GET" && path === "/providers") {
      const items = state.providers.filter((provider) => (!url.searchParams.get("category") || provider.category === url.searchParams.get("category")) && (!url.searchParams.get("city") || provider.city === url.searchParams.get("city")) && (!url.searchParams.has("maxPriceMinor") || (provider.priceFrom?.amountMinor ?? Infinity) <= Number(url.searchParams.get("maxPriceMinor"))));
      const page = Number(url.searchParams.get("page") ?? 1), pageSize = Number(url.searchParams.get("pageSize") ?? 6);
      return reply(200, { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize });
    }
    if (!path.startsWith("/gifts/")) return base.handle(request);
    if (!path.startsWith(prefix)) return failure(404);
    const guest = request.headers.authorization === `Bearer ${GUEST_TOKEN}`;
    if (!request.headers.authorization) return failure(401);
    if (request.method === "GET" && path === `${prefix}/items`) {
      const visible = guest ? state.items.filter((item) => ["AVAILABLE", "PENDING_REVIEW", "COMMITTED"].includes(item.status)) : state.items;
      return reply(200, { items: visible.map((item) => { const { reservedByName, ...safe } = item; return (guest ? state.settings.showRequesterToGuests : state.settings.showRequesterToHost) && reservedByName ? { ...safe, reservedByName } : safe; }), partnerPriorityEnabled: state.celebration.settings.partnerPriorityEnabled });
    }
    if (request.method === "POST" && path === `${prefix}/items`) {
      if (guest) return failure(403);
      const input = request.body as AddGiftInput;
      if (input.source === "EXTERNAL" && state.celebration.settings.partnerPriorityEnabled && !input.partnerSuggestionsAcknowledged) return reply(409, { status: 409, code: "PARTNER_CATALOG_FIRST", suggestions: state.listings.map((item) => ({ productListingId: item.id, title: item.title })) });
      if (input.source === "CATALOGED" && !state.listings.some((item) => item.id === input.productListingId && item.published && item.type === "PRODUCT" && item.providerStatus === "VERIFIED")) return failure(422, "CATALOG_PRODUCT_UNAVAILABLE");
      const item: GiftItem = { id: nextId(), listId: PROVIDER_ID, celebrationId: celebration.id, title: input.title, price: input.price, source: input.source, status: input.source === "EXTERNAL" && state.celebration.settings.externalGiftMode === "RESTRICTED" ? "PROPOSED" : "AVAILABLE", version: 1, createdAt: "2026-11-08T14:00:00Z", ...(input.source === "CATALOGED" ? { productListingId: input.productListingId } : { externalUrl: input.url }) };
      state.items.push(item); return reply(201, item);
    }
    if (path === `${prefix}/gift-settings`) {
      if (guest) return failure(403);
      if (request.method === "PUT") state.settings = { ...state.settings, ...request.body as object, version: state.settings.version + 1 };
      return reply(200, state.settings);
    }
    if (path === `${prefix}/reservations` && request.method === "GET") return guest ? failure(403) : reply(200, { items: state.reservations.filter((item) => !url.searchParams.get("status") || item.status === url.searchParams.get("status")).map((item) => state.settings.showRequesterToHost ? item : { ...item, requesterHidden: true, guestId: null, guestDisplayName: null, message: null }) });
    const reserve = new RegExp(`^${prefix}/items/([^/]+)/reservations$`).exec(path);
    if (reserve && request.method === "POST") {
      const key = request.headers["idempotency-key"];
      if (key && reservationKeys.has(key)) return reply(201, reservationKeys.get(key));
      const item = state.items.find((entry) => entry.id === reserve[1]);
      if (!item) return failure(404);
      if (item.status !== "AVAILABLE") return failure(409, "GIFT_NOT_AVAILABLE");
      const input = request.body as { guestDisplayName?: string; message?: string };
      const reservation: GiftReservation = { id: nextId(), itemId: item.id, celebrationId: celebration.id, status: "PENDING_REVIEW", requestedAt: "2026-11-08T14:00:00Z", ...input };
      state.reservations.push(reservation); state.items = state.items.map((entry) => entry.id === item.id ? { ...entry, status: "PENDING_REVIEW" } : entry);
      if (key) reservationKeys.set(key, reservation); return reply(201, reservation);
    }
    const approval = new RegExp(`^${prefix}/items/([^/]+)/approve$`).exec(path);
    if (approval && request.method === "POST") {
      if (guest) return failure(403);
      const index = state.items.findIndex((item) => item.id === approval[1]);
      if (index < 0) return failure(404);
      if (state.items[index]?.status !== "PROPOSED") return failure(409);
      state.items[index] = { ...state.items[index]!, status: "AVAILABLE", version: state.items[index]!.version + 1 }; return reply(200, state.items[index]);
    }
    const decision = new RegExp(`^${prefix}/reservations/([^/]+)/(approve|reject)$`).exec(path);
    if (decision && request.method === "POST") {
      if (guest) return failure(403);
      const reservation = state.reservations.find((entry) => entry.id === decision[1]);
      if (!reservation) return failure(404);
      if (reservation.status !== "PENDING_REVIEW") return failure(409, "RESERVATION_NOT_PENDING");
      const resolved = { ...reservation, status: decision[2] === "approve" ? "COMMITTED" as const : "REJECTED" as const, resolvedAt: "2026-11-08T14:01:00Z" };
      state.reservations = state.reservations.map((entry) => entry.id === resolved.id ? resolved : entry);
      state.items = state.items.map((item) => item.id === resolved.itemId ? { ...item, status: resolved.status === "COMMITTED" ? "COMMITTED" : "AVAILABLE", ...(resolved.status === "COMMITTED" ? { reservedByName: reservation.guestDisplayName ?? "" } : {}) } : item);
      return reply(200, resolved);
    }
    return failure(404);
  };
  return { ...base, state, handle, prefix };
}
