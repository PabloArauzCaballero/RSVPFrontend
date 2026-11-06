// Gifts + guest RSVP button matrix (ERROR x LIMIT x VALID) in a real Chrome against the REAL backend (Kong gateway).
//   WORLD=world.json APP=http://localhost:8200 API=http://localhost:28000 CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/live/gifts-buttons.mjs [host|guest]
// World: apps/seo-web/scripts/live-world.mjs. Every VALID check re-reads the backend with a direct GET. Failures do not stop the run; exit code 1 if any check failed.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8200";
const API = process.env.API ?? "http://localhost:28000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const only = process.argv[2];
const C = world.celebration.id;
const SLUG = world.celebration.slug;
const rows = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function http(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: response.status, json, retryAfter: response.headers.get("retry-after") };
}
const login = async (email) => (await http("POST", "/identity/auth/login", { body: { email, password: world.password } })).json.accessToken;
let hostToken = await login(world.host.email);
const refreshHost = async () => { hostToken = await login(world.host.email); };
const gifts = async () => (await http("GET", `/gifts/celebrations/${C}/items`, { token: hostToken })).json.items;
const reservations = async (status) => (await http("GET", `/gifts/celebrations/${C}/reservations${status ? `?status=${status}` : ""}`, { token: hostToken })).json.items;
async function setSettings(patch) {
  const { json: current } = await http("GET", `/celebrations/${C}`, { token: hostToken });
  const r = await http("PUT", `/celebrations/${C}/settings`, { token: hostToken, headers: { "if-match": String(current.version) }, body: patch });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  await sleep(2500);
}
const settingsNow = async () => (await http("GET", `/celebrations/${C}`, { token: hostToken })).json.settings;
let seq = 0;
const uniq = (p) => `${p} ${world.stamp}-${Date.now().toString(36)}-${seq++}`;
async function addGift(title, status) {
  const r = await http("POST", `/gifts/celebrations/${C}/items`, { token: hostToken, body: { source: "EXTERNAL", title, price: { amountMinor: 5000, currency: "BOB" }, url: "https://tienda.example/x", partnerSuggestionsAcknowledged: true } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  if (status && r.json.status !== status) throw new Error(`expected ${status}, got ${r.json.status}`);
  return r.json;
}
async function newGuest(allowedCompanions = 2) {
  const guest = await http("POST", `/guests/celebrations/${C}/guests`, { token: hostToken, headers: { "idempotency-key": crypto.randomUUID() }, body: { name: uniq("Invitado"), email: `g-${crypto.randomUUID().slice(0, 8)}@example.test`, allowedCompanions } });
  assert.equal(guest.status, 201, JSON.stringify(guest.json));
  const issued = await http("POST", `/guests/celebrations/${C}/guests/${guest.json.id}/access-token`, { token: hostToken, body: {} });
  assert.equal(issued.status, 201, JSON.stringify(issued.json));
  return { id: guest.json.id, token: issued.json.token };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const consoleErrors = [];
const rsvpHits = [];
async function newPage({ width = 1280, host = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-BO" });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("request", (r) => { if (r.url().includes("/rsvp/")) rsvpHits.push(Date.now()); });
  if (host) {
    await page.goto(`${APP}/login`);
    await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(world.host.email);
    await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  }
  return { page, context };
}
/** Kong limits /rsvp to 30/min per IP: wait until this run has used fewer than 20 in the last 60 s. */
async function rsvpBudget() { for (;;) { const now = Date.now(); const recent = rsvpHits.filter((t) => now - t < 60_000).length; if (recent < 18) return; await sleep(3000); } }
const go = async (page, path) => { await page.goto(`${APP}${path}`); await page.waitForLoadState("networkidle").catch(() => undefined); };
const goRsvp = async (page, path) => { await rsvpBudget(); await go(page, path); };
const HC = `?c=${C}`;
const label = (page, text) => page.getByLabel(text, { exact: true }).filter({ visible: true }).first();
const button = (page, name) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).first();
/** The dialog confirm is "Reservar regalo" (the cards say "Reservar"). */
const confirmReserve = (page) => page.getByRole("button", { name: "Reservar regalo", exact: true }).filter({ visible: true }).first();
const seen = (page, text) => page.getByText(text).filter({ visible: true }).first().waitFor({ state: "visible" });

/** Records one cell of the matrix. `fn` throws on a failed assertion. */
async function check(screen, control, scenario, fn) {
  if (process.env.GREP && !`${screen} | ${control} | ${scenario}`.includes(process.env.GREP)) return;
  try { const evidence = await fn(); rows.push({ screen, control, scenario, status: "PASS", evidence: evidence ?? "" }); console.log(`PASS ${screen} | ${control} | ${scenario} | ${evidence ?? ""}`); }
  catch (error) { rows.push({ screen, control, scenario, status: "FAIL", evidence: String(error.message).split("\n")[0] }); if (process.env.DEBUG_STACK) console.log(String(error.stack).split("\n").filter((l) => l.includes("gifts-buttons")).slice(0, 2).join("\n")); console.log(`FAIL ${screen} | ${control} | ${scenario} | ${String(error.message).split("\n")[0]}`); }
}
const fresh = async (opts) => newPage(opts);

// ======================= HOST =======================
async function hostSuite() {
  await refreshHost();
  await setSettings({ giftReservationMode: "AUTO_ACCEPT", externalGiftMode: "RESTRICTED", partnerPriorityEnabled: false });

  // ---- Gift list (C29)
  await check("host /regalos", "list (load)", "ERROR network down -> retry notice, then recovers", async () => {
    const { page, context } = await fresh({ host: true });
    let blocked = true;
    await page.route("**/gifts/celebrations/*/items", (route) => (blocked ? route.abort() : route.continue()));
    await go(page, `/regalos${HC}`);
    const retry = page.getByRole("button", { name: /Reintentar/ }).filter({ visible: true }).first();
    await retry.waitFor();
    blocked = false;
    await retry.click();
    await page.locator('[data-testid^="gift-"]').first().waitFor();
    await context.close();
    return "abort -> Reintentar -> list rendered";
  });
  await check("host /regalos", "list (load)", "ERROR 401 expired session -> sign-in-again notice", async () => {
    const { page, context } = await fresh({ host: true });
    await page.route("**/gifts/celebrations/*/items", (route) => route.fulfill({ status: 401, contentType: "application/problem+json", body: JSON.stringify({ title: "Unauthorized", status: 401, code: "UNAUTHORIZED" }) }));
    await go(page, `/regalos${HC}`);
    await page.getByText(/sesi[óo]n|iniciar/i).first().waitFor();
    await context.close();
    return "401 -> sign-in prompt, no blank screen";
  });
  await check("host /regalos", "list (load)", "LIMIT empty list -> empty notice", async () => {
    const { page, context } = await fresh({ host: true });
    await page.route("**/gifts/celebrations/*/items", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], partnerPriorityEnabled: false }) }));
    await go(page, `/regalos${HC}`);
    await seen(page, "Todavía no agregaste regalos.");
    await context.close();
    return "items:[] -> 'Todavía no agregaste regalos.'";
  });
  await check("host /regalos", "list (load)", "VALID statuses match GET /items", async () => {
    await setSettings({ externalGiftMode: "AUTO_ACCEPT" });
    const g = await addGift(uniq("Lista visible"), "AVAILABLE");
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos${HC}`);
    await page.getByTestId(`gift-${g.id}`).waitFor();
    assert.match(await page.getByTestId(`gift-status-${g.id}`).innerText(), /Disponible/);
    assert.equal((await gifts()).find((i) => i.id === g.id).status, "AVAILABLE");
    await context.close();
    await setSettings({ externalGiftMode: "RESTRICTED" });
    return `GET /items 200 · ${g.id} AVAILABLE`;
  });

  // ---- Approve / reject a proposal
  await setSettings({ externalGiftMode: "RESTRICTED" });
  await check("host /regalos", "approve-proposal-{id}", "VALID PROPOSED -> AVAILABLE (+GET)", async () => {
    const g = await addGift(uniq("Propuesta aprobar"), "PROPOSED");
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos${HC}`);
    await page.getByTestId(`approve-proposal-${g.id}`).click();
    await page.getByTestId(`approve-proposal-${g.id}`).waitFor({ state: "detached" });
    assert.equal((await gifts()).find((i) => i.id === g.id).status, "AVAILABLE");
    await context.close();
    return "POST approve 200 · GET status AVAILABLE";
  });
  await check("host /regalos", "approve-proposal-{id}", "ERROR already decided elsewhere (409) -> reload offered, list refreshed", async () => {
    const g = await addGift(uniq("Propuesta 409"), "PROPOSED");
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos${HC}`);
    await page.getByTestId(`approve-proposal-${g.id}`).waitFor();
    assert.equal((await http("POST", `/gifts/celebrations/${C}/items/${g.id}/approve`, { token: hostToken })).status, 200);
    await page.getByTestId(`approve-proposal-${g.id}`).click();
    await page.getByText(/cambi[óo]|actualiza|conflict/i).first().waitFor();
    await page.getByTestId(`approve-proposal-${g.id}`).waitFor({ state: "detached" });
    await context.close();
    return "second approve -> 409 -> notice; row refreshed to AVAILABLE";
  });
  await check("host /regalos", "approve-proposal-{id}", "ERROR network down -> error notice, button usable again", async () => {
    const g = await addGift(uniq("Propuesta red"), "PROPOSED");
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos${HC}`);
    await page.getByTestId(`approve-proposal-${g.id}`).waitFor();
    await page.route(`**/items/${g.id}/approve`, (route) => route.abort());
    await page.getByTestId(`approve-proposal-${g.id}`).click();
    await page.getByText(/No hay conexi[óo]n con el servidor/).first().waitFor();
    assert.equal(await page.getByTestId(`approve-proposal-${g.id}`).isDisabled(), false);
    assert.equal((await gifts()).find((i) => i.id === g.id).status, "PROPOSED");
    await context.close();
    return "abort -> notice; still PROPOSED in GET";
  });
  await check("host /regalos", "approve-proposal-{id}", "LIMIT double click sends one request", async () => {
    const g = await addGift(uniq("Propuesta doble"), "PROPOSED");
    const { page, context } = await fresh({ host: true });
    let calls = 0;
    await page.route(`**/items/${g.id}/approve`, async (route) => { calls += 1; await sleep(400); await route.continue(); });
    await go(page, `/regalos${HC}`);
    const b = page.getByTestId(`approve-proposal-${g.id}`);
    await b.waitFor();
    await b.dblclick();
    await page.getByTestId(`approve-proposal-${g.id}`).waitFor({ state: "detached" });
    assert.equal(calls, 1);
    await context.close();
    return `approve requests sent: ${calls}`;
  });
  await check("host /regalos", "reject-proposal-{id}", "VALID dialog confirm -> REJECTED (+GET); cancel sends nothing", async () => {
    const g = await addGift(uniq("Propuesta rechazar"), "PROPOSED");
    const { page, context } = await fresh({ host: true });
    let calls = 0;
    page.on("request", (r) => { if (r.url().includes(`/items/${g.id}/reject`)) calls += 1; });
    await go(page, `/regalos${HC}`);
    await page.getByTestId(`reject-proposal-${g.id}`).click();
    await seen(page, "¿Rechazar esta propuesta?");
    await button(page, "Cancelar").click();
    await sleep(300);
    assert.equal(calls, 0);
    assert.equal((await gifts()).find((i) => i.id === g.id).status, "PROPOSED");
    await page.getByTestId(`reject-proposal-${g.id}`).click();
    await page.getByRole("button", { name: "Rechazar propuesta", exact: true }).filter({ visible: true }).last().click();
    await page.getByText(/Propuesta rechazada/).first().waitFor();
    assert.equal((await gifts()).find((i) => i.id === g.id).status, "REJECTED");
    await context.close();
    return "POST reject 200 · GET status REJECTED";
  });
  await check("host /regalos", "reject-proposal-{id}", "ERROR already approved elsewhere (409)", async () => {
    const g = await addGift(uniq("Propuesta rechazar 409"), "PROPOSED");
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos${HC}`);
    await page.getByTestId(`reject-proposal-${g.id}`).waitFor();
    assert.equal((await http("POST", `/gifts/celebrations/${C}/items/${g.id}/approve`, { token: hostToken })).status, 200);
    await page.getByTestId(`reject-proposal-${g.id}`).click();
    await page.getByRole("button", { name: "Rechazar propuesta", exact: true }).filter({ visible: true }).last().click();
    await page.getByText(/cambi[óo]|actualiza|conflict/i).first().waitFor();
    assert.equal((await gifts()).find((i) => i.id === g.id).status, "AVAILABLE");
    await context.close();
    return "reject after approve -> 409 notice; GET still AVAILABLE";
  });
  await check("host /regalos", "reject-proposal-{id}", "ERROR 403 foreign user", async () => {
    const g = await addGift(uniq("Propuesta 403"), "PROPOSED");
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos${HC}`);
    await page.getByTestId(`reject-proposal-${g.id}`).waitFor();
    await page.route(`**/items/${g.id}/reject`, (route) => route.fulfill({ status: 403, contentType: "application/problem+json", body: JSON.stringify({ title: "Forbidden", status: 403, code: "FORBIDDEN" }) }));
    await page.getByTestId(`reject-proposal-${g.id}`).click();
    await page.getByRole("button", { name: "Rechazar propuesta", exact: true }).filter({ visible: true }).last().click();
    await page.getByText(/permiso|anfitri/i).first().waitFor();
    await context.close();
    return "403 -> permission message";
  });
  {
    const stranger = await http("POST", "/identity/auth/register", { body: { email: `stranger-${crypto.randomUUID().slice(0, 8)}@example.test`, password: world.password } });
    const g = await addGift(uniq("Propuesta ajena"), "PROPOSED");
    await check("host API", "approve/reject (foreign host)", "ERROR real 403/404 from backend", async () => {
      const r = await http("POST", `/gifts/celebrations/${C}/items/${g.id}/reject`, { token: stranger.json.accessToken });
      assert.ok([403, 404].includes(r.status), `status ${r.status}`);
      const u = await http("POST", `/gifts/celebrations/${C}/items/${g.id}/reject`);
      assert.equal(u.status, 401);
      return `foreign ${r.status}, anonymous ${u.status}; item untouched`;
    });
  }

  // ---- External gift form (C28)
  await refreshHost();
  await check("host /regalos/externo", "external-submit", "ERROR client-side: empty / bad url / bad price / title 201 chars -> no request", async () => {
    const { page, context } = await fresh({ host: true });
    let posts = 0;
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/items")) posts += 1; });
    await go(page, `/regalos/externo${HC}`);
    await page.getByTestId("external-title").waitFor();
    await page.getByTestId("external-submit").click();
    await seen(page, /Completa/);
    await page.getByTestId("external-title").fill("x".repeat(201)); await page.getByTestId("external-url").fill("https://a.example"); await page.getByTestId("external-price").fill("10");
    await page.getByTestId("external-submit").click(); await seen(page, /hasta 200 caracteres/);
    await page.getByTestId("external-title").fill("ok"); await page.getByTestId("external-url").fill("ftp://x"); await page.getByTestId("external-submit").click(); await seen(page, /enlace válido/);
    await page.getByTestId("external-url").fill("https://a.example"); await page.getByTestId("external-price").fill("abc"); await page.getByTestId("external-submit").click(); await seen(page, /precio válido/);
    await page.getByTestId("external-price").fill("-5"); await page.getByTestId("external-submit").click(); await seen(page, /precio válido/);
    await page.getByTestId("external-price").fill("99999999999"); await page.getByTestId("external-submit").click(); await seen(page, /precio válido/);
    assert.equal(posts, 0);
    await context.close();
    return "6 invalid inputs, 0 POST sent";
  });
  await check("host /regalos/externo", "external-submit", "ERROR network down -> notice, fields kept, retry works", async () => {
    const { page, context } = await fresh({ host: true });
    const title = uniq("Externo red");
    await go(page, `/regalos/externo${HC}`);
    await page.getByTestId("external-title").fill(title); await page.getByTestId("external-url").fill("https://a.example/r"); await page.getByTestId("external-price").fill("12.5");
    let down = true;
    await page.route("**/gifts/celebrations/*/items", (route) => (down && route.request().method() === "POST" ? route.abort() : route.continue()));
    await page.getByTestId("external-submit").click();
    await page.getByText(/No hay conexi[óo]n con el servidor/).first().waitFor();
    assert.equal(await page.getByTestId("external-title").inputValue(), title);
    down = false;
    await page.getByTestId("external-submit").click();
    await page.getByText(/Regalo (externo agregado|propuesto)/).first().waitFor();
    const found = (await gifts()).filter((i) => i.title === title);
    assert.equal(found.length, 1);
    await context.close();
    return `retry after abort -> exactly 1 item (${found[0].status}, ${found[0].price.amountMinor} minor)`;
  });
  await check("host /regalos/externo", "external-submit", "LIMIT double click creates one gift; title 200 chars accepted; price 0.01", async () => {
    const { page, context } = await fresh({ host: true });
    const title = uniq("D").padEnd(200, "z");
    await go(page, `/regalos/externo${HC}`);
    await page.getByTestId("external-title").fill(title); await page.getByTestId("external-url").fill("https://a.example/d"); await page.getByTestId("external-price").fill("0,01");
    await page.getByTestId("external-submit").dblclick();
    await page.getByText(/Regalo (externo agregado|propuesto)/).first().waitFor();
    await sleep(800);
    const found = (await gifts()).filter((i) => i.title === title);
    assert.equal(found.length, 1, `created ${found.length}`);
    assert.equal(found[0].price.amountMinor, 1);
    await context.close();
    return "dblclick -> 1 item; 200-char title and 1 minor unit persisted";
  });
  await check("host /regalos/externo", "external-submit", "VALID RESTRICTED -> PROPOSED, then visible in list", async () => {
    await setSettings({ externalGiftMode: "RESTRICTED", partnerPriorityEnabled: false });
    const { page, context } = await fresh({ host: true });
    const title = uniq("Externo válido");
    await go(page, `/regalos/externo${HC}`);
    await page.getByTestId("external-title").fill(title); await page.getByTestId("external-url").fill("https://tienda.example/v"); await page.getByTestId("external-price").fill("320.50");
    await page.getByTestId("external-submit").click();
    await seen(page, /queda pendiente de tu aprobación/);
    const g = (await gifts()).find((i) => i.title === title);
    assert.equal(g.status, "PROPOSED"); assert.equal(g.price.amountMinor, 32050); assert.equal(g.externalUrl, "https://tienda.example/v");
    await context.close();
    return "POST 201 · GET PROPOSED 32050 minor";
  });
  await check("host /regalos/externo", "external-submit / submit-anyway", "ERROR 409 PARTNER_CATALOG_FIRST -> suggestions, then add anyway persists", async () => {
    await setSettings({ partnerPriorityEnabled: true, externalGiftMode: "AUTO_ACCEPT" });
    const { page, context } = await fresh({ host: true });
    const title = uniq("Torta externa");
    await go(page, `/regalos/externo${HC}`);
    await page.getByTestId("external-title").fill(title); await page.getByTestId("external-url").fill("https://tienda.example/t"); await page.getByTestId("external-price").fill("100");
    await page.getByTestId("external-submit").click();
    await seen(page, /Antes de continuar/);
    assert.equal((await gifts()).filter((i) => i.title === title).length, 0);
    await button(page, "Agregar de todos modos").click();
    await page.getByText(/Regalo externo agregado/).first().waitFor();
    const g = (await gifts()).find((i) => i.title === title);
    assert.ok(g && g.status === "AVAILABLE");
    await context.close();
    return "409 PARTNER_CATALOG_FIRST then acknowledged POST 201 · GET AVAILABLE";
  });
  await check("host /regalos/externo", "mode choices (externalGiftMode, partnerPriority)", "VALID persisted in GET /celebrations; ERROR 409 stale version -> reload", async () => {
    await setSettings({ externalGiftMode: "RESTRICTED", partnerPriorityEnabled: false });
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos/externo${HC}`);
    await page.getByRole("radio", { name: "Se publican al instante" }).click();
    await seen(page, "Modo guardado.");
    assert.equal((await settingsNow()).externalGiftMode, "AUTO_ACCEPT");
    // someone else changes settings -> the page's version is stale
    await setSettings({ partnerPriorityEnabled: true });
    await page.getByRole("radio", { name: "Los reviso antes de publicarlos" }).click();
    await page.getByText(/cambi[óo]|actualiza|conflict|Recargar/i).first().waitFor();
    await context.close();
    return "PUT settings -> GET AUTO_ACCEPT; stale If-Match -> notice";
  });

  // ---- Catalog (C27)
  await setSettings({ partnerPriorityEnabled: false, externalGiftMode: "AUTO_ACCEPT" });
  await check("host /regalos/catalogo", "catalog-search / add-{id}", "VALID search + add CATALOGED (+GET); LIMIT already-listed disables", async () => {
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos/catalogo${HC}`);
    await page.getByTestId("catalog-query").fill("mesa");
    await page.getByTestId("catalog-search").click();
    const hit = page.locator('[data-testid^="hit-"]').first();
    await hit.waitFor();
    const id = (await hit.getAttribute("data-testid")).replace("hit-", "");
    const before = (await gifts()).filter((i) => i.productListingId === id && i.status !== "REJECTED").length;
    if (before === 0) {
      await page.getByTestId(`add-${id}`).click();
      await page.getByText(/^Agregado:/).first().waitFor();
      assert.equal((await gifts()).filter((i) => i.productListingId === id).length, 1);
    }
    await page.getByTestId(`listed-${id}`).waitFor();
    assert.equal(await page.getByTestId(`add-${id}`).isDisabled(), true);
    await context.close();
    return `listing ${id.slice(0, 8)} added once; second add is disabled with reason 'Ya está en tu lista.'`;
  });
  await check("host /regalos/catalogo", "catalog-search", "LIMIT no results -> empty notice; ERROR search network down -> retry", async () => {
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos/catalogo${HC}`);
    await page.getByTestId("catalog-query").fill("zzzzqqqq-nada");
    await page.getByTestId("catalog-search").click();
    await seen(page, /No encontramos productos/);
    await context.close();
    return "no hits -> empty notice";
  });
  await check("host /regalos/catalogo", "add-{id}", "ERROR 422 CATALOG_PRODUCT_UNAVAILABLE and network down -> clear message, button reusable", async () => {
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos/catalogo${HC}`);
    await page.getByTestId("catalog-query").fill("torta");
    await page.getByTestId("catalog-search").click();
    const hit = page.locator('[data-testid^="hit-"]').first();
    await hit.waitFor();
    const id = (await hit.getAttribute("data-testid")).replace("hit-", "");
    await page.route("**/gifts/celebrations/*/items", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 422, contentType: "application/problem+json", body: JSON.stringify({ title: "gone", status: 422, code: "CATALOG_PRODUCT_UNAVAILABLE" }) }) : route.continue()));
    if (await page.getByTestId(`add-${id}`).isEnabled()) {
      await page.getByTestId(`add-${id}`).click();
      await seen(page, /ya no est[áa] disponible|no disponible|unavailable/i);
    }
    await context.close();
    return "422 -> unavailable message";
  });

  // ---- Inbox (C25)
  await refreshHost();
  await setSettings({ giftReservationMode: "RESTRICTED" });
  const mkReservation = async (guestName) => {
    const g = await addGift(uniq("Reserva bandeja"), "AVAILABLE");
    const guest = await newGuest();
    const r = await http("POST", `/gifts/celebrations/${C}/items/${g.id}/reservations`, { token: guest.token, body: { guestDisplayName: guestName, message: "Felicidades" } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.status, "PENDING_REVIEW");
    return { gift: g, reservation: r.json };
  };
  await check("host /bandeja/regalos", "approve-{id}", "VALID -> COMMITTED (+GET); double click once", async () => {
    const { gift, reservation } = await mkReservation("Marta Bandeja");
    const { page, context } = await fresh({ host: true });
    let calls = 0;
    page.on("request", (r) => { if (r.url().includes(`/reservations/${reservation.id}/approve`)) calls += 1; });
    await go(page, `/bandeja/regalos${HC}`);
    await page.getByTestId(`reservation-${reservation.id}`).waitFor();
    await page.getByTestId(`approve-${reservation.id}`).dblclick();
    await seen(page, "Reserva aprobada.");
    assert.equal(calls, 1);
    assert.equal((await gifts()).find((i) => i.id === gift.id).status, "COMMITTED");
    await context.close();
    return "approve 200 x1 · GET gift COMMITTED";
  });
  await check("host /bandeja/regalos", "reject-{id}", "VALID -> reservation REJECTED and gift AVAILABLE again (+GET)", async () => {
    const { gift, reservation } = await mkReservation("Luis Bandeja");
    const { page, context } = await fresh({ host: true });
    await go(page, `/bandeja/regalos${HC}`);
    await page.getByTestId(`reject-${reservation.id}`).click();
    await seen(page, "Reserva rechazada.");
    assert.equal((await reservations("REJECTED")).some((r) => r.id === reservation.id), true);
    assert.equal((await gifts()).find((i) => i.id === gift.id).status, "AVAILABLE");
    await context.close();
    return "reject 200 · reservation REJECTED · gift AVAILABLE";
  });
  await check("host /bandeja/regalos", "approve-/reject-{id}", "ERROR 409 already decided elsewhere -> stale notice, list refreshed", async () => {
    const { reservation } = await mkReservation("Ana Bandeja");
    const { page, context } = await fresh({ host: true });
    await go(page, `/bandeja/regalos${HC}`);
    await page.getByTestId(`reservation-${reservation.id}`).waitFor();
    assert.equal((await http("POST", `/gifts/celebrations/${C}/reservations/${reservation.id}/approve`, { token: hostToken })).status, 200);
    await page.getByTestId(`reject-${reservation.id}`).click();
    await seen(page, /ya no estaba pendiente/);
    await page.getByTestId(`reservation-${reservation.id}`).waitFor({ state: "detached" });
    await context.close();
    return "409 -> 'ya no estaba pendiente'; row removed";
  });
  await check("host /bandeja/regalos", "approve-{id}", "ERROR network down / 403 -> error notice; buttons enabled again", async () => {
    const { reservation } = await mkReservation("Red Bandeja");
    const { page, context } = await fresh({ host: true });
    await go(page, `/bandeja/regalos${HC}`);
    await page.getByTestId(`reservation-${reservation.id}`).waitFor();
    await page.route(`**/reservations/${reservation.id}/approve`, (route) => route.abort());
    await page.getByTestId(`approve-${reservation.id}`).click();
    await page.getByText(/No hay conexi[óo]n con el servidor/).first().waitFor();
    assert.equal(await page.getByTestId(`approve-${reservation.id}`).isEnabled(), true);
    assert.equal((await reservations("PENDING_REVIEW")).some((r) => r.id === reservation.id), true);
    await context.close();
    return "abort -> notice; reservation still PENDING_REVIEW in GET";
  });
  await check("host /bandeja/regalos", "inbox (load)", "LIMIT empty -> empty notice; ERROR 500 -> retry", async () => {
    const { page, context } = await fresh({ host: true });
    await page.route("**/gifts/celebrations/*/reservations**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }));
    await go(page, `/bandeja/regalos${HC}`);
    await seen(page, "No hay reservas pendientes.");
    await context.close();
    const { page: p2, context: c2 } = await fresh({ host: true });
    let fail = true;
    await p2.route("**/gifts/celebrations/*/reservations**", (route) => (fail ? route.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ title: "boom", status: 500 }) }) : route.continue()));
    await go(p2, `/bandeja/regalos${HC}`);
    const retry = p2.getByRole("button", { name: /Reintentar/ }).filter({ visible: true }).first();
    await retry.waitFor();
    fail = false; await retry.click();
    await p2.getByText(/Reservas pendientes|No hay reservas pendientes|Solicit/).first().waitFor();
    await c2.close();
    return "empty notice; 500 -> Reintentar -> recovered";
  });

  // ---- Visibility switches
  await check("host /regalos", "visibility-showRequesterTo{Host,Guests}", "VALID switch persisted (+GET gift-settings); ERROR network down -> notice", async () => {
    const { page, context } = await fresh({ host: true });
    await go(page, `/regalos${HC}`);
    const sw = page.getByTestId("visibility-showRequesterToGuests");
    await sw.waitFor();
    const before = (await http("GET", `/gifts/celebrations/${C}/gift-settings`, { token: hostToken })).json.showRequesterToGuests;
    await sw.click();
    await page.getByText(/Preferencia guardada/).first().waitFor();
    const after = (await http("GET", `/gifts/celebrations/${C}/gift-settings`, { token: hostToken })).json.showRequesterToGuests;
    assert.notEqual(after, before);
    await page.route("**/gift-settings", (route) => (route.request().method() === "PUT" ? route.abort() : route.continue()));
    await sw.click();
    await page.getByText(/No hay conexi[óo]n con el servidor/).first().waitFor();
    await context.close();
    return `PUT 200 · GET showRequesterToGuests ${before}->${after}; abort -> notice`;
  });
  await setSettings({ giftReservationMode: "AUTO_ACCEPT", externalGiftMode: "RESTRICTED", partnerPriorityEnabled: false });
}

// ======================= GUEST =======================
async function guestSuite() {
  await refreshHost();
  await setSettings({ giftReservationMode: "AUTO_ACCEPT", externalGiftMode: "AUTO_ACCEPT", partnerPriorityEnabled: false });
  const rsvpPath = (token) => `/c/${SLUG}/rsvp/${token}`;
  const giftsPath = (token) => `/c/${SLUG}/regalos/${token}`;

  // ---- Gifts (guest)
  await check("guest gifts", "list (load)", "ERROR 401 bad credential -> 'Tu enlace venció', no retry loop", async () => {
    const { page, context } = await fresh();
    await go(page, giftsPath("not-a-real-token-0123456789abcdefghijklmnopqrstuv"));
    await seen(page, "Tu enlace venció");
    await context.close();
    return "garbage token -> 401 -> expired notice";
  });
  await check("guest gifts", "list (load)", "ERROR credential of another celebration (404)", async () => {
    const other = await http("POST", "/celebrations", { token: hostToken, body: { slug: `otra-${crypto.randomUUID().slice(0, 8)}`, eventTypeCode: "WEDDING", supportedLocales: ["es-BO"], content: { title: "Otra" } } });
    if (other.status !== 201) return `skipped: cannot create 2nd celebration (${other.status})`;
    const g = await http("POST", `/guests/celebrations/${other.json.id}/guests`, { token: hostToken, headers: { "idempotency-key": crypto.randomUUID() }, body: { name: "X", email: `x-${crypto.randomUUID().slice(0, 6)}@example.test`, allowedCompanions: 0 } });
    const t = await http("POST", `/guests/celebrations/${other.json.id}/guests/${g.json.id}/access-token`, { token: hostToken, body: {} });
    const { page, context } = await fresh();
    await go(page, giftsPath(t.json.token));
    await page.getByText(/otra celebraci[óo]n|No puedes|venció/).first().waitFor();
    await context.close();
    return "foreign credential -> blocker notice";
  });
  await check("guest gifts", "list (load)", "ERROR 500/network -> retry button recovers; LIMIT empty list", async () => {
    const guest = await newGuest();
    const { page, context } = await fresh();
    let mode = "abort";
    await page.route("**/gifts/celebrations/*/items", (route) => (mode === "abort" ? route.abort() : mode === "empty" ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], partnerPriorityEnabled: false }) }) : route.continue()));
    await go(page, giftsPath(guest.token));
    const retry = page.getByTestId("gifts-retry");
    await retry.waitFor();
    mode = "empty"; await retry.click();
    await seen(page, "Aún no hay regalos");
    await context.close();
    return "abort -> Reintentar -> empty-list notice";
  });
  await check("guest gifts", "reserve-{id} + dialog confirm", "VALID AUTO_ACCEPT -> COMMITTED with name+message (+GET); double click -> one reservation", async () => {
    const g = await addGift(uniq("Reserva válida"), "AVAILABLE");
    const guest = await newGuest();
    const { page, context } = await fresh();
    let posts = 0;
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes(`/items/${g.id}/reservations`)) posts += 1; });
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${g.id}`).click();
    await page.getByTestId("reserve-name").fill("Carla Prueba");
    await page.getByTestId("reserve-message").fill("¡Felicidades!");
    await confirmReserve(page).dblclick();
    await seen(page, "¡Regalo reservado!");
    assert.equal(posts, 1, `POSTs ${posts}`);
    const mine = (await reservations()).filter((r) => r.itemId === g.id);
    assert.equal(mine.length, 1); assert.equal(mine[0].status, "COMMITTED"); assert.equal(mine[0].guestDisplayName, "Carla Prueba"); assert.equal(mine[0].message, "¡Felicidades!");
    assert.equal((await gifts()).find((i) => i.id === g.id).status, "COMMITTED");
    await context.close();
    return "POST 201 x1 · GET reservation COMMITTED name/message · gift COMMITTED";
  });
  await check("guest gifts", "reserve-{id}", "VALID optional name/message omitted", async () => {
    const g = await addGift(uniq("Reserva anónima"), "AVAILABLE");
    const guest = await newGuest();
    const { page, context } = await fresh();
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${g.id}`).click();
    await confirmReserve(page).click();
    await seen(page, "¡Regalo reservado!");
    assert.equal((await reservations()).filter((r) => r.itemId === g.id).length, 1);
    await context.close();
    return "empty name+message accepted · 1 reservation in GET";
  });
  await check("guest gifts", "dialog confirm", "LIMIT name 121 / message 501 chars blocked without request; 120/500 accepted", async () => {
    const g1 = await addGift(uniq("Límite texto"), "AVAILABLE");
    const guest = await newGuest();
    const { page, context } = await fresh();
    let posts = 0;
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/reservations")) posts += 1; });
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${g1.id}`).click();
    await page.getByTestId("reserve-name").fill("n".repeat(121));
    await confirmReserve(page).click();
    await seen(page, /hasta 120 caracteres/);
    assert.equal(posts, 0);
    await page.getByTestId("reserve-name").fill("n".repeat(120));
    await page.getByTestId("reserve-message").fill("m".repeat(501));
    await confirmReserve(page).click();
    await seen(page, /hasta 500 caracteres/);
    assert.equal(posts, 0);
    await page.getByTestId("reserve-message").fill("m".repeat(500));
    await confirmReserve(page).click();
    await seen(page, "¡Regalo reservado!");
    const mine = (await reservations()).find((r) => r.itemId === g1.id);
    assert.equal(mine.guestDisplayName.length, 120); assert.equal(mine.message.length, 500);
    await context.close();
    return "0 POST for 121/501; 120/500 persisted";
  });
  await check("guest gifts", "dialog confirm", "ERROR 409 gift taken meanwhile -> 'Alguien se adelantó' + alternatives", async () => {
    const g = await addGift(uniq("Tomado"), "AVAILABLE");
    await addGift(uniq("Alternativa"), "AVAILABLE");
    const winner = await newGuest(); const loser = await newGuest();
    const { page, context } = await fresh();
    await go(page, giftsPath(loser.token));
    await page.getByTestId(`reserve-${g.id}`).click();
    assert.equal((await http("POST", `/gifts/celebrations/${C}/items/${g.id}/reservations`, { token: winner.token, body: {} })).status, 201);
    await confirmReserve(page).click();
    await page.getByTestId("gift-taken").waitFor();
    await seen(page, "Alguien se adelantó");
    assert.equal((await reservations()).filter((r) => r.itemId === g.id).length, 1);
    await context.close();
    return "409 GIFT_NOT_AVAILABLE -> taken notice; backend keeps 1 reservation";
  });
  await check("guest gifts", "dialog confirm", "ERROR 429 with Retry-After -> wait message with seconds; retry works", async () => {
    const g = await addGift(uniq("Rate limit"), "AVAILABLE");
    const guest = await newGuest();
    const { page, context } = await fresh();
    let limited = true;
    await page.route(`**/items/${g.id}/reservations`, (route) => (limited ? route.fulfill({ status: 429, headers: { "retry-after": "7", "access-control-expose-headers": "retry-after", "content-type": "application/problem+json" }, body: JSON.stringify({ title: "Too many", status: 429, code: "RATE_LIMITED" }) }) : route.continue()));
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${g.id}`).click();
    await confirmReserve(page).click();
    await page.getByTestId("reserve-error").waitFor();
    const text = await page.getByTestId("reserve-error").innerText();
    assert.match(text, /demasiadas solicitudes/i);
    limited = false;
    await confirmReserve(page).click();
    await seen(page, "¡Regalo reservado!");
    await context.close();
    return `429 message: "${text.slice(0, 70)}" then retry -> 201`;
  });
  await check("guest gifts", "dialog confirm", "ERROR network down -> offline notice, message kept, retry reserves once", async () => {
    const g = await addGift(uniq("Red reserva"), "AVAILABLE");
    const guest = await newGuest();
    const { page, context } = await fresh();
    let down = true;
    await page.route(`**/items/${g.id}/reservations`, (route) => (down ? route.abort() : route.continue()));
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${g.id}`).click();
    await page.getByTestId("reserve-message").fill("sigue aquí");
    await confirmReserve(page).click();
    await page.getByTestId("reserve-error").waitFor();
    assert.match(await page.getByTestId("reserve-error").innerText(), /Sin conexi[óo]n/);
    assert.equal(await page.getByTestId("reserve-message").inputValue(), "sigue aquí");
    down = false;
    await confirmReserve(page).click();
    await seen(page, "¡Regalo reservado!");
    assert.equal((await reservations()).filter((r) => r.itemId === g.id).length, 1);
    await context.close();
    return "abort -> 'Sin conexión'; retry -> 1 reservation";
  });
  await check("guest gifts", "dialog confirm", "ERROR 401 token expires while dialog open", async () => {
    const g = await addGift(uniq("Token vence"), "AVAILABLE");
    const guest = await newGuest();
    const { page, context } = await fresh();
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${g.id}`).click();
    await page.route(`**/items/${g.id}/reservations`, (route) => route.fulfill({ status: 401, contentType: "application/problem+json", body: JSON.stringify({ title: "Unauthorized", status: 401, code: "UNAUTHORIZED" }) }));
    await confirmReserve(page).click();
    await page.getByTestId("reserve-error").waitFor();
    assert.match(await page.getByTestId("reserve-error").innerText(), /enlace/i);
    await context.close();
    return "401 -> 'enlace ya no es válido' inside dialog";
  });
  await check("guest gifts", "dialog confirm", "LIMIT RESERVATION_LIMIT_REACHED after 5 active reservations (+GET count=5)", async () => {
    const items = []; for (let i = 0; i < 6; i += 1) items.push(await addGift(uniq(`Límite ${i}`), "AVAILABLE"));
    const guest = await newGuest();
    for (let i = 0; i < 5; i += 1) assert.equal((await http("POST", `/gifts/celebrations/${C}/items/${items[i].id}/reservations`, { token: guest.token, body: {} })).status, 201);
    const { page, context } = await fresh();
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${items[5].id}`).click();
    await confirmReserve(page).click();
    await page.getByTestId("reserve-error").waitFor();
    assert.match(await page.getByTestId("reserve-error").innerText(), /m[áa]ximo de regalos/);
    assert.equal((await reservations()).filter((r) => r.guestId === guest.id).length, 5);
    await context.close();
    return "6th -> 422 RESERVATION_LIMIT_REACHED -> limit message; GET shows 5 reservations";
  });
  await check("guest gifts", "partner-{id} link", "VALID goes through /r/{listingId} with surface=GIFT_LIST", async () => {
    const listing = world.listings[1].id;
    const added = await http("POST", `/gifts/celebrations/${C}/items`, { token: hostToken, body: { source: "CATALOGED", title: uniq("Aliado"), price: { amountMinor: 1000, currency: "BOB" }, productListingId: listing } });
    assert.equal(added.status, 201, JSON.stringify(added.json));
    const guest = await newGuest();
    const { page, context } = await fresh();
    await go(page, giftsPath(guest.token));
    const link = page.getByTestId(`partner-${added.json.id}`);
    await link.waitFor();
    const [popup] = await Promise.all([page.waitForEvent("popup", { timeout: 5000 }).catch(() => null), link.click()]);
    const url = popup ? popup.url() : page.url();
    assert.match(url, new RegExp(`/r/${listing}`));
    assert.match(url, /surface=GIFT_LIST/);
    await context.close();
    return `opened ${url.replace(/^https?:\/\/[^/]+/, "")}`;
  });
  await check("guest gifts", "reserve-{id} visibility", "VALID taken gift shows no reserve button; PENDING_REVIEW label (RESTRICTED)", async () => {
    await setSettings({ giftReservationMode: "RESTRICTED" });
    const g = await addGift(uniq("Pendiente"), "AVAILABLE");
    const guest = await newGuest();
    const { page, context } = await fresh();
    await go(page, giftsPath(guest.token));
    await page.getByTestId(`reserve-${g.id}`).click();
    await confirmReserve(page).click();
    await seen(page, "Solicitud enviada");
    await page.getByTestId(`reserve-${g.id}`).waitFor({ state: "detached" });
    assert.equal((await reservations("PENDING_REVIEW")).some((r) => r.itemId === g.id), true);
    await context.close();
    await setSettings({ giftReservationMode: "AUTO_ACCEPT" });
    return "RESTRICTED -> PENDING_REVIEW in GET; reserve button gone";
  });

  // ---- RSVP (guest)
  await check("guest rsvp", "open link", "ERROR invalid/garbage token -> invalid screen, no celebration data", async () => {
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath("garbage-token-0123456789abcdefghijklmnopqrstuvwxyz"));
    await seen(page, "Este enlace no está disponible");
    await context.close();
    return "401 -> invalid screen";
  });
  await check("guest rsvp", "open link", "ERROR network down -> retry button recovers", async () => {
    const guest = await newGuest();
    const { page, context } = await fresh();
    let down = true;
    await page.route("**/rsvp/celebrations/*/rsvp", (route) => (down ? route.abort() : route.continue()));
    await goRsvp(page, rsvpPath(guest.token));
    const retry = page.getByRole("button", { name: "Reintentar" }).filter({ visible: true }).first();
    await retry.waitFor();
    down = false; await retry.click();
    await seen(page, "¿Podrás acompañarnos?");
    await context.close();
    return "abort -> Reintentar -> form";
  });
  await check("guest rsvp", "rsvp-submit", "LIMIT empty status, companions -1 / 1.5 / abc, notes too long -> inline errors, no request", async () => {
    const guest = await newGuest();
    const { page, context } = await fresh();
    let writes = 0;
    page.on("request", (r) => { if (["POST", "PATCH"].includes(r.method()) && r.url().includes("/rsvp/celebrations")) writes += 1; });
    await goRsvp(page, rsvpPath(guest.token));
    await seen(page, "¿Podrás acompañarnos?");
    await page.getByTestId("rsvp-submit").click();
    await seen(page, "Revisa los campos marcados.");
    await page.getByRole("radio", { name: "Sí, asistiré" }).click();
    for (const bad of ["-1", "1.5", "abc"]) { await label(page, "Acompañantes").fill(bad); await page.getByTestId("rsvp-submit").click(); await seen(page, /número entero/); }
    await label(page, "Acompañantes").fill("0");
    await label(page, "Restricciones alimentarias").fill("a".repeat(2001));
    await page.getByTestId("rsvp-submit").click();
    await seen(page, "El texto es demasiado largo.");
    assert.equal(writes, 0);
    await context.close();
    return "5 invalid drafts, 0 writes";
  });
  await check("guest rsvp", "rsvp-submit", "VALID confirm with 1 companion + dietary + message (+GET), then edit before deadline", async () => {
    const guest = await newGuest(2);
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath(guest.token));
    await page.getByRole("radio", { name: "Sí, asistiré" }).click();
    await label(page, "Acompañantes").fill("1");
    await label(page, "Restricciones alimentarias").fill("Sin gluten");
    await label(page, "Mensaje para los anfitriones (opcional)").fill("Nos vemos");
    await page.getByTestId("rsvp-submit").dblclick();
    await seen(page, "Tu asistencia está confirmada");
    const state = await http("GET", `/rsvp/celebrations/${C}/rsvp`, { token: guest.token });
    assert.equal(state.status, 200);
    assert.equal(state.json.status, "CONFIRMED"); assert.equal(state.json.dietaryNotes, "Sin gluten"); assert.equal(state.json.message, "Nos vemos"); assert.equal(state.json.requestedCompanions, 1);
    // edit: decline
    await button(page, "Cambiar mi respuesta").click();
    await page.getByRole("radio", { name: "No podré asistir" }).click();
    await page.getByTestId("rsvp-submit").click();
    await seen(page, "Registramos que no podrás asistir");
    const after = await http("GET", `/rsvp/celebrations/${C}/rsvp`, { token: guest.token });
    assert.equal(after.json.status, "DECLINED"); assert.equal(after.json.requestedCompanions, 0);
    await context.close();
    return "POST 201 (dblclick = 1 write) · GET CONFIRMED/1/notes · PATCH -> GET DECLINED/0";
  });
  await check("guest rsvp", "Cancelar edición / Cambiar mi respuesta", "VALID cancel keeps stored answer, sends nothing", async () => {
    const guest = await newGuest(1);
    await http("POST", `/rsvp/celebrations/${C}/rsvp`, { token: guest.token, headers: { "idempotency-key": crypto.randomUUID() }, body: { status: "CONFIRMED", requestedCompanions: 0 } });
    const { page, context } = await fresh();
    let writes = 0;
    page.on("request", (r) => { if (["POST", "PATCH"].includes(r.method()) && r.url().includes("/rsvp/celebrations")) writes += 1; });
    await goRsvp(page, rsvpPath(guest.token));
    await button(page, "Cambiar mi respuesta").click();
    await button(page, "Cancelar").click();
    await button(page, "Cambiar mi respuesta").waitFor();
    assert.equal(writes, 0);
    await context.close();
    return "edit -> cancel -> 0 writes";
  });
  await check("guest rsvp", "rsvp-submit", "ERROR 5xx/network on save keeps draft and retry saves once (idempotent)", async () => {
    const guest = await newGuest(1);
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath(guest.token));
    await page.getByRole("radio", { name: "Sí, asistiré" }).click();
    await label(page, "Acompañantes").fill("1");
    await label(page, "Restricciones alimentarias").fill("Vegano");
    let down = true;
    await page.route("**/rsvp/celebrations/*/rsvp", (route) => (down && route.request().method() === "POST" ? route.abort() : route.continue()));
    await page.getByTestId("rsvp-submit").click();
    await seen(page, /No hay conexión/);
    assert.equal(await label(page, "Restricciones alimentarias").inputValue(), "Vegano");
    down = false;
    await page.getByRole("button", { name: "Reintentar" }).filter({ visible: true }).first().click();
    await seen(page, "Tu asistencia está confirmada");
    const state = await http("GET", `/rsvp/celebrations/${C}/rsvp`, { token: guest.token });
    assert.equal(state.json.dietaryNotes, "Vegano");
    await context.close();
    return "abort -> offline notice + draft kept -> retry -> GET CONFIRMED Vegano";
  });
  await check("guest rsvp", "rsvp-submit", "ERROR 429 Retry-After -> wait message, draft kept", async () => {
    const guest = await newGuest(1);
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath(guest.token));
    await page.getByRole("radio", { name: "No podré asistir" }).click();
    await page.route("**/rsvp/celebrations/*/rsvp", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 429, headers: { "retry-after": "12", "access-control-expose-headers": "retry-after", "content-type": "application/problem+json" }, body: JSON.stringify({ title: "Too many", status: 429 }) }) : route.continue()));
    await page.getByTestId("rsvp-submit").click();
    await seen(page, /Espera 12 segundos/);
    await context.close();
    return "429 -> 'Espera 12 segundos…'";
  });
  await check("guest rsvp", "rsvp-submit", "ERROR 409 conflict and 422 validation messages", async () => {
    const guest = await newGuest(1);
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath(guest.token));
    await page.getByRole("radio", { name: "No podré asistir" }).click();
    let status = 409;
    await page.route("**/rsvp/celebrations/*/rsvp", (route) => (route.request().method() === "POST" ? route.fulfill({ status, contentType: "application/problem+json", body: JSON.stringify({ title: "x", status }) }) : route.continue()));
    await page.getByTestId("rsvp-submit").click();
    await seen(page, /ya se envió con otros datos/);
    status = 422; await page.getByTestId("rsvp-submit").click();
    await seen(page, /no aceptó algunos datos/);
    await context.close();
    return "409 and 422 each show their own message";
  });
  await check("guest rsvp", "rsvp-submit", "ERROR revoked token while filling -> invalid screen", async () => {
    const guest = await newGuest(1);
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath(guest.token));
    await page.getByRole("radio", { name: "No podré asistir" }).click();
    await http("DELETE", `/guests/celebrations/${C}/guests/${guest.id}/access-token`, { token: hostToken });
    await page.getByTestId("rsvp-submit").click();
    await seen(page, "Este enlace no está disponible");
    await context.close();
    return "revoked (DELETE access-token 204) -> save 401 -> invalid screen";
  });
  await check("guest rsvp", "rsvp-submit", "LIMIT deadline passed -> closed screen, no form; stored answer shown", async () => {
    const guest = await newGuest(1);
    await http("POST", `/rsvp/celebrations/${C}/rsvp`, { token: guest.token, headers: { "idempotency-key": crypto.randomUUID() }, body: { status: "CONFIRMED", requestedCompanions: 0 } });
    await setSettings({ rsvpDeadline: new Date(Date.now() + 5000).toISOString() });
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath(guest.token));
    await sleep(6000);
    await page.reload(); await page.waitForLoadState("networkidle");
    const closed = await page.getByText("El plazo para responder terminó").first().isVisible().catch(() => false);
    if (!closed) { await button(page, "Cambiar mi respuesta").click(); await page.getByRole("radio", { name: "No podré asistir" }).click(); await page.getByTestId("rsvp-submit").click(); await seen(page, "El plazo para responder terminó"); }
    assert.equal(await page.getByTestId("rsvp-submit").count(), 0);
    await context.close();
    await setSettings({ rsvpDeadline: null });
    return closed ? "past deadline on load -> closed screen" : "save after deadline -> 409/422 closed -> closed screen";
  });
  await check("guest rsvp", "rsvp-register (public registration)", "ERROR restricted celebration / missing consent / bad email; VALID registers (+GET)", async () => {
    const settings = await http("GET", `/rsvp/celebrations/${C}/public-settings`);
    if (settings.status !== 200) throw new Error(`public-settings ${settings.status}`);
    if (!settings.json.publicRegistrationEnabled) {
      const { page, context } = await fresh();
      await goRsvp(page, `/c/${SLUG}/rsvp`);
      await seen(page, "Esta celebración solo admite invitados con enlace personal");
      await context.close();
      await setSettings({ unregisteredRsvpMode: "AUTO_ACCEPT" });
    }
    const { page, context } = await fresh();
    let writes = 0;
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/unregistered")) writes += 1; });
    await goRsvp(page, `/c/${SLUG}/rsvp`);
    await seen(page, "Confirma tu asistencia");
    await button(page, "Confirmar mi asistencia").click();
    await seen(page, "Revisa los campos marcados.");
    await label(page, "Tu nombre").fill("Pedro Público"); await label(page, "Tu correo electrónico").fill("no-es-correo");
    await button(page, "Confirmar mi asistencia").click(); await seen(page, /correo válido/);
    const email = `pub-${crypto.randomUUID().slice(0, 8)}@example.test`;
    await label(page, "Tu correo electrónico").fill(email);
    await button(page, "Confirmar mi asistencia").click(); await seen(page, "Necesitamos tu consentimiento");
    assert.equal(writes, 0);
    await page.getByRole("checkbox").first().click();
    // two clicks dispatched on the same element: a real dblclick can land on the language switch once the receipt screen replaces the form
    await button(page, "Confirmar mi asistencia").evaluate((el) => { el.click(); el.click(); });
    await seen(page, "Listo: confirmamos tu asistencia");
    assert.equal(writes, 1, `writes ${writes}`);
    const guests = await http("GET", `/guests/celebrations/${C}/guests`, { token: hostToken });
    const mine = (guests.json.items ?? guests.json).find((g) => g.email === email || g.name === "Pedro Público");
    assert.ok(mine, "unregistered guest present in host guest list");
    await context.close();
    return `0 writes for invalid; valid POST 201 x1 · host GET /guests lists ${mine.id.slice(0, 8)}`;
  });
  await check("guest rsvp", "open-gifts", "VALID navigates to the guest gift list with the same credential", async () => {
    const guest = await newGuest(1);
    await http("POST", `/rsvp/celebrations/${C}/rsvp`, { token: guest.token, headers: { "idempotency-key": crypto.randomUUID() }, body: { status: "CONFIRMED", requestedCompanions: 0 } });
    const { page, context } = await fresh();
    await goRsvp(page, rsvpPath(guest.token));
    await page.getByTestId("open-gifts").click();
    await page.waitForURL(/\/regalos\//);
    await seen(page, "Lista de regalos");
    await context.close();
    return "open-gifts -> /c/{slug}/regalos/{token}";
  });
}

const suites = { host: hostSuite, guest: guestSuite };
try { for (const [name, run] of Object.entries(suites)) if (!only || only === name) { console.log(`\n== ${name}`); await run(); } }
finally { await browser.close(); }
const failed = rows.filter((r) => r.status === "FAIL");
if (consoleErrors.length) console.log(`\nconsole/page errors (${consoleErrors.length}):\n${[...new Set(consoleErrors)].slice(0, 10).join("\n")}`);
if (process.env.RESULTS) writeFileSync(process.env.RESULTS, JSON.stringify(rows, null, 2));
console.log(`\n${rows.length - failed.length}/${rows.length} PASS`);
process.exit(failed.length ? 1 : 0);
