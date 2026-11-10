#!/usr/bin/env node
// Poblador de datos de demostracion (Bolivia). Solo HTTP por el gateway; idempotente y re-ejecutable.
//   node apps/universal/scripts/seed/demo.mjs                 # familia "dbo" (reutiliza lo existente)
//   SEED_FAMILY=otra node apps/universal/scripts/seed/demo.mjs   # otra familia, sin colisiones
// Ver docs/runbooks/datos-demo.md. No imprime tokens; .last-run.json guarda ids (sin tokens).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { account, call, must, idem, claims, listAll, log, sleep, dateOffset, dayOffset, callStats, API } from "./lib.mjs";
import { PASSWORD, weddingFamilies, WEDDING, PROVIDERS, GIFTS_EXTERNAL, DIETS, MESSAGES } from "./data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FAMILY = process.env.SEED_FAMILY ?? "dbo";
const mail = (name) => `${FAMILY}.${name}@example.com`;
const started = Date.now();
const out = { family: FAMILY, api: API, startedAt: new Date().toISOString(), accounts: {}, notes: [] };
const note = (text) => { out.notes.push(text); log("  !", text); };
const phase = (name) => log(`\n== ${name} (${Math.round((Date.now() - started) / 1000)} s)`);
const safe = async (label, fn) => { try { return await fn(); } catch (error) { note(`${label}: ${error.message}`); return undefined; } };

// ---------------------------------------------------------------- cuentas
phase("Cuentas");
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.test";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Correct-horse-9battery";
const admin = await account(adminEmail, adminPassword, "HOST");
if (!admin.roles.includes("ADMIN")) throw new Error(`${adminEmail} no es ADMIN: arranca Identity con IDENTITY_BOOTSTRAP_ADMIN_EMAIL=${adminEmail} (ver README del servicio).`);
const hostWedding = await account(mail("anfitrion.boda"), PASSWORD, "HOST");
const hostDraft = await account(mail("anfitrion.borrador"), PASSWORD, "HOST");
const hostArchived = await account(mail("anfitrion.archivada"), PASSWORD, "HOST");
const viewer = await account(mail("colaborador.lector"), PASSWORD, "HOST");
const planner = await account(mail("planificadora"), PASSWORD, "PLANNER");
const visitors = [];
for (const n of [1, 2, 3]) visitors.push(await account(mail(`visitante${n}`), PASSWORD, "HOST"));
const providerAccounts = {};
for (const [i, p] of PROVIDERS.entries()) providerAccounts[p.key] = await account(mail(`proveedor${String(i + 1).padStart(2, "0")}`), PASSWORD, "PROVIDER");
out.accounts = { admin: adminEmail, hostWedding: hostWedding.email, hostDraft: hostDraft.email, hostArchived: hostArchived.email, viewer: viewer.email, planner: planner.email, visitors: visitors.map((v) => v.email), providers: Object.fromEntries(PROVIDERS.map((p) => [p.key, providerAccounts[p.key].email])), password: PASSWORD };
log(`  ${Object.keys(providerAccounts).length + 8} cuentas listas`);

// ---------------------------------------------------------------- admin: catalogos
phase("Admin: categorias, ciudades, tipos de evento");
await safe("categoria PASTRY", () => must("PUT", "/providers/admin/categories/PASTRY", { token: admin.token, body: { names: { "es-BO": "Pastelería", "en-US": "Pastry" }, active: true } }));
await safe("geo yacuiba", () => must("PUT", "/providers/admin/geography/yacuiba", { token: admin.token, body: { kind: "CITY", parentCode: "TJ", names: { "es-BO": "Yacuiba", "en-US": "Yacuiba" }, active: true, latitude: -22.0153, longitude: -63.6775 } }));
await safe("tipo de evento PRIMERA_COMUNION", () => must("PUT", "/celebrations/admin/event-types/PRIMERA_COMUNION", { token: admin.token, body: { status: "ACTIVE", defaultLocale: "es-BO", hostRoles: ["CELEBRANT"], enabledSections: ["story", "schedule", "venues", "faq", "gifts", "rsvp"], requiredFieldsForPublish: ["title", "eventDate", "venueName", "hosts.CELEBRANT"], compatibleTemplateTags: ["religious"], translations: [{ locale: "es-BO", name: "Primera comunión", description: "Celebración de la primera comunión y almuerzo familiar.", hostRoleLabels: { CELEBRANT: "Comulgante" } }, { locale: "en-US", name: "First communion", hostRoleLabels: { CELEBRANT: "Communicant" } }] } }));

// ---------------------------------------------------------------- celebraciones
const celebrationsOf = async (host) => (await must("GET", "/celebrations", { token: host.token })).items ?? [];
async function ensureCelebration(host, slug, eventTypeCode, content, extra = {}) {
  const found = (await celebrationsOf(host)).find((c) => c.slug === slug);
  if (found) return { celebration: found, created: false };
  const celebration = await must("POST", "/celebrations", { token: host.token, headers: idem(), body: { slug, eventTypeCode, content, ...extra } });
  return { celebration, created: true };
}
const getCelebration = (host, id) => must("GET", `/celebrations/${id}`, { token: host.token });
async function patchContent(host, id, content, translations) {
  const current = await getCelebration(host, id);
  return must("PATCH", `/celebrations/${id}`, { token: host.token, headers: { "if-match": String(current.version) }, body: { content, ...(translations ? { translations } : {}) } });
}
async function publish(host, id) {
  const check = await must("GET", `/celebrations/${id}/publish-check`, { token: host.token });
  if (!check.ready) { note(`publicar ${id}: faltan ${JSON.stringify(check.missingFields)}`); return false; }
  const current = await getCelebration(host, id);
  if (current.status === "PUBLISHED") return true;
  await must("POST", `/celebrations/${id}/publish`, { token: host.token, headers: { "if-match": String(check.version ?? current.version) } });
  return true;
}

phase("Celebracion A: borrador casi vacia");
const draft = await ensureCelebration(hostDraft, `${FAMILY}-cumple-wara-borrador`, "BIRTHDAY", { title: "Cumpleaños de Wara" });
out.draft = { id: draft.celebration.id, slug: draft.celebration.slug, status: draft.celebration.status };

phase("Celebracion B: boda publicada");
const wedSlug = `${FAMILY}-boda-flores-choque`;
const eventDate = dayOffset(75, 18);
const wed = await ensureCelebration(hostWedding, wedSlug, "WEDDING", { title: WEDDING.title, eventDate, venueName: WEDDING.venueName, hosts: WEDDING.hosts });
const wedId = wed.celebration.id;
if (!wed.celebration.content?.story) {
  const schedule = [["Ceremonia religiosa", "Parroquia San Miguel, Calacoto", 0, "18:00"], ["Recibimiento con salteñas y api", "Jardín del salón", 0, "19:30"], ["Cena y brindis", "Salón Los Cedros", 0, "20:30"], ["Baile de los novios y cueca", "Pista principal", 0, "22:00"], ["Fiesta con DJ", "Hasta que el cuerpo aguante", 0, "23:00"]]
    .map(([title, description, , time], i) => ({ id: `item-${i}`, title, description, startsAt: `${eventDate.slice(0, 10)}T${time}` }));
  await safe("idiomas de la boda", async () => { const cur = await getCelebration(hostWedding, wedId); return must("PATCH", `/celebrations/${wedId}`, { token: hostWedding.token, headers: { "if-match": String(cur.version) }, body: { supportedLocales: ["es-BO", "en-US"] } }); });
  await patchContent(hostWedding, wedId, { subtitle: WEDDING.subtitle, story: WEDDING.story, dressCode: WEDDING.dressCode, venues: WEDDING.venues, faq: WEDDING.faq, recommendations: WEDDING.recommendations, schedule },
    { "en-US": { title: "Lucía Flores & Daniel Choque", subtitle: "We are getting married and want to celebrate with you", story: "We met at a book fair in La Paz in 2016 and have been inseparable since." } });
  await safe("ajustes de la boda", async () => { const cur = await getCelebration(hostWedding, wedId); return must("PUT", `/celebrations/${wedId}/settings`, { token: hostWedding.token, headers: { "if-match": String(cur.version) }, body: { giftReservationMode: "RESTRICTED", unregisteredRsvpMode: "RESTRICTED", extraCompanionMode: "RESTRICTED", externalGiftMode: "RESTRICTED", rsvpDeadline: dayOffset(55, 23), partnerPriorityEnabled: true } }); });
}
out.published = await publish(hostWedding, wedId);
out.wedding = { id: wedId, slug: wedSlug, eventDate };
await safe("colaborador VIEWER", async () => { const cur = await getCelebration(hostWedding, wedId); if ((cur.collaborators ?? []).some((c) => c.userId === viewer.userId)) return; return must("PUT", `/celebrations/${wedId}/collaborators/${viewer.userId}`, { token: hostWedding.token, headers: { "if-match": String(cur.version) }, body: { role: "VIEWER" } }); });

phase("Celebracion C: archivada");
const arch = await ensureCelebration(hostArchived, `${FAMILY}-quince-ximena-archivada`, "QUINCEANERA", { title: "Los quince de Ximena", eventDate: dayOffset(30, 19), venueName: "Salón Kantuta, Cochabamba", hosts: { CELEBRANT: "Ximena Rojas Apaza" } });
if (!arch.celebration.content?.story) await patchContent(hostArchived, arch.celebration.id, { story: "Una noche de vals, familia y torta de tres leches." });
await safe("publicar y archivar", async () => {
  if ((await getCelebration(hostArchived, arch.celebration.id)).status === "DRAFT") await publish(hostArchived, arch.celebration.id);
  const cur = await getCelebration(hostArchived, arch.celebration.id);
  if (cur.status !== "ARCHIVED") await must("POST", `/celebrations/${arch.celebration.id}/archive`, { token: hostArchived.token, headers: { "if-match": String(cur.version) } });
});
out.archived = { id: arch.celebration.id, slug: arch.celebration.slug };

// ---------------------------------------------------------------- proveedores
phase("Proveedores (10)");
const providers = {};
const listingsOf = {};
for (const p of PROVIDERS) {
  const acct = providerAccounts[p.key];
  const mine = (await must("GET", "/providers/mine", { token: acct.token })).items ?? [];
  let row = mine.find((m) => m.name === p.name);
  if (!row) row = await must("POST", "/providers", { token: acct.token, body: { name: p.name } });
  if (row.plan !== p.plan) await safe(`plan ${p.key}`, () => must("PATCH", `/providers/${row.id}`, { token: admin.token, body: { plan: p.plan } }));
  providers[p.key] = row;
  const existing = (await must("GET", `/providers/${row.id}/listings`, { token: acct.token })).items ?? [];
  listingsOf[p.key] = existing;
  const fulfillment = { responsible: p.category === "VENUE" ? "CUSTOMER" : "PROVIDER", coverageZones: [p.city, "la-paz"], transportCostMinor: 5000 + (p.key.length % 5) * 2500, leadTimeDays: 3 + (p.key.length % 10), conditions: { "es-BO": "Reservas con 30% de anticipo; el saldo se paga el día del evento. Cancelaciones con 7 días de aviso.", "en-US": "Reservations require a 30% deposit; the balance is due on the day. Cancel 7 days ahead." } };
  const slugPhone = `+5917000${String(2000 + PROVIDERS.indexOf(p)).padStart(4, "0")}`;
  for (const [type, title, price, desc] of p.listings) {
    if (existing.some((l) => (l.title ?? l.titles?.["es-BO"]) === title)) continue;
    const created = await must("POST", `/providers/${row.id}/listings`, { token: acct.token, body: { type, category: p.category, city: p.city, titles: { "es-BO": title, "en-US": title }, descriptions: { "es-BO": desc }, destinations: { WHATSAPP: `https://wa.me/${slugPhone.slice(1)}`, OFFICIAL_SITE: `https://example.com/${p.key}`, INSTAGRAM: `https://instagram.example.com/${p.key}` }, fulfillment, priceFromMinor: price } });
    existing.push(created); listingsOf[p.key] = existing;
    if (p.state !== "DRAFT" || p.key === "maquillaje") await safe(`publicar ${title}`, () => must("POST", `/providers/${row.id}/listings/${created.id}/publish`, { token: acct.token }));
  }
  if (!existing.length) note(`${p.name}: sin ofertas`);
  const current = await must("GET", `/providers/${row.id}`, { token: acct.token });
  if (current.status === "DRAFT") {
    await safe(`config ${p.key}`, async () => {
      await must("PUT", `/providers/${row.id}/availability`, { token: acct.token, body: { capacityPerDay: p.key === "foto" ? 1 : 2, rules: [{ weekdays: [1, 2, 3, 4, 5], start: "08:00", end: "18:00" }, { weekdays: [5, 6, 0], start: "10:00", end: "23:00" }], blackouts: [{ start: dateOffset(40), end: dateOffset(42), reason: "Vacaciones del equipo" }, { start: dateOffset(95), reason: "Feriado" }] } });
      await must("PUT", `/providers/${row.id}/lead-config`, { token: acct.token, body: { enabledDestinations: ["WHATSAPP", "OFFICIAL_SITE", "INSTAGRAM"], utmSource: "dOne", utmMedium: "directory", utmCampaign: `demo-${p.key}`, dedupeMinutes: 30, monthlyCap: 200, billingModel: "CPC" } });
      if (p.about) await must("PUT", `/providers/${row.id}/microsite`, { token: acct.token, body: { descriptions: { "es-BO": p.about, "en-US": p.about }, hours: { weekly: [{ weekdays: [1, 2, 3, 4, 5], opens: "09:00", closes: "18:00" }, { weekdays: [6], opens: "10:00", closes: "14:00" }], note: "Atendemos por WhatsApp fuera de horario." }, social: { website: `https://example.com/${p.key}`, instagram: `https://instagram.example.com/${p.key}`, whatsapp: slugPhone }, ...(p.address ? { address: p.address } : {}) } });
    });
    if (p.state !== "DRAFT") await safe(`enviar ${p.key}`, () => must("POST", `/providers/${row.id}/submit`, { token: acct.token }));
  }
}
phase("Admin: verificacion");
for (const p of PROVIDERS) {
  const row = providers[p.key];
  const cur = await must("GET", `/providers/${row.id}`, { token: providerAccounts[p.key].token });
  if (p.state === "VERIFIED" && cur.status === "PENDING_VERIFICATION") await safe(`verificar ${p.key}`, () => must("POST", `/providers/${row.id}/verify`, { token: admin.token }));
  if (p.state === "REJECTED" && cur.status === "PENDING_VERIFICATION") await safe(`rechazar ${p.key}`, () => must("POST", `/providers/${row.id}/reject`, { token: admin.token, body: { reason: p.reason } }));
  if (p.state === "SUSPENDED") {
    if (cur.status === "PENDING_VERIFICATION") await safe(`verificar ${p.key}`, () => must("POST", `/providers/${row.id}/verify`, { token: admin.token }));
    const again = await must("GET", `/providers/${row.id}`, { token: providerAccounts[p.key].token });
    if (again.status === "VERIFIED") await safe(`suspender ${p.key}`, () => must("POST", `/providers/${row.id}/suspend`, { token: admin.token, body: { reason: p.reason } }));
  }
  providers[p.key].status = (await must("GET", `/providers/${row.id}`, { token: providerAccounts[p.key].token })).status;
}
out.providers = Object.fromEntries(PROVIDERS.map((p) => [p.key, { id: providers[p.key].id, slug: providers[p.key].slug, status: providers[p.key].status, listings: listingsOf[p.key].map((l) => l.id) }]));
log("  estados: " + PROVIDERS.map((p) => `${p.key}=${providers[p.key].status}`).join(" "));

// ---------------------------------------------------------------- leads, clics, metricas, reservas de fecha
phase("Leads, clics y reservas de fecha");
const verified = PROVIDERS.filter((p) => providers[p.key].status === "VERIFIED");
for (const [i, p] of verified.entries()) {
  const row = providers[p.key];
  const leads = (await must("GET", `/providers/${row.id}/leads?limit=100`, { token: providerAccounts[p.key].token })).items ?? [];
  const hasForm = leads.some((l) => l.kind === "FORM"), hasClicks = leads.some((l) => l.kind !== "FORM"); // idempotencia: ya sembrado
  const names = ["Camila Vargas Rojas", "Roberto Mamani Quispe", "Fabiola Choque", "Iván Villca Salazar", "Sandra Poma"];
  const count = 3 + (i % 3);
  for (let n = 0; n < (hasForm ? 0 : count); n += 1) {
    const asVisitor = visitors[n % visitors.length];
    const listing = listingsOf[p.key][n % listingsOf[p.key].length];
    const anon = process.env.SEED_ANON_QUOTE === "1" && n === 0 && i === 0; // la cotizacion anonima tiene tope por hora por IP (Retry-After ~50 min): opt-in
    await safe(`cotizacion ${p.key}`, () => must("POST", `/providers/${row.id}/quotes`, { token: anon ? undefined : asVisitor.token, body: { listingIds: [listing.id], eventDate: dateOffset(60 + n * 9 + i), guestCount: 40 + n * 25, budgetMinor: 500000 + n * 300000, eventCity: "la-paz", contact: { name: names[n % names.length], email: `cotiza.${FAMILY}.${p.key}.${n}@example.com`, phone: `+5917000${String(3000 + i * 10 + n)}` }, message: ["Hola, quisiera saber si tienen disponibilidad y cuánto sale con todo incluido.", "¿Hacen descuento para más de 100 personas?", "Necesito una cotización para el sábado, por favor. Gracias.", "Buenas tardes, ¿atienden en El Alto?", "Queremos ver el lugar antes de reservar, ¿cuándo se puede?"][n % 5], locale: "es-BO" } }));
    await sleep(300);
  }
  for (let n = 0; n < (hasClicks ? 0 : 4); n += 1) { // clics REDIRECT con sesiones distintas (el dedupe cuenta por sesion y destino)
    const listing = listingsOf[p.key][n % listingsOf[p.key].length];
    await safe(`clic ${p.key}`, () => call("GET", `/r/${listing.id}?destination=${["WHATSAPP", "OFFICIAL_SITE", "INSTAGRAM"][n % 3]}&sessionId=${FAMILY}-${p.key}-s${n}&surface=${["SEARCH", "PUBLIC_SITE", "GIFT_LIST", "SEARCH"][n]}`, { redirect: "manual", retries: 1 }));
  }
  if (!hasClicks) await safe(`impresiones ${p.key}`, () => call("POST", "/providers/impressions", { token: visitors[0].token, body: { listingIds: listingsOf[p.key].map((l) => l.id), surface: "SEARCH" } }));
}
// Reservas de fecha: el anfitrion de la boda pide fecha; el proveedor confirma, rechaza o cancela; unas quedan pendientes.
const bookingPlan = [["salon", 75, "confirm"], ["catering", 75, "confirm"], ["foto", 75, "pending"], ["pasteleria", 74, "reject"], ["musica", 75, "cancel"], ["planner", 76, "pending"], ["foto", 78, "pending"]];
const bookingsOut = [];
for (const [key, days, action] of bookingPlan) {
  const p = providers[key]; if (!p || p.status !== "VERIFIED") continue;
  const existing = (await must("GET", `/providers/${p.id}/bookings`, { token: providerAccounts[key].token })).items ?? [];
  const date = dateOffset(days);
  if (existing.some((b) => (b.startsAt ?? b.date ?? "").startsWith(date))) continue;
  const booking = await safe(`reserva ${key}`, () => must("POST", `/providers/${p.id}/bookings`, { token: hostWedding.token, body: { date, time: "12:00", listingId: listingsOf[key][0].id } }));
  if (!booking) continue;
  if (action !== "pending") await safe(`${action} ${key}`, () => must("POST", `/providers/${p.id}/bookings/${booking.id}/${action === "cancel" ? "confirm" : action}`, { token: providerAccounts[key].token }));
  if (action === "cancel") await safe(`cancelar ${key}`, () => must("POST", `/providers/${p.id}/bookings/${booking.id}/cancel`, { token: providerAccounts[key].token }));
  bookingsOut.push({ provider: key, id: booking.id, plan: action });
}
out.bookings = bookingsOut;

// ---------------------------------------------------------------- moderacion
phase("Admin: cola de moderacion");
const queue = (await must("GET", "/providers/admin/moderation?status=PENDING", { token: admin.token })).items ?? [];
log(`  ${queue.length} pendientes; se deciden las del proveedor demo para dejar variedad`);
const demoUsers = new Set(Object.values(providerAccounts).map((a) => a.userId));
const mine = queue.filter((q) => demoUsers.has(q.submittedBy));
const decidedBefore = ((await call("GET", "/providers/admin/moderation?status=APPROVED", { token: admin.token })).body?.items ?? []).some((q) => demoUsers.has(q.submittedBy)) || ((await call("GET", "/providers/admin/moderation?status=REJECTED", { token: admin.token })).body?.items ?? []).some((q) => demoUsers.has(q.submittedBy));
for (const [i, item] of (decidedBefore ? [] : mine.slice(0, 4)).entries()) {
  if (i === 0) await safe("aprobar moderacion", () => must("POST", `/providers/admin/moderation/${item.id}/approve`, { token: admin.token, body: {} }));
  if (i === 1) await safe("rechazar moderacion", () => must("POST", `/providers/admin/moderation/${item.id}/reject`, { token: admin.token, body: { reason: "El enlace no abre; sube uno vigente." } }));
}

// ---------------------------------------------------------------- invitados
phase("Invitados de la boda (~60)");
const G = `/guests/celebrations/${wedId}`;
await safe("ajustes de invitados", () => must("PUT", `${G}/guest-settings`, { token: hostWedding.token, body: { defaultAllowedCompanions: 1 } }));
const groupRows = (await must("GET", `${G}/groups`, { token: hostWedding.token })).items ?? [];
const groupId = new Map(groupRows.map((g) => [g.name, g.id]));
const guestRows = await listAll(`${G}/guests`, hostWedding.token, 100);
const guestId = new Map(guestRows.map((g) => [g.name, g.id]));
const families = weddingFamilies();
let created = 0;
for (const fam of families) {
  const famName = fam.group.slice(0, 200);
  if (!groupId.has(famName)) groupId.set(famName, (await must("POST", `${G}/groups`, { token: hostWedding.token, headers: idem(), body: { name: famName } })).id);
  for (const m of fam.members) {
    if (guestId.has(m.name)) continue;
    const g = await must("POST", `${G}/guests`, { token: hostWedding.token, headers: idem(), body: { name: m.name, ...m.contact, allowedCompanions: m.allowedCompanions, groupId: groupId.get(famName), locale: "es-BO" } });
    guestId.set(m.name, g.id); created += 1;
  }
}
log(`  grupos: ${groupId.size}; invitados nuevos: ${created}; total: ${guestId.size}`);

phase("Respuestas RSVP (con tope de Kong: ~25/min)");
const all = families.flatMap((f) => f.members.map((m) => ({ ...m, id: guestId.get(m.name) })));
const rsvps = await must("GET", `/guests/celebrations/${wedId}/rsvps?limit=200`, { token: hostWedding.token }).catch(() => ({ items: [] }));
const answered = new Set((rsvps.items ?? []).map((r) => r.guestId));
const credentials = new Map();
const tokenFor = async (guest) => {
  if (credentials.has(guest.id)) return credentials.get(guest.id);
  const issued = await must("POST", `${G}/guests/${guest.id}/access-token`, { token: hostWedding.token, body: {} });
  credentials.set(guest.id, issued.token);
  return issued.token;
};
const CYCLE = "CNCDNCNCDNC"; // por cada 11 invitados: 5 confirman, 2 no asisten, 4 no responden (~27/11/22 de 60)
const finalPlan = all.map((_, i) => ({ C: "CONFIRMED", D: "DECLINED", N: "NONE" })[CYCLE[i % CYCLE.length]]);
let sent = 0;
for (const [i, g] of all.entries()) {
  const status = finalPlan[i];
  if (status === "NONE" || answered.has(g.id)) continue;
  const credential = await tokenFor(g);
  const wants = status === "CONFIRMED" ? (i % 9 === 0 ? g.allowedCompanions + 1 : Math.min(g.allowedCompanions, i % 3)) : 0;
  const body = status === "CONFIRMED"
    ? { status, requestedCompanions: wants, dietaryNotes: i % 3 === 0 ? DIETS[i % DIETS.length] : null, message: i % 4 === 0 ? MESSAGES[i % 5] : null }
    : { status, requestedCompanions: 0, dietaryNotes: null, message: i % 3 === 0 ? MESSAGES[5] : null };
  const r = await call("POST", `/rsvp/celebrations/${wedId}/rsvp`, { token: credential, headers: idem(), body });
  if (r.status >= 300) note(`rsvp ${g.name}: ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`); else sent += 1;
}
log(`  respuestas enviadas: ${sent}`);

phase("Solicitudes de acompañante y registro sin invitacion");
const requests = (await must("GET", `${G}/companion-requests`, { token: hostWedding.token })).items ?? [];
log(`  solicitudes: ${requests.length} (${[...new Set(requests.map((r) => r.status))].join(",")})`);
const pending = sent > 0 ? requests.filter((r) => r.status === "PENDING_REVIEW") : []; // la lista solo trae las abiertas: se decide solo en la corrida que acaba de crear las respuestas
for (const [i, r] of pending.entries()) {
  if (i === 0) await safe("aprobar acompañante", () => must("POST", `${G}/companion-requests/${r.id}/decision`, { token: hostWedding.token, body: { decision: "APPROVED" } }));
  if (i === 1) await safe("rechazar acompañante", () => must("POST", `${G}/companion-requests/${r.id}/decision`, { token: hostWedding.token, body: { decision: "REJECTED" } }));
}
await safe("registro publico", async () => { const cur = await getCelebration(hostWedding, wedId); if (cur.settings.unregisteredRsvpMode === "AUTO_ACCEPT") return; return must("PUT", `/celebrations/${wedId}/settings`, { token: hostWedding.token, headers: { "if-match": String(cur.version) }, body: { unregisteredRsvpMode: "AUTO_ACCEPT" } }); });
const publicGuests = [["Rubén Apaza Limachi", "ruben.apaza"], ["Doña Hilda Torrez Cruz", "hilda.torrez"], ["Pamela Aguilar", "pamela.aguilar"]];
for (const [name, local] of publicGuests) {
  if (guestId.has(name)) continue;
  const r = await call("POST", `/rsvp/celebrations/${wedId}/unregistered`, { headers: idem(), body: { name, email: `${FAMILY}.${local}@example.com`, locale: "es-BO", consent: true, requestedCompanions: 1, dietaryNotes: null, message: "Me enteré por el enlace que compartió un primo; ¿puedo asistir?" } });
  if (r.status >= 300) note(`registro sin invitacion ${name}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`); else guestId.set(name, r.body?.guestId ?? r.body?.id ?? "unregistered");
}

// ---------------------------------------------------------------- regalos
phase("Regalos");
const GF = `/gifts/celebrations/${wedId}`;
await call("POST", `${GF}/gift-list`, { token: hostWedding.token });
await safe("visibilidad de regalos", () => must("PUT", `${GF}/gift-settings`, { token: hostWedding.token, body: { showRequesterToHost: true, showRequesterToGuests: false } }));
const giftItems = async () => (await must("GET", `${GF}/items`, { token: hostWedding.token })).items ?? [];
let items = await giftItems();
const have = (title) => items.find((i) => i.title === title);
const catalogPicks = [["pasteleria", 0], ["pasteleria", 1], ["catering", 2], ["foto", 1], ["salon", 2], ["musica", 0], ["planner", 2]];
for (const [key, idx] of catalogPicks) {
  const listing = listingsOf[key]?.[idx]; if (!listing || providers[key].status !== "VERIFIED") continue;
  const spec = PROVIDERS.find((p) => p.key === key).listings[idx];
  if (have(spec[1])) continue;
  await safe(`regalo catalogado ${spec[1]}`, () => must("POST", `${GF}/items`, { token: hostWedding.token, headers: idem(), body: { source: "CATALOGED", title: spec[1], description: spec[3], price: { amountMinor: spec[2], currency: "BOB" }, productListingId: listing.id } }));
}
for (const [title, price, url, decision] of GIFTS_EXTERNAL) {
  if (have(title)) continue;
  const body = { source: "EXTERNAL", title: title.slice(0, 200), price: { amountMinor: price, currency: "BOB" }, url, partnerSuggestionsAcknowledged: true };
  await safe(`regalo externo ${title.slice(0, 30)}`, () => must("POST", `${GF}/items`, { token: hostWedding.token, headers: idem(), body }));
}
items = await giftItems();
for (const [title, , , decision] of GIFTS_EXTERNAL) {
  const item = have(title.slice(0, 200)); if (!item || item.status !== "PROPOSED") continue;
  if (decision === "approved") await safe("aprobar regalo", () => must("POST", `${GF}/items/${item.id}/approve`, { token: hostWedding.token }));
  if (decision === "rejected") await safe("rechazar regalo", () => must("POST", `${GF}/items/${item.id}/reject`, { token: hostWedding.token, body: { reason: "No encaja con la lista" } }));
}
items = await giftItems();
const reservations0 = (await must("GET", `${GF}/reservations`, { token: hostWedding.token })).items ?? [];
if (reservations0.length === 0) {
  const available = items.filter((i) => i.status === "AVAILABLE");
  const reservers = all.filter((g, i) => finalPlan[i] === "CONFIRMED").slice(0, 8);
  for (const [i, g] of reservers.entries()) {
    const item = available[i % available.length]; if (!item) break;
    const credential = await tokenFor(g);
    await safe(`reservar regalo ${i}`, () => must("POST", `${GF}/items/${item.id}/reservations`, { token: credential, headers: idem(), body: { guestDisplayName: g.name.split(" ")[0], message: i % 2 ? "Con mucho cariño." : null } }));
  }
}
const reservations = (await must("GET", `${GF}/reservations`, { token: hostWedding.token })).items ?? [];
const pend = reservations0.length === 0 ? reservations.filter((r) => r.status === "PENDING_REVIEW") : []; // solo la primera vez
for (const [i, r] of pend.entries()) {
  if (i < 3) await safe("aprobar reserva", () => must("POST", `${GF}/reservations/${r.id}/approve`, { token: hostWedding.token }));
  else if (i === 3) await safe("rechazar reserva", () => must("POST", `${GF}/reservations/${r.id}/reject`, { token: hostWedding.token, body: { reason: "Ese regalo ya está cubierto" } }));
}

// ---------------------------------------------------------------- avisos, preferencias, planificadora
phase("Avisos, preferencias y planificadora");
await safe("preferencias", () => must("PATCH", `/notifications/celebrations/${wedId}/preferences`, { token: hostWedding.token, body: { channels: { EMAIL: true, SMS: false, WHATSAPP: true, PUSH: false }, quietHours: { start: 22, end: 7 } } }));
await safe("organizacion", async () => {
  const orgs = (await must("GET", "/identity/organizations", { token: planner.token })).items ?? [];
  const org = orgs.find((o) => o.name === `Ch'aska Eventos (${FAMILY})`) ?? await must("POST", "/identity/organizations", { token: planner.token, body: { name: `Ch'aska Eventos (${FAMILY})` } });
  await call("POST", `/identity/organizations/${org.id}/members`, { token: planner.token, body: { email: hostDraft.email, role: "HOST" } });
  out.organization = { id: org.id };
});
await sleep(6000); // ventana de consistencia del modelo de lectura (~5 s)

// ---------------------------------------------------------------- verificacion con GET
phase("Verificacion (GET)");
const summary = await must("GET", `${G}/guest-summary`, { token: hostWedding.token });
const groupsNow = (await must("GET", `${G}/groups`, { token: hostWedding.token })).items ?? [];
const gl = await must("GET", `${G}/guest-list?limit=1`, { token: hostWedding.token });
const itemsNow = await giftItems();
const resNow = (await must("GET", `${GF}/reservations`, { token: hostWedding.token })).items ?? [];
const count = (list, key) => list.reduce((m, x) => ({ ...m, [x[key]]: (m[x[key]] ?? 0) + 1 }), {});
const notif = await call("GET", `/notifications/celebrations/${wedId}/notifications`, { token: hostWedding.token });
out.counts = {
  guests: gl.total, groups: groupsNow.length, summary: { total: summary.total, confirmed: summary.confirmed, declined: summary.declined, pending: summary.pending, companions: summary.companions, openCompanionRequests: summary.openCompanionRequests },
  giftItemsByStatus: count(itemsNow, "status"), giftReservationsByStatus: count(resNow, "status"), notifications: notif.body?.items?.length ?? `HTTP ${notif.status}`,
  providersByStatus: count(Object.values(providers), "status")
};
const provCounts = {};
for (const p of PROVIDERS) {
  const row = providers[p.key], t = providerAccounts[p.key].token;
  const leads = await call("GET", `/providers/${row.id}/leads?limit=100`, { token: t });
  const bk = await call("GET", `/providers/${row.id}/bookings`, { token: t });
  const mt = await call("GET", `/providers/${row.id}/metrics`, { token: t });
  provCounts[p.key] = { status: row.status, listings: listingsOf[p.key].length, leads: leads.body?.items?.length ?? `HTTP ${leads.status}`, bookings: count(bk.body?.items ?? [], "status"), metrics: JSON.stringify(mt.body ?? {}).slice(0, 160) };
}
out.counts.providers = provCounts;
out.counts.moderation = { pending: ((await call("GET", "/providers/admin/moderation?status=PENDING", { token: admin.token })).body?.items ?? []).length, approved: ((await call("GET", "/providers/admin/moderation?status=APPROVED", { token: admin.token })).body?.items ?? []).length, rejected: ((await call("GET", "/providers/admin/moderation?status=REJECTED", { token: admin.token })).body?.items ?? []).length };
out.slowCalls = callStats.slow.slice(0, 20);
out.durationSeconds = Math.round((Date.now() - started) / 1000);
writeFileSync(join(here, ".last-run.json"), JSON.stringify(out, null, 2));
log("\n" + JSON.stringify(out.counts, null, 2));
if (callStats.limited) log(`  (${callStats.limited} llamadas omitidas por limite horario de Kong/servicio)`);
log(`\nListo en ${out.durationSeconds} s; ${callStats.calls} llamadas, ${callStats.retries} reintentos; ${out.notes.length} avisos.`);
