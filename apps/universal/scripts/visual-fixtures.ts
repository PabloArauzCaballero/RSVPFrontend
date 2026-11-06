import { MOCK_CELEBRATION_ID } from "@rsvp/testing/contract-mock";

/**
 * Sample answers for the endpoints the contract mock does not serve yet (provider portal, admin, gifts, templates),
 * shaped like the published contracts. Only for the visual gate: never the real backend, never shipped.
 */
type Reply = { readonly status: number; readonly headers?: Readonly<Record<string, string>>; readonly body?: unknown };
type Request = { readonly method: string; readonly path: string };
const ok = (body: unknown): Reply => ({ status: 200, headers: { "content-type": "application/json" }, body });
const P = "p-1";
const NOW = "2026-11-04T15:00:00.000Z";

const provider = { id: P, slug: "foto-altiplano", name: "Foto Altiplano", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 3, leadConfig: { mode: "REDIRECT" } };
const listings = [
  { id: "l-1", providerId: P, type: "SERVICE", category: "FOTOGRAFIA", city: "La Paz", title: "Cobertura de boda", published: true, priceFromMinor: 450000 },
  { id: "l-2", providerId: P, type: "PRODUCT", category: "FOTOGRAFIA", city: "La Paz", title: "Álbum de 40 páginas", published: false, priceFromMinor: 90000 }
];
const templates = [
  { id: "t-classic", name: "Clásico marfil", status: "PUBLISHED", version: 1, publishedAt: NOW, eventTypeTags: ["wedding"], layout: "classic", theme: { palette: { canvas: "#FFFBF4", surface: "#FFFFFF", text: "#302C28", accent: "#865E36", muted: "#6F665D" }, typography: { heading: "Georgia, serif", body: "Arial, sans-serif" }, sectionStyle: "bands" }, sectionOrder: ["story", "schedule", "venues", "faq", "rsvp"] },
  { id: "t-minimal", name: "Minimalista", status: "PUBLISHED", version: 1, publishedAt: NOW, eventTypeTags: ["wedding", "quinceanera"], layout: "minimal", theme: { palette: { canvas: "#FFFFFF", surface: "#F7F7F5", text: "#1C1C1A", accent: "#2F5D50", muted: "#5F5F5A" }, typography: { heading: "Arial, sans-serif", body: "Arial, sans-serif" }, sectionStyle: "plain" }, sectionOrder: ["schedule", "story"] },
  { id: "t-draft", name: "Festivo (borrador)", status: "DRAFT", version: 1, publishedAt: null, eventTypeTags: ["quinceanera"], layout: "festive", theme: { palette: { canvas: "#FFF4F8", surface: "#FFFFFF", text: "#3A1730", accent: "#C2185B", muted: "#7A5A6E" }, typography: { heading: "Georgia, serif", body: "Arial, sans-serif" }, sectionStyle: "cards" }, sectionOrder: ["story", "rsvp"] }
];
const gifts = [
  { id: "g-1", listId: "gl-1", celebrationId: MOCK_CELEBRATION_ID, title: "Juego de copas", description: null, price: { amountMinor: 18000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 1, productListingId: "l-2", providerId: P, externalUrl: null, createdAt: NOW },
  { id: "g-2", listId: "gl-1", celebrationId: MOCK_CELEBRATION_ID, title: "Licuadora", description: "Cualquier marca", price: { amountMinor: 35000, currency: "BOB" }, source: "EXTERNAL", status: "COMMITTED", version: 2, productListingId: null, providerId: null, externalUrl: "https://example.com/licuadora", createdAt: NOW },
  { id: "g-3", listId: "gl-1", celebrationId: MOCK_CELEBRATION_ID, title: "Torta de bodas", description: null, price: { amountMinor: 60000, currency: "BOB" }, source: "CATALOGED", status: "PENDING_REVIEW", version: 1, productListingId: "l-2", providerId: P, externalUrl: null, createdAt: NOW }
];
const reservations = [
  { id: "r-1", itemId: "g-3", celebrationId: MOCK_CELEBRATION_ID, guestId: "x", guestDisplayName: "Marta Quispe", message: "¡Con cariño!", status: "PENDING_REVIEW", requestedAt: NOW, resolvedAt: null, resolvedBy: null }
];
const card = { listingId: "l-1", providerSlug: "foto-altiplano", name: "Cobertura de boda", category: "FOTOGRAFIA", city: "La Paz", department: "La Paz", verified: true, providerId: P, providerName: "Foto Altiplano", destinations: [], summary: "Dos fotógrafos, entrega en 15 días.", priceFrom: { amountMinor: 450000, currency: "BOB" } };
const days = Array.from({ length: 30 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, weekday: (i + 6) % 7, available: i % 7 !== 0, remaining: 2 }));

const routes: readonly (readonly [RegExp, (request: Request) => Reply])[] = [
  // Provider portal
  [/^\/providers\/mine$/, () => ok({ items: [provider] })],
  [new RegExp(`^/providers/${P}$`), () => ok(provider)],
  [new RegExp(`^/providers/${P}/listings`), () => ok({ items: listings })],
  [new RegExp(`^/providers/${P}/leads`), () => ok({ total: 2, items: [{ id: "ld-1", listingId: "l-1", kind: "FORM", valid: true, billable: true, occurredAt: NOW }, { id: "ld-2", listingId: "l-1", kind: "REDIRECT", destination: "WHATSAPP", valid: false, invalidReason: "dup", occurredAt: NOW }] })],
  [new RegExp(`^/providers/${P}/metrics`), () => ok({ providerId: P, from: "2026-10-07", to: "2026-11-06", totals: { impressions: 1240, clicks: 96, validLeads: 14, invalidLeads: 2, ctr: 0.077 }, rows: [] })],
  [new RegExp(`^/providers/${P}/availability`), () => ok({ providerId: P, timeZone: "America/La_Paz", capacityPerDay: 2, rules: [{ weekdays: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" }], blackouts: [], version: 1 })],
  [new RegExp(`^/providers/${P}/calendar`), () => ok({ providerId: P, timeZone: "America/La_Paz", month: "2026-11", days })],
  [new RegExp(`^/providers/${P}/bookings`), () => ok({ items: [{ id: "b-1", providerId: P, requesterId: "u-9", date: "2026-11-21", status: "PENDING", expiresAt: "2026-11-10T00:00:00Z", listingId: "l-1" }] })],
  [new RegExp(`^/providers/${P}/microsite`), () => ok({ providerId: P, version: 1, descriptions: { "es-BO": "Fotografía de bodas en La Paz." }, gallery: [], hours: { weekly: [{ weekdays: [1, 2, 3, 4, 5], opens: "09:00", closes: "18:00" }] }, social: {}, address: { line: "Av. Arce 2000", city: "La Paz" } })],
  [new RegExp(`^/providers/${P}/documents`), () => ok({ items: [{ id: "d-1", providerId: P, kind: "IDENTITY", fileName: "ci.pdf", contentType: "application/pdf", sizeBytes: 204800, status: "UPLOADED", createdAt: NOW, uploadedAt: NOW }] })],
  [/^\/providers(\?.*)?$/, () => ok({ items: [card], total: 1, page: 1, pageSize: 6 })],
  [/^\/listings/, () => ok({ items: listings.map((l) => ({ id: l.id, providerId: P, title: l.title, type: l.type, category: l.category, published: l.published, providerStatus: "VERIFIED", priceFromMinor: l.priceFromMinor, currency: "BOB" })) })],
  // Admin
  [/^\/providers\/admin\/verification-queue/, () => ok({ items: [{ providerId: "p-2", name: "Catering Sol", category: "CATERING", city: "Santa Cruz", submittedAt: "2026-11-02T15:00:00Z", status: "PENDING" }, { providerId: "p-3", name: "DJ Andino", category: "MUSICA", city: "Cochabamba", submittedAt: "2026-11-03T15:00:00Z", status: "PENDING" }] })],
  [/^\/providers\/admin\/moderation/, () => ok({ items: [{ id: "m-1", kind: "MICROSITE", title: "Sitio de Foto Altiplano", url: "https://example.com/foto", submittedBy: "foto@example.com", submittedAt: NOW, status: "PENDING" }, { id: "g-1", kind: "EXTERNAL_GIFT", title: "Licuadora en tienda externa", submittedBy: "ana@example.com", submittedAt: NOW, status: "PENDING" }] })],
  [/^\/providers\/admin\/metrics\/leads/, () => ok({ groupBy: "partner", from: "2026-10-07", to: "2026-11-06", total: 12, items: [{ key: "p-1", label: "Foto Altiplano", leads: 8, quotes: 5, bookings: 2 }, { key: "p-2", label: "Catering Sol", leads: 4, quotes: 1, bookings: 0 }] })],
  [/^\/providers\/admin\/categories/, () => ok({ items: [{ code: "CATERING", names: { "es-BO": "Catering", "en-US": "Catering" }, active: true }, { code: "FOTOGRAFIA", names: { "es-BO": "Fotografía", "en-US": "Photography" }, active: true }] })],
  [/^\/providers\/admin\/geography/, () => ok({ items: [{ code: "BO", kind: "COUNTRY", parentCode: null, names: { "es-BO": "Bolivia" }, active: true }, { code: "LAPAZ", kind: "CITY", parentCode: "BO", names: { "es-BO": "La Paz" }, active: true }] })],
  [/^\/providers\/admin\/summary/, () => ok({ providersByStatus: { DRAFT: 2, PENDING_VERIFICATION: 1, VERIFIED: 4, SUSPENDED: 0, REJECTED: 1 }, listingsPublished: 9, leads: { valid: 30, invalid: 3, last30Days: 12 }, quotes: 7, bookingsConfirmed: 5 })],
  [/^\/identity\/admin\/summary/, () => ok({ users: { total: 25, byRole: { ADMIN: 1, HOST: 20, PROVIDER: 4 } }, organizations: { total: 3 } })],
  [/^\/identity\/admin\/users/, () => ok({ items: [{ id: "u-1", email: "ana@example.com", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-01T12:00:00Z" }, { id: "u-2", email: "foto@example.com", roles: ["PROVIDER"], status: "ACTIVE", createdAt: "2026-10-05T12:00:00Z" }] })],
  [/^\/identity\/admin\/organizations/, () => ok({ items: [{ id: "o-1", name: "Bodas La Paz", ownerUserId: "u-1", members: [] }] })],
  [/^\/celebrations\/admin\/event-types/, () => ok({ items: [{ code: "WEDDING", status: "ACTIVE", defaultLocale: "es-BO", hostRoles: ["BRIDE", "GROOM"], enabledSections: ["story", "schedule", "venues", "rsvp"], requiredFieldsForPublish: ["title"], compatibleTemplateTags: ["wedding"], translations: [{ locale: "es-BO", name: "Boda", hostRoleLabels: { BRIDE: "Novia", GROOM: "Novio" } }] }] })],
  [/^\/celebrations\/health/, () => ok({ status: "ok" })],
  // Templates and gifts for the host
  [/^\/media\/admin\/templates/, () => ok({ items: templates })],
  [/^\/media\/templates/, () => ok({ items: templates.filter((t) => t.status === "PUBLISHED") })],
  [/^\/gifts\/celebrations\/[^/]+\/items/, () => ok({ items: gifts, partnerPriorityEnabled: true })],
  [/^\/gifts\/celebrations\/[^/]+\/reservations/, () => ok({ items: reservations })],
  [/^\/gifts\/celebrations\/[^/]+\/gift-settings/, () => ok({ showRequesterToHost: true, showRequesterToGuests: false, version: 0 })]
];

/** Wraps `mock.handle`: what the mock already serves stays untouched; only its 404s fall through to these samples. */
export function withVisualFixtures<TMock extends { handle: (request: never) => Reply }>(mock: TMock): TMock {
  const original = mock.handle.bind(mock) as (request: Request) => Reply;
  (mock as { handle: (request: Request) => Reply }).handle = (request) => {
    const reply = original(request);
    if (reply.status !== 404 || request.method !== "GET") return reply;
    const found = routes.find(([pattern]) => pattern.test(request.path));
    return found ? found[1](request) : reply;
  };
  return mock;
}
