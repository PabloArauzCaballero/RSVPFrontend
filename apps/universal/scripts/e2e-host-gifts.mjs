// F23: compiled Expo web in Chrome against local HTTP contract fixtures, without publishing.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHostGiftFixture, GUEST_TOKEN, LISTING_A, LISTING_B } from "../test/fixtures/host-gifts.ts";

const app = fileURLToPath(new URL("..", import.meta.url));
const out = resolve(app, "web-build-f23");
assert.ok(out.startsWith(resolve(app) + sep), "temporary export must stay inside its app");
assert.ok(!existsSync(out), "preserve an existing output directory");
const evidence = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F23/local-web/", import.meta.url));
mkdirSync(evidence, { recursive: true });
const API_PORT = Number(process.env.API_PORT ?? 8531), APP_PORT = Number(process.env.APP_PORT ?? 8532);
const API = `http://localhost:${API_PORT}`, APP = `http://localhost:${APP_PORT}`;
const fixture = createHostGiftFixture(), c = fixture.state.celebration.id, query = `?c=${c}`;
const fixtureHostToken = [Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: "host", roles: ["HOST"], organizationIds: [], exp: 4102444800 })).toString("base64url"), "fixture"].join(".");
let apiDelay = 0, browser, staticServer, activePage;
const report = { surface: "Expo web in Chrome, HTTP fixtures; not a live backend or native device", date: new Date().toISOString(), checks: [], axe: [], runtimeErrors: [], steps: [] };
const response = (status, body, headers = {}) => ({ status, body, headers: { "content-type": "application/json", ...headers } });
const api = createServer(async (request, outgoing) => {
  const cors = { "access-control-allow-origin": request.headers.origin ?? APP, "access-control-allow-credentials": "true", "access-control-allow-headers": request.headers["access-control-request-headers"] ?? "authorization,content-type,x-correlation-id,idempotency-key,if-match,x-session-transport", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "x-correlation-id,retry-after" };
  if (request.method === "OPTIONS") { outgoing.writeHead(204, cors).end(); return; }
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  const path = new URL(request.url, API).pathname;
  let result;
  if (path === "/identity/auth/login") result = response(200, { accessToken: fixtureHostToken, expiresIn: 3600 }, { "set-cookie": "f23_fixture=host; HttpOnly; Path=/; SameSite=Lax" });
  else if (path === "/identity/auth/refresh") result = request.headers.cookie?.includes("f23_fixture=host") ? response(200, { accessToken: fixtureHostToken, expiresIn: 3600 }) : response(401, { status: 401, title: "No fixture session" });
  else {
    if (apiDelay && path.startsWith("/gifts/")) await new Promise((done) => setTimeout(done, apiDelay));
    result = fixture.handle({ method: request.method ?? "GET", path: request.url, headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])), body: raw ? JSON.parse(raw) : undefined });
  }
  outgoing.writeHead(result.status, { ...cors, ...result.headers }); outgoing.end(result.body === undefined || result.body === null ? undefined : JSON.stringify(result.body));
});
const sleep = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
const id = (page, name) => page.getByTestId(name).filter({ visible: true });
const heading = (page, name) => page.getByRole("heading", { name, exact: true });
function reset() {
  fixture.state.items = []; fixture.state.reservations = []; fixture.state.calls = []; fixture.state.failures.clear();
  fixture.state.settings = { showRequesterToHost: true, showRequesterToGuests: false, version: 0 };
  fixture.state.celebration = { ...fixture.state.celebration, settings: { ...fixture.state.celebration.settings, externalGiftMode: "RESTRICTED", partnerPriorityEnabled: true } };
}
const route = (path) => `${APP}${path}${query}`;
async function session(width, { locale = "es-BO", dark = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale, timezoneId: "Asia/Tokyo", reducedMotion: "reduce", colorScheme: dark ? "dark" : "light" });
  await context.route((url) => url.origin === APP && url.pathname.startsWith("/r/"), async (request) => {
    const url = new URL(request.request().url()); assert.match(url.pathname, /^\/r\/[0-9a-f-]+$/i); assert.equal(url.searchParams.get("surface"), "APP");
    await request.fulfill({ status: 200, contentType: "text/html", body: "<title>Redirector boundary</title><p>F23 redirector boundary</p>" });
  });
  const page = await context.newPage(); activePage = page;
  page.setDefaultTimeout(15000); page.on("pageerror", (error) => report.runtimeErrors.push(error.message));
  return { context, page };
}
async function host(page, path = "/regalos") {
  await page.goto(`${APP}${path}${query}`);
  await id(page, "login-email").fill("host@f23.test"); await id(page, "login-password").fill("F23FixturePass123!");
  await id(page, "login-submit").click();
  await page.waitForURL((url) => url.pathname === path && url.searchParams.get("c") === c);
}
async function snap(page, name) {
  activePage = page;
  assert.doesNotMatch(await page.locator("body").innerText(), /(?:hostGifts|gifts\.host|partner\.destination|directory\.category)\.[A-Za-z_]+/, name + " untranslated interface key");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + " horizontal overflow");
  const violations = (await new AxeBuilder({ page }).analyze()).violations.filter((finding) => ["serious", "critical"].includes(finding.impact));
  report.axe.push({ screen: name, violations: violations.map((finding) => finding.id) });
  assert.deepEqual(violations.map((finding) => finding.id), [], name + " axe");
  await page.screenshot({ path: join(evidence, name + ".png"), fullPage: true });
}
async function space(control) { await expect(control).toBeEnabled(); await control.focus(); await control.press("Space"); }

try {
  await new Promise((done) => api.listen(API_PORT, done));
  console.log("F23: building its temporary Expo web export");
  const exit = await new Promise((done, fail) => spawn(process.execPath, [fileURLToPath(import.meta.resolve("expo/bin/cli")), "export", "--platform", "web", "--output-dir", out, "--max-workers", "1", "--dev"], {
    cwd: app, stdio: "inherit", env: { ...process.env, NODE_ENV: "development", EXPO_PUBLIC_API_URL: API, EXPO_PUBLIC_SITE_URL: APP, EXPO_PUBLIC_DEV_ACCESS_TOKEN: "" }
  }).once("exit", done).once("error", fail));
  assert.equal(exit, 0, "Expo export must succeed");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".ttf": "font/ttf", ".woff2": "font/woff2", ".png": "image/png", ".ico": "image/x-icon" };
  staticServer = createServer((request, outgoing) => {
    const candidate = resolve(out, "." + decodeURIComponent(new URL(request.url, APP).pathname));
    if (candidate !== out && !candidate.startsWith(out + sep)) { outgoing.writeHead(403).end(); return; }
    const file = existsSync(candidate) && extname(candidate) ? candidate : join(out, "index.html");
    outgoing.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" }); outgoing.end(readFileSync(file));
  });
  await new Promise((done) => staticServer.listen(APP_PORT, done));
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  for (const width of [360, 768, 1280]) {
    reset();
    const { page, context } = await session(width); await host(page);
    await id(page, "go-catalog").waitFor();
    let partnerSteps = 0, externalSteps = 0;
    await space(id(page, "go-catalog")); partnerSteps++;
    await id(page, "hit-" + LISTING_A).waitFor(); await id(page, "hit-" + LISTING_A).scrollIntoViewIfNeeded(); await snap(page, `catalog-${width}`);
    await space(id(page, "add-" + LISTING_A)); partnerSteps++;
    await page.getByText("Agregado: Vajilla de cerámica", { exact: true }).waitFor();
    const item = fixture.state.items[0]; assert.equal(item.status, "AVAILABLE");
    await page.getByRole("button", { name: "Ver mis regalos", exact: true }).click();
    await id(page, "gift-" + item.id).waitFor(); await id(page, "gift-" + item.id).scrollIntoViewIfNeeded(); await snap(page, `gifts-${width}`);

    const guest = await session(width); await guest.page.goto(`${APP}/c/${fixture.state.celebration.slug}/regalos/${GUEST_TOKEN}`);
    await id(guest.page, "reserve-" + item.id).waitFor();
    assert.equal(await guest.page.getByTestId("login-email").count(), 0);
    const guestRead = fixture.state.calls.findLast((call) => call.method === "GET" && call.path.startsWith(fixture.prefix + "/items"));
    assert.equal(guestRead.headers.authorization, `Bearer ${GUEST_TOKEN}`);
    await id(guest.page, "reserve-" + item.id).click();
    await id(guest.page, "reserve-name").fill("María Sol"); await id(guest.page, "reserve-message").fill("Felicidades desde mi invitación");
    await id(guest.page, "guest-reserve-submit").click(); await guest.page.getByText("Solicitud enviada", { exact: true }).waitFor();
    const reservation = fixture.state.reservations[0];
    await page.goto(route("/bandeja/regalos"));
    await page.getByText("Solicitó: María Sol", { exact: true }).waitFor(); await snap(page, `inbox-${width}`);
    await space(id(page, "approve-" + reservation.id));
    await page.getByText("Reserva aprobada.", { exact: true }).waitFor();
    assert.equal(fixture.state.items.find((entry) => entry.id === item.id).status, "COMMITTED");
    await page.goto(route("/regalos")); await id(page, "go-external").waitFor();
    await space(id(page, "go-external")); externalSteps++;
    await id(page, "external-title").waitFor(); await id(page, "external-title").scrollIntoViewIfNeeded(); await snap(page, `external-${width}`);
    await id(page, "external-title").fill("Cafetera de otra tienda"); await id(page, "external-url").fill("https://store.fixture.example/coffee"); await id(page, "external-price").fill("125,50");
    await space(page.getByRole("checkbox", { name: "Revisé las alternativas y prefiero un regalo externo" })); externalSteps++;
    await space(id(page, "external-submit")); externalSteps++;
    await id(page, "suggestion-" + LISTING_A).waitFor();
    await expect(id(page, "external-suggestions")).toBeFocused();
    await expect(id(page, "suggestion-" + LISTING_A)).toBeInViewport();
    assert.equal(await id(page, "external-price").inputValue(), "125,50");
    await snap(page, `external-partner-first-${width}`);
    await space(id(page, "external-submit")); externalSteps++;
    await page.getByText("Regalo propuesto: queda pendiente de tu aprobación.", { exact: true }).waitFor();
    const external = fixture.state.items.find((entry) => entry.source === "EXTERNAL"); assert.equal(external.status, "PROPOSED");
    await guest.page.reload(); await id(guest.page, "gift-" + item.id).waitFor();
    assert.equal(await guest.page.getByText(external.title, { exact: true }).count(), 0);
    assert.ok(partnerSteps < externalSteps); report.steps.push({ width, partnerRequiredActions: partnerSteps, externalRequiredActions: externalSteps, partnerRequiredFields: 0, externalRequiredFields: 3 });

    await page.goto(route("/regalos/proveedores")); await id(page, "provider-" + LISTING_A).waitFor(); await id(page, "provider-" + LISTING_A).scrollIntoViewIfNeeded(); await snap(page, `providers-${width}`);
    await page.getByRole("combobox", { name: "Categoría", exact: true }).selectOption("CATERING");
    await id(page, "providers-city").fill("La Paz"); await id(page, "providers-max-price").fill("600");
    await space(id(page, "providers-search"));
    await id(page, "provider-" + LISTING_B).waitFor();
    await page.waitForFunction(() => !document.body.innerText.includes("Actualizando los resultados…"));
    assert.ok(fixture.state.calls.some((call) => call.path.includes("category=CATERING") && call.path.includes("city=la-paz") && call.path.includes("maxPriceMinor=60000")), "applied provider filters reach HTTP");
    const links = await page.locator('[data-testid^="provider-"] a[href]').evaluateAll((nodes) => nodes.map((node) => node.href));
    assert.ok(links.length >= 1, "DOM scan must inspect real outbound anchors");
    assert.ok(links.every((link) => { const url = new URL(link); return url.origin === APP && /^\/r\/[0-9a-f-]+$/i.test(url.pathname) && url.searchParams.get("surface") === "APP"; }));
    const popupPromise = context.waitForEvent("page"); await id(page, `dest-${LISTING_B}-PRODUCT_PAGE`).click();
    const popup = await popupPromise; await popup.waitForLoadState(); await popup.close();
    await space(id(page, "add-provider-" + LISTING_B));
    await page.getByText("Agregado: Torta para celebrar", { exact: true }).waitFor();
    await page.goto(route("/regalos"));
    const toggle = page.getByRole("switch", { name: "Ver el nombre en mi panel", exact: true }); await toggle.waitFor();
    await space(toggle);
    await page.getByText("La preferencia se guardó. Actualizamos las reservas y los regalos.", { exact: true }).waitFor();
    assert.equal(fixture.state.settings.showRequesterToHost, false); assert.equal(fixture.state.settings.showRequesterToGuests, false);
    assert.ok(!(await page.locator("body").innerText()).includes("María Sol"));
    await id(page, "gift-" + item.id).scrollIntoViewIfNeeded(); await snap(page, `visibility-hidden-${width}`);
    await guest.context.close(); await context.close();
  }
  report.checks.push("Five host screens at 360/768/1280; create -> public guest list -> reserve -> host approval; unpublished external hidden; partner 2 required actions vs external 4 + 3 fields");
  report.checks.push("Read-back preference confirmation, guest default hidden, real outbound DOM anchors through the redirector, keyboard Space and reduced motion");

  reset();
  const { page, context } = await session(360); await host(page);
  await page.getByText("Todavía no agregaste regalos.", { exact: true }).waitFor(); await snap(page, "gifts-empty-360");
  await page.goto(route("/bandeja/regalos")); await page.getByText("No hay reservas pendientes.", { exact: true }).waitFor(); await snap(page, "inbox-empty-360");
  fixture.state.failures.set(`GET ${fixture.prefix}/items`, 403);
  await page.goto(route("/regalos")); await page.getByText("No tienes permiso para gestionar los regalos de esta celebración.", { exact: true }).waitFor(); await snap(page, "gifts-forbidden-360"); fixture.state.failures.clear();
  fixture.state.failures.set("GET /providers", 503);
  await page.goto(route("/regalos/proveedores")); await page.getByRole("alert").waitFor(); await snap(page, "providers-error-360"); fixture.state.failures.clear();
  await page.goto(route("/regalos/externo")); await id(page, "external-title").fill("Mi regalo conservado"); await id(page, "external-url").fill("https://store.fixture.example/gift"); await id(page, "external-price").fill("100");
  await space(page.getByRole("checkbox", { name: "Revisé las alternativas y prefiero un regalo externo" }));
  fixture.state.failures.set(`POST ${fixture.prefix}/items`, 503); await space(id(page, "external-submit"));
  await page.getByRole("alert").waitFor(); assert.equal(await id(page, "external-title").inputValue(), "Mi regalo conservado"); await snap(page, "external-send-error-360"); fixture.state.failures.clear();
  await page.goto(route("/regalos/catalogo")); await id(page, "add-" + LISTING_A).waitFor(); await id(page, "add-" + LISTING_A).click(); await page.getByText("Agregado: Vajilla de cerámica", { exact: true }).waitFor();
  const item = fixture.state.items[0];
  fixture.state.items[0] = { ...item, status: "PENDING_REVIEW" };
  const pending = { id: "88888888-8888-4888-8888-888888888888", itemId: item.id, celebrationId: c, guestDisplayName: "Invitada de la carrera", message: "Mensaje privado", status: "PENDING_REVIEW", requestedAt: "2026-11-08T02:00:00Z" };
  fixture.state.reservations = [pending];
  await page.goto(route("/bandeja/regalos")); await id(page, "approve-" + pending.id).waitFor();
  fixture.state.reservations = [{ ...pending, status: "COMMITTED" }];
  await id(page, "approve-" + pending.id).click(); await page.getByText("Esta reserva ya no estaba pendiente; actualizamos la lista.", { exact: true }).waitFor(); await snap(page, "inbox-race-360");
  await context.close();
  const english = await session(768, { locale: "en-US", dark: true }); await host(english.page, "/regalos/catalogo"); await id(english.page, "hit-" + LISTING_A).waitFor(); await snap(english.page, "catalog-en-US-system-dark-768"); await english.context.close();
  report.checks.push("Empty inbox/list, forbidden list, discovery outage, failed external submission with preserved draft, concurrent 409 and en-US with system dark preference (app uses its existing light theme)");
  assert.deepEqual(report.runtimeErrors, [], "unexpected runtime errors");
  report.status = "PASS"; console.log("F23 CHROME PASS", { screens: report.axe.length, steps: report.steps });
  const failed = join(evidence, "failed-state.png"); if (existsSync(failed)) unlinkSync(failed);
} catch (error) {
  report.status = "FAIL"; report.error = String(error.stack ?? error); process.exitCode = 1; console.error(error);
  if (activePage && !activePage.isClosed()) { report.pageUrl = activePage.url().replace(/[A-Za-z0-9_-]{43}/g, "[guest credential]"); report.pageText = (await activePage.locator("body").innerText()).slice(-2500).replace(/[A-Za-z0-9_-]{43}/g, "[guest credential]"); await activePage.screenshot({ path: join(evidence, "failed-state.png"), fullPage: true }); }
} finally {
  writeFileSync(join(evidence, "result.json"), JSON.stringify(report, null, 2));
  await browser?.close(); staticServer?.closeAllConnections(); staticServer?.close(); api.closeAllConnections(); api.close();
  if (existsSync(out)) { assert.equal(out, resolve(app, "web-build-f23")); rmSync(out, { recursive: true, force: true }); }
}
