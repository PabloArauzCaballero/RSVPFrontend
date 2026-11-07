// Responsive + i18n + a11y sweep of the provider portal and platform admin: Chrome real, REAL backend (Kong), real login screen.
//   WORLD=<world.json> APP=http://localhost:3200 API=http://localhost:28000 CHROMIUM_PATH=".../Google Chrome" \
//     node apps/universal/scripts/live/responsive/provider-admin.mjs
// Env: WIDTHS=360,768,1280  LOCALES=es-BO,en-US  SCHEMES=light,dark  PHASES=sweep,flows  FLOW_WIDTHS=1280  OUT=<file.json>  DETAIL=1
// Sweep (every route x width x locale x scheme): (a) no pageerror / console.error / unexpected 4xx-5xx, (b) no horizontal scroll,
// (c) no raw i18n keys, no Spanish literals under en-US, (d) axe WCAG 2.0/2.1 A+AA without serious/critical, (e) touch targets >= 44 px at 360,
// (f) the theme under `dark` (portal and admin use a fixed LIGHT palette: reported, not asserted to flip).
// Flows (en-US, by testID, language independent): valid end-to-end writes verified with a direct GET + one network-error flow.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:3200";
const API = process.env.API ?? "http://localhost:28000";
const world = JSON.parse(readFileSync(process.env.WORLD ?? "", "utf8"));
const PASSWORD = world.password ?? "Passw0rd!Passw0rd-live";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Correct-horse-9battery";
const WIDTHS = (process.env.WIDTHS ?? "360,768,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES ?? "es-BO,en-US").split(",");
const SCHEMES = (process.env.SCHEMES ?? "light,dark").split(",");
const PHASES = (process.env.PHASES ?? "sweep,flows").split(",");
const FLOW_WIDTHS = (process.env.FLOW_WIDTHS ?? "1280").split(",").map(Number);
const DETAIL = process.env.DETAIL === "1";
const stamp = Date.now().toString(36);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function http(method, path, { token, body } = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    if (response.status === 429 && attempt < 3) { await sleep((Number(response.headers.get("retry-after")) || 5) * 1000 + 500); continue; }
    const text = await response.text(); let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    return { status: response.status, json };
  }
  throw new Error("unreachable");
}
const login = async (email, password = PASSWORD) => { const r = await http("POST", "/identity/auth/login", { body: { email, password } }); assert.equal(r.status, 200, `login ${email}: ${r.status}`); return r.json.accessToken; };
const register = async (label, role) => { const email = `r.${label}.${stamp}@example.com`; const r = await http("POST", "/identity/auth/register", { body: { email, password: PASSWORD, role } }); assert.equal(r.status, 201, `register ${email}: ${r.status}`); const token = await login(email); return { email, token, id: JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub }; };
const FUL = { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 1, conditions: { "es-BO": "Entrega en tu domicilio", "en-US": "Delivered to your door" } };
const LISTING = { type: "SERVICE", category: "DECORATION", city: "la-paz", destinations: { WHATSAPP: "https://wa.me/59170000000" } };
let adminAt = 0, adminJwt = "";
/** Admin JWT for direct calls: 15 min lifetime, refreshed after 10. */
const getAdminToken = async () => { if (Date.now() - adminAt > 10 * 60_000) { adminJwt = await login(ADMIN_EMAIL, ADMIN_PASSWORD); adminAt = Date.now(); } return adminJwt; };
assert.ok(JSON.parse(Buffer.from((await getAdminToken()).split(".")[1], "base64url").toString()).roles.includes("ADMIN"), `${ADMIN_EMAIL} must be ADMIN`);

async function newProvider(label, { verify, listings = 1 }) {
  const owner = await register(label, "PROVIDER");
  const created = await http("POST", "/providers", { token: owner.token, body: { name: `Dulce ${label} ${stamp}` } });
  assert.equal(created.status, 201);
  const providerId = created.json.id; const ids = [];
  for (let i = 0; i < listings; i += 1) { const l = await http("POST", `/providers/${providerId}/listings`, { token: owner.token, body: { ...LISTING, titles: { "es-BO": `Torta ${label} ${i}`, "en-US": `Cake ${label} ${i}` }, fulfillment: FUL, priceFromMinor: 15000 } }); assert.equal(l.status, 201); ids.push(l.json.id); }
  await http("PUT", `/providers/${providerId}/availability`, { token: owner.token, body: { capacityPerDay: 2, rules: [{ weekdays: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "20:00" }], blackouts: [] } });
  await http("POST", `/providers/${providerId}/submit`, { token: owner.token });
  if (verify) assert.equal((await http("POST", `/providers/${providerId}/verify`, { token: await getAdminToken() })).status, 200);
  return { owner, providerId, listings: ids };
}

// ---------- known, accepted failures (the stack in this world has no media / object storage) ----------
const knownBad = (status, url) => (status === 401 && /\/auth\/refresh/.test(url)) || ([502, 503].includes(status) && /template|media|document|storage|download/i.test(url));

const NAMESPACES = ["portal", "admin", "partner", "quote", "directory", "search", "host", "common", "auth", "errors", "gifts", "guests", "nav"];
const RAW_KEY = new RegExp(`(?<![\\w@./-])(?:${NAMESPACES.join("|")})\\.[a-z][A-Za-z0-9]*(?:\\.[A-Za-z0-9]+)*(?![\\w@-])`, "g");
// Spanish-only words that must not survive under en-US (whole words; English homographs such as "Agenda" or "Total" are left out).
const SPANISH = /\b(Guardar|Guardado|Guardada|Guardados|Cancelar|Cargando|Verificar|Verificado|Verificada|Reintentar|Editar|Eliminar|Crear|Publicar|Publicado|Rechazar|Rechazado|Suspender|Aprobar|Siguiente|Anterior|Buscar|Nombre|Ciudad|Precio|Servicios|Entrega|Destinos|Perfil|Documentos|Métricas|Resumen|Oferta|Ofertas|Aplicar|Confirmar|Volver|Cerrar|Proveedor|Proveedores|Usuarios|Categorías|Moderación|Operación|Organizaciones|Pendiente|Pendientes|Desde|Hasta|Reservas|Cotizaciones|Contacto|Mensaje|Teléfono|Correo|Contraseña|Iniciar|Salir|Agregar|Quitar|Fecha|Motivo|Estado|Descripción|Cobertura|Zona|Plazo|Condiciones|Opcional|Obligatorio|Reintento|Intenta|conexión|servidor)\b/;

// Names that the buttons matrix wrote into the shared database (user data, not interface copy).
const SEEDED_DATA = /Ciudad (?:mw\w+|prueba)|Entrega en (?:tu domicilio|el sal[oó]n)|Torta de bodas|Mesa de dulces|Catering para 100 invitados/g;
const rows = [];
const record = (row) => { rows.push(row); const tag = row.status === "PASS" ? "PASS" : "FAIL"; if (row.status !== "PASS" || DETAIL) console.log(`  ${tag} ${row.key} | ${row.check} | ${row.route} | ${row.evidence}`); };

const PORTAL_ROUTES = ["/portal", "/portal/alta", "/portal/servicios", "/portal/productos", "/portal/entrega", "/portal/destinos", "/portal/agenda", "/portal/leads", "/portal/metricas", "/portal/perfil", "/portal/documentos"];
const ADMIN_ROUTES = ["/admin", "/admin/verificacion", "/admin/moderacion", "/admin/usuarios", "/admin/organizaciones", "/admin/categorias", "/admin/geografia", "/admin/tipos-evento", "/admin/templates", "/admin/metricas", "/admin/operacion", "/panel"];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });

async function open({ width, locale, scheme }, email, password = PASSWORD) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale, colorScheme: scheme });
  context.setDefaultTimeout(25000);
  const page = await context.newPage();
  const sink = { errors: [], bad: [] };
  page.on("pageerror", (error) => sink.errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) sink.errors.push(`console.error: ${message.text().slice(0, 200)}`); });
  page.on("response", (response) => { if (response.status() >= 400 && !knownBad(response.status(), response.url())) sink.bad.push(`${response.status()} ${response.request().method()} ${response.url().replace(API, "")}`); });
  await page.goto(`${APP}/login`);
  await page.getByTestId("login-email").filter({ visible: true }).first().fill(email);
  await page.getByTestId("login-password").filter({ visible: true }).first().fill(password);
  await page.getByTestId("login-submit").filter({ visible: true }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
  return { page, context, sink };
}

const SMALL_TARGETS = () => {
  const out = []; let total = 0;
  for (const el of document.querySelectorAll('button, [role="button"], [role="tab"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], a[href], input[type="checkbox"], input[type="radio"]')) {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || s.visibility === "hidden" || s.display === "none") continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.tagName === "A" && el.closest("p, li") && s.display === "inline") continue; // inline text links are exempt (WCAG 2.5.8)
    total += 1;
    if (r.height < 43.5) out.push(`${(el.getAttribute("data-testid") || el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40)} ${Math.round(r.width)}x${Math.round(r.height * 10) / 10}`);
  }
  return { total, small: out };
};

async function sweepRoute(ctx, route, key, flags) {
  const { page, sink } = ctx; const { width, locale, scheme } = flags;
  sink.errors.length = 0; sink.bad.length = 0;
  const fail = (check, evidence) => record({ key: `${key} ${route}`, width, locale, scheme, route, check, status: "FAIL", evidence });
  const pass = (check, evidence = "") => record({ key: `${key} ${route}`, width, locale, scheme, route, check, status: "PASS", evidence });
  try {
    await page.goto(`${APP}${route}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForFunction(() => document.body.innerText.trim().length > 40, null, { timeout: 25000 }).catch(() => undefined);
    await sleep(800);
    const body = await page.evaluate(() => document.body.innerText);
    if (sink.errors.length || sink.bad.length) fail("a-load", [...sink.errors, ...sink.bad].slice(0, 4).join(" || ")); else pass("a-load");
    if (body.trim().length <= 40) fail("a-blank", "blank screen");
    const overflow = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, inner: window.innerWidth }));
    if (Math.max(overflow.doc, overflow.body) > overflow.inner + 1) fail("b-hscroll", `scrollWidth ${overflow.doc}/${overflow.body} > ${overflow.inner}`); else pass("b-hscroll");
    const raw = [...new Set(body.match(RAW_KEY) ?? [])];
    if (raw.length) fail("c-rawkeys", raw.slice(0, 5).join(", ")); else pass("c-rawkeys");
    if (locale === "en-US") {
      const hits = [...new Set((body.replace(SEEDED_DATA, "").match(new RegExp(SPANISH.source, "g")) ?? []))];
      if (hits.length) fail("c-spanish-in-en", `${hits.slice(0, 8).join(", ")} | ${body.replace(/\s+/g, " ").slice(0, 0)}`); else pass("c-spanish-in-en");
    }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (bad.length) fail("d-axe", bad.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")} :: ${v.nodes[0]?.html.slice(0, 110)}`).join(" || ")); else pass("d-axe", `${axe.violations.length} minor/moderate`);
    if (width <= 360) {
      const { total, small } = await page.evaluate(SMALL_TARGETS);
      if (small.length) fail("e-touch44", `${small.length}/${total}: ${small.slice(0, 5).join(" | ")}`); else pass("e-touch44", `${total} targets`);
    }
    if (scheme === "dark") {
      const bg = await page.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor; const el = document.elementFromPoint(Math.min(40, innerWidth / 2), Math.min(300, innerHeight / 2)); return { body: c, probe: el ? getComputedStyle(el).backgroundColor : "" }; });
      record({ key: `${key} ${route}`, width, locale, scheme, route, check: "f-theme", status: "PASS", evidence: `fondo ${bg.probe || bg.body} (paleta clara fija: no sigue el esquema)` });
    }
  } catch (error) { fail("sweep-exception", String(error?.message ?? error).split("\n")[0].slice(0, 200)); }
}

// ---------------------------------------------------------------------------------------------------------------------
const wp = { owner: { email: world.provider.email }, providerId: world.provider.id };
const fresh = await register("fresh", "PROVIDER"); // PROVIDER account without a provider record: /portal/alta
if (PHASES.includes("sweep")) {
  await newProvider("pend", { verify: false, listings: 1 }); await newProvider("pend2", { verify: false, listings: 1 }); // admin verification queue rows
  for (const scheme of SCHEMES) for (const width of WIDTHS) for (const locale of LOCALES) {
    const flags = { width, locale, scheme }; const key = `${width}/${locale}/${scheme}`;
    console.log(`\nSWEEP ${key}`);
    let prov, adm, alta;
    try {
      prov = await open(flags, wp.owner.email); for (const r of PORTAL_ROUTES.filter((r) => r !== "/portal/alta")) await sweepRoute(prov, r, key, flags); await prov.context.close();
      alta = await open(flags, fresh.email); await sweepRoute(alta, "/portal/alta", key, flags); await alta.context.close();
      adm = await open(flags, ADMIN_EMAIL, ADMIN_PASSWORD); for (const r of ADMIN_ROUTES) await sweepRoute(adm, r, key, flags); await adm.context.close();
    } catch (error) { record({ key, width, locale, scheme, route: "(login)", check: "session", status: "FAIL", evidence: String(error?.message ?? error).split("\n")[0].slice(0, 200) }); for (const c of [prov, alta, adm]) await c?.context.close().catch(() => undefined); }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
if (PHASES.includes("flows")) {
  const locale = "en-US";
  for (const width of FLOW_WIDTHS) {
    console.log(`\nFLOWS en-US ${width}px`);
    const flags = { width, locale, scheme: "light" }; const key = `flows ${width}/en-US/light`;
    let current = null;
    const step = async (name, fn) => { try { const evidence = await fn(); record({ key, width, locale, scheme: "light", route: name, check: "g-flow", status: "PASS", evidence: evidence ?? "" }); } catch (error) { const seen = await current?.locator("body").innerText().catch(() => ""); record({ key, width, locale, scheme: "light", route: name, check: "g-flow", status: "FAIL", evidence: `${String(error?.message ?? error).split("\n")[0].slice(0, 200)} | screen: ${String(seen).replace(/\s+/g, " ").slice(-260)}` }); } };
    const tid = (page, id) => page.getByTestId(id).filter({ visible: true }).first();
/** Admin queues show 10 rows and "Show more": reveal the row of an action before touching it. */
const reveal = async (page, testId) => {
  let idle = 0;
  for (let i = 0; i < 60 && !(await tid(page, testId).isVisible().catch(() => false)); i += 1) {
    const more = tid(page, "admin-show-more");
    if (!(await more.isVisible().catch(() => false))) { idle += 1; if (idle > 8) break; await page.waitForTimeout(500); continue; }
    idle = 0; await more.click();
  }
};
    const go = async (page, path) => { await page.goto(`${APP}${path}`); await page.waitForLoadState("networkidle").catch(() => undefined); };
    const poll = async (fn, what) => { const started = Date.now(); for (;;) { const value = await fn(); if (value) return value; if (Date.now() - started > 15000) throw new Error(`timeout waiting for ${what}`); await sleep(400); } };
    const P = await newProvider(`fp${width}`, { verify: true, listings: 0 });
    const own = async () => (await http("GET", `/providers/${P.providerId}`, { token: P.owner.token })).json;
    const listings = async () => (await http("GET", `/providers/${P.providerId}/listings`, { token: P.owner.token })).json.items;
    const { page, context } = await open(flags, P.owner.email); current = page;
    await step("portal: create offer", async () => {
      await go(page, "/portal/servicios"); await tid(page, "offer-new").click(); await tid(page, "listing-name").waitFor();
      await tid(page, "listing-name").fill("Flow cake"); await tid(page, "listing-whatsapp").fill("https://wa.me/59171111111"); await tid(page, "listing-coverage").fill("la-paz, el-alto"); await tid(page, "listing-lead").fill("2"); await tid(page, "listing-conditions").fill("Delivery included"); await tid(page, "listing-price").fill("150,50");
      await tid(page, "listing-submit").click();
      const created = await poll(async () => (await listings()).find((l) => l.title === "Flow cake"), "listing in GET");
      assert.equal(created.priceFromMinor, 15050); assert.equal(created.published, false);
      return `GET /listings: "Flow cake" priceFromMinor 15050, draft`;
    });
    await step("portal: publish offer", async () => {
      const created = (await listings()).find((l) => l.title === "Flow cake");
      await tid(page, `publish-${created.id}`).click();
      await poll(async () => (await listings()).find((l) => l.id === created.id)?.published, "published=true");
      return "GET published=true";
    });
    await step("portal: save destinations", async () => {
      await go(page, "/portal/destinos"); await tid(page, "destinations-save").waitFor();
      await tid(page, "destination-WHATSAPP").click(); await tid(page, "utm-campaign").fill("flow_en"); await tid(page, "utm-dedupe").fill("90"); await tid(page, "utm-cap").fill("500");
      await tid(page, "destinations-save").click();
      const lc = (await poll(async () => { const p = await own(); return p.leadConfig?.utmCampaign === "flow_en" ? p : null; }, "leadConfig")).leadConfig;
      assert.ok(lc.enabledDestinations.length >= 1); assert.equal(lc.dedupeMinutes, 90); assert.equal(lc.monthlyCap, 500);
      return `GET leadConfig: ${lc.enabledDestinations.join("+")}, dedupe 90, cap 500`;
    });
    await step("portal: save agenda", async () => {
      await go(page, "/portal/agenda"); await tid(page, "agenda-save").waitFor();
      await tid(page, "agenda-capacity").fill("7"); await tid(page, "agenda-save").click();
      const av = await poll(async () => { const r = (await http("GET", `/providers/${P.providerId}/availability`, { token: P.owner.token })).json; return r.capacityPerDay === 7 ? r : null; }, "capacity 7");
      return `GET availability capacityPerDay ${av.capacityPerDay}`;
    });
    await step("portal: rename", async () => {
      await go(page, "/portal"); await tid(page, "more-options").click(); await tid(page, "rename-open").click(); await tid(page, "rename-name").fill(`Renamed ${stamp}`); await tid(page, "rename-save").click();
      await poll(async () => (await own()).name === `Renamed ${stamp}`, "new name");
      return "GET name updated";
    });
    await step("portal: ERROR network down (rename)", async () => {
      await go(page, "/portal"); await tid(page, "more-options").click(); await tid(page, "rename-open").click(); await tid(page, "rename-name").fill("Offline name");
      const handler = (route) => route.abort("connectionfailed"); await page.route(/\/providers\/[^/]+$/, handler);
      try {
        await tid(page, "rename-save").click();
        await page.getByText(/No hay conexión con el servidor|Cannot reach the server/).filter({ visible: true }).first().waitFor();
      } finally { await page.unroute(/\/providers\/[^/]+$/, handler); }
      assert.notEqual((await own()).name, "Offline name");
      assert.equal(await tid(page, "rename-name").inputValue(), "Offline name");
      return "notice shown, typed text kept, GET unchanged";
    });
    await context.close();

    // ---- admin ----
    const pend = await newProvider(`fv${width}`, { verify: false, listings: 1 });
    const grantee = await register(`fg${width}`, "HOST");
    const adm = await open(flags, ADMIN_EMAIL, ADMIN_PASSWORD); current = adm.page;
    await step("admin: verify provider", async () => {
      await go(adm.page, "/admin/verificacion"); await reveal(adm.page, `verify-${pend.providerId}`); await tid(adm.page, `verify-${pend.providerId}`).waitFor();
      await reveal(adm.page, `verify-${pend.providerId}`); await tid(adm.page, `verify-${pend.providerId}`).click();
      await poll(async () => (await http("GET", `/providers/${pend.providerId}`, { token: await getAdminToken() })).json.status === "VERIFIED", "VERIFIED");
      return "GET status VERIFIED";
    });
    await step("admin: grant role", async () => {
      await go(adm.page, "/admin/usuarios"); await tid(adm.page, "users-search").waitFor();
      await tid(adm.page, "users-search").fill(grantee.email); await tid(adm.page, "users-search-go").click();
      await tid(adm.page, `grant-PLANNER-${grantee.id}`).click();
      await tid(adm.page, "grant-confirm").click();
      const roles = await poll(async () => { const r = (await http("GET", `/identity/admin/users?query=${encodeURIComponent(grantee.email)}`, { token: await getAdminToken() })).json.items[0].roles; return r.includes("PLANNER") ? r : null; }, "PLANNER role");
      return `GET roles ${roles.join(",")}`;
    });
    await step("admin: ERROR network down (verify)", async () => {
      const pend2 = await newProvider(`fe${width}`, { verify: false, listings: 1 });
      await go(adm.page, "/admin/verificacion"); await reveal(adm.page, `verify-${pend2.providerId}`); await tid(adm.page, `verify-${pend2.providerId}`).waitFor();
      const handler = (route) => route.abort("connectionfailed"); await adm.page.route(/\/verify$/, handler);
      try { await reveal(adm.page, `verify-${pend2.providerId}`); await tid(adm.page, `verify-${pend2.providerId}`).click(); await adm.page.getByText(/No hay conexión con el servidor|Cannot reach the server/).filter({ visible: true }).first().waitFor(); } finally { await adm.page.unroute(/\/verify$/, handler); }
      assert.equal((await http("GET", `/providers/${pend2.providerId}`, { token: await getAdminToken() })).json.status, "PENDING_VERIFICATION");
      return "notice shown, GET still PENDING_VERIFICATION";
    });
    await adm.context.close();
  }
}

const fails = rows.filter((r) => r.status === "FAIL");
const summary = {};
for (const r of rows) { const k = `${r.width}/${r.locale}/${r.scheme}`; summary[k] ??= { pass: 0, fail: 0 }; summary[k][r.status === "PASS" ? "pass" : "fail"] += 1; }
console.log(`\n${rows.length} checks, ${fails.length} FAIL`); console.log(JSON.stringify(summary, null, 1));
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(rows, null, 2));
await browser.close();
process.exit(fails.length ? 1 : 0);
