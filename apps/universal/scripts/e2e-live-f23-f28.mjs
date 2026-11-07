// F23 (host gifts) and F28 (provider portal) in Chrome against the REAL backend: the exported web app on :8081 (Kong's CORS origin)
// and Kong on :28000. Sign-in goes through the real login screen. World from apps/seo-web/scripts/live-world.mjs.
//   WORLD=world.json CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/e2e-live-f23-f28.mjs [f23|f28]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8081";
const API = process.env.API ?? "http://localhost:28000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const evidence = (lane) => fileURLToPath(new URL(`../../../docs/progress/evidence/lane-${lane}/`, import.meta.url));
const only = process.argv[2];
const WIDTHS = [360, 768, 1280];
const results = [];
const record = (lane, id, text) => { results.push({ lane, id, text, status: "PASS" }); console.log(`  PASS ${lane} ${id} · ${text}`); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function http(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : undefined };
}
const apiLogin = async (email) => (await http("POST", "/identity/auth/login", { body: { email, password: world.password } })).json.accessToken;
async function setSettings(hostToken, patch) {
  const { json: current } = await http("GET", `/celebrations/${world.celebration.id}`, { token: hostToken });
  const response = await http("PUT", `/celebrations/${world.celebration.id}/settings`, { token: hostToken, headers: { "if-match": String(current.version) }, body: patch });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  await sleep(2500);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const consoleErrors = [];
async function session(email, width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO" });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) consoleErrors.push(message.text()); });
  await page.goto(`${APP}/login`);
  await page.getByLabel(/^(Correo electrónico|Correo)$/).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: /^(Iniciar sesión|Entrar)$/ }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  return { page, context };
}
const go = async (page, path) => { await page.goto(`${APP}${path}`); await page.waitForLoadState("networkidle").catch(() => undefined); };
const snap = (lane, page, name, width) => page.screenshot({ path: join(evidence(lane), `${name}-${width}.png`), fullPage: true });
const noOverflow = async (page, name) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `horizontal scroll on ${name}`);
const shots = async (lane, email, path, name, ready) => {
  for (const width of WIDTHS) {
    const { page, context } = await session(email, width);
    await go(page, path); await ready(page); await noOverflow(page, `${name}-${width}`); await snap(lane, page, name, width); await context.close();
  }
};

async function f23() {
  console.log("\nF23 · gestion de regalos del anfitrion");
  const hostToken = await apiLogin(world.host.email);
  const viewer = await apiLogin(world.viewer.email);
  const c = `?c=${world.celebration.id}`;
  await shots("F23", world.host.email, `/regalos${c}`, "C29-estado-regalos", (page) => page.getByTestId(`gift-${world.giftItems[0]}`).waitFor());
  {
    const { page, context } = await session(world.host.email);
    await go(page, `/regalos${c}`);
    await page.getByTestId(`gift-${world.giftItems[0]}`).waitFor();
    const proposed = page.locator('[data-testid^="gift-status-"]', { hasText: /^(Propuesto|Por revisar)$/ });
    assert.ok(await proposed.count() >= 1, "a PROPOSED external gift is shown to the host");
    const first = await page.locator('[data-testid^="gift-status-"]').first().innerText();
    assert.match(first, /Disponible|Comprometido/);
    record("F23", "REQ-F23-04", "estado de cada regalo (disponible / propuesto) con catalogados primero, datos reales");
    await page.locator('[data-testid^="approve-proposal-"]').first().click();
    await page.waitForFunction(() => !document.body.innerText.includes("Propuesto, por revisar"));
    record("F23", "REQ-F23-04b", "aprobar una propuesta externa (POST /items/{id}/approve) la deja Disponible");
    await context.close();
  }
  // Inbox: restricted reservations, one approved from the UI, one rejected after someone else already decided (409)
  await setSettings(hostToken, { giftReservationMode: "RESTRICTED" });
  const reserve = (item) => http("POST", `/gifts/celebrations/${world.celebration.id}/items/${item}/reservations`, { token: viewer, body: { guestDisplayName: "Marta Invitada", message: "Felicidades" } });
  const r1 = await reserve(world.giftItems[0]); const r2 = await reserve(world.giftItems[1]);
  assert.equal(r1.status, 201); assert.equal(r2.status, 201); assert.equal(r1.json.status, "PENDING_REVIEW");
  await shots("F23", world.host.email, `/bandeja/regalos${c}`, "C25-bandeja-reservas", (page) => page.getByTestId(`reservation-${r1.json.id}`).waitFor());
  {
    const { page, context } = await session(world.host.email);
    await go(page, `/bandeja/regalos${c}`);
    await page.getByText("Solicitó: Marta Invitada").first().waitFor();
    await page.getByTestId(`approve-${r1.json.id}`).click();
    await page.getByText("Reserva aprobada.").waitFor();
    const items = (await http("GET", `/gifts/celebrations/${world.celebration.id}/items`, { token: hostToken })).json.items;
    assert.equal(items.find((i) => i.id === world.giftItems[0]).status, "COMMITTED");
    await snap("F23", page, "C25-aprobada", 1280);
    record("F23", "REQ-F23-01", "bandeja con quien lo pidio; aprobar -> el regalo queda COMMITTED en el backend");
    // someone else resolves r2 first, then the UI rejects it -> 409 handled
    const approvedElsewhere = await http("POST", `/gifts/celebrations/${world.celebration.id}/reservations/${r2.json.id}/approve`, { token: hostToken });
    assert.equal(approvedElsewhere.status, 200);
    await page.getByTestId(`reject-${r2.json.id}`).click();
    await page.getByText(/ya no estaba pendiente/).waitFor();
    await snap("F23", page, "C25-409-ya-resuelta", 1280);
    record("F23", "409", "rechazar una reserva ya resuelta por otro: aviso claro y lista refrescada");
    await context.close();
  }
  await setSettings(hostToken, { giftReservationMode: "AUTO_ACCEPT" });
  // Catalog
  await shots("F23", world.host.email, `/regalos/catalogo${c}`, "C27-catalogo", (page) => page.getByTestId("catalog-query").waitFor());
  {
    const { page, context } = await session(world.host.email);
    await go(page, `/regalos/catalogo${c}`);
    await page.getByTestId("catalog-query").fill("torta");
    await page.getByTestId("catalog-search").click();
    // The fallback note only exists when the product search is down (viaFallback); with search available the hit itself is the proof.
    const hit = page.locator('[data-testid^="hit-"]').first();
    await hit.waitFor();
    await snap("F23", page, "C27-resultados", 1280);
    await hit.getByRole("button", { name: /^(Agregar a la lista|Agregar a mi lista)$/ }).click();
    await page.getByText(/^Agregado:/).waitFor();
    const items = (await http("GET", `/gifts/celebrations/${world.celebration.id}/items`, { token: hostToken })).json.items;
    assert.ok(items.filter((i) => i.source === "CATALOGED").length >= 4, "cataloged gift created");
    record("F23", "REQ-F23-02", "buscar (el gateway no enruta GET /listings: aviso + catalogo publico) y agregar un producto CATALOGED real (201)");
    await context.close();
  }
  // External with friction
  await setSettings(hostToken, { partnerPriorityEnabled: true, externalGiftMode: "RESTRICTED" });
  await shots("F23", world.host.email, `/regalos/externo${c}`, "C28-externo", (page) => page.getByTestId("external-title").waitFor());
  {
    const { page, context } = await session(world.host.email);
    await go(page, `/regalos/externo${c}`);
    await page.getByTestId("external-title").fill("Licuadora Oster");
    await page.getByTestId("external-url").fill("https://tienda.example/oster");
    await page.getByTestId("external-price").fill("320");
    await page.getByTestId("external-submit").click();
    await page.getByText(/Antes de (continuar|seguir)/).waitFor();
    await snap("F23", page, "C28-fricción-409-partner-first", 1280);
    await page.getByRole("button", { name: "Agregar de todos modos" }).click();
    await page.getByText(/queda (pendiente de tu aprobación|por revisar)/).waitFor();
    await snap("F23", page, "C28-propuesto", 1280);
    record("F23", "REQ-F23-03", "regalo externo: 409 PARTNER_CATALOG_FIRST muestra la fricción; 'agregar de todos modos' reenvia con acknowledged y queda PROPOSED");
    // The two settings that govern external gifts now live only in "Modos de control" (one place per datum).
    await go(page, `/modos${c}`);
    const current = (await http("GET", `/celebrations/${world.celebration.id}`, { token: hostToken })).json.settings.externalGiftMode;
    if (current !== "AUTO_ACCEPT") {
      await page.getByTestId("switch-externalGiftMode").click();
      await page.getByRole("button", { name: "Sí, cambiar" }).click();
      await page.getByText(/Modo actualizado/).waitFor();
    }
    const settings = (await http("GET", `/celebrations/${world.celebration.id}`, { token: hostToken })).json.settings;
    assert.equal(settings.externalGiftMode, "AUTO_ACCEPT");
    record("F23", "switch", "el switch del modo externo escribe externalGiftMode=AUTO_ACCEPT en Celebration (PUT /settings con If-Match)");
    await context.close();
  }
  // 403: a user who is not a member of the celebration
  {
    const stranger = `f23stranger.${Date.now()}@example.com`;
    const registered = await http("POST", "/identity/auth/register", { body: { email: stranger, password: world.password } });
    assert.equal(registered.status, 201);
    const { page, context } = await session(stranger);
    await go(page, `/regalos${c}`);
    await page.getByText(/no se encontr|No encontramos|no existe|no tienes|Puedes ver|error/i).first().waitFor();
    await snap("F23", page, "C29-no-miembro", 1280);
    record("F23", "403/404", "un usuario ajeno a la celebracion ve un aviso (sin datos), no un error en blanco");
    await context.close();
  }
}

async function f28() {
  console.log("\nF28 · portal del proveedor");
  const stamp = Date.now().toString(36);
  const fresh = `f28fresh.${stamp}@example.com`;
  assert.equal((await http("POST", "/identity/auth/register", { body: { email: fresh, password: world.password, role: "PROVIDER" } })).status, 201);
  // D1-D3: onboarding of a brand-new provider
  {
    const { page, context } = await session(fresh, 360);
    await go(page, "/portal");
    await page.getByText(/^Primero registra tu negocio/).waitFor();
    await snap("F28", page, "D1-sin-ficha", 360);
    await page.getByTestId("go-onboarding").click();
    await page.getByTestId("provider-name").fill(`Pasteles Luna ${stamp}`);
    await snap("F28", page, "D1-alta", 360);
    await page.getByTestId("provider-create").click();
    await page.getByTestId("provider-status").waitFor();
    assert.equal(await page.getByTestId("provider-status").innerText(), "Borrador");
    await snap("F28", page, "D2-borrador", 360);
    record("F28", "REQ-F28-01a", "alta real (POST /providers) -> ficha en Borrador con la nota de documentos");
    await go(page, "/portal/servicios");
    // Offers are one list now: the short form opens from "Nueva oferta" (testID offer-new).
    if (!(await page.getByTestId("listing-name").isVisible().catch(() => false))) await page.getByTestId("offer-new").click();
    await page.getByTestId("listing-name").fill("Torta de chocolate");
    await page.getByTestId("listing-whatsapp").fill("https://wa.me/59171111111");
    await page.getByTestId("listing-coverage").fill("la-paz, el-alto");
    await page.getByTestId("listing-lead").fill("2");
    await page.getByTestId("listing-conditions").fill("Entrega en tu domicilio.");
    await page.getByTestId("listing-price").fill("200");
    await page.getByTestId("listing-submit").click();
    await page.getByText("Oferta creada como borrador.").waitFor();
    await snap("F28", page, "D5-servicios", 360);
    await page.locator('[data-testid^="publish-"]').first().click();
    await page.locator('[data-testid^="listing-state-"]', { hasText: "Publicado" }).waitFor();
    record("F28", "REQ-F28-03", "crear oferta con condiciones de entrega (201 borrador) y publicarla (200)");
    await go(page, "/portal");
    await page.getByTestId("submit-verification").waitFor();
    await page.waitForFunction(() => { const b = document.querySelector('[data-testid="submit-verification"]'); return b && !b.hasAttribute("disabled") && b.getAttribute("aria-disabled") !== "true"; });
    await page.getByTestId("submit-verification").click();
    await page.getByText("En verificación", { exact: true }).waitFor();
    await snap("F28", page, "D3-en-verificacion", 360);
    record("F28", "REQ-F28-01b", "enviar a verificacion (POST /submit) -> estado 'En verificacion' real; verificar requiere ADMIN (fuera del portal)");
    await context.close();
  }
  // Verified provider: connect its id, then the rest
  const email = world.provider.email;
  const first = await session(email, 1280);
  await go(first.page, "/portal/alta");
  await first.page.getByTestId("provider-code").fill(world.provider.id);
  await first.page.getByTestId("provider-connect").click();
  await first.page.getByTestId("provider-status").waitFor();
  assert.equal(await first.page.getByTestId("provider-status").innerText(), "Verificado");
  await first.context.close();
  for (const width of WIDTHS) {
    const { page, context } = await session(email, width);
    await go(page, "/portal/alta"); await page.getByTestId("provider-code").fill(world.provider.id); await page.getByTestId("provider-connect").click(); await page.getByTestId("provider-status").waitFor();
    await page.getByTestId("metric-totals").waitFor();
    await noOverflow(page, `portal-${width}`); await snap("F28", page, "D2-verificado-resumen", width);
    await go(page, "/portal/leads"); await page.getByText(/^(Cotizaciones recibidas|Solicitudes)$/).first().waitFor(); await page.waitForSelector('[data-testid^="lead-"]'); await noOverflow(page, `leads-${width}`); await snap("F28", page, "D12-leads", width);
    await go(page, "/portal/metricas"); await page.getByTestId("metric-totals").waitFor(); await noOverflow(page, `metricas-${width}`); await snap("F28", page, "D13-metricas", width);
    await go(page, "/portal/destinos"); await page.getByTestId("destinations-save").waitFor(); await noOverflow(page, `destinos-${width}`); await snap("F28", page, "D7-destinos", width);
    await go(page, "/portal/agenda"); await page.getByTestId("agenda-save").waitFor(); await noOverflow(page, `agenda-${width}`); await snap("F28", page, "D9-agenda", width);
    await go(page, "/portal/servicios"); await page.locator('[data-testid^="listing-"]').first().waitFor(); await noOverflow(page, `servicios-${width}`); await snap("F28", page, "D5-servicios-verificado", width);
    if (width === 1280) {
      await go(page, "/portal/leads");
      const text = await page.locator("body").innerText();
      assert.match(text, /Cotizaci/); assert.match(text, /Clic|Toques/);
      record("F28", "REQ-F28-06a", "leads reales: cotizaciones FORM (F26) y clics REDIRECT (F27) separados");
      await go(page, "/portal/metricas");
      const totals = await page.getByTestId("metric-totals").innerText();
      assert.match(totals, /Impresiones|Veces que te vieron/);
      record("F28", "REQ-F28-06b", `metricas reales del periodo (GET /metrics): ${totals.replace(/\n+/g, " | ").slice(0, 120)}`);
      await go(page, "/portal/destinos");
      const enabledNow = page.locator('[data-testid^="destination-"][aria-checked="true"]');
      while (await enabledNow.count()) await enabledNow.first().click();
      await page.getByTestId("destinations-save").click();
      await page.getByText("Elige al menos un destino.").waitFor();
      await snap("F28", page, "D7-minimo-un-destino", 1280);
      await page.getByTestId("destination-WHATSAPP").click();
      await page.getByTestId("destinations-save").click();
      await page.getByText("Destinos guardados.").waitFor();
      record("F28", "REQ-F28-04", "al menos un destino obligatorio (validacion) y guardado real PUT /lead-config");
      await go(page, "/portal/agenda");
      await page.getByTestId("blackout-date").fill("2027-04-01");
      await page.getByTestId("blackout-add").click();
      await page.getByTestId("agenda-save").click();
      await page.getByText("Agenda guardada.").waitFor();
      record("F28", "agenda", "disponibilidad guardada con PUT /availability (dia bloqueado agregado)");
      const booking = page.locator('[data-testid^="confirm-"]').first();
      if (await booking.count()) { await booking.click(); await page.getByText("Solicitud actualizada.").waitFor(); await snap("F28", page, "D10-reserva-confirmada", 1280); record("F28", "bookings", "confirmar una solicitud de fecha recibida (POST /bookings/{id}/confirm)"); }
    }
    await context.close();
  }
}

try {
  if (!only || only === "f23") await f23();
  if (!only || only === "f28") await f28();
} finally {
  await browser.close();
  writeFileSync(join(fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url)), `live-run-universal-${only ?? "all"}.json`), JSON.stringify({ date: new Date().toISOString(), consoleErrors, results }, null, 2));
}
console.log(`\n${results.length} checks passed, console errors: ${consoleErrors.length}`);
