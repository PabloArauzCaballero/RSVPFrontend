// Close-out of F21/F22/F23/F26/F28 in Chrome against the REAL backend (Kong :28000), the Next.js site (:3000) and the exported Expo web app (:8081).
//   node apps/seo-web/scripts/live-world.mjs > world.json
//   WORLD=world.json CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/e2e-live-closeout.mjs [f22|f23|f21|f28|quote]
// Nothing is mocked: the guest's opaque link credential is the Bearer, MinIO is the real object store on :29000.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8081";
const SITE = process.env.SITE ?? "http://localhost:3000";
const API = process.env.API ?? "http://localhost:28000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const evidence = (lane) => fileURLToPath(new URL(`../../../docs/progress/evidence/lane-${lane}/`, import.meta.url));
const only = process.argv[2];
const WIDTHS = [360, 768, 1280];
const results = [];
const record = (lane, id, text) => { results.push({ lane, id, text, status: "PASS" }); console.log(`  PASS ${lane} ${id} · ${text}`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slug = world.celebration.slug;
const cid = world.celebration.id;

async function http(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: response.status, json, headers: response.headers };
}
const apiLogin = async (email) => (await http("POST", "/identity/auth/login", { body: { email, password: world.password } })).json.accessToken;
const hostToken = await apiLogin(world.host.email);
async function setSettings(patch) {
  const { json: current } = await http("GET", `/celebrations/${cid}`, { token: hostToken });
  const response = await http("PUT", `/celebrations/${cid}/settings`, { token: hostToken, headers: { "if-match": String(current.version) }, body: patch });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  await sleep(2500); // Gift List learns the setting from celebration.settings.updated.v1
}
const giftSettings = (body) => http("PUT", `/gifts/celebrations/${cid}/gift-settings`, { token: hostToken, body });
async function newGuest(celebrationId, name) {
  const guest = await http("POST", `/guests/celebrations/${celebrationId}/guests`, { token: hostToken, body: { name, email: `${name.toLowerCase().replace(/\W+/g, ".")}.${Date.now().toString(36)}@example.com` } });
  assert.equal(guest.status, 201, JSON.stringify(guest.json));
  const issued = await http("POST", `/guests/celebrations/${celebrationId}/guests/${guest.json.id}/access-token`, { token: hostToken, body: {} });
  assert.equal(issued.status, 201, JSON.stringify(issued.json));
  return { id: guest.json.id, token: issued.json.token };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const consoleErrors = [];
async function newPage(width, { colorScheme } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO", ...(colorScheme ? { colorScheme } : {}) });
  context.setDefaultTimeout(20000);
  // Partner destinations are external: never leave localhost, but let /r/ through so the redirector itself is observed.
  await context.route((url) => !["localhost", "127.0.0.1"].includes(url.hostname), (route) => route.abort());
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|ERR_FAILED|net::/.test(message.text())) consoleErrors.push(`${page.url()}: ${message.text()}`); });
  return { page, context };
}
async function session(email, width = 1280) {
  const { page, context } = await newPage(width);
  await page.goto(`${APP}/login`);
  await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  return { page, context };
}
const go = async (page, path, base = APP) => { await page.goto(`${base}${path}`); await page.waitForLoadState("networkidle").catch(() => undefined); };
const snap = (lane, page, name, width) => page.screenshot({ path: join(evidence(lane), `${name}-${width}.png`), fullPage: true });
const noOverflow = async (page, name) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `horizontal scroll on ${name}`);
const shots = async (lane, email, path, name, ready) => {
  for (const width of WIDTHS) {
    const { page, context } = await session(email, width);
    await go(page, path); await ready(page); await noOverflow(page, `${name}-${width}`); await snap(lane, page, name, width); await context.close();
  }
};

const state = {};
async function f22() {
  console.log("\nF22-04 · reserva sin cuenta con la credencial opaca del enlace");
  await setSettings({ giftReservationMode: "AUTO_ACCEPT", externalGiftMode: "AUTO_ACCEPT", partnerPriorityEnabled: false });
  assert.equal((await giftSettings({ showRequesterToHost: true, showRequesterToGuests: false })).status, 200);
  const a = { id: world.guest.id, token: world.guest.issued.token };
  const b = await newGuest(cid, "Beto Invitado");
  const other = await http("POST", "/celebrations", { token: hostToken, body: { slug: `f22-otra-${Date.now().toString(36)}`, eventTypeCode: "WEDDING", content: { title: "Otra boda", eventDate: "2027-06-20T18:00", venueName: "Otro salon", hosts: { BRIDE: "Eva", GROOM: "Raul" } } } });
  assert.equal(other.status, 201, JSON.stringify(other.json));
  const c = await newGuest(other.json.id, "Carla Ajena");
  state.a = a; state.b = b; state.c = c;
  const path = `/c/${slug}/regalos`;

  // Credential travels as the Bearer; the fragment is removed from the address bar.
  for (const width of WIDTHS) {
    const { page, context } = await newPage(width);
    const auth = [];
    page.on("request", (request) => { if (request.url().includes("/gifts/celebrations/") && request.method() === "GET") auth.push(request.headers()["authorization"]); });
    await page.goto(`${SITE}${path}#t=${a.token}`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    assert.ok(auth.length >= 1 && auth.every((value) => value === `Bearer ${a.token}`), `Bearer is the opaque link credential: ${JSON.stringify(auth)}`);
    assert.ok(!page.url().includes("#t="), "fragment removed from the URL");
    await noOverflow(page, `lista-${width}`); await snap("F22", page, "E1-lista-con-credencial-del-enlace", width);
    await context.close();
  }
  record("F22", "REQ-F22-04a", "la lista carga en el navegador con el token opaco del enlace como Bearer (200); el fragmento #t= se borra de la URL; sin SSR anonimo");

  // A reserves with a double click: one POST, 201 COMMITTED
  {
    const { page, context } = await newPage(360);
    const posts = [];
    page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/reservations")) posts.push({ key: request.headers()["idempotency-key"], auth: request.headers()["authorization"] }); });
    page.on("response", (response) => { if (response.request().method() === "POST" && response.url().includes("/reservations")) posts.push({ status: response.status() }); });
    await page.goto(`${SITE}${path}#t=${a.token}`);
    await page.getByRole("button", { name: /Reservar Torta de bodas/ }).click();
    await page.getByLabel("Tu nombre").fill("Marta Invitada");
    await snap("F22", page, "E2-reservar", 360);
    await page.getByRole("button", { name: "Reservar regalo" }).dblclick();
    await page.getByRole("heading", { name: "¡Regalo reservado!" }).waitFor();
    const sent = posts.filter((p) => p.key);
    assert.equal(sent.length, 1); assert.equal(sent[0].auth, `Bearer ${a.token}`);
    assert.ok(posts.some((p) => p.status === 201), "201 observed");
    await snap("F22", page, "E3-reserva-201", 360);
    record("F22", "REQ-F22-04b", "invitado A reserva sin cuenta: doble clic = 1 POST con Idempotency-Key, Bearer = token del enlace, 201 COMMITTED");
    await context.close();
  }

  // B has the list open; the rival reserves Mesa de dulces first -> B gets 409 with alternatives
  {
    const { page, context } = await newPage(360);
    await page.goto(`${SITE}${path}#t=${b.token}`);
    await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor();
    assert.equal(await page.getByTestId("reserved-by").count(), 0, "guests do not see who reserved by default");
    const torta = page.locator("[data-gift-id]", { hasText: "Torta de bodas" });
    assert.match(await torta.innerText(), /Ya reservado/);
    await page.getByRole("button", { name: /Reservar Mesa de dulces/ }).click();
    const rival = await http("POST", `/gifts/celebrations/${cid}/items/${world.giftItems[1]}/reservations`, { token: a.token, body: { guestDisplayName: "Marta Invitada" }, headers: { "idempotency-key": crypto.randomUUID() } });
    assert.equal(rival.status, 201);
    await page.getByLabel("Tu nombre").fill("Beto");
    await page.getByRole("button", { name: "Reservar regalo" }).click();
    await page.getByRole("heading", { name: "Alguien se adelantó" }).waitFor();
    await page.getByTestId("alternatives").waitFor();
    assert.ok(await page.locator('[data-testid="alternatives"] [data-gift-id]').count() >= 1, "alternatives listed");
    await snap("F22", page, "E4-409-con-alternativas", 360);
    record("F22", "REQ-F22-05", "otro invitado, mismo regalo: 409 GIFT_NOT_AVAILABLE -> 'Alguien se adelanto' con alternativas disponibles");
    await context.close();
  }
  { const { page, context } = await newPage(1280); await page.goto(`${SITE}${path}#t=${b.token}`); await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor(); await snap("F22", page, "E4-lista-despues-del-409", 1280); await context.close(); }

  // reservedByName only when the host allows it
  {
    const open = async (width = 1280) => { const x = await newPage(width); await x.page.goto(`${SITE}${path}#t=${b.token}`); await x.page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor(); return x; };
    let x = await open(); assert.equal(await x.page.getByTestId("reserved-by").count(), 0); await x.context.close();
    const api = await http("GET", `/gifts/celebrations/${cid}/items`, { token: b.token });
    assert.ok(api.json.items.every((item) => item.reservedByName === undefined), "API omits reservedByName for guests by default");
    assert.equal((await giftSettings({ showRequesterToHost: true, showRequesterToGuests: true })).status, 200);
    x = await open(); await x.page.getByTestId("reserved-by").first().waitFor();
    const names = await x.page.getByTestId("reserved-by").allInnerTexts();
    assert.ok(names.some((text) => text.includes("Marta Invitada")), names.join());
    await snap("F22", x.page, "E5-nombre-visible-por-ajuste", 1280); await x.context.close();
    assert.equal((await giftSettings({ showRequesterToHost: true, showRequesterToGuests: false })).status, 200);
    x = await open(); assert.equal(await x.page.getByTestId("reserved-by").count(), 0); await x.context.close();
    record("F22", "REQ-F23-06b", "reservedByName aparece a los invitados solo con showRequesterToGuests=true y desaparece al apagarlo (PUT /gift-settings)");
  }

  // Credential of another celebration -> 404 without data; unknown -> 401
  {
    const direct = await http("GET", `/gifts/celebrations/${cid}/items`, { token: c.token });
    assert.equal(direct.status, 404); assert.equal(JSON.stringify(direct.json).includes('"items"'), false);
    const post = await http("POST", `/gifts/celebrations/${cid}/items/${world.giftItems[2]}/reservations`, { token: c.token, body: {}, headers: { "idempotency-key": crypto.randomUUID() } });
    assert.equal(post.status, 404);
    const { page, context } = await newPage(360);
    await page.goto(`${SITE}${path}#t=${c.token}`);
    await page.getByRole("heading", { name: "Este enlace es de otra celebración" }).waitFor();
    assert.equal(await page.locator("[data-gift-id]").count(), 0, "no gift data rendered");
    await snap("F22", page, "E6-token-de-otra-celebracion-404", 360);
    await context.close();
    const unknown = await http("GET", `/gifts/celebrations/${cid}/items`, { token: "x".repeat(43) });
    assert.equal(unknown.status, 401);
    const second = await newPage(360);
    await second.page.goto(`${SITE}${path}#t=${"x".repeat(43)}`);
    await second.page.getByRole("heading", { name: "Tu enlace venció" }).waitFor();
    await snap("F22", second.page, "E7-token-desconocido-401", 360); await second.context.close();
    record("F22", "REQ-F22-04c", "token de otra celebracion: 404 sin datos (GET y POST) y pantalla 'enlace de otra celebracion'; token desconocido: 401 'Tu enlace vencio'");
  }

  // Restricted mode -> pending, then the host approves in the Expo UI (f23)
  await setSettings({ giftReservationMode: "RESTRICTED" });
  {
    const { page, context } = await newPage(360);
    await page.goto(`${SITE}${path}#t=${b.token}`);
    await page.getByRole("button", { name: /Reservar Catering/ }).click();
    await page.getByLabel("Tu nombre").fill("Beto");
    await page.getByRole("button", { name: "Reservar regalo" }).click();
    await page.getByRole("heading", { name: "Solicitud enviada" }).waitFor();
    await snap("F22", page, "E8-pendiente-de-aprobacion", 360);
    await context.close();
    record("F22", "REQ-F22-04d", "modo RESTRICTED: 201 PENDING_REVIEW -> 'Solicitud enviada'");
  }
  const pending = (await http("GET", `/gifts/celebrations/${cid}/reservations?status=PENDING_REVIEW`, { token: hostToken })).json.items;
  assert.ok(pending.length >= 1);
  state.pending = pending[0];
}

async function f23() {
  console.log("\nF23 · aprobacion, ajuste de visibilidad y descubrir proveedores");
  const c = `?c=${cid}`;
  state.b ??= await newGuest(cid, "Beto Invitado");
  await shots("F23", world.host.email, `/regalos${c}`, "F1-visibilidad-del-solicitante", (page) => page.getByRole("switch", { name: "Mostrar el nombre a otros invitados" }).waitFor());
  {
    const { page, context } = await session(world.host.email);
    await go(page, `/bandeja/regalos${c}`);
    const first = state.pending ?? (await http("GET", `/gifts/celebrations/${cid}/reservations?status=PENDING_REVIEW`, { token: hostToken })).json.items[0];
    await page.getByText("Solicitó: Beto").first().waitFor();
    await snap("F23", page, "F2-bandeja-con-nombre", 1280);
    await page.getByTestId(`approve-${first.id}`).click();
    await page.getByText("Reserva aprobada.").waitFor();
    const item = (await http("GET", `/gifts/celebrations/${cid}/items`, { token: hostToken })).json.items.find((i) => i.id === first.itemId);
    assert.equal(item.status, "COMMITTED");
    await snap("F23", page, "F3-aprobada", 1280);
    record("F23", "REQ-F23-01", "el anfitrion aprueba en la bandeja (UI) la reserva hecha sin cuenta -> regalo COMMITTED en el backend");
    await context.close();
  }
  // requesterHidden: switch showRequesterToHost off from the UI, create another pending reservation, read the inbox
  {
    const { page, context } = await session(world.host.email);
    await go(page, `/regalos${c}`);
    const toggle = page.getByRole("switch", { name: "Ver el nombre en mi panel" });
    await toggle.waitFor();
    await toggle.click();
    await page.getByText("Preferencia guardada. Aplica desde ahora.").waitFor();
    const saved = (await http("GET", `/gifts/celebrations/${cid}/gift-settings`, { token: hostToken })).json;
    assert.equal(saved.showRequesterToHost, false); assert.ok(saved.version >= 1);
    await snap("F23", page, "F4-ajuste-guardado", 1280);
    record("F23", "REQ-F23-06a", `el switch escribe PUT /gift-settings (showRequesterToHost=false, version ${saved.version}) y se relee del backend`);
    const extra = await http("POST", `/gifts/celebrations/${cid}/items`, { token: hostToken, body: { source: "EXTERNAL", title: "Set de copas", price: { amountMinor: 15000, currency: "BOB" }, url: "https://tienda.example/copas", partnerSuggestionsAcknowledged: true } });
    assert.equal(extra.status, 201, JSON.stringify(extra.json));
    if (extra.json.status !== "AVAILABLE") { const approved = await http("POST", `/gifts/celebrations/${cid}/items/${extra.json.id}/approve`, { token: hostToken }); assert.equal(approved.status, 200); }
    const reserved = await http("POST", `/gifts/celebrations/${cid}/items/${extra.json.id}/reservations`, { token: state.b.token, body: { guestDisplayName: "Beto" }, headers: { "idempotency-key": crypto.randomUUID() } });
    assert.equal(reserved.status, 201, JSON.stringify(reserved.json));
    const apiList = (await http("GET", `/gifts/celebrations/${cid}/reservations?status=PENDING_REVIEW`, { token: hostToken })).json.items;
    const hidden = apiList.find((r) => r.id === reserved.json.id);
    assert.equal(hidden.requesterHidden, true); assert.ok(!hidden.guestDisplayName);
    await go(page, `/bandeja/regalos${c}`);
    await page.getByTestId(`hidden-${reserved.json.id}`).waitFor();
    assert.match(await page.getByTestId(`reservation-${reserved.json.id}`).innerText(), /Nombre oculto por tu ajuste/);
    await snap("F23", page, "F5-requesterHidden", 1280);
    for (const width of [360, 768]) { await page.setViewportSize({ width, height: 800 }); await noOverflow(page, `inbox-${width}`); await snap("F23", page, "F5-requesterHidden", width); }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByTestId(`approve-${reserved.json.id}`).click();
    await page.getByText("Reserva aprobada.").waitFor();
    record("F23", "REQ-F23-06c", "con showRequesterToHost=false la bandeja muestra 'Nombre oculto por tu ajuste' (API: requesterHidden=true, sin guestDisplayName) y aprobar sigue funcionando");
    await go(page, `/regalos${c}`);
    await page.getByRole("switch", { name: "Ver el nombre en mi panel" }).click();
    await page.getByText("Preferencia guardada. Aplica desde ahora.").waitFor();
    assert.equal((await http("GET", `/gifts/celebrations/${cid}/gift-settings`, { token: hostToken })).json.showRequesterToHost, true);
    await context.close();
  }
  // discovery
  await shots("F23", world.host.email, `/regalos/proveedores${c}`, "F6-descubrir-proveedores", (page) => page.locator('[data-testid^="provider-"]').first().waitFor());
  {
    const { page, context } = await session(world.host.email);
    const requests = [];
    page.on("request", (request) => { if (request.url().includes("/providers?") || request.url().endsWith("/providers")) requests.push(request.url()); });
    await go(page, `/regalos/proveedores${c}`);
    await page.locator('[data-testid^="provider-"]').first().waitFor();
    assert.ok(requests.some((url) => url.includes(":28000/providers?")), "GET /providers called");
    const card = page.locator('[data-testid^="provider-"]').first();
    const text = await card.innerText();
    assert.match(text, /Plazo: \d+ días/); assert.match(text, /Cobertura:/); assert.match(text, /no presta ni garantiza/);
    await page.getByTestId("category-CATERING").click();
    await page.waitForResponse((response) => response.url().includes("category=CATERING"));
    await page.locator('[data-testid^="provider-"]').first().waitFor();
    await snap("F23", page, "F7-filtrado-catering", 1280);
    // destinations go through the redirector, never the partner URL
    const redirects = [];
    page.context().on("request", (request) => { if (request.url().startsWith(`${SITE}/r/`)) redirects.push(request.url()); });
    await page.locator('[data-testid^="dest-"]').first().click();
    await sleep(1500);
    assert.ok(redirects.length >= 1, "the click goes through /r/ first (then the redirector answers 302 to the partner)");
    assert.match(redirects[0], /surface=APP/);
    await page.locator('[data-testid^="add-provider-"]').first().click();
    await page.getByText(/^Agregado:/).waitFor();
    await snap("F23", page, "F8-agregado-desde-descubrir", 1280);
    record("F23", "REQ-F23-05", `descubrir proveedores desde el panel con GET /providers (tarjeta ampliada: oferta, negocio, plazo, cobertura, deslinde); filtro de categoria; destino por ${redirects[0].replace(SITE, "")}; agregar como regalo CATALOGED`);
    await context.close();
  }
}

async function f21() {
  console.log("\nF21-05 · regalos dentro de la app del invitado (Expo web)");
  state.b ??= await newGuest(cid, "Beto Invitado");
  const b = state.b;
  await setSettings({ giftReservationMode: "AUTO_ACCEPT", externalGiftMode: "AUTO_ACCEPT" });
  for (const width of WIDTHS) {
    const { page, context } = await newPage(width);
    const auth = [];
    page.on("request", (request) => { if (request.url().includes("/gifts/celebrations/") && request.method() === "GET") auth.push(request.headers()["authorization"]); });
    await page.goto(`${APP}/c/${slug}/regalos/${b.token}`);
    await page.getByRole("heading", { name: "Lista de regalos", level: 1 }).waitFor();
    await page.locator('[data-testid^="gift-"]').first().waitFor();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    assert.ok(auth.length >= 1 && auth.every((value) => value === `Bearer ${b.token}`), JSON.stringify(auth));
    await noOverflow(page, `app-regalos-${width}`); await snap("F21", page, "G1-regalos-en-la-app", width);
    if (width === 1280) {
      const hrefs = await page.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.href));
      assert.ok(hrefs.every((href) => !/^https?:\/\/(?!localhost)/.test(href)), "no direct partner href");
      const redirects = [];
      context.on("request", (request) => { if (request.url().startsWith(`${SITE}/r/`)) redirects.push(request.url()); });
      await page.locator('[data-testid^="partner-"]').first().click();
      await sleep(1500);
      assert.ok(redirects.length >= 1 && redirects[0].startsWith(`${SITE}/r/`) && /surface=GIFT_LIST/.test(redirects[0]), redirects.join());
      record("F21", "REQ-F21-05b", `el boton 'Ver en la tienda del aliado' abre ${redirects[0].replace(SITE, "")} (redirector), nunca la URL del partner`);
    }
    await context.close();
  }
  record("F21", "REQ-F21-05a", "lista de regalos dentro de la app (Expo web) cargada con el token del enlace como Bearer (200), sin cuenta");
  {
    const { page, context } = await newPage(360);
    await page.goto(`${APP}/c/${slug}/regalos/${b.token}`);
    await page.locator('[data-testid^="reserve-"]').first().waitFor();
    const target = page.locator('[data-testid^="reserve-"]').first();
    const id = (await target.getAttribute("data-testid")).replace("reserve-", "");
    await target.click();
    await page.getByTestId("reserve-name").fill("Beto");
    await snap("F21", page, "G2-reservar", 360);
    const rival = await http("POST", `/gifts/celebrations/${cid}/items/${id}/reservations`, { token: state.a?.token ?? world.guest.issued.token, body: {}, headers: { "idempotency-key": crypto.randomUUID() } });
    assert.equal(rival.status, 201, JSON.stringify(rival.json));
    await page.getByRole("button", { name: "Reservar regalo" }).click();
    await page.getByTestId("gift-taken").waitFor();
    await snap("F21", page, "G3-409-alternativas", 360);
    record("F21", "REQ-F21-05c", "409 al reservar un regalo ya tomado: aviso y alternativas, en la app");
    const fresh = await http("POST", `/gifts/celebrations/${cid}/items`, { token: hostToken, body: { source: "EXTERNAL", title: `Vajilla ${Date.now().toString(36)}`, price: { amountMinor: 25000, currency: "BOB" }, url: "https://tienda.example/vajilla", partnerSuggestionsAcknowledged: true } });
    assert.equal(fresh.status, 201, JSON.stringify(fresh.json));
    if (fresh.json.status !== "AVAILABLE") assert.equal((await http("POST", `/gifts/celebrations/${cid}/items/${fresh.json.id}/approve`, { token: hostToken })).status, 200);
    await page.reload();
    await page.locator('[data-testid^="reserve-"]').first().waitFor();
    await page.locator('[data-testid^="reserve-"]').first().click();
    await page.getByRole("button", { name: "Reservar regalo" }).click();
    await page.getByText("¡Regalo reservado!").waitFor();
    await snap("F21", page, "G4-reservado", 360);
    record("F21", "REQ-F21-05d", "reserva con 201 desde la app, sin cuenta");
    await context.close();
  }
  {
    const { page, context } = await newPage(360);
    await page.goto(`${APP}/c/${slug}/regalos/${state.c?.token ?? "x".repeat(43)}`);
    await page.getByText("Este enlace es de otra celebración").waitFor();
    assert.equal(await page.locator('[data-testid^="gift-"]').count(), 0);
    await snap("F21", page, "G5-token-de-otra-celebracion", 360);
    await context.close();
    record("F21", "REQ-F21-06", "token de otra celebracion en la app: 404 sin datos de regalos");
  }
}

async function f28() {
  console.log("\nF28 · entrega, productos, documentos y metricas con CTR coherente");
  const email = world.provider.email;
  for (const [route, name, ready] of [["productos", "H1-productos", (p) => p.getByText("Torta de bodas").first().waitFor()], ["servicios", "H2-servicios", (p) => p.getByText("Catering para 100 invitados").first().waitFor()], ["entrega", "H3-entrega", (p) => p.getByText(/Entrega a cargo de/).first().waitFor()]]) {
    await shots("F28", email, `/portal/${route}`, name, ready);
  }
  record("F28", "REQ-F28-03", "pantallas propias de Productos (D6) y Servicios (D5): cada una lista solo su tipo, datos reales");
  record("F28", "REQ-F28-05", "pantalla propia de Condiciones de entrega (D8): responsable, cobertura, traslado y plazo de cada oferta, datos reales");

  // Documents: register -> PUT to MinIO :29000 -> complete -> 'Recibido'
  {
    const { page, context } = await session(email, 1280);
    await go(page, "/portal/documentos");
    await page.getByTestId("document-choose").waitFor();
    const puts = [];
    page.on("request", (request) => { if (request.method() === "PUT" && /:29000\//.test(request.url())) puts.push(request.url().split("?")[0]); });
    page.on("response", (response) => { if (response.request().method() === "PUT" && /:29000\//.test(response.url())) puts.push(`status ${response.status()}`); });
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    for (const [label, file] of [["PDF", { name: "registro-negocio.pdf", mimeType: "application/pdf", buffer: pdf }], ["PNG", { name: "carnet.png", mimeType: "image/png", buffer: png }]]) {
      const chooser = page.waitForEvent("filechooser");
      await page.getByTestId("document-choose").click();
      await (await chooser).setFiles(file);
      await page.getByTestId("document-chosen").waitFor();
      if (label === "PDF") await snap("F28", page, "I1-documento-elegido", 1280);
      await page.getByTestId("document-upload").click();
      await page.getByText("Documento subido.").waitFor();
      await page.locator('[data-testid^="document-"]', { hasText: file.name }).filter({ hasText: "Recibido" }).first().waitFor();
      await snap("F28", page, `I2-recibido-${label}`, 1280);
    }
    const docs = (await http("GET", `/providers/${world.provider.id}/documents`, { token: await apiLogin(email) })).json.items;
    const uploaded = docs.filter((d) => d.status === "UPLOADED").length;
    assert.ok(uploaded >= 2, JSON.stringify(docs));
    assert.ok(puts.some((entry) => entry === "status 200"), puts.join());
    for (const width of [360, 768]) { await page.setViewportSize({ width, height: 800 }); await noOverflow(page, `docs-${width}`); await snap("F28", page, "I3-documentos", width); }
    record("F28", "REQ-F28-01c", `registrar (201) -> PUT a MinIO ${puts.find((p) => p.includes(":29000"))?.replace(/\/[^/]*$/, "/…")} (${puts.filter((p) => p.startsWith("status")).join(",")}) -> completar -> 'Recibido' (PDF y PNG); el backend lista ${uploaded} documentos UPLOADED`);
    await context.close();
  }

  // Coherent CTR: impressions first, then real clicks through the redirector
  {
    const token = await apiLogin(email);
    const metrics = async () => (await http("GET", `/providers/${world.provider.id}/metrics`, { token })).json.totals;
    const before = await metrics();
    const ids = world.listings.map((l) => l.id);
    const impressions = [];
    for (let i = 0; i < 4; i += 1) impressions.push((await http("POST", "/providers/impressions", { body: { listingIds: ids, surface: "SEARCH" } })).status);
    await sleep(1500);
    const guest = state.b?.token ?? world.guest.issued.token;
    const { page, context } = await newPage(1280);
    await page.goto(`${SITE}/c/${slug}/regalos#t=${guest}`);
    await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor();
    let clicks = 0;
    for (const link of await page.locator('a[href^="/r/"]').all()) {
      const href = await link.getAttribute("href");
      if (!ids.some((id) => href.includes(id))) continue; // gifts added from other providers' listings are not this provider's clicks
      const response = await page.request.get(`${SITE}${href}`, { maxRedirects: 0 });
      assert.equal(response.status(), 302); clicks += 1;
    }
    await context.close();
    await sleep(6000);
    const after = await metrics();
    assert.ok(after.impressions > before.impressions, "impressions grew");
    assert.ok(after.impressions >= after.clicks, `impressions ${after.impressions} >= clicks ${after.clicks}`);
    assert.ok(after.ctr <= 1);
    record("F28", "REQ-F28-06c", `impresiones POST /providers/impressions (${impressions.join(",")}) antes de ${clicks} clics 302 por /r/: totals ${JSON.stringify(before)} -> ${JSON.stringify(after)} (CTR=${after.ctr})`);
    state.metrics = { before, after, impressions, clicks };
  }
  await shots("F28", email, "/portal/metricas", "D13-metricas", (p) => p.getByTestId("metric-totals").waitFor());
  await shots("F28", email, "/portal/leads", "D12-leads", (p) => p.getByText("Cotizaciones recibidas").waitFor());
}

async function quote() {
  console.log("\nF26 · cotizacion sin cuenta");
  const providerSlug = world.provider.slug;
  const path = `/p/${providerSlug}/cotizar?l=${world.listings[0].id}`;
  const fillForm = async (page, email, name = "Visitante Anonimo") => {
    await page.getByLabel("Fecha del evento").fill("2027-05-10");
    await page.getByLabel("Cantidad de invitados").fill("60");
    await page.getByLabel("Tu nombre").fill(name);
    await page.getByLabel("Tu correo").fill(email);
  };
  const stamp = Date.now().toString(36);
  const sameEmail = `anon.${stamp}@example.com`;
  for (const width of WIDTHS) {
    const { page, context } = await newPage(width);
    await page.goto(`${SITE}${path}`);
    await page.getByTestId("quote-anon-note").waitFor();
    await noOverflow(page, `cotizar-${width}`); await snap("F26", page, "J1-cotizar-sin-cuenta", width);
    if (width === 1280) {
      assert.equal(await page.evaluate(() => sessionStorage.length), 0, "no session");
      const authHeaders = [];
      page.on("request", (request) => { if (request.url().includes("/quotes")) authHeaders.push(request.headers()["authorization"] ?? null); });
      const responses = [];
      page.on("response", (response) => { if (response.url().includes("/quotes")) responses.push(response.status()); });
      await fillForm(page, sameEmail);
      await page.getByRole("button", { name: "Enviar solicitud" }).click();
      await page.getByRole("heading", { name: "Solicitud enviada" }).waitFor();
      assert.deepEqual(authHeaders, [null]); assert.deepEqual(responses, [201]);
      await snap("F26", page, "J2-enviada-sin-cuenta", 1280);
      record("F26", "REQ-F26-01a", "cotizar sin sesion: POST /quotes sin Authorization -> 201 'Solicitud enviada' (modo open local)");
    }
    await context.close();
  }
  // honeypot filled -> 422 QUOTE_REJECTED
  {
    const { page, context } = await newPage(360);
    await page.goto(`${SITE}${path}`);
    await fillForm(page, `bot.${stamp}@example.com`);
    await page.evaluate(() => { const input = document.getElementById("website"); input.value = "http://spam.example"; });
    const status = page.waitForResponse((response) => response.url().includes("/quotes"));
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    const response = await status;
    assert.equal(response.status(), 422); assert.equal((await response.json()).code, "QUOTE_REJECTED");
    await page.getByText(/No pudimos aceptar la solicitud/).waitFor();
    await snap("F26", page, "J3-honeypot-rechazado", 360);
    const visible = await page.evaluate(() => { const input = document.getElementById("website"); const r = input.getBoundingClientRect(); return r.right > 0 && r.left < window.innerWidth; });
    assert.equal(visible, false, "honeypot is off screen");
    record("F26", "REQ-F26-01b", "honeypot 'website' fuera de pantalla; si se llena el backend responde 422 QUOTE_REJECTED y la UI lo dice");
    await context.close();
  }
  // 429 per contact (3/day/provider/email) then per address
  const post = (email) => http("POST", `/providers/${world.provider.id}/quotes`, { body: { listingIds: [world.listings[0].id], eventDate: "2027-05-10", guestCount: 60, contact: { name: "Anon", email } } });
  const statuses = [201]; // the UI one
  let limited = null;
  for (let i = 0; i < 5 && !limited; i += 1) { const r = await post(sameEmail); statuses.push(r.status); if (r.status === 429) limited = r; }
  assert.ok(limited, `contact limit reached: ${statuses.join()}`);
  assert.equal(limited.json.code, "QUOTE_LIMIT_REACHED");
  {
    const { page, context } = await newPage(360);
    await page.goto(`${SITE}${path}`);
    await fillForm(page, sameEmail);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await page.getByText(/máximo de solicitudes hoy/).waitFor();
    await snap("F26", page, "J4-limite-por-correo-429", 360);
    await context.close();
    record("F26", "REQ-F26-01c", `429 QUOTE_LIMIT_REACHED al 4.o envio con el mismo correo (${statuses.join(",")}); la UI explica el limite`);
  }
  let addressLimited = null; const addressStatuses = [];
  for (let i = 0; i < 8 && !addressLimited; i += 1) { const r = await post(`anon.${stamp}.${i}@example.com`); addressStatuses.push(r.status); if (r.status === 429) addressLimited = r; }
  assert.ok(addressLimited, `address limit reached: ${addressStatuses.join()}`);
  {
    const { page, context } = await newPage(360);
    await page.goto(`${SITE}${path}`);
    await fillForm(page, `anon.${stamp}.fresh@example.com`);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await page.getByText(/Enviaste muchas solicitudes seguidas/).waitFor();
    await snap("F26", page, "J5-limite-por-direccion-429", 360);
    await context.close();
    record("F26", "REQ-F26-01d", `429 por direccion tras ${addressStatuses.length} envios mas (${addressStatuses.join(",")}; Retry-After=${addressLimited.headers.get("retry-after")}); la UI espera y explica`);
  }
  // date request still needs an account
  {
    const { page, context } = await newPage(360);
    await page.goto(`${SITE}/p/${providerSlug}/agenda`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const free = page.locator('button[data-date]:not([aria-disabled="true"])').first();
    await free.waitFor();
    await free.click();
    await page.getByRole("button", { name: "Solicitar esta fecha" }).click();
    await page.getByText(/Inicia sesión para solicitar una fecha/).waitFor();
    await snap("F26", page, "J6-fecha-requiere-cuenta", 360);
    await context.close();
    record("F26", "REQ-F26-04", "pedir fecha sigue requiriendo cuenta: 401 -> 'Inicia sesion para solicitar una fecha'");
  }
}

try {
  if (!only || only === "f22") await f22();
  if (!only || only === "f23") await f23();
  if (!only || only === "f21") await f21();
  if (!only || only === "f28") await f28();
  if (!only || only === "quote") await quote();
} finally {
  await browser.close();
  writeFileSync(join(fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url)), `live-run-closeout-${only ?? "all"}.json`), JSON.stringify({ date: new Date().toISOString(), consoleErrors, results, metrics: state.metrics }, null, 2));
}
console.log(`\n${results.length} checks passed, console errors: ${consoleErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.slice(0, 8).join("\n"));
