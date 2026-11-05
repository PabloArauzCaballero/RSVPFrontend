// Seeds a REAL world on the local backend (Kong :28000) for the F22-F28 browser runs: a published celebration with a
// gift list, a registered PROVIDER with listings, availability and a guest with a single-use link token.
//   node apps/seo-web/scripts/live-world.mjs > world.json        (API_URL overrides the gateway)
// Registration, celebration, gifts, listings, tokens and provider verification go through HTTP. Verifying needs an ADMIN:
// start Identity with IDENTITY_BOOTSTRAP_ADMIN_EMAIL=$E2E_ADMIN_EMAIL (default e2e-admin@example.test, registered here
// if missing) and restart it once; see RSVPBackend apps/identity-service/README.md. Local development stack only.

const API = process.env.API_URL ?? "http://localhost:28000";
const stamp = Date.now().toString(36);
const PASSWORD = "Passw0rd!Passw0rd-live";

async function call(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  return json;
}
const register = (role, label) => call("POST", "/identity/auth/register", { body: { email: `${label}.${stamp}@example.com`, password: PASSWORD, role } });

const host = await register("HOST", "f22host");
const provider = await register("PROVIDER", "f28prov");
const providerRow = await call("POST", "/providers", { token: provider.accessToken, body: { name: `Dulce Sol ${stamp}` } });
const fulfillment = { responsible: "PROVIDER", coverageZones: ["la-paz", "el-alto"], transportCostMinor: 5000, leadTimeDays: 3, conditions: { "es-BO": "Entrega en el salon, montaje incluido.", "en-US": "Delivered to the venue, setup included." } };
const listings = [];
for (const [type, title, price] of [["PRODUCT", "Torta de bodas", 45000], ["PRODUCT", "Mesa de dulces", 30000], ["SERVICE", "Catering para 100 invitados", 900000]]) {
  const created = await call("POST", `/providers/${providerRow.id}/listings`, { token: provider.accessToken, body: { type, category: type === "SERVICE" ? "CATERING" : "DECORATION", city: "la-paz", titles: { "es-BO": title, "en-US": title }, descriptions: { "es-BO": `${title} hecho a mano.` }, destinations: { WHATSAPP: "https://wa.me/59170000000", OFFICIAL_SITE: "https://example.com/dulce-sol" }, fulfillment, priceFromMinor: price } });
  listings.push(created);
}
for (const [index, listing] of listings.entries()) {
  try { await call("POST", `/providers/${providerRow.id}/listings/${listing.id}/publish`, { token: provider.accessToken }); } catch (error) { console.error(`publish ${index}: ${error.message}`); }
}
await call("PUT", `/providers/${providerRow.id}/availability`, { token: provider.accessToken, body: { capacityPerDay: 1, rules: [{ weekdays: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "20:00" }], blackouts: [{ start: nextMonthDay(10), reason: "Feriado" }] } });
await call("POST", `/providers/${providerRow.id}/submit`, { token: provider.accessToken });
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.test";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Correct-horse-9battery";
await call("POST", "/identity/auth/register", { body: { email: adminEmail, password: adminPassword, role: "HOST" } }).catch(() => undefined); // 409 when it already exists
const admin = await call("POST", "/identity/auth/login", { body: { email: adminEmail, password: adminPassword } });
if (!(JSON.parse(Buffer.from(admin.accessToken.split(".")[1], "base64url").toString()).roles ?? []).includes("ADMIN")) throw new Error(`${adminEmail} is not ADMIN: start Identity with IDENTITY_BOOTSTRAP_ADMIN_EMAIL=${adminEmail} and restart it`);
await call("POST", `/providers/${providerRow.id}/verify`, { token: admin.accessToken });

const slug = `f22-${stamp}`;
const celebration = await call("POST", "/celebrations", { token: host.accessToken, body: { slug, eventTypeCode: "WEDDING", content: { title: "Ana y Luis", eventDate: "2027-05-20T18:00", venueName: "Salon Los Pinos", hosts: { BRIDE: "Ana", GROOM: "Luis" } } } });
const current = await call("GET", `/celebrations/${celebration.id}`, { token: host.accessToken });
await call("PUT", `/celebrations/${celebration.id}/settings`, { token: host.accessToken, headers: { "if-match": String(current.version) }, body: { giftReservationMode: "AUTO_ACCEPT", unregisteredRsvpMode: "AUTO_ACCEPT", extraCompanionMode: "RESTRICTED", externalGiftMode: "RESTRICTED", partnerPriorityEnabled: true } }).catch((e) => console.error(`settings: ${e.message}`));
const check = await call("GET", `/celebrations/${celebration.id}/publish-check`, { token: host.accessToken });
let published = check.ready;
if (check.ready) await call("POST", `/celebrations/${celebration.id}/publish`, { token: host.accessToken, headers: { "if-match": String(check.version) } });
await call("POST", `/gifts/celebrations/${celebration.id}/gift-list`, { token: host.accessToken }).catch((e) => console.error(`gift-list: ${e.message}`));
const giftItems = [];
for (const [index, listing] of listings.entries()) {
  giftItems.push(await call("POST", `/gifts/celebrations/${celebration.id}/items`, { token: host.accessToken, body: { source: "CATALOGED", title: listing.title ?? ["Torta de bodas", "Mesa de dulces", "Catering para 100 invitados"][index], price: { amountMinor: [45000, 30000, 900000][index], currency: "BOB" }, productListingId: listing.id } }));
}
// External gift: first call answers 409 PARTNER_CATALOG_FIRST with suggestions; resend acknowledging them (RESTRICTED mode makes it PROPOSED).
await call("POST", `/gifts/celebrations/${celebration.id}/items`, { token: host.accessToken, body: { source: "EXTERNAL", title: "Licuadora", price: { amountMinor: 20000, currency: "BOB" }, url: "https://tienda.example/licuadora", partnerSuggestionsAcknowledged: true } }).catch((e) => console.error(`external: ${e.message}`));
const viewer = await register("HOST", "f22viewer");
// Gift List only answers members of the celebration (404 for anyone else), so the stand-in guest credential is a VIEWER collaborator's JWT.
const viewerClaims = JSON.parse(Buffer.from(viewer.accessToken.split(".")[1], "base64url").toString());
const latest = await call("GET", `/celebrations/${celebration.id}`, { token: host.accessToken });
await call("PUT", `/celebrations/${celebration.id}/collaborators/${viewerClaims.sub}`, { token: host.accessToken, headers: { "if-match": String(latest.version) }, body: { role: "VIEWER" } });
const guest = await call("POST", `/guests/celebrations/${celebration.id}/guests`, { token: host.accessToken, body: { name: "Marta Invitada", email: `marta.${stamp}@example.com` } });
const issued = await call("POST", `/guests/celebrations/${celebration.id}/guests/${guest.id}/access-token`, { token: host.accessToken, body: {} });

console.log(JSON.stringify({ stamp, password: PASSWORD, host: { email: host.email, token: host.accessToken }, provider: { email: provider.email, token: provider.accessToken, id: providerRow.id, slug: providerRow.slug }, listings: listings.map((l) => ({ id: l.id, title: l.title })), celebration: { id: celebration.id, slug, published, missing: check.missingFields }, guest: { id: guest.id, issued }, viewer: { email: viewer.email }, giftItems: giftItems.map((g) => g.id) }, null, 2));

function nextMonthDay(day) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day));
  return date.toISOString().slice(0, 10);
}
