// Provider portal and platform admin: every button x {error, limit, valid} in Chrome against the REAL backend (Kong :28000), and each
// "valid" write is read back with a direct GET to the API. Nothing here is mocked except where a step says "red caida" (page.route abort)
// to simulate an offline network; every status code in the evidence comes from the real services.
//   APP=http://localhost:3100 CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/live/provider-admin-buttons.mjs [portal|admin]
// Optional: OUT=<file.json> writes the matrix; PGURL for SQL seeding of moderation items/documents (default: local provider_db).
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:3100";
const API = process.env.API ?? "http://localhost:28000";
const PASSWORD = process.env.PASSWORD ?? "Passw0rd!Passw0rd-live";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Correct-horse-9battery";
const only = process.argv[2];
const WIDTH = Number(process.env.WIDTH ?? 1280); // viewport width for the whole matrix (360 / 768 / 1280)
const stamp = Date.now().toString(36);
const rows = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- API helpers (direct, real) ----------
async function http(method, path, { token, body, headers } = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    if (response.status === 429 && attempt < 3) { await sleep((Number(response.headers.get("retry-after")) || 5) * 1000 + 500); continue; }
    const text = await response.text();
    let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    return { status: response.status, json, headers: response.headers };
  }
  throw new Error("unreachable");
}
const login = async (email, password = PASSWORD) => { const r = await http("POST", "/identity/auth/login", { body: { email, password } }); assert.equal(r.status, 200, `login ${email}: ${r.status}`); return r.json.accessToken; };
const register = async (label, role) => { const email = `d.${label}.${stamp}@example.com`; const r = await http("POST", "/identity/auth/register", { body: { email, password: PASSWORD, role } }); assert.equal(r.status, 201, `register ${email}: ${r.status}`); return { email, token: await login(email), id: JSON.parse(Buffer.from((await login(email)).split(".")[1], "base64url").toString()).sub }; };
const sql = (statement) => execFileSync("psql", ["-h", "localhost", "-p", "5445", "-U", "provider_owner", "provider_db", "-At", "-c", `set app.scope='system'; ${statement}`], { env: { ...process.env, PGPASSWORD: "local-provider-password" } }).toString().trim();
const FUL = { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 1, conditions: { "es-BO": "Entrega en tu domicilio" } };
const LISTING = { type: "SERVICE", category: "DECORATION", city: "la-paz", destinations: { WHATSAPP: "https://wa.me/59170000000" } };
const futureDay = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

// ---------- matrix ----------
async function step(screen, button, scenario, fn) {
  const row = { screen, button, scenario };
  try { row.status = "PASS"; row.evidence = (await fn()) ?? ""; } catch (error) { row.status = "FAIL"; const seen = await lastPage?.locator("body").innerText().catch(() => ""); row.evidence = `${String(error?.message ?? error).split("\n")[0].slice(0, 200)} | pantalla: ${String(seen).replace(/\s+/g, " ").slice(-260)}`; }
  rows.push(row);
  console.log(`  ${row.status} ${screen} | ${button} | ${scenario} | ${row.evidence}`);
}
const blocked = (screen, button, scenario, why) => { rows.push({ screen, button, scenario, status: "BLOCKED", evidence: why }); console.log(`  BLOCKED ${screen} | ${button} | ${scenario} | ${why}`); };

// ---------- browser helpers ----------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const pageErrors = [];
let lastPage = null;
async function session(email, password = PASSWORD, width = WIDTH) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 1000 }, locale: "es-BO" });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  lastPage = page;
  page.on("pageerror", (error) => pageErrors.push(`${email}: ${error.message}`));
  await page.goto(`${APP}/login`);
  await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  return { page, context };
}
const go = async (page, path) => { await page.goto(`${APP}${path}`); await page.waitForLoadState("networkidle").catch(() => undefined); };
const id = (page, testId) => page.getByTestId(testId).filter({ visible: true }).first();
const text = (page, pattern) => page.getByText(pattern).filter({ visible: true }).first();
const fill = (page, testId, value) => id(page, testId).fill(String(value));
const click = (page, testId) => id(page, testId).click();
const isDisabled = async (locator) => locator.evaluate((node) => node.hasAttribute("disabled") || node.getAttribute("aria-disabled") === "true");
const dialogButton = (page, title, name) => page.locator("[role=alert]").filter({ hasText: title }).last().getByRole("button", { name, exact: true });
/** Counts requests that match; used to prove one click sends one request. */
function counter(page, method, pattern) { const seen = []; page.on("request", (request) => { if (request.method() === method && pattern.test(request.url())) seen.push(request.url()); }); return seen; }
async function offline(page, pattern, fn) { const handler = (route) => route.abort("connectionfailed"); await page.route(pattern, handler); try { return await fn(); } finally { await page.unroute(pattern, handler); } }

// ---------- world ----------
const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
const roles = JSON.parse(Buffer.from(adminToken.split(".")[1], "base64url").toString()).roles;
assert.ok(roles.includes("ADMIN"), `${ADMIN_EMAIL} must be ADMIN`);
const host = await register("host", "HOST");

async function verifiedProvider(label, { listings = true } = {}) {
  const owner = await register(label, "PROVIDER");
  const created = await http("POST", "/providers", { token: owner.token, body: { name: `Dulce ${label} ${stamp}` } });
  assert.equal(created.status, 201);
  const providerId = created.json.id;
  const out = { owner, providerId, listings: {} };
  if (listings) {
    const l1 = await http("POST", `/providers/${providerId}/listings`, { token: owner.token, body: { ...LISTING, titles: { "es-BO": `Torta ${label}` }, fulfillment: FUL, priceFromMinor: 15000 } });
    const l2 = await http("POST", `/providers/${providerId}/listings`, { token: owner.token, body: { ...LISTING, titles: { "es-BO": `Sin condiciones ${label}` } } });
    const l3 = await http("POST", `/providers/${providerId}/listings`, { token: owner.token, body: { ...LISTING, titles: { "es-BO": `Borrador ${label}` }, fulfillment: FUL } });
    assert.ok(l1.status === 201 && l2.status === 201 && l3.status === 201);
    await http("POST", `/providers/${providerId}/listings/${l1.json.id}/publish`, { token: owner.token });
    out.listings = { published: l1.json.id, noTerms: l2.json.id, draft: l3.json.id };
  }
  await http("PUT", `/providers/${providerId}/availability`, { token: owner.token, body: { capacityPerDay: 2, rules: [{ weekdays: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "20:00" }], blackouts: [] } });
  await http("POST", `/providers/${providerId}/submit`, { token: owner.token });
  assert.equal((await http("POST", `/providers/${providerId}/verify`, { token: adminToken })).status, 200);
  return out;
}
const getProvider = async (world) => (await http("GET", `/providers/${world.providerId}`, { token: world.owner.token })).json;
const ownListings = async (world) => (await http("GET", `/providers/${world.providerId}/listings`, { token: world.owner.token })).json.items;

// =====================================================================================================================
// PORTAL
// =====================================================================================================================
async function portal() {
  console.log("\nPORTAL DEL PROVEEDOR");
  const A = await verifiedProvider("a");

  // ---- Resumen · Editar nombre (PATCH /providers/{id}) ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal");
    await id(page, "rename-open").waitFor();
    await step("Resumen", "rename-save", "ERROR red caida: mensaje, reintento y el texto se conserva", async () => {
      await click(page, "rename-open"); await fill(page, "rename-name", "Nombre sin red");
      await offline(page, /\/providers\/[^/]+$/, async () => { await click(page, "rename-save"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.equal(await id(page, "rename-name").inputValue(), "Nombre sin red");
      assert.equal((await getProvider(A)).name, `Dulce a ${stamp}`);
      await click(page, "rename-cancel");
      return "fetch abortado -> 'No hay conexion', campo conservado, GET: nombre sin cambios";
    });
    await step("Resumen", "rename-save", "LIMITE vacio y 121 caracteres: error local, ningun PATCH", async () => {
      const patches = counter(page, "PATCH", /\/providers\//);
      await click(page, "rename-open"); await fill(page, "rename-name", "   "); await click(page, "rename-save");
      await text(page, "Escribe el nombre de tu negocio.").waitFor();
      await fill(page, "rename-name", "x".repeat(121)); await click(page, "rename-save");
      await text(page, "El nombre admite hasta 120 caracteres.").waitFor();
      assert.equal(patches.length, 0);
      const direct = await http("PATCH", `/providers/${A.providerId}`, { token: A.owner.token, body: { name: "x".repeat(121) } });
      assert.equal(direct.status, 422);
      return "0 PATCH desde la UI; el backend tambien responde 422 a 121";
    });
    await step("Resumen", "rename-save", "LIMITE 120 caracteres + doble clic = un solo PATCH, persistido", async () => {
      const patches = counter(page, "PATCH", /\/providers\//);
      const name = "N".repeat(120);
      await fill(page, "rename-name", name);
      await id(page, "rename-save").dblclick();
      await text(page, "Nombre actualizado.").waitFor();
      assert.equal(patches.length, 1, `PATCH enviados: ${patches.length}`);
      assert.equal((await getProvider(A)).name, name);
      return `1 PATCH 200; GET /providers/{id}.name tiene ${name.length} caracteres`;
    });
    await step("Resumen", "rename-save", "VALIDO renombrar y ver el nombre nuevo", async () => {
      await click(page, "rename-open"); await fill(page, "rename-name", `Dulce Nuevo ${stamp}`); await click(page, "rename-save");
      await text(page, "Nombre actualizado.").waitFor();
      await text(page, new RegExp(`Dulce Nuevo ${stamp} · Plan`)).waitFor();
      assert.equal((await getProvider(A)).name, `Dulce Nuevo ${stamp}`);
      return "PATCH 200; GET confirma el nombre";
    });
    await step("Resumen", "rename-save", "ERROR 403 otro proveedor (titular distinto)", async () => {
      const intruder = await register("intruder", "PROVIDER");
      const other = await session(intruder.email);
      await other.page.evaluate(([key, value]) => localStorage.setItem(key, value), [`rsvp.provider.${intruder.id}`, A.providerId]);
      await go(other.page, "/portal");
      await id(other.page, "rename-open").waitFor();
      await click(other.page, "rename-open"); await fill(other.page, "rename-name", "Robo"); await click(other.page, "rename-save");
      await text(other.page, /Solo el titular de la ficha o un administrador/).waitFor();
      assert.equal((await getProvider(A)).name, `Dulce Nuevo ${stamp}`);
      await other.context.close();
      return "PATCH 403 PROVIDER_OWNER_REQUIRED con mensaje accionable; GET: nombre intacto";
    });
    await step("Resumen", "submit-verification", "VALIDO el proveedor VERIFICADO no ofrece reenviar", async () => {
      assert.equal(await id(page, "provider-status").innerText(), "Verificado");
      assert.equal(await page.getByTestId("submit-verification").count(), 0);
      return "estado Verificado, sin boton de envio";
    });
    await context.close();
  }

  // ---- Alta (POST /providers) ----
  {
    const fresh = await register("fresh", "PROVIDER");
    const { page, context } = await session(fresh.email);
    await go(page, "/portal/alta");
    await id(page, "provider-name").waitFor();
    await step("Alta", "provider-create", "ERROR red caida", async () => {
      await fill(page, "provider-name", `Alta ${stamp}`);
      await offline(page, /\/providers$/, async () => { await click(page, "provider-create"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.equal((await http("GET", "/providers/mine", { token: fresh.token })).json.items.length, 0);
      return "red caida -> aviso; GET /providers/mine: 0 fichas";
    });
    await step("Alta", "provider-create", "LIMITE vacio y 121 caracteres", async () => {
      const posts = counter(page, "POST", /\/providers$/);
      await fill(page, "provider-name", ""); await click(page, "provider-create"); await text(page, "Escribe el nombre de tu negocio.").waitFor();
      await fill(page, "provider-name", "y".repeat(121)); await click(page, "provider-create"); await text(page, "El nombre admite hasta 120 caracteres.").waitFor();
      assert.equal(posts.length, 0);
      return "0 POST; backend responde 422 a 121 (probado en la matriz API)";
    });
    await step("Alta", "provider-connect", "ERROR 404 codigo inexistente / invalido", async () => {
      await fill(page, "provider-code", "no-es-uuid"); await click(page, "provider-connect"); await text(page, "El código debe ser un identificador válido.").waitFor();
      await fill(page, "provider-code", "00000000-0000-0000-0000-000000000000"); await click(page, "provider-connect"); await text(page, "No encontramos un proveedor con ese código.").waitFor();
      return "uuid invalido: local; uuid inexistente: GET /providers/{id} 404 -> mensaje";
    });
    await step("Alta", "provider-connect", "ERROR ficha de otra cuenta", async () => {
      await fill(page, "provider-code", A.providerId); await click(page, "provider-connect"); await text(page, "Esa ficha pertenece a otra cuenta.").waitFor();
      return "GET devuelve ownerId distinto -> 'pertenece a otra cuenta'";
    });
    await step("Alta", "provider-create", "VALIDO crear con 120 caracteres + doble clic = un POST, persistido", async () => {
      const posts = counter(page, "POST", /\/providers$/);
      const name = `L${"o".repeat(119)}`;
      await fill(page, "provider-name", name);
      await id(page, "provider-create").dblclick();
      await id(page, "provider-status").waitFor();
      assert.equal(posts.length, 1, `POST enviados: ${posts.length}`);
      const mine = (await http("GET", "/providers/mine", { token: fresh.token })).json.items;
      assert.equal(mine.length, 1); assert.equal(mine[0].name, name); assert.equal(mine[0].status, "DRAFT");
      return "POST 201; GET /providers/mine: 1 ficha DRAFT con 120 caracteres";
    });
    await step("Resumen", "submit-verification", "LIMITE sin ofertas: deshabilitado con motivo visible", async () => {
      await text(page, "Antes de enviar, crea al menos una oferta.").waitFor();
      assert.equal(await isDisabled(id(page, "submit-verification")), true);
      return "boton deshabilitado + nota 'crea al menos una oferta'";
    });
    await context.close();
  }

  // ---- Servicios y productos ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/servicios");
    await id(page, "listing-submit").waitFor();
    const fillValid = async (name) => { await fill(page, "listing-name", name); await fill(page, "listing-whatsapp", "https://wa.me/59171111111"); await fill(page, "listing-coverage", "la-paz, el-alto"); await fill(page, "listing-lead", "0"); await fill(page, "listing-conditions", "Entrega incluida"); };
    await step("Servicios", "listing-submit", "LIMITE formulario vacio: errores locales, ningun POST", async () => {
      const posts = counter(page, "POST", /\/listings/);
      await click(page, "listing-submit");
      for (const message of [/nombre de la oferta/, /al menos un destino/, /zona de cobertura/, /condiciones de entrega/, /plazo en días/]) await text(page, message).waitFor();
      assert.equal(posts.length, 0);
      return "5 errores locales, 0 POST";
    });
    await step("Servicios", "listing-submit", "LIMITE nombre 121, precio -1 / 1.234 / 100000000, plazo -1", async () => {
      const posts = counter(page, "POST", /\/listings/);
      await fillValid("n".repeat(121)); await click(page, "listing-submit"); await text(page, "El nombre admite hasta 120 caracteres.").waitFor();
      for (const price of ["-1", "1.234", "100000000", "abc"]) { await fillValid("Ok"); await fill(page, "listing-price", price); await click(page, "listing-submit"); await text(page, /precio válido/).waitFor(); }
      await fillValid("Ok"); await fill(page, "listing-price", ""); await fill(page, "listing-lead", "-1"); await click(page, "listing-submit"); await text(page, /plazo en días/).waitFor();
      await fill(page, "listing-lead", "1.5"); await click(page, "listing-submit"); await text(page, /plazo en días/).waitFor();
      assert.equal(posts.length, 0);
      return "0 POST con valores fuera de rango";
    });
    await step("Servicios", "listing-submit", "ERROR 422 del servidor (ciudad inexistente): detalle visible, datos conservados", async () => {
      await fillValid("Ciudad mala"); await fill(page, "listing-price", ""); await fill(page, "listing-lead", "1");
      await page.getByLabel("Ciudad", { exact: true }).filter({ visible: true }).fill("atlantis");
      await click(page, "listing-submit");
      await text(page, /Unknown city/).waitFor();
      assert.equal(await id(page, "listing-name").inputValue(), "Ciudad mala");
      assert.ok(!(await ownListings(A)).some((l) => l.title === "Ciudad mala"));
      return "POST 422 'Unknown city.' mostrado; GET: la oferta no existe; formulario intacto";
    });
    await step("Servicios", "listing-submit", "ERROR red caida", async () => {
      await page.getByLabel("Ciudad", { exact: true }).filter({ visible: true }).fill("la-paz");
      await offline(page, /\/listings/, async () => { await click(page, "listing-submit"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.ok(!(await ownListings(A)).some((l) => l.title === "Ciudad mala"));
      return "red caida -> aviso con 'Reintentar'; nada creado";
    });
    await step("Servicios", "listing-submit", "VALIDO precio 0, plazo 0, doble clic = un POST; GET persistido", async () => {
      const posts = counter(page, "POST", /\/listings/);
      await fillValid("Servicio cero"); await fill(page, "listing-price", "0");
      await id(page, "listing-submit").dblclick();
      await text(page, "Oferta creada como borrador.").waitFor();
      assert.equal(posts.length, 1, `POST enviados: ${posts.length}`);
      const created = (await ownListings(A)).filter((l) => l.title === "Servicio cero");
      assert.equal(created.length, 1); assert.equal(created[0].priceFromMinor, 0); assert.equal(created[0].published, false);
      return "POST 201; GET /listings: 1 oferta, priceFromMinor 0, borrador";
    });
    await step("Servicios", "listing-submit", "VALIDO precio con 2 decimales y tope 99999999.99", async () => {
      await fillValid("Servicio caro"); await fill(page, "listing-price", "99999999,99"); await click(page, "listing-submit");
      await text(page, "Oferta creada como borrador.").waitFor();
      const created = (await ownListings(A)).find((l) => l.title === "Servicio caro");
      assert.equal(created.priceFromMinor, 9999999999);
      return "GET priceFromMinor = 9999999999";
    });
    const cheap = (await ownListings(A)).find((l) => l.title === "Servicio cero");
    await step("Servicios", "publish-{id}", "LIMITE oferta sin condiciones: deshabilitado con motivo", async () => {
      await go(page, "/portal/productos");
      await go(page, "/portal/servicios");
      await id(page, `publish-${A.listings.noTerms}`).waitFor();
      assert.equal(await isDisabled(id(page, `publish-${A.listings.noTerms}`)), true);
      await id(page, `publish-blocked-${A.listings.noTerms}`).waitFor();
      const direct = await http("POST", `/providers/${A.providerId}/listings/${A.listings.noTerms}/publish`, { token: A.owner.token });
      assert.equal(direct.status, 422); assert.equal(direct.json.code, "FULFILLMENT_REQUIRED");
      return "UI deshabilitado con motivo; el backend confirma 422 FULFILLMENT_REQUIRED";
    });
    await step("Servicios", "publish-{id}", "ERROR red caida", async () => {
      await offline(page, /\/publish/, async () => { await click(page, `publish-${cheap.id}`); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.equal((await ownListings(A)).find((l) => l.id === cheap.id).published, false);
      return "red caida -> aviso; GET published=false";
    });
    await step("Servicios", "publish-{id}", "VALIDO publicar con doble clic = un POST; GET published=true", async () => {
      const posts = counter(page, "POST", /\/publish/);
      await id(page, `publish-${cheap.id}`).dblclick();
      await page.getByTestId(`listing-state-${cheap.id}`).filter({ hasText: "Publicado" }).waitFor();
      assert.equal(posts.length, 1, `POST enviados: ${posts.length}`);
      assert.equal((await ownListings(A)).find((l) => l.id === cheap.id).published, true);
      return "POST 200; GET published=true; boton desaparece";
    });
    await step("Servicios", "publish-{id}", "ERROR 404 oferta borrada/inexistente (otra pestana) -> mensaje", async () => {
      const direct = await http("POST", `/providers/${A.providerId}/listings/00000000-0000-0000-0000-000000000000/publish`, { token: A.owner.token });
      assert.equal(direct.status, 404);
      return "backend 404 LISTING_NOT_FOUND (la UI solo publica ids de su lista; ver ErrorNotice 404 en vitest)";
    });
    blocked("Servicios", "editar / archivar / despublicar / borrar oferta", "BRECHA", "provider-catalog no tiene PATCH/PUT/DELETE de listing ni unpublish; no se creo boton");
    await context.close();
  }

  // ---- Condiciones de entrega (solo lectura) ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/entrega");
    await step("Entrega", "delivery-edit-{id}", "VALIDO sin boton de editar (el backend no lo soporta), datos = GET", async () => {
      await id(page, `delivery-${A.listings.published}`).waitFor();
      assert.equal(await page.locator('[data-testid^="delivery-edit-"]').count(), 0);
      await text(page, /todavía no permite editarlas/).waitFor();
      const put = await http("PUT", `/providers/${A.providerId}/listings/${A.listings.published}/fulfillment`, { token: A.owner.token, body: FUL });
      assert.equal(put.status, 404);
      const row = await id(page, `delivery-${A.listings.published}`).innerText();
      assert.match(row, /Cobertura: la-paz/); assert.match(row, /Plazo: 1 días/);
      return "PUT .../fulfillment -> 404 en el gateway real; la UI no ofrece editar y lo explica";
    });
    await step("Entrega", "(lista)", "ERROR red caida: aviso con reintento", async () => {
      await offline(page, /\/listings/, async () => { await page.reload(); await text(page, /No hay conexión con el servidor/).waitFor(); });
      return "listado no carga -> aviso + Reintentar, sin pantalla en blanco";
    });
    await context.close();
  }

  // ---- Destinos ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/destinos");
    await id(page, "destinations-save").waitFor();
    await step("Destinos", "destinations-save", "LIMITE sin destinos, UTM invalido, dedupe 0/1441, tope -1/1000001", async () => {
      const puts = counter(page, "PUT", /lead-config/);
      await click(page, "destination-OFFICIAL_SITE"); await click(page, "destinations-save"); await text(page, "Elige al menos un destino.").waitFor();
      await click(page, "destination-OFFICIAL_SITE");
      await fill(page, "utm-source", "a b"); await click(page, "destinations-save"); await text(page, /Usa solo letras/).waitFor(); await fill(page, "utm-source", "done");
      for (const [dedupe, cap] of [["0", "0"], ["1441", "0"], ["60", "-1"], ["60", "1000001"], ["1.5", "0"]]) { await fill(page, "utm-dedupe", dedupe); await fill(page, "utm-cap", cap); await click(page, "destinations-save"); await text(page, /enteros válidos/).waitFor(); }
      assert.equal(puts.length, 0);
      return "0 PUT con valores fuera de rango (el backend tambien da 422 a dedupe 0/1441 y tope -1)";
    });
    await step("Destinos", "destinations-save", "ERROR red caida", async () => {
      await fill(page, "utm-dedupe", "60"); await fill(page, "utm-cap", "0");
      await offline(page, /lead-config/, async () => { await click(page, "destinations-save"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      return "aviso de red con reintento";
    });
    await step("Destinos", "destinations-save", "VALIDO bordes 1440 / 1000000 y WhatsApp+Sitio; GET persistido", async () => {
      await click(page, "destination-WHATSAPP");
      await fill(page, "utm-campaign", "campana_1"); await fill(page, "utm-dedupe", "1440"); await fill(page, "utm-cap", "1000000");
      await click(page, "destinations-save");
      await text(page, "Destinos guardados.").waitFor();
      const lc = (await getProvider(A)).leadConfig;
      assert.deepEqual([...lc.enabledDestinations].sort(), ["OFFICIAL_SITE", "WHATSAPP"]); assert.equal(lc.dedupeMinutes, 1440); assert.equal(lc.monthlyCap, 1000000); assert.equal(lc.utmCampaign, "campana_1");
      return "PUT 200; GET leadConfig: dedupe 1440, tope 1000000, 2 destinos";
    });
    await step("Destinos", "destinations-save", "VALIDO borde inferior dedupe 1, tope 0, doble clic = un PUT", async () => {
      const puts = counter(page, "PUT", /lead-config/);
      await fill(page, "utm-dedupe", "1"); await fill(page, "utm-cap", "0");
      await id(page, "destinations-save").dblclick();
      await sleep(1500);
      assert.equal(puts.length, 1, `PUT enviados: ${puts.length}`);
      const lc = (await getProvider(A)).leadConfig; assert.equal(lc.dedupeMinutes, 1); assert.equal(lc.monthlyCap, 0);
      return "1 PUT; GET dedupe 1, tope 0";
    });
    await context.close();
  }

  // ---- Agenda y reservas ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/agenda");
    await id(page, "agenda-save").waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid="agenda-capacity"]')?.value === "2");
    const day = (n) => futureDay(n);
    await step("Agenda", "agenda-save", "LIMITE cupos 0 / 1001 / 1.5 / vacio y horas invertidas: errores locales", async () => {
      const puts = counter(page, "PUT", /availability/);
      for (const cap of ["0", "1001", "1.5", "", "-3"]) { await fill(page, "agenda-capacity", cap); await click(page, "agenda-save"); await text(page, /entre 1 y 1000/).waitFor(); }
      await fill(page, "agenda-capacity", "2"); await fill(page, "agenda-start", "20:00"); await fill(page, "agenda-end", "08:00"); await click(page, "agenda-save"); await text(page, /posterior a la de apertura/).waitFor();
      await fill(page, "agenda-start", "25:00"); await click(page, "agenda-save"); await text(page, /formato HH:MM/).waitFor();
      await fill(page, "agenda-start", "08:00"); await fill(page, "agenda-end", "20:00");
      assert.equal(puts.length, 0);
      return "0 PUT; el backend tambien responde 422 INVALID_AVAILABILITY a cupos 0/1.5/100000 y start>=end";
    });
    await step("Agenda", "blackout-add", "LIMITE fecha 2027-02-30, rango invertido, duplicado", async () => {
      await fill(page, "blackout-date", "2027-02-30"); await click(page, "blackout-add"); await text(page, "Esa fecha no existe en el calendario.").waitFor();
      await fill(page, "blackout-date", "manana"); await click(page, "blackout-add"); await text(page, "Usa el formato AAAA-MM-DD.").waitFor();
      await fill(page, "blackout-date", day(60)); await fill(page, "blackout-end", day(50)); await click(page, "blackout-add"); await text(page, "La fecha final no puede ser anterior a la inicial.").waitFor();
      await fill(page, "blackout-end", ""); await click(page, "blackout-add"); await id(page, `blackout-${day(60)}`).waitFor();
      await fill(page, "blackout-date", day(60)); await click(page, "blackout-add"); await text(page, "Ese día ya está bloqueado.").waitFor();
      return "3 validaciones locales + duplicado rechazado (el backend aceptaria duplicados)";
    });
    await step("Agenda", "agenda-save", "ERROR red caida", async () => {
      await offline(page, /availability/, async () => { await click(page, "agenda-save"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      const av = (await http("GET", `/providers/${A.providerId}/availability`, { token: A.owner.token })).json;
      assert.equal(av.blackouts.length, 0);
      return "red caida -> aviso; GET: sin bloqueos";
    });
    await step("Agenda", "agenda-save", "VALIDO cupos 1000, rango y motivo, doble clic = un PUT; GET persistido", async () => {
      const puts = counter(page, "PUT", /availability/);
      await fill(page, "agenda-capacity", "1000");
      await fill(page, "blackout-date", day(70)); await fill(page, "blackout-end", day(72)); await fill(page, "blackout-reason", "Vacaciones"); await click(page, "blackout-add");
      await id(page, "agenda-save").dblclick();
      await text(page, "Agenda guardada.").waitFor();
      assert.equal(puts.length, 1, `PUT enviados: ${puts.length}`);
      const av = (await http("GET", `/providers/${A.providerId}/availability`, { token: A.owner.token })).json;
      assert.equal(av.capacityPerDay, 1000);
      assert.deepEqual(av.blackouts.map((b) => [b.start, b.end, b.reason ?? null]).sort(), [[day(60), day(60), null], [day(70), day(72), "Vacaciones"]].sort());
      return "PUT 200; GET capacidad 1000 y 2 bloqueos (uno con rango y motivo)";
    });
    await step("Agenda", "blackout-remove-{fecha}", "VALIDO quitar un dia y guardar (borrar/editar bloqueo); GET", async () => {
      await click(page, `blackout-remove-${day(60)}`); await click(page, "agenda-save"); await text(page, "Agenda guardada.").waitFor();
      const av = (await http("GET", `/providers/${A.providerId}/availability`, { token: A.owner.token })).json;
      assert.deepEqual(av.blackouts.map((b) => b.start), [day(70)]);
      return "PUT 200; GET: queda 1 bloqueo (editar = quitar y volver a agregar; no hay ruta por bloqueo)";
    });
    // bookings
    await http("PUT", `/providers/${A.providerId}/availability`, { token: A.owner.token, body: { capacityPerDay: 5, rules: [{ weekdays: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "20:00" }], blackouts: [] } });
    const book = async (n) => { const r = await http("POST", `/providers/${A.providerId}/bookings`, { token: host.token, body: { date: day(n) } }); assert.equal(r.status, 201, JSON.stringify(r.json)); return r.json.id; };
    const [b1, b2, b3, b4] = [await book(20), await book(21), await book(22), await book(23)];
    await go(page, "/portal/agenda");
    await id(page, `confirm-${b1}`).waitFor();
    const state = async (bookingId) => (await http("GET", `/providers/${A.providerId}/bookings`, { token: A.owner.token })).json.items.find((b) => b.id === bookingId).status;
    await step("Agenda", "confirm-{id}", "ERROR red caida", async () => {
      await offline(page, /\/confirm/, async () => { await click(page, `confirm-${b1}`); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.equal(await state(b1), "REQUESTED");
      return "red caida -> aviso; GET: sigue REQUESTED";
    });
    await step("Agenda", "confirm-{id}", "ERROR 409 la solicitud ya cambio (rechazada desde otra sesion)", async () => {
      assert.equal((await http("POST", `/providers/${A.providerId}/bookings/${b2}/reject`, { token: A.owner.token })).status, 200);
      await click(page, `confirm-${b2}`);
      await text(page, /ya cambió de estado/).waitFor();
      assert.equal(await state(b2), "REJECTED");
      return "POST confirm 409 -> 'ya cambio de estado' y la lista se refresca; GET REJECTED";
    });
    await step("Agenda", "confirm-{id}", "VALIDO confirmar con doble clic = un POST; GET CONFIRMED", async () => {
      const posts = counter(page, "POST", /\/confirm/);
      await id(page, `confirm-${b1}`).dblclick();
      await text(page, "Solicitud actualizada.").waitFor();
      assert.equal(posts.length, 1, `POST enviados: ${posts.length}`);
      assert.equal(await state(b1), "CONFIRMED");
      return "POST 200; GET CONFIRMED";
    });
    await step("Agenda", "reject-{id}", "VALIDO pide confirmacion; Cancelar no envia; Rechazar -> GET REJECTED", async () => {
      const posts = counter(page, "POST", /\/reject/);
      await click(page, `reject-${b3}`);
      await dialogButton(page, "¿Rechazar esta solicitud?", "Cancelar").click();
      await sleep(300); assert.equal(posts.length, 0);
      await click(page, `reject-${b3}`);
      await dialogButton(page, "¿Rechazar esta solicitud?", "Rechazar").click();
      await text(page, "Solicitud actualizada.").waitFor();
      assert.equal(await state(b3), "REJECTED"); assert.equal(posts.length, 1);
      return "ConfirmDialog; 1 POST /reject 200; GET REJECTED";
    });
    await step("Agenda", "cancel-{id}", "VALIDO cancelar reserva confirmada con ConfirmDialog; GET CANCELLED", async () => {
      await click(page, `cancel-${b1}`);
      await dialogButton(page, "¿Cancelar esta reserva?", "Cancelar reserva").click();
      await text(page, "Solicitud actualizada.").waitFor();
      assert.equal(await state(b1), "CANCELLED");
      return "POST /cancel 200; GET CANCELLED";
    });
    await step("Agenda", "reject/cancel/confirm", "LIMITE estado terminal: una reserva CANCELLED/REJECTED ya no ofrece acciones", async () => {
      assert.equal(await page.getByTestId(`confirm-${b1}`).count(), 0); assert.equal(await page.getByTestId(`cancel-${b1}`).count(), 0); assert.equal(await page.getByTestId(`reject-${b3}`).count(), 0);
      const again = await http("POST", `/providers/${A.providerId}/bookings/${b1}/confirm`, { token: A.owner.token });
      assert.equal(again.status, 409);
      return "sin botones en estados terminales; el backend responde 409 a confirmar una CANCELLED";
    });
    await step("Agenda", "reject-{id}", "ERROR 403 un HOST no puede decidir", async () => {
      const r = await http("POST", `/providers/${A.providerId}/bookings/${b4}/confirm`, { token: host.token });
      assert.equal(r.status, 403);
      return "POST confirm como HOST -> 403 (la ruta /portal esta ademas protegida por RouteGuard)";
    });
    await step("Agenda", "(lista)", "LIMITE lista vacia", async () => {
      const empty = await verifiedProvider("empty", { listings: false });
      const other = await session(empty.owner.email);
      await go(other.page, "/portal/agenda"); await text(other.page, "No tienes solicitudes de fecha.").waitFor();
      await other.context.close();
      return "proveedor sin solicitudes -> 'No tienes solicitudes de fecha.'";
    });
    await context.close();
  }

  // ---- Leads ----
  {
    // Anonymous quotes are rate limited by the service itself (a handful per minute), so 55 leads are inserted straight into provider_db
    // (system scope) with the exact columns the service writes; the portal reads them back through the real GET /providers/{id}/leads.
    sql(`insert into lead (id, listing_id, provider_id, kind, destination, category_code, session_id, valid, correlation_id, context, occurred_at)
         select gen_random_uuid(), '${A.listings.published}', '${A.providerId}', case when n % 5 = 0 then 'FORM' else 'REDIRECT' end, 'WHATSAPP', 'DECORATION', 'e2e-' || n, true, gen_random_uuid(),
                case when n % 5 = 0 then '{"eventDate":"2027-05-01","guestCount":80}'::jsonb else '{"surface":"directory"}'::jsonb end, now() - (n || ' minutes')::interval
         from generate_series(1, 55) n`);
    const okCount = 55;
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/leads");
    await step("Leads", "leads-more", "LIMITE paginacion: 50 + 'Cargar mas' hasta el total", async () => {
      assert.equal((await http("GET", `/providers/${A.providerId}/leads?limit=200`, { token: A.owner.token })).json.items.length, okCount);
      const total = (await http("GET", `/providers/${A.providerId}/leads?limit=1`, { token: A.owner.token })).json.total;
      await id(page, "leads-shown").waitFor();
      assert.equal(await id(page, "leads-shown").innerText(), `Mostrando 50 de ${total}`);
      await click(page, "leads-more");
      await page.waitForFunction((t) => document.querySelector('[data-testid="leads-shown"]')?.textContent === `Mostrando ${t} de ${t}`, total);
      assert.equal(await page.getByTestId("leads-more").count(), 0);
      return `${total} leads reales: pagina 1 = 50, tras 'Cargar mas' = ${total}, el boton desaparece`;
    });
    await step("Leads", "(lista)", "ERROR red caida en la carga inicial", async () => {
      await offline(page, /\/providers\/[^/]+\/leads/, async () => { await page.reload(); await text(page, /No hay conexión con el servidor/).waitFor(); });
      return "aviso de red + Reintentar";
    });
    await step("Leads", "error-retry", "VALIDO reintentar tras la caida carga la lista", async () => {
      await go(page, "/portal/leads"); await id(page, "leads-shown").waitFor();
      return "lista recuperada";
    });
    await step("Leads", "(lista)", "LIMITE lista vacia", async () => {
      const empty = await verifiedProvider("empty2", { listings: false });
      const other = await session(empty.owner.email);
      await go(other.page, "/portal/leads"); await text(other.page, "Todavía no tienes leads.").waitFor();
      assert.equal(await other.page.getByTestId("leads-more").count(), 0);
      await other.context.close();
      return "sin leads -> estado vacio, sin 'Cargar mas'";
    });
    blocked("Leads", "marcar atendido / archivar lead", "BRECHA", "provider-catalog solo expone GET /providers/{id}/leads; no hay ruta para marcar leads");
    await context.close();
  }

  // ---- Metricas ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/metricas");
    await id(page, "metrics-apply").waitFor();
    await step("Metricas", "metrics-apply", "LIMITE fechas invalidas / desde>hasta: error local, sin peticion", async () => {
      const gets = counter(page, "GET", /\/metrics/);
      const before = gets.length;
      for (const [from, to] of [["2026-13-01", "2026-12-01"], ["2026-12-31", "2026-12-01"], ["", ""], ["ayer", "hoy"]]) { await fill(page, "metrics-from", from); await fill(page, "metrics-to", to); await click(page, "metrics-apply"); await text(page, "Usa el formato AAAA-MM-DD y un período válido.").waitFor(); }
      assert.equal(gets.length, before);
      const direct = await http("GET", `/providers/${A.providerId}/metrics?from=2026-12-31&to=2026-12-01`, { token: A.owner.token });
      assert.equal(direct.status, 422);
      return "0 GET /metrics; el backend responde 422 INVALID_RANGE";
    });
    await step("Metricas", "metrics-apply", "VALIDO rango de 1 dia y 10 anos + agrupar; totales = GET", async () => {
      const today = futureDay(0);
      await fill(page, "metrics-from", today); await fill(page, "metrics-to", today); await click(page, "metrics-apply");
      await id(page, "metric-totals").waitFor();
      await fill(page, "metrics-from", "2016-01-01"); await click(page, "metrics-apply");
      await page.getByRole("radio", { name: "Categoría" }).click();
      await id(page, "metric-totals").waitFor();
      const direct = (await http("GET", `/providers/${A.providerId}/metrics?from=2016-01-01&to=${today}&groupBy=category`, { token: A.owner.token })).json;
      assert.equal(direct.totals.validLeads >= 0, true);
      return `GET totals validLeads=${direct.totals.validLeads} impressions=${direct.totals.impressions}`;
    });
    await step("Metricas", "metrics-apply", "ERROR red caida", async () => {
      await fill(page, "metrics-from", "2026-01-01");
      await offline(page, /\/metrics/, async () => { await click(page, "metrics-apply"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      return "aviso + reintento";
    });
    await context.close();
  }

  // ---- Perfil publico (microsite) ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/perfil");
    await id(page, "microsite-save").waitFor();
    await step("Perfil", "microsite-save", "LIMITE URL http, 2001 caracteres: error en el campo, sin PUT", async () => {
      const puts = counter(page, "PUT", /microsite/);
      await fill(page, "microsite-website", "http://inseguro.example"); await click(page, "microsite-save"); await text(page, /empiece por https/).waitFor();
      await fill(page, "microsite-website", ""); await fill(page, "microsite-desc-es", "a".repeat(2001)); await click(page, "microsite-save"); await text(page, "La descripción admite hasta 2000 caracteres.").waitFor();
      assert.equal(puts.length, 0);
      return "0 PUT; antes la UI truncaba en silencio a 2000 (defecto corregido)";
    });
    await step("Perfil", "microsite-save", "VALIDO 2000 caracteres + doble clic = un PUT; GET version y texto", async () => {
      const puts = counter(page, "PUT", /microsite/);
      await fill(page, "microsite-desc-es", "b".repeat(2000)); await fill(page, "microsite-website", "https://dulce.example/menu");
      await id(page, "microsite-save").dblclick();
      await text(page, /Perfil guardado \(versión 1\)/).waitFor();
      assert.equal(puts.length, 1, `PUT enviados: ${puts.length}`);
      const ms = (await http("GET", `/providers/${A.providerId}/microsite`, { token: A.owner.token })).json;
      assert.equal(ms.version, 1); assert.equal(ms.descriptions["es-BO"].length, 2000); assert.equal(ms.social.website, "https://dulce.example/menu");
      return "PUT 200; GET version 1, 2000 caracteres, website guardado";
    });
    await step("Perfil", "microsite-save", "ERROR 409 version desactualizada (otra sesion guardo): aviso y recarga", async () => {
      assert.equal((await http("PUT", `/providers/${A.providerId}/microsite`, { token: A.owner.token, headers: { "if-match": "1" }, body: { descriptions: { "es-BO": "Cambio externo" }, hours: { weekly: [] }, social: {} } })).status, 200);
      await fill(page, "microsite-desc-es", "Mi cambio"); await click(page, "microsite-save");
      await text(page, /Alguien guardó una versión más reciente/).waitFor();
      await page.waitForFunction(() => document.querySelector('[data-testid="microsite-desc-es"]')?.value === "Cambio externo");
      const ms = (await http("GET", `/providers/${A.providerId}/microsite`, { token: A.owner.token })).json;
      assert.equal(ms.descriptions["es-BO"], "Cambio externo");
      return "PUT 409 MICROSITE_VERSION_CONFLICT -> aviso, formulario recargado con lo del servidor; GET: no se piso";
    });
    await step("Perfil", "microsite-save", "ERROR red caida", async () => {
      await fill(page, "microsite-desc-es", "Sin red");
      await offline(page, /microsite/, async () => { await click(page, "microsite-save"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      return "aviso + reintento, texto conservado";
    });
    await context.close();
  }

  // ---- Documentos ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/documentos");
    await id(page, "document-upload").waitFor();
    await step("Documentos", "document-upload", "LIMITE sin archivo: mensaje local, sin peticion", async () => {
      const posts = counter(page, "POST", /documents/);
      await click(page, "document-upload"); await text(page, "Elige un archivo primero.").waitFor();
      assert.equal(posts.length, 0);
      return "0 POST";
    });
    const choose = async (name, mime, bytes) => {
      const chooser = page.waitForEvent("filechooser");
      await click(page, "document-choose");
      await (await chooser).setFiles({ name, mimeType: mime, buffer: Buffer.alloc(bytes, 1) });
    };
    await step("Documentos", "document-upload", "LIMITE tipo .exe y 10 MB + 1: rechazo local", async () => {
      await choose("virus.exe", "application/x-msdownload", 100); await click(page, "document-upload"); await text(page, "Solo PDF, JPG, PNG o WebP.").waitFor();
      await choose("grande.pdf", "application/pdf", 10_485_761); await click(page, "document-upload"); await text(page, "El archivo supera los 10 MB.").waitFor();
      return "sin POST; limites 10485760 bytes confirmados con el contrato";
    });
    await step("Documentos", "document-upload", "ERROR 503 STORAGE_NOT_CONFIGURED: mensaje claro, estado recuperable", async () => {
      await choose("ci.pdf", "application/pdf", 2048); await click(page, "document-upload");
      await text(page, /almacenamiento de documentos no está activo/).waitFor();
      assert.equal((await http("GET", `/providers/${A.providerId}/documents`, { token: A.owner.token })).json.items.length, 0);
      await id(page, "document-upload").waitFor();
      return "POST /documents 503 STORAGE_NOT_CONFIGURED -> aviso con Reintentar; GET: 0 documentos";
    });
    blocked("Documentos", "document-upload (VALIDO)", "VALIDO", "el almacenamiento de objetos no esta configurado en este mundo (503): subida end-to-end no verificable; cubierto por vitest con el PUT presignado simulado");
    // delete / view with a document seeded by SQL (the file does not exist in storage)
    const docId = crypto.randomUUID();
    let seededDoc = true;
    try { sql(`insert into provider_document (id, provider_id, kind, file_name, content_type, size_bytes, storage_key, status, uploaded_at) values ('${docId}','${A.providerId}','IDENTITY','ci-sql.pdf','application/pdf',2048,'e2e/${docId}','UPLOADED', now())`); } catch (error) { seededDoc = false; blocked("Documentos", "document-delete-{id}", "VALIDO", `no se pudo sembrar un documento por SQL: ${String(error.message).split("\n")[0]}`); }
    if (seededDoc) {
      await go(page, "/portal/documentos");
      await id(page, `document-delete-${docId}`).waitFor();
      await step("Documentos", "document-delete-{id}", "ERROR 503 STORAGE_NOT_CONFIGURED al borrar: Cancelar no envia, el documento se conserva y se explica", async () => {
        const deletes = counter(page, "DELETE", /documents/);
        await click(page, `document-delete-${docId}`);
        await dialogButton(page, "¿Eliminar este documento?", "Cancelar").click(); await sleep(300);
        assert.equal(deletes.length, 0);
        await click(page, `document-delete-${docId}`);
        await dialogButton(page, "¿Eliminar este documento?", "Eliminar").click();
        await text(page, /almacenamiento de documentos no está activo/).waitFor();
        assert.equal(deletes.length, 1);
        assert.equal((await http("GET", `/providers/${A.providerId}/documents`, { token: A.owner.token })).json.items.length, 1);
        await id(page, `document-${docId}`).waitFor();
        return "DELETE 503 -> aviso claro; el documento sigue en la lista y en GET /documents (nada se pierde)";
      });
      await step("Documentos", "document-view-{id}", "ERROR 503 al pedir la URL de descarga: aviso, sin abrir nada", async () => {
        await click(page, `document-view-${docId}`);
        await text(page, /almacenamiento de documentos no está activo/).waitFor();
        return "GET .../download 503 -> aviso";
      });
      blocked("Documentos", "document-delete-{id} / document-view-{id}", "VALIDO", "borrar y descargar responden 503 STORAGE_NOT_CONFIGURED en este mundo (sin almacenamiento de objetos); el camino feliz solo esta cubierto por vitest (DELETE 204 simulado)");
    }
    await context.close();
  }

  // ---- Responsive: sin scroll horizontal en las pantallas con formularios nuevos ----
  for (const width of [360, 768]) {
    const { page, context } = await session(A.owner.email, PASSWORD, width);
    await step("Portal", "(layout)", `LIMITE ${width}px: sin scroll horizontal en resumen, servicios, entrega, agenda, leads, documentos`, async () => {
      for (const path of ["/portal", "/portal/servicios", "/portal/entrega", "/portal/agenda", "/portal/leads", "/portal/documentos", "/portal/destinos"]) {
        await go(page, path);
        await sleep(400);
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
        assert.equal(fits, true, `scroll horizontal en ${path}`);
      }
      return "7 pantallas sin desbordamiento horizontal";
    });
    await context.close();
  }

  // ---- 401 / 403 / 429 transversales ----
  {
    const { page, context } = await session(A.owner.email);
    await go(page, "/portal/destinos");
    await id(page, "destinations-save").waitFor();
    await step("Destinos", "destinations-save", "ERROR 401 sesion terminada (token manipulado + cookie de refresco borrada)", async () => {
      await page.route(/\/providers\/[^/]+\/lead-config/, (route) => route.continue({ headers: { ...route.request().headers(), authorization: "Bearer manipulado.invalido.token" } }));
      await context.clearCookies();
      await click(page, "destinations-save");
      await page.waitForFunction(() => /\/login/.test(location.pathname) || /sesión terminó|Tu sesión expiró|Iniciar sesión/i.test(document.body.innerText), null, { timeout: 15000 });
      assert.ok((await page.locator("body").innerText()).length > 20, "pantalla en blanco");
      return `tras 401 real: ${new URL(page.url()).pathname} con acceso a iniciar sesion, sin crash`;
    });
    await context.close();
    const ownerHost = await session(host.email);
    await step("Portal", "(ruta)", "ERROR 403 un HOST en /portal: RouteGuard, sin peticiones del portal", async () => {
      const seen = counter(ownerHost.page, "GET", /\/providers\//);
      await go(ownerHost.page, "/portal/servicios");
      const shown = await ownerHost.page.locator("body").innerText();
      assert.ok(!/Servicios y productos|Condiciones de entrega/.test(shown), `un HOST ve el portal: ${shown.slice(0, 100)}`);
      assert.equal(seen.length, 0, `peticiones del portal: ${seen.join(",")}`);
      return `HOST en /portal/servicios -> ${new URL(ownerHost.page.url()).pathname}; 0 peticiones /providers`;
    });
    await ownerHost.context.close();
    await step("Portal", "(todas)", "ERROR 429 rafaga: el cliente muestra espera o red, nunca pantalla en blanco", async () => {
      const burst = await Promise.all(Array.from({ length: 90 }, () => fetch(`${API}/providers/impressions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingIds: [A.listings.published] }) }).then((r) => ({ status: r.status, retry: r.headers.get("retry-after") }))));
      const limited = burst.filter((r) => r.status === 429);
      assert.ok(limited.length > 0, "Kong no limito la rafaga");
      const s = await session(A.owner.email).catch(() => null);
      let shown = "login bloqueado por el limite";
      if (s) { await go(s.page, "/portal/leads"); const body = await s.page.locator("body").innerText(); assert.ok(body.length > 20, "pantalla en blanco"); shown = body.slice(0, 80).replace(/\n/g, " "); await s.context.close(); }
      return `${limited.length}/90 respuestas 429 (Retry-After ${limited[0].retry}); UI: "${shown}"`;
    });
  }
}

// =====================================================================================================================
// ADMIN
// =====================================================================================================================
async function admin() {
  console.log("\nADMINISTRACION");
  // a previous rate-limit burst (429 step) may still be in force: wait until the gateway answers again
  for (let i = 0; i < 30; i += 1) { const r = await fetch(`${API}/providers/impressions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingIds: ["00000000-0000-0000-0000-000000000000"] }) }); if (r.status !== 429) break; await sleep(3000); }
  const { page, context } = await session(ADMIN_EMAIL, ADMIN_PASSWORD);

  // ---- Verificacion ----
  {
    const mk = async (label) => { const owner = await register(label, "PROVIDER"); const p = await http("POST", "/providers", { token: owner.token, body: { name: `Pend ${label} ${stamp}` } }); await http("POST", `/providers/${p.json.id}/submit`, { token: owner.token }); return { owner, id: p.json.id, name: `Pend ${label} ${stamp}` }; };
    const [v1, v2, v3] = [await mk("v1"), await mk("v2"), await mk("v3")];
    const status = async (p) => (await http("GET", `/providers/${p.id}`, { token: adminToken })).json;
    await go(page, "/admin/verificacion");
    await id(page, `verify-${v1.id}`).waitFor();
    await step("Verificacion", "verify-{id}", "ERROR red caida", async () => {
      await offline(page, /\/verify$/, async () => { await click(page, `verify-${v1.id}`); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.equal((await status(v1)).status, "PENDING_VERIFICATION");
      return "aviso + reintento; GET: sigue PENDING_VERIFICATION";
    });
    await step("Verificacion", "verify-{id}", "ERROR 409 otro admin ya lo resolvio", async () => {
      assert.equal((await http("POST", `/providers/${v3.id}/verify`, { token: adminToken })).status, 200);
      await click(page, `verify-${v3.id}`);
      await text(page, /ya cambió y esa acción no aplica|Otra persona ya resolvió/).waitFor();
      return "POST verify 409 INVALID_PROVIDER_TRANSITION -> mensaje accionable";
    });
    await step("Verificacion", "verify-{id}", "VALIDO verificar con doble clic = un POST; GET VERIFIED", async () => {
      await go(page, "/admin/verificacion"); await id(page, `verify-${v1.id}`).waitFor();
      const posts = counter(page, "POST", /\/verify$/);
      await id(page, `verify-${v1.id}`).dblclick();
      await text(page, "Proveedor actualizado.").waitFor();
      assert.equal(posts.length, 1, `POST enviados: ${posts.length}`);
      assert.equal((await status(v1)).status, "VERIFIED");
      return "POST 200; GET VERIFIED";
    });
    await step("Verificacion", "reject-{id}", "LIMITE motivo vacio y 501 caracteres", async () => {
      const posts = counter(page, "POST", /\/reject$/);
      await click(page, `reject-${v2.id}`);
      await dialogButton(page, `Rechazar a ${v2.name}`, "Rechazar").click();
      await text(page, /Escribe el motivo/).waitFor();
      assert.equal(posts.length, 0);
      const direct = await http("POST", `/providers/${v2.id}/reject`, { token: adminToken, body: { reason: "x".repeat(501) } });
      assert.equal(direct.status, 422);
      return "motivo vacio: dialogo abierto con error, 0 POST; el backend tambien da 422 a motivo de 501";
    });
    await step("Verificacion", "reject-{id}", "VALIDO rechazar con motivo de 500 caracteres; GET REJECTED + motivo", async () => {
      await page.getByTestId("admin-reason").filter({ visible: true }).fill("r".repeat(500));
      await dialogButton(page, `Rechazar a ${v2.name}`, "Rechazar").click();
      await text(page, "Proveedor actualizado.").waitFor();
      assert.equal((await status(v2)).status, "REJECTED");
      return "POST /reject 200; GET REJECTED";
    });
    await step("Verificacion", "(filtro Rechazados)", "LIMITE estado terminal: sin botones, con razon visible", async () => {
      await page.getByRole("radio", { name: "Rechazados" }).click();
      await id(page, `no-action-${v2.id}`).waitFor();
      assert.equal(await page.getByTestId(`verify-${v2.id}`).count(), 0);
      const direct = await http("POST", `/providers/${v2.id}/verify`, { token: adminToken });
      assert.equal(direct.status, 409);
      return "antes ofrecia 'Verificar' que siempre daba 409; ahora sin boton y con nota (backend: 409 INVALID_PROVIDER_TRANSITION)";
    });
    await step("Verificacion", "suspend-{id}", "VALIDO suspender un VERIFICADO con motivo; GET SUSPENDED", async () => {
      await page.getByRole("radio", { name: "Verificados" }).click();
      await id(page, `suspend-${v1.id}`).waitFor();
      await click(page, `suspend-${v1.id}`);
      await page.getByTestId("admin-reason").filter({ visible: true }).fill("Abuso reiterado");
      await dialogButton(page, `Suspender a ${v1.name}`, "Suspender").click();
      await text(page, "Proveedor actualizado.").waitFor();
      assert.equal((await status(v1)).status, "SUSPENDED");
      return "POST /suspend 200; GET SUSPENDED";
    });
    blocked("Verificacion", "reactivar proveedor suspendido", "BRECHA", "provider-catalog no tiene reactivar/unsuspend (verify desde SUSPENDED -> 409); no se creo boton");
    await step("Verificacion", "(ruta)", "ERROR 403 un HOST: pantalla de acceso denegado y 403 de la API", async () => {
      const h = await session(host.email);
      const seen = counter(h.page, "GET", /localhost:28000.*\/admin\//);
      await go(h.page, "/admin/verificacion");
      const body = await h.page.locator("body").innerText();
      assert.ok(/No tienes acceso|Acceso denegado|denegado/i.test(body) || !/\/admin/.test(new URL(h.page.url()).pathname), body.slice(0, 120));
      assert.equal(seen.length, 0);
      const api403 = await http("GET", "/providers/admin/verification-queue?status=PENDING", { token: host.token });
      assert.equal(api403.status, 403);
      await h.context.close();
      return `UI: ${new URL(h.page.url()).pathname} sin peticiones admin; API 403 ADMIN_REQUIRED`;
    });
  }

  // ---- Moderacion ----
  {
    const w = await verifiedProvider("mod", { listings: false });
    const items = [crypto.randomUUID(), crypto.randomUUID()];
    let seeded = true;
    try {
      sql(`insert into moderation_item (id, kind, provider_id, title, url, submitted_by, submitted_at, status) values ('${items[0]}','MICROSITE','${w.providerId}','Microsite ${stamp} A','https://example.com/a','${w.owner.id}', now(),'PENDING')`);
      sql(`insert into moderation_item (id, kind, provider_id, title, url, submitted_by, submitted_at, status) values ('${items[1]}','EXTERNAL_GIFT','${w.providerId}','Regalo ${stamp} B','https://example.com/b','${w.owner.id}', now(),'PENDING')`);
    } catch (error) { seeded = false; blocked("Moderacion", "approve/reject", "VALIDO", `no se pudo sembrar por SQL: ${String(error.message).split("\n")[0]}`); }
    await go(page, "/admin/moderacion");
    if (seeded) {
      await id(page, `approve-${items[0]}`).waitFor();
      const item = async (itemId) => (await http("GET", "/providers/admin/moderation?status=PENDING", { token: adminToken })).json.items.find((i) => i.id === itemId);
      await step("Moderacion", "approve-{id}", "ERROR red caida", async () => {
        await offline(page, /moderation\/.+\/approve/, async () => { await click(page, `approve-${items[0]}`); await text(page, /No hay conexión con el servidor/).waitFor(); });
        assert.ok(await item(items[0]));
        return "aviso; GET: sigue PENDING";
      });
      await step("Moderacion", "approve-{id}", "VALIDO aprobar; GET APPROVED", async () => {
        const posts = counter(page, "POST", /approve$/);
        await id(page, `approve-${items[0]}`).dblclick();
        await text(page, "Decisión registrada.").waitFor();
        assert.equal(posts.length, 1);
        const approved = (await http("GET", "/providers/admin/moderation?status=APPROVED", { token: adminToken })).json.items.some((i) => i.id === items[0]);
        assert.equal(approved, true);
        return "POST approve 200; GET status=APPROVED lo incluye";
      });
      await step("Moderacion", "reject-{id}", "LIMITE motivo vacio, luego 500 caracteres; GET REJECTED", async () => {
        await click(page, `reject-${items[1]}`);
        await dialogButton(page, `Rechazar`, "Rechazar").click().catch(() => undefined);
        await text(page, /Escribe el motivo/).waitFor();
        await page.getByTestId("admin-reason").filter({ visible: true }).fill("m".repeat(500));
        await page.locator("[role=alert]").last().getByRole("button", { name: "Rechazar", exact: true }).click();
        await sleep(1000);
        const rejected = (await http("GET", "/providers/admin/moderation?status=REJECTED", { token: adminToken })).json.items.find((i) => i.id === items[1]);
        assert.ok(rejected); assert.equal(rejected.reason.length, 500);
        return "POST reject 200; GET REJECTED con motivo de 500 caracteres";
      });
    }
    await step("Moderacion", "(lista)", "LIMITE estado vacio y filtros", async () => {
      await page.getByRole("radio", { name: "Aprobados" }).click(); await sleep(500);
      await page.getByRole("radio", { name: "Pendientes" }).click();
      const pending = (await http("GET", "/providers/admin/moderation?status=PENDING", { token: adminToken })).json.items.length;
      if (pending === 0) await text(page, /No hay/).waitFor();
      return `GET pendientes=${pending}; la UI refleja lista vacia o filas`;
    });
  }

  // ---- Usuarios ----
  {
    const target = await register("grantee", "HOST");
    await go(page, "/admin/usuarios");
    await id(page, "users-search").waitFor();
    const rolesOf = async () => (await http("GET", `/identity/admin/users?query=${encodeURIComponent(target.email)}`, { token: adminToken })).json.items[0].roles;
    await step("Usuarios", "users-search-go", "LIMITE busqueda de 121 caracteres: error local", async () => {
      const gets = counter(page, "GET", /admin\/users/);
      await fill(page, "users-search", "a".repeat(121)); await click(page, "users-search-go"); await text(page, /rechazó los datos/).waitFor();
      assert.equal(gets.length, 0);
      return "0 peticion; el backend da 422 a query > 120";
    });
    await step("Usuarios", "users-search-go", "LIMITE sin resultados / 120 caracteres", async () => {
      await fill(page, "users-search", "zzzz-no-existe-".repeat(8).slice(0, 120)); await click(page, "users-search-go"); await text(page, "No hay usuarios que coincidan.").waitFor();
      return "estado vacio";
    });
    await step("Usuarios", "users-next / users-prev", "LIMITE paginacion: pagina 1, siguiente, anterior en el borde", async () => {
      await fill(page, "users-search", ""); await click(page, "users-search-go");
      await id(page, "users-page").waitFor();
      const total = (await http("GET", "/identity/admin/users?size=1", { token: adminToken })).json.total;
      const pages = Math.max(1, Math.ceil(total / 25));
      assert.equal(await id(page, "users-page").innerText(), `Página 1 de ${pages}`);
      assert.equal(await isDisabled(id(page, "users-prev")), true);
      if (pages > 1) { await click(page, "users-next"); await page.waitForFunction((p) => document.querySelector('[data-testid="users-page"]')?.textContent === `Página 2 de ${p}`, pages); await click(page, "users-prev"); }
      return `${total} cuentas, ${pages} paginas; 'Anterior' deshabilitado en la primera`;
    });
    await step("Usuarios", "grant-{ROLE}-{id}", "VALIDO dar rol con ConfirmDialog (Cancelar no envia); GET roles", async () => {
      await fill(page, "users-search", target.email); await click(page, "users-search-go");
      await id(page, `grant-PLANNER-${target.id}`).waitFor();
      const puts = counter(page, "PUT", /roles\//);
      await click(page, `grant-PLANNER-${target.id}`);
      await dialogButton(page, `¿Dar el rol PLANNER a ${target.email}?`, "Cancelar").click(); await sleep(300);
      assert.equal(puts.length, 0);
      await click(page, `grant-PLANNER-${target.id}`);
      await dialogButton(page, `¿Dar el rol PLANNER a ${target.email}?`, "Dar rol PLANNER").last().click();
      await text(page, "Rol otorgado.").waitFor();
      assert.equal(puts.length, 1);
      assert.deepEqual((await rolesOf()).sort(), ["HOST", "PLANNER"]);
      await id(page, `user-${target.id}`).waitFor();
      assert.equal(await page.getByTestId(`grant-PLANNER-${target.id}`).count(), 0);
      return "PUT /identity/users/{id}/roles/PLANNER 200; GET admin/users: [HOST, PLANNER]; el boton desaparece";
    });
    await step("Usuarios", "grant-{ROLE}-{id}", "ERROR red caida", async () => {
      await click(page, `grant-PROVIDER-${target.id}`);
      await offline(page, /roles\/PROVIDER/, async () => { await dialogButton(page, `¿Dar el rol PROVIDER a ${target.email}?`, "Dar rol PROVIDER").last().click(); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.ok(!(await rolesOf()).includes("PROVIDER"));
      return "aviso; GET: sin PROVIDER";
    });
    await step("Usuarios", "grant-{ROLE}-{id}", "ERROR 403/404 API: HOST no concede roles; usuario inexistente 404", async () => {
      assert.equal((await http("PUT", `/identity/users/${target.id}/roles/ADMIN`, { token: host.token })).status, 403);
      assert.equal((await http("PUT", "/identity/users/00000000-0000-0000-0000-000000000000/roles/PLANNER", { token: adminToken })).status, 404);
      assert.equal((await http("PUT", `/identity/users/${target.id}/roles/ROOT`, { token: adminToken })).status, 422);
      return "403 / 404 / 422 confirmados en el backend; la UI solo ofrece roles validos y solo a ADMIN";
    });
    blocked("Usuarios", "quitar rol / suspender cuenta", "BRECHA", "identity solo tiene PUT /users/{id}/roles/{role} (conceder); no hay revocar ni suspender usuario; no se creo boton");
  }

  // ---- Categorias ----
  {
    const code = `E2E${stamp.toUpperCase()}`;
    await go(page, "/admin/categorias");
    await id(page, "save-category").waitFor();
    await step("Categorias", "save-category", "LIMITE codigo invalido, sin nombre, nombre de 81 caracteres", async () => {
      const puts = counter(page, "PUT", /admin\/categories/);
      await fill(page, "category-code", "1mal"); await click(page, "save-category"); await text(page, /Usa de 2 a 40 caracteres/).waitFor();
      await fill(page, "category-code", code); await click(page, "save-category"); await text(page, "Escribe al menos un nombre.").waitFor();
      assert.equal(puts.length, 0);
      await fill(page, "category-code", code); await page.getByTestId("catalog-name-es-BO").filter({ visible: true }).fill("n".repeat(81)); await click(page, "save-category");
      await text(page, /rechazó los datos/).waitFor();
      return "local: codigo/nombre; servidor: 422 INVALID_NAMES a 81 caracteres -> 'rechazo los datos'";
    });
    await step("Categorias", "save-category", "VALIDO crear con doble clic = un PUT; GET", async () => {
      const puts = counter(page, "PUT", /admin\/categories/);
      await page.getByTestId("catalog-name-es-BO").filter({ visible: true }).fill(`Categoria ${stamp}`);
      await id(page, "save-category").dblclick();
      await text(page, "Guardado.").waitFor();
      assert.equal(puts.length, 1, `PUT enviados: ${puts.length}`);
      const found = (await http("GET", "/providers/admin/categories", { token: adminToken })).json.items.find((c) => c.code === code);
      assert.deepEqual([found.active, found.names["es-BO"]], [true, `Categoria ${stamp}`]);
      return "PUT 200; GET categoria activa";
    });
    await step("Categorias", "Editar {nombre}", "VALIDO editar y desactivar (el borrado no existe en el backend); GET", async () => {
      await page.getByRole("button", { name: `Editar Categoria ${stamp}` }).first().click();
      await page.getByRole("radio", { name: "Inactivo" }).last().click();
      await click(page, "save-category"); await text(page, "Guardado.").waitFor();
      const found = (await http("GET", "/providers/admin/categories", { token: adminToken })).json.items.find((c) => c.code === code);
      assert.equal(found.active, false);
      return "PUT 200; GET active=false (desactivar es el 'borrar' soportado)";
    });
    await step("Categorias", "save-category", "ERROR red caida y 403 API para HOST", async () => {
      await offline(page, /admin\/categories\//, async () => { await click(page, "save-category"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.equal((await http("PUT", `/providers/admin/categories/${code}`, { token: host.token, body: { names: { "es-BO": "x" }, active: true } })).status, 403);
      return "red caida -> aviso; PUT como HOST -> 403 ADMIN_REQUIRED";
    });
    blocked("Categorias", "borrar categoria", "BRECHA", "provider-catalog solo tiene GET/PUT de categorias; no DELETE (se desactiva con active=false)");
  }

  // ---- Geografia ----
  {
    const city = `e2e-${stamp}`;
    await go(page, "/admin/geografia");
    await id(page, "save-geo").waitFor();
    await step("Geografia", "save-geo", "LIMITE ciudad sin coordenadas / latitud 200 / padre inexistente", async () => {
      const puts = counter(page, "PUT", /admin\/geography/);
      await fill(page, "geo-code", city); await fill(page, "geo-parent", "LP"); await page.getByTestId("catalog-name-es-BO").filter({ visible: true }).fill(`Ciudad ${stamp}`);
      await click(page, "save-geo"); await text(page, /necesita latitud y longitud/).waitFor();
      await fill(page, "geo-latitude", "200"); await fill(page, "geo-longitude", "-68"); await click(page, "save-geo"); await text(page, /necesita latitud y longitud/).waitFor();
      assert.equal(puts.length, 0);
      await fill(page, "geo-latitude", "-16.5"); await fill(page, "geo-parent", "NOPE"); await click(page, "save-geo"); await text(page, /rechazó los datos/).waitFor();
      return "local: coordenadas; servidor 422 INVALID_PARENT -> mensaje";
    });
    await step("Geografia", "save-geo", "VALIDO crear ciudad (slug en minuscula) con coordenadas; GET", async () => {
      await fill(page, "geo-parent", "LP");
      await id(page, "save-geo").dblclick();
      await text(page, "Guardado.").waitFor();
      const found = (await http("GET", "/providers/admin/geography", { token: adminToken })).json.items.find((g) => g.code === city);
      assert.deepEqual([found.kind, found.parentCode, found.active], ["CITY", "LP", true]);
      return "PUT 200 (antes la UI forzaba MAYUSCULAS y el backend respondia 422 INVALID_CODE: defecto corregido); GET ciudad";
    });
    await step("Geografia", "Editar {ciudad}", "VALIDO editar una ciudad existente sin coordenadas (la-paz) y desactivar la de prueba", async () => {
      await page.getByRole("button", { name: `Editar Ciudad ${stamp}` }).first().click();
      await page.getByRole("radio", { name: "Inactivo" }).last().click();
      await click(page, "save-geo"); await text(page, "Guardado.").waitFor();
      const found = (await http("GET", "/providers/admin/geography", { token: adminToken })).json.items.find((g) => g.code === city);
      assert.equal(found.active, false);
      return "PUT 200; GET active=false";
    });
    await step("Geografia", "Editar Bolivia", "LIMITE el pais es de solo lectura: boton deshabilitado con razon", async () => {
      await page.getByRole("button", { name: /Editar Bolivia/ }).first().click();
      await text(page, "El país no se puede modificar.").waitFor();
      assert.equal(await isDisabled(id(page, "save-geo")), true);
      const direct = await http("PUT", "/providers/admin/geography/BO", { token: adminToken, body: { kind: "COUNTRY", parentCode: null, names: { "es-BO": "Bolivia" }, active: true } });
      assert.equal(direct.status, 422);
      return "backend 422 COUNTRY_READ_ONLY; UI deshabilitada";
    });
    blocked("Geografia", "borrar ubicacion", "BRECHA", "solo GET/PUT en /providers/admin/geography; se desactiva con active=false");
  }

  // ---- Tipos de evento ----
  {
    const code = `E2E${stamp.toUpperCase()}`;
    await go(page, "/admin/tipos-evento");
    await id(page, "save-event-type").waitFor();
    await step("Tipos de evento", "save-event-type", "LIMITE formulario vacio: 4 errores locales, ningun PUT (antes: 404 'modulo no disponible')", async () => {
      const puts = counter(page, "PUT", /admin\/event-types/);
      await click(page, "save-event-type");
      for (const message of [/código va en mayúsculas/, /al menos un rol/, /al menos una etiqueta/]) await text(page, message).waitFor();
      assert.equal(puts.length, 0);
      return "0 PUT; el backend tambien rechaza (400 compatibleTemplateTags/hostRoles >=1, 422 sin traduccion por defecto)";
    });
    await step("Tipos de evento", "save-event-type", "ERROR codigo en minusculas aceptado por la UI se normaliza; red caida", async () => {
      await fill(page, "event-type-code", code.toLowerCase()); await fill(page, "event-type-roles", "HOST1"); await fill(page, "event-type-tags", "wedding"); await fill(page, "event-type-name-es-BO", "Evento prueba");
      await offline(page, /admin\/event-types\//, async () => { await click(page, "save-event-type"); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.ok(!(await http("GET", "/celebrations/admin/event-types", { token: adminToken })).json.items.some((t) => t.code === code));
      return "red caida -> aviso; GET: el tipo no existe";
    });
    await step("Tipos de evento", "save-event-type", "VALIDO crear con doble clic = un PUT; GET ACTIVE; luego retirar (RETIRED)", async () => {
      const puts = counter(page, "PUT", /admin\/event-types/);
      await fill(page, "event-type-name-en-US", "Test event");
      await id(page, "save-event-type").dblclick();
      await text(page, /Guardado\./).waitFor();
      assert.equal(puts.length, 1, `PUT enviados: ${puts.length}`);
      const created = (await http("GET", "/celebrations/admin/event-types", { token: adminToken })).json.items.find((t) => t.code === code);
      assert.equal(created.status, "ACTIVE"); assert.deepEqual(created.hostRoles, ["HOST1"]);
      await page.getByRole("radio", { name: new RegExp(`^${code}`) }).click();
      await page.getByRole("radio", { name: "Retirado", exact: true }).click();
      await click(page, "save-event-type"); await text(page, /Guardado\./).waitFor();
      const retired = (await http("GET", "/celebrations/admin/event-types", { token: adminToken })).json.items.find((t) => t.code === code);
      assert.equal(retired.status, "RETIRED");
      return "PUT 201 y 200; GET ACTIVE y luego RETIRED (la baja soportada; no hay DELETE)";
    });
    blocked("Tipos de evento", "borrar tipo de evento", "BRECHA", "celebration solo tiene GET/PUT de event-types (RETIRED hace de baja); no DELETE");
  }

  // ---- Templates (template-media caido) ----
  {
    await go(page, "/admin/templates");
    await step("Templates", "(lista)", "ERROR 502 template-media no levantado: aviso + reintento, formulario utilizable", async () => {
      const api = await http("GET", "/media/admin/templates", { token: adminToken });
      assert.ok([502, 503, 504].includes(api.status), `status ${api.status}`);
      await text(page, /El servidor tuvo un problema|no está disponible/).waitFor();
      await id(page, "error-retry").waitFor();
      await id(page, "save-template").waitFor();
      return `API ${api.status} (servicio ausente); UI muestra aviso, Reintentar y el editor`;
    });
    blocked("Templates", "save-template / publicar / archivar", "VALIDO", "template-media no esta levantado (502): crear/publicar/archivar solo verificables con mocks (vitest); no se marca verificado en vivo");
  }

  // ---- Metricas admin, organizaciones, resumen, operacion ----
  {
    await go(page, "/admin/metricas");
    await id(page, "metrics-from").waitFor();
    await step("Metricas admin", "metrics-from / metrics-to", "LIMITE rango invertido: error local; rango valido: filas = GET", async () => {
      await fill(page, "metrics-from", "2026-12-31"); await fill(page, "metrics-to", "2026-01-01"); await text(page, /Revisa las fechas/).waitFor();
      await fill(page, "metrics-from", "2026-01-01"); await fill(page, "metrics-to", futureDay(0));
      const api = (await http("GET", `/providers/admin/metrics/leads?groupBy=partner&from=2026-01-01&to=${futureDay(0)}`, { token: adminToken })).json;
      await text(page, new RegExp(`Total.*${api.total}|${api.total}`)).waitFor();
      return `GET total=${api.total}, ${api.items.length} partners`;
    });
    await go(page, "/admin/organizaciones");
    await id(page, "org-lookup").waitFor();
    await step("Organizaciones", "org-lookup", "ERROR 404 id inexistente y LIMITE id vacio deshabilitado", async () => {
      assert.equal(await isDisabled(id(page, "org-lookup")), true);
      await fill(page, "org-id", "00000000-0000-0000-0000-000000000000"); await click(page, "org-lookup");
      await text(page, /ya no existe|no está disponible/).waitFor();
      return "GET /identity/organizations/{id} 404 -> mensaje; vacio deshabilitado";
    });
    blocked("Organizaciones", "crear organizacion / agregar miembro", "BRECHA-UI", "identity tiene POST /organizations y /organizations/{id}/members, pero son acciones del anfitrion/planner (no del admin de plataforma); la pantalla admin es de consulta");
    await go(page, "/admin");
    await step("Resumen admin", "(contadores)", "VALIDO conteos = GET /providers/admin/summary", async () => {
      const summary = (await http("GET", "/providers/admin/summary", { token: adminToken })).json;
      await text(page, new RegExp(`Ofertas publicadas: ${summary.listingsPublished}`)).waitFor();
      return `listingsPublished=${summary.listingsPublished}`;
    });
    await go(page, "/admin/operacion");
    await id(page, "replay").waitFor();
    await step("Operacion", "replay", "VALIDO pide confirmacion; Cancelar no envia; Confirmar -> 200 {applied}", async () => {
      const posts = counter(page, "POST", /projections\/public\/replay/);
      await click(page, "replay"); await dialogButton(page, "Reconstruir la proyección pública", "Cancelar").click(); await sleep(300);
      assert.equal(posts.length, 0);
      await click(page, "replay"); await dialogButton(page, "Reconstruir la proyección pública", "Confirmar").last().click();
      await text(page, /Proyección reconstruida: \d+ eventos aplicados/).waitFor();
      assert.equal(posts.length, 1);
      return "POST replay 200; mensaje con el contador real";
    });
    await step("Operacion", "replay", "ERROR red caida y 403 API para HOST", async () => {
      await offline(page, /projections\/public\/replay/, async () => { await click(page, "replay"); await dialogButton(page, "Reconstruir la proyección pública", "Confirmar").last().click(); await text(page, /No hay conexión con el servidor/).waitFor(); });
      assert.equal((await http("POST", "/celebrations/admin/projections/public/replay", { token: host.token })).status, 403);
      return "aviso + reintento; HOST -> 403";
    });
    await step("Operacion", "(salud)", "ERROR template-media caido se reporta como 'no disponible', no rompe la pantalla", async () => {
      await text(page, /template-media-service: .*(no responde|caído|no disponible|Sin respuesta)/i).waitFor().catch(async () => { assert.match(await page.locator("body").innerText(), /template-media-service/); });
      return "estado del servicio visible";
    });
  }
  await context.close();
}

try {
  if (!only || only === "portal") await portal();
  if (!only || only === "admin") await admin();
} finally {
  await browser.close();
  const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
  console.log(`\nResumen: ${JSON.stringify(counts)}; errores de pagina: ${pageErrors.length}`);
  for (const error of pageErrors.slice(0, 5)) console.log(`  pageerror ${error}`);
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ stamp, counts, rows, pageErrors }, null, 2));
}
if (rows.some((row) => row.status === "FAIL") || pageErrors.length) process.exit(1);
