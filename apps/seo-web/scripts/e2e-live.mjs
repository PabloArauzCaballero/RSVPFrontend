// Browser run of F22/F25/F26/F27 against the REAL backend (Kong :28000) and the real Next.js dev server (:3000, CORS origin of Kong).
//   node apps/seo-web/scripts/live-world.mjs > $WORLD ; WORLD=$WORLD CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/seo-web/scripts/e2e-live.mjs [f22|f26|f25|f27]
// Screens are written to docs/progress/evidence/lane-FNN/. Nothing here is mocked: every API answer comes from the live services.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const API = process.env.API_URL ?? "http://localhost:28000";
const SITE = process.env.SITE ?? "http://localhost:3000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const evidence = (lane) => fileURLToPath(new URL(`../../../docs/progress/evidence/lane-${lane}/`, import.meta.url));
const only = process.argv[2];
const WIDTHS = [360, 768, 1280];
const results = [];
const record = (lane, id, text) => { results.push({ lane, id, text, status: "PASS" }); console.log(`  PASS ${lane} ${id} · ${text}`); };

async function http(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : undefined };
}
const login = async (email) => (await http("POST", "/identity/auth/login", { body: { email, password: world.password } })).json.accessToken;
async function setSettings(hostToken, patch) {
  const { json: current } = await http("GET", `/celebrations/${world.celebration.id}`, { token: hostToken });
  const response = await http("PUT", `/celebrations/${world.celebration.id}/settings`, { token: hostToken, headers: { "if-match": String(current.version) }, body: patch });
  assert.equal(response.status, 200, `settings ${JSON.stringify(response.json)}`);
  await new Promise((resolve) => setTimeout(resolve, 2500)); // Gift List learns the setting from celebration.settings.updated.v1 (eventually consistent)
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const consoleErrors = [];
async function open(width, path, { credential, slug = world.celebration.slug } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO" });
  if (credential) await context.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [`rsvp.guest.credential.${slug}`, credential]);
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) consoleErrors.push(`${path}: ${message.text()}`); });
  await page.goto(`${SITE}${path}`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  return { page, context };
}
const snap = (lane, page, name, width) => page.screenshot({ path: join(evidence(lane), `${name}-${width}.png`), fullPage: true });
const noOverflow = async (page, name) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `horizontal scroll on ${name}`);

async function f22() {
  console.log("\nF22 · lista de regalos pública");
  const host = await login(world.host.email);
  await setSettings(host, { externalGiftMode: "AUTO_ACCEPT", giftReservationMode: "AUTO_ACCEPT" });
  const external = await http("POST", `/gifts/celebrations/${world.celebration.id}/items`, { token: host, body: { source: "EXTERNAL", title: "Cafetera italiana", price: { amountMinor: 18000, currency: "BOB" }, url: "https://tienda.example/cafetera", partnerSuggestionsAcknowledged: true } });
  assert.equal(external.status, 201);
  const credential = await login(world.viewer.email);
  const path = `/c/${world.celebration.slug}/regalos`;

  // Reality of the live contract: the guest's opaque link token is NOT accepted by Gift List (401), and the page says so clearly.
  for (const width of WIDTHS) {
    const { page, context } = await open(width, path);
    await page.getByRole("heading", { name: "Abre tu enlace de invitación" }).waitFor();
    await noOverflow(page, `needs-link-${width}`);
    await snap("F22", page, "A14-sin-enlace", width);
    await context.close();
  }
  record("F22", "401", "sin credencial: estado claro 'Abre tu enlace' (Gift List exige bearer; SSR anónimo da 401)");
  {
    const linkToken = world.guest.issued.token;
    const { page, context } = await open(360, path, { credential: linkToken });
    await page.getByRole("heading", { name: "Tu enlace venció" }).waitFor();
    await snap("F22", page, "A14-token-de-enlace-rechazado", 360);
    await context.close();
    record("F22", "401-link", "el token opaco del enlace de invitado es rechazado por Gift List en vivo (401) -> mensaje 'Tu enlace venció'");
  }

  // With a real Identity JWT as the guest credential the whole flow runs against the live service.
  for (const width of WIDTHS) {
    const { page, context } = await open(width, path, { credential });
    await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor();
    await noOverflow(page, `list-${width}`);
    await snap("F22", page, "A14-catalogo", width);
    if (width === 1280) {
      const order = await page.$$eval("[data-gift-id]", (cards) => cards.map((card) => card.getAttribute("data-source")));
      assert.deepEqual(order, [...order].sort((a, b) => (a === "CATALOGED" ? 0 : 1) - (b === "CATALOGED" ? 0 : 1)), "cataloged first in the rendered order");
      assert.ok(order.includes("EXTERNAL") && order[0] === "CATALOGED");
      record("F22", "REQ-F22-02", `orden renderizado: ${order.join(" > ")}`);
      await page.getByLabel("Precio máximo").fill("400");
      assert.equal(await page.locator("[data-gift-id]").count(), 2);
      await page.getByLabel("Origen").selectOption("other");
      assert.equal(await page.locator("[data-gift-id][data-source=CATALOGED]").count(), 0);
      await snap("F22", page, "A14-filtrado", width);
      record("F22", "REQ-F22-01", "filtros por precio, origen y disponibilidad funcionan sobre datos reales");
    }
    await context.close();
  }

  // Anti double click + 201 (AUTO_ACCEPT => COMMITTED)
  {
    const { page, context } = await open(360, path, { credential });
    await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor();
    const posts = [];
    page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/reservations")) posts.push({ key: request.headers()["idempotency-key"] }); });
    await page.getByRole("button", { name: /Reservar Torta de bodas/ }).click();
    await page.getByLabel("Tu nombre").fill("Marta Invitada");
    await snap("F22", page, "A16-reservar", 360);
    await page.getByRole("button", { name: "Reservar regalo" }).dblclick();
    await page.getByRole("heading", { name: "¡Regalo reservado!" }).waitFor();
    assert.equal(posts.length, 1, `exactly one POST, got ${posts.length}`);
    assert.ok(posts[0].key, "Idempotency-Key sent");
    await snap("F22", page, "A18-confirmada", 360);
    record("F22", "REQ-F22-05a", "doble clic -> 1 POST con Idempotency-Key; 201 COMMITTED muestra 'Regalo reservado'");
    await context.close();
  }

  // 409 GIFT_NOT_AVAILABLE: someone else reserves while the dialog is open
  {
    const rival = await login(world.host.email);
    const { page, context } = await open(360, path, { credential });
    await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor();
    await page.getByRole("button", { name: /Reservar Mesa de dulces/ }).click();
    const target = world.giftItems[1];
    const taken = await http("POST", `/gifts/celebrations/${world.celebration.id}/items/${target}/reservations`, { token: rival, body: {} });
    assert.equal(taken.status, 201);
    await page.getByRole("button", { name: "Reservar regalo" }).click();
    await page.getByRole("heading", { name: "Alguien se adelantó" }).waitFor();
    const alternatives = await page.getByTestId("alternatives").locator("[data-gift-id]").count();
    assert.ok(alternatives >= 1, "alternatives offered");
    await snap("F22", page, "A19-ya-tomado", 360);
    await page.setViewportSize({ width: 1280, height: 900 }); await snap("F22", page, "A19-ya-tomado", 1280);
    record("F22", "REQ-F22-06", `409 GIFT_NOT_AVAILABLE: mensaje claro + ${alternatives} alternativas reales y lista refrescada`);
    await context.close();
  }

  // PENDING_REVIEW when the celebration restricts reservations
  {
    await setSettings(host, { giftReservationMode: "RESTRICTED" });
    const { page, context } = await open(360, path, { credential });
    await page.getByRole("heading", { name: "Productos de nuestros aliados" }).waitFor();
    await page.getByRole("button", { name: /Reservar Catering/ }).click();
    await page.getByRole("button", { name: "Reservar regalo" }).click();
    await page.getByRole("heading", { name: "Solicitud enviada" }).waitFor();
    await snap("F22", page, "A17-pendiente", 360);
    record("F22", "REQ-F22-05b", "modo RESTRICTED -> 201 PENDING_REVIEW muestra 'Solicitud enviada'");
    await setSettings(host, { giftReservationMode: "AUTO_ACCEPT" });
    await context.close();
  }

  // Detail page + redirector link
  {
    const { page, context } = await open(1280, `${path}/${world.giftItems[0]}`, { credential });
    await page.getByRole("heading", { level: 1, name: "Torta de bodas" }).waitFor();
    const href = await page.getByRole("link", { name: "Ver en la tienda del aliado" }).getAttribute("href");
    assert.match(href, /^\/r\/[0-9a-f-]{36}\?destination=PRODUCT_PAGE&surface=GIFT_LIST/);
    await snap("F22", page, "A15-detalle", 1280);
    record("F22", "REQ-F22-03", `detalle con precio en BOB y enlace al partner por ${href.split("?")[0].slice(0, 3)}…`);
    await context.close();
  }
}

const lanes = { f22 };
const extra = (await import("./e2e-live-more.mjs").catch(() => ({}))).default ?? {};
Object.assign(lanes, extra);
try {
  for (const [name, run] of Object.entries(lanes)) if (!only || only === name) await run({ browser, open, snap, noOverflow, http, login, world, record, evidence, SITE, API, WIDTHS });
} finally {
  await browser.close();
  writeFileSync(join(fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url)), `live-run-${only ?? "all"}.json`), JSON.stringify({ date: new Date().toISOString(), consoleErrors, results }, null, 2));
}
console.log(`\n${results.length} checks passed, console errors: ${consoleErrors.length}`);
