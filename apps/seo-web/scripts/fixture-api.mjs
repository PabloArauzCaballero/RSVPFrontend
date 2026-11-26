// Local contract fixture for the public API, for visual/Lighthouse evidence when the live backend has no content
// (celebrations with every section) or no Provider Catalog HTTP service yet.
//   node apps/seo-web/scripts/fixture-api.mjs   (PORT=28100; FIXTURE_LOCALE=en-US to serve the view in English)
// It is NOT the backend: evidence produced against it is labelled "fixture" and proves rendering only.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 28100);
const SLUG = "fixture-ana-y-luis";
const CONTACT_SLUG = "fixture-contacto-rsvp";
const image = (hue) => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1280" viewBox="0 0 1920 1280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 45% 78%)"/><stop offset="1" stop-color="hsl(${hue + 40} 40% 52%)"/></linearGradient></defs><rect width="1920" height="1280" fill="url(#g)"/></svg>`;
const img = (n) => `http://localhost:${PORT}/img/${n}.svg`;

const view = {
  celebrationId: "00000000-0000-4000-8000-000000000001", slug: SLUG, locale: process.env.FIXTURE_LOCALE ?? "es-BO", availableLocales: ["es-BO", "en-US"],
  eventType: { code: "WEDDING", name: "Boda", hostRoles: [{ role: "BRIDE", label: "Novia" }, { role: "GROOM", label: "Novio" }] },
  enabledSections: ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations", "gifts", "rsvp"],
  timeZone: "America/La_Paz", currency: "BOB", templateId: "t-classic",
  content: {
    title: "Ana y Luis", eventDate: "2026-12-19T23:00:00.000Z", venueName: "Hacienda El Prado", hosts: { BRIDE: "Ana", GROOM: "Luis" },
    story: "Nos conocimos en La Paz.\n\nCinco años después, decimos que sí.", dressCode: "Formal, tonos tierra.",
    schedule: [{ id: "s1", title: "Ceremonia", startsAt: "2026-12-19T23:00:00.000Z" }, { id: "s2", title: "Fiesta", startsAt: "2026-12-20T03:30:00.000Z" }],
    venues: [{ key: "ceremony", kind: "ceremony", name: "Iglesia San Francisco", address: "Plaza San Francisco, La Paz" }, { key: "party", kind: "reception", name: "Hacienda El Prado", address: "Valle de Zongo" }],
    faq: [{ question: "¿Pueden ir niños?", answer: "Sí, serán bienvenidos." }, { question: "¿Hay estacionamiento?", answer: "Sí, dentro de la hacienda." }],
    recommendations: [{ kind: "lodging", name: "Hotel Andino", listingId: "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11" }, { kind: "transport", name: "Radio taxi" }]
  },
  localTimes: { eventDate: { date: "2026-12-19", time: "19:00", timeZone: "America/La_Paz", utcOffset: "-04:00" } },
  rsvpDeadline: null, publishedAt: "2026-10-17T12:00:00.000Z", version: 5
};
const restrictedRsvp = {
  ...view,
  celebrationId: "00000000-0000-4000-8000-000000000002",
  slug: CONTACT_SLUG,
  content: {
    ...view.content,
    hostContact: { email: "confirmacionesinvitadosmatrimoniocivil2026@example.test", consentPublic: true }
  }
};
const template = { id: "t-classic", name: "Clásico marfil", layout: "classic", eventTypeTags: ["wedding"], theme: { palette: { canvas: "#FFFBF4", surface: "#FFFFFF", text: "#302C28", accent: "#865E36", muted: "#6F665D" }, typography: { heading: "'Cormorant Garamond', Georgia, serif", body: "'Source Sans 3', Arial, sans-serif" }, sectionStyle: "bands" }, sectionOrder: ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"] };
const gallery = [1, 2, 3].map((n) => ({ id: `g${n}`, width: 1920, height: 1280, isCover: n === 1, variants: { thumb: img(n), medium: img(n), full: img(n), webp: img(n) } }));

// F4 b · the three prototyped templates as design documents v2, read from the very files the backend seeds. Each one is served as a
// celebration with a cover photo (`fixture-v2-<name>`) and without it (`fixture-v2-<name>-sinfoto`), to prove both covers on the real site.
const V2_IDS = { marfil: "73477f09-c9a6-544e-9477-948866a907c6", pinata: "c5c5c247-bfaf-52c2-b932-e0ce9f2cb8c7", gala: "e6a5911c-2e0b-5381-a2f8-9d9e0a9b24e8",
  // F4 c1 · the wedding group (the id is the v1 seed's: uuid5 of the key, P20).
  "jardin-botanico": "1437aaef-2fdf-5aff-ba78-10139d8c8e24", "rosa-antiguo": "984f5f85-66e1-5226-9f58-af6ca5fd4963", editorial: "eee0b5bb-a4aa-5091-93b0-696da7b7bab5",
  "editorial-granate": "637c1fe4-e88a-5e6c-802c-c4832d881519", "editorial-oliva": "7a69536f-1bb7-5cb5-b905-4b42e1626032", "bodas-de-oro": "2430166f-d9cd-52d8-b999-ef1c9ed7040c",
  "bodas-de-plata": "a3d91e73-703b-5f8e-ae78-a9da05402bed", "pedida-de-mano": "2b64a4fb-e239-5855-9816-6f73a2f7d8d7" };
const V2_CONTENT = { pinata: { title: "Sofi cumple 6", hosts: {}, eventDate: "2026-12-19T19:00:00.000Z" }, "bodas-de-oro": { title: "Rosa y Mario", hosts: { BRIDE: "Rosa", GROOM: "Mario" } },
  "bodas-de-plata": { title: "Carla y Jorge", hosts: { BRIDE: "Carla", GROOM: "Jorge" } }, "pedida-de-mano": { title: "Lucía y Marco", hosts: { BRIDE: "Lucía", GROOM: "Marco" } } };
const v2Template = (name) => {
  const file = JSON.parse(readFileSync(new URL(`../../../packages/celebration-theme/src/design/documents/${name}.json`, import.meta.url), "utf8"));
  return { id: V2_IDS[name], name: file.name, description: file.description, status: "PUBLISHED", layout: file.layout, eventTypeTags: file.eventTypeTags, theme: file.theme, sectionOrder: file.sectionOrder, version: 2 };
};
const v2Celebrations = Object.entries(V2_IDS).flatMap(([name, templateId], index) => [false, true].map((bare) => ({
  slug: `fixture-v2-${name}${bare ? "-sinfoto" : ""}`, templateId, bare,
  view: { ...view, celebrationId: `00000000-0000-4000-8000-${String(100 + index * 2 + (bare ? 1 : 0)).padStart(12, "0")}`, slug: `fixture-v2-${name}${bare ? "-sinfoto" : ""}`, templateId,
    content: V2_CONTENT[name] ? { ...view.content, ...V2_CONTENT[name] } : view.content }
})));

const providers = [
  { listingId: "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11", providerSlug: "hotel-andino", name: "Hotel Andino", category: "ACCOMMODATION", city: "La Paz", department: "La Paz", verified: true, summary: "Hospedaje boutique en el centro histórico, con salón para recepciones de hasta 120 personas.", priceFrom: { amountMinor: 45000, currency: "BOB" }, imageUrl: img(1), destinations: ["WHATSAPP", "PHONE", "EMAIL", "OFFICIAL_SITE"], coverage: ["La Paz", "El Alto"], address: "Calle Comercio 123, La Paz", hours: ["Lu-Do 08:00-22:00"], lat: -16.4955, lng: -68.1336 },
  { listingId: "8e2d2b45-6e5d-4b4a-8b3f-1a5a3e4e8c22", providerSlug: "salon-del-sol", name: "Salón del Sol", category: "VENUE", city: "La Paz", department: "La Paz", verified: true, summary: "Salón de eventos con jardín y estacionamiento.", priceFrom: { amountMinor: 1200000, currency: "BOB" }, imageUrl: img(2), destinations: ["WHATSAPP", "INSTAGRAM"], coverage: ["La Paz", "Achumani"], lat: -16.54, lng: -68.08 },
  { listingId: "9f3e3c56-7f6e-4c5b-9c4a-2b6b4f5f9d33", providerSlug: "luz-estudio", name: "Luz Estudio Fotográfico", category: "PHOTOGRAPHY", city: "Santa Cruz de la Sierra", department: "Santa Cruz", verified: true, summary: "Fotografía y video de bodas.", priceFrom: { amountMinor: 350000, currency: "BOB" }, imageUrl: img(3), destinations: ["WHATSAPP", "EMAIL"], coverage: ["Santa Cruz de la Sierra"], lat: -17.7833, lng: -63.1821 },
  { listingId: "a04f4d67-8a7f-4d6c-8d5b-3c7c5a6a0e44", providerSlug: "catering-valle", name: "Catering Valle", category: "CATERING", city: "Cochabamba", department: "Cochabamba", verified: false, summary: "Banquetes para eventos.", lat: -17.3895, lng: -66.1568 }
];
const km = (a, b) => { const r = (d) => d * Math.PI / 180; const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); };
const strip = ({ lat, lng, ...card }) => card;

function search(q) {
  let items = providers.filter((p) => p.verified);
  if (q.get("slug")) items = items.filter((p) => p.providerSlug === q.get("slug"));
  if (q.get("category")) items = items.filter((p) => p.category === q.get("category"));
  if (q.get("lat") && q.get("lng")) {
    const origin = { lat: Number(q.get("lat")), lng: Number(q.get("lng")) };
    const radius = Number(q.get("radiusKm") ?? 25);
    items = items.map((p) => ({ p, d: km(origin, p) })).filter(({ d }) => d <= radius).sort((a, b) => a.d - b.d).map(({ p }) => p);
  } else if (q.get("city")) items = items.filter((p) => p.city === q.get("city"));
  return { items: items.map(strip), total: items.length, page: Number(q.get("page") ?? 1), pageSize: 12 };
}

const json = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(body)); };

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  // The browser calls the API directly from another origin (like the gateway in production): without CORS the client
  // screens baselined an offline error instead of the real state.
  const origin = req.headers.origin;
  if (origin && /^http:\/\/localhost:\d+$/.test(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("access-control-allow-credentials", "true");
    res.setHeader("access-control-allow-headers", "authorization,content-type,idempotency-key,if-match,accept-language,x-correlation-id");
    res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("vary", "origin");
  }
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  // Gift List through the gateway: a visitor without the link credential gets the same 401 the real service answers.
  if (/^\/gifts\/celebrations\/[^/]+\/items$/.test(path) && !req.headers.authorization) return json(res, 401, { type: "https://rsvp.example/problems/Unauthorized", title: "A valid credential is required", status: 401, code: "Unauthorized" });
  if (path.startsWith("/img/")) { res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600" }); return res.end(image(Number(path.match(/(\d+)/)?.[1] ?? 1) * 70)); }
  if (path === "/celebrations/public") return json(res, 200, { items: [{ slug: SLUG, updatedAt: "2026-11-01T00:00:00Z", supportedLocales: ["es-BO", "en-US"] }] });
  if (path === `/celebrations/public/${SLUG}`) return json(res, 200, view);
  if (path === `/celebrations/public/${CONTACT_SLUG}`) return json(res, 200, restrictedRsvp);
  const v2 = v2Celebrations.find((item) => path === `/celebrations/public/${item.slug}`);
  if (v2) return json(res, 200, v2.view);
  const v2Assets = v2Celebrations.find((item) => path === `/media/public/celebrations/${item.view.celebrationId}/assets`);
  if (v2Assets) return json(res, 200, { items: v2Assets.bare ? [] : gallery });
  const v2Name = Object.keys(V2_IDS).find((name) => path === `/media/templates/${V2_IDS[name]}`);
  if (v2Name) return json(res, 200, v2Template(v2Name));
  if (path.startsWith("/celebrations/public/")) return json(res, 404, { title: "Not found", status: 404 });
  if (path === "/media/templates/t-classic") return json(res, 200, template);
  if (path === `/media/public/celebrations/${view.celebrationId}/assets`) return json(res, 200, { items: gallery });
  if (path === "/providers" || path === "/providers/") return json(res, 200, search(url.searchParams));
  if (path === `/rsvp/celebrations/${view.celebrationId}/public-settings`) return json(res, 200, { unregisteredRsvpMode: "AUTO_ACCEPT", publicRegistrationEnabled: true });
  if (path === `/rsvp/celebrations/${restrictedRsvp.celebrationId}/public-settings`) return json(res, 200, { unregisteredRsvpMode: "RESTRICTED", publicRegistrationEnabled: false });
  const redirect = path.match(/^\/r\/([0-9a-f-]{36})$/);
  if (redirect) {
    const cid = req.headers["x-correlation-id"] ?? "none";
    const target = new URL("https://partner.example/reservas");
    target.searchParams.set("utm_source", "rsvp"); target.searchParams.set("utm_medium", "referral"); target.searchParams.set("correlationId", String(cid));
    res.writeHead(302, { location: target.toString() }); return res.end();
  }
  json(res, 404, { title: "Not found", status: 404 });
}).listen(PORT, () => console.log(`fixture API on :${PORT} (slug ${SLUG})`));
