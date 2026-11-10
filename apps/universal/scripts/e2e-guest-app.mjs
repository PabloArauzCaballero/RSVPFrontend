// F21: Chrome against real Expo/Next bundles and local contract fixtures. Native association still requires signed devices.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createContractMock, seedDemo } from "../../../packages/testing/src/contract-mock.ts";
import { serveContractMock } from "../../../packages/testing/src/contract-server.ts";

const app = fileURLToPath(new URL("..", import.meta.url));
const webApp = fileURLToPath(new URL("../../seo-web/", import.meta.url));
const evidence = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F21/local-web/", import.meta.url));
const out = resolve(app, "web-build-f21");
const nextOut = resolve(webApp, ".next-f21");
for (const [root, target] of [[app, out], [webApp, nextOut]]) {
  assert.ok(target.startsWith(resolve(root) + sep), "temporary output must stay inside its app");
  assert.ok(!existsSync(target), `preserve existing output: ${target}`);
}
const apiPort = Number(process.env.API_PORT ?? 8471), appPort = Number(process.env.APP_PORT ?? 8472), webPort = Number(process.env.WEB_PORT ?? 3471);
const API = `http://localhost:${apiPort}`, APP = `http://localhost:${appPort}`, WEB = `http://localhost:${webPort}`;
const configPath = join(webApp, "tsconfig.json"), configBefore = readFileSync(configPath, "utf8");
const envPath = join(webApp, "next-env.d.ts"), envBefore = existsSync(envPath) ? readFileSync(envPath, "utf8") : null;
const mock = createContractMock({ webOrigin: WEB });
seedDemo(mock);
const ID = mock.celebrationId, slug = mock.slug;
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222", LISTING = "33333333-3333-4333-8333-333333333333";
const reply = (status, body) => ({ status, body, headers: { "content-type": "application/json" } });
let giftMode = "normal", postMode = "normal", rsvpFail = false;
let giftStates = new Map();
const saved = new Map();
const giftCalls = [];
function resetGifts() { giftMode = "normal"; postMode = "normal"; giftStates = new Map([[A, "AVAILABLE"], [B, "AVAILABLE"]]); saved.clear(); }
resetGifts();
const gift = (id) => ({ id, listId: A, celebrationId: ID, title: id === A ? "Vajilla de cerámica" : "Copas para celebrar", description: "Un regalo para compartir momentos.", source: id === A ? "CATALOGED" : "EXTERNAL", status: giftStates.get(id), productListingId: id === A ? LISTING : null, price: { amountMinor: 25000, currency: "BOB" }, version: 1, createdAt: "2026-11-07T02:00:00Z" });
const { server } = await serveContractMock({ ...mock, handle(input) {
  const path = input.path.split("?")[0];
  if (rsvpFail && input.method === "POST" && path.endsWith("/rsvp")) return reply(503, { status: 503, title: "Unavailable" });
  if (path.startsWith("/gifts/")) {
    const authorization = input.headers.authorization;
    const token = authorization?.replace(/^Bearer /, "");
    if (!mock.listGuests().some((guest) => guest.token === token)) return reply(401, { status: 401, title: "Invalid guest" });
    giftCalls.push({ method: input.method, path, authorization, body: input.body, key: input.headers["idempotency-key"] });
    if (input.method === "GET") {
      if (giftMode === "unavailable") return reply(503, { status: 503, title: "Unavailable" });
      if (giftMode === "forbidden") return reply(403, { status: 403, title: "Forbidden" });
      return reply(200, { items: giftMode === "empty" ? [] : [gift(A), gift(B)], partnerPriorityEnabled: true });
    }
    const match = /\/items\/([^/]+)\/reservations$/.exec(path);
    if (input.method === "POST" && match?.[1]) {
      const id = match[1], key = token + ":" + input.headers["idempotency-key"];
      if (saved.has(key)) return reply(201, saved.get(key));
      if (postMode === "conflict" || giftStates.get(id) !== "AVAILABLE") { giftStates.set(id, "COMMITTED"); return reply(409, { status: 409, code: "GIFT_NOT_AVAILABLE", title: "Taken" }); }
      if (postMode === "unavailable") return reply(503, { status: 503, title: "Unavailable" });
      giftStates.set(id, "PENDING_REVIEW");
      const result = { id: B, itemId: id, celebrationId: ID, status: "PENDING_REVIEW", requestedAt: new Date().toISOString() };
      saved.set(key, result); return reply(201, result);
    }
    return reply(404, { status: 404, title: "Not found" });
  }
  return mock.handle(input);
} }, apiPort);
const fresh = () => { const token = randomBytes(32).toString("base64url"); mock.addGuest({ name: "María José Núñez", token, allowedCompanions: 2 }); return token; };
const route = (token) => `/c/${slug}/rsvp/${token}`;
const report = { date: new Date().toISOString(), surface: "Expo web + Next.js + Chrome with contract fixtures; no OS association/device claim", checks: [], axe: [] };
mkdirSync(evidence, { recursive: true });
let statics, web, browser, activePage;
const run = (command, args, cwd, env) => new Promise((done, fail) => spawn(command, args, { cwd, env, stdio: "inherit" }).once("exit", done).once("error", fail));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
try {
  console.log("F21: building Expo web");
  assert.equal(await run(process.execPath, [fileURLToPath(import.meta.resolve("expo/bin/cli")), "export", "--platform", "web", "--output-dir", out, "--max-workers", "1", "--dev"], app,
    { ...process.env, NODE_ENV: "development", EXPO_PUBLIC_API_URL: API, EXPO_PUBLIC_SITE_URL: WEB, EXPO_PUBLIC_DEV_ACCESS_TOKEN: "" }), 0);
  console.log("F21: building the existing web fallback");
  const next = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
  const webEnv = { ...process.env, NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_SITE_URL: WEB, NEXT_DIST_DIR: ".next-f21", NEXT_TELEMETRY_DISABLED: "1" };
  assert.equal(await run(process.execPath, [next, "build"], webApp, webEnv), 0);
  web = spawn(process.execPath, [next, "start", "-p", String(webPort)], { cwd: webApp, env: webEnv, stdio: "inherit" });
  let ready = false;
  for (let n = 0; n < 60; n++) { if ((await fetch(WEB).catch(() => null))?.ok) { ready = true; break; } await sleep(500); }
  assert.ok(ready, "Next did not start");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".ttf": "font/ttf" };
  statics = createServer((request, response) => {
    const candidate = resolve(out, "." + decodeURIComponent(new URL(request.url ?? "/", APP).pathname));
    if (candidate !== out && !candidate.startsWith(out + sep)) { response.writeHead(403).end(); return; }
    const file = existsSync(candidate) && extname(candidate) ? candidate : join(out, "index.html");
    response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" }); response.end(readFileSync(file));
  });
  await new Promise((done) => statics.listen(appPort, done));
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  async function open(width, path, origin = APP, locale = "es-BO") {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale, timezoneId: "Asia/Tokyo", reducedMotion: "reduce" });
    const page = await context.newPage(); activePage = page;
    page.on("request", (request) => { if (request.url().startsWith(API)) assert.ok(!request.url().includes("/rsvp/" + path.split("/").at(-1)), "API credential in URL"); });
    await page.goto(origin + path, { waitUntil: "domcontentloaded" });
    return { context, page };
  }
  async function snap(page, name, origin = "app") {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + " overflow");
    const findings = (await new AxeBuilder({ page }).analyze()).violations.filter((item) => ["critical", "serious"].includes(item.impact));
    report.axe.push({ screen: origin + ":" + name, violations: findings.map((item) => item.id) });
    assert.deepEqual(findings.map((item) => item.id), [], name + " axe");
    await page.screenshot({ path: join(evidence, origin + "-" + name + ".png"), fullPage: true });
  }
  for (const width of [360, 768, 1280]) {
    resetGifts(); const token = fresh();
    const { page, context } = await open(width, route(token));
    await page.getByTestId("rsvp-submit").waitFor();
    await snap(page, "rsvp-" + width);
    await page.getByRole("radio", { name: "Sí, asistiré", exact: true }).press("Space");
    await page.getByLabel("Mensaje para los anfitriones (opcional)", { exact: true }).fill("¡Nos vemos!"); 
    await page.getByTestId("rsvp-submit").press("Enter");
    await page.getByRole("heading", { name: "Tu asistencia está confirmada", exact: true }).waitFor();
    await snap(page, "confirmed-" + width);
    await page.getByTestId("open-gifts").press("Enter");
    await page.getByTestId("reserve-" + A).waitFor();
    await snap(page, "gifts-" + width);
    const partner = context.waitForEvent("page");
    await context.route(WEB + "/r/**", (request) => request.fulfill({ status: 200, body: "Redirector boundary test" }));
    await page.getByTestId("partner-" + A).press("Enter");
    const popup = await partner; await popup.waitForLoadState();
    assert.equal(new URL(popup.url()).pathname, "/r/" + LISTING); await popup.close();
    await page.getByTestId("reserve-" + A).press("Enter");
    await page.getByTestId("reserve-name").fill("María José");
    await page.getByTestId("reserve-message").fill("Con cariño");
    await snap(page, "reservation-" + width);
    await page.getByTestId("guest-reserve-submit").press("Enter");
    await page.getByText("Solicitud enviada", { exact: true }).waitFor();
    await snap(page, "reserved-" + width);
    const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    assert.ok(!stored.includes(token), "app credential persisted");
    assert.ok(!(await page.locator("body").innerText()).includes(token), "credential displayed");
    await page.getByTestId("back-to-rsvp").press("Enter");
    await page.getByRole("heading", { name: "Tu asistencia está confirmada", exact: true }).waitFor();
    await context.close();
  }
  report.checks.push("App: RSVP -> gifts -> reserve -> back, keyboard and redirector, 360/768/1280, no account or stored credential");
  { const token = fresh(); const { page, context } = await open(360, "/rsvp/" + token);
    await page.getByTestId("rsvp-submit").waitFor(); assert.equal(new URL(page.url()).pathname, route(token));
    await page.goto(APP + "/regalos/" + token); await page.getByText("Lista de regalos", { exact: true }).first().waitFor(); await context.close(); }
  for (const state of ["invalid", "closed", "unregistered", "empty", "forbidden", "conflict"]) {
    resetGifts(); const token = fresh(); let path = route(token);
    if (state === "invalid") path = route("X".repeat(43));
    if (state === "closed") mock.state.deadline = "2020-01-01T00:00:00Z";
    if (state === "unregistered") path = `/c/${slug}/rsvp`;
    if (["empty", "forbidden", "conflict"].includes(state)) path = `/c/${slug}/regalos/${token}`;
    if (state === "empty") giftMode = "empty";
    if (state === "forbidden") giftMode = "forbidden";
    const { page, context } = await open(360, path);
    if (state === "invalid") await page.getByText("Este enlace no está disponible", { exact: true }).waitFor();
    if (state === "closed") await page.getByText("El plazo para responder terminó", { exact: true }).waitFor();
    if (state === "unregistered") await page.getByText("Confirma tu asistencia", { exact: true }).waitFor();
    if (state === "empty") await page.getByText("Aún no hay regalos", { exact: true }).waitFor();
    if (state === "forbidden") await page.getByText("No puedes reservar regalos aquí", { exact: true }).waitFor();
    if (state === "conflict") { postMode = "conflict"; await page.getByTestId("reserve-" + A).click(); await page.getByTestId("guest-reserve-submit").click(); await page.getByText("Alguien se adelantó", { exact: true }).waitFor(); }
    await snap(page, state + "-360"); await context.close(); mock.state.deadline = null;
  }
  resetGifts();
  { const token = fresh(); const { page, context } = await open(768, route(token), APP, "en-US");
    await page.getByText("Can you join us?", { exact: true }).waitFor(); await snap(page, "rsvp-en-US-768"); await context.close(); }
  { const token = fresh(); const { page, context } = await open(360, route(token));
    await page.getByRole("radio", { name: "Sí, asistiré", exact: true }).click();
    await page.getByLabel("Mensaje para los anfitriones (opcional)", { exact: true }).fill("Mi mensaje sigue aquí");
    const network = await context.newCDPSession(page);
    await network.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 300000, uploadThroughput: 75000 });
    rsvpFail = true; await page.getByTestId("rsvp-submit").click();
    await page.getByText(/El servicio no responde por ahora/).waitFor();
    assert.equal(await page.getByLabel("Mensaje para los anfitriones (opcional)", { exact: true }).inputValue(), "Mi mensaje sigue aquí");
    await snap(page, "slow-send-error-360");
    rsvpFail = false; await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await page.getByRole("heading", { name: "Tu asistencia está confirmada", exact: true }).waitFor(); await context.close(); }
  report.checks.push("Legacy links, five RSVP states, gift error/empty/conflict, English and slow failed submission with preserved draft");
  for (const width of [360, 768, 1280]) {
    resetGifts(); const token = fresh();
    const { page, context } = await open(width, route(token), WEB);
    await page.getByRole("heading", { name: "¿Podrás acompañarnos?", exact: true }).waitFor();
    await snap(page, "rsvp-" + width, "web");
    await page.getByRole("radio", { name: "Sí, asistiré", exact: true }).check();
    await page.getByRole("button", { name: "Enviar respuesta", exact: true }).click();
    await page.getByRole("heading", { name: "Tu asistencia está confirmada", exact: true }).waitFor();
    await page.getByTestId("guest-web-gifts").click();
    await page.getByRole("button", { name: "Reservar Vajilla de cerámica", exact: true }).waitFor();
    const partnerHref = await page.getByRole("link", { name: "Ver en la tienda del aliado", exact: true }).first().getAttribute("href");
    assert.equal(new URL(partnerHref, WEB).pathname, "/r/" + LISTING);
    await page.getByRole("button", { name: "Reservar Vajilla de cerámica", exact: true }).click();
    await page.getByLabel("Tu nombre", { exact: true }).fill("Invitado sin app");
    await page.getByRole("button", { name: "Reservar regalo", exact: true }).click();
    await page.getByRole("heading", { name: "Solicitud enviada", exact: true }).waitFor();
    await snap(page, "reserved-" + width, "web");
    assert.equal(await page.getByLabel("Contraseña", { exact: true }).count(), 0);
    await context.close();
  }
  report.checks.push("Web without an installed app: same canonical invitation path, confirm and reserve without account, 360/768/1280");
  assert.ok(giftCalls.filter((row) => row.method === "POST").every((row) => row.authorization?.startsWith("Bearer ") && row.key && !row.path.includes(row.authorization.slice(7))));
  report.status = "PASS"; console.log("F21 CHROME PASS", report.checks);
} catch (error) {
  report.status = "FAIL"; report.error = String(error.stack ?? error); process.exitCode = 1; console.error(error);
  if (activePage && !activePage.isClosed()) { report.pageText = (await activePage.locator("body").innerText()).slice(-2500).replace(/[A-Za-z0-9_-]{43}/g, "[guest credential]"); await activePage.screenshot({path: join(evidence, "failed-state.png"), fullPage: true}); }
} finally {
  writeFileSync(join(evidence, "result.json"), JSON.stringify(report, null, 2));
  await browser?.close();
  if (web) { web.kill(); await sleep(500); }
  statics?.closeAllConnections(); statics?.close(); server.closeAllConnections(); server.close();
  const current = readFileSync(configPath, "utf8");
  if (current !== configBefore) {
    const parsed = JSON.parse(current), original = JSON.parse(configBefore);
    parsed.include = parsed.include.filter((value) => !value.startsWith(".next-f21/"));
    const originalOrder = [...original.include]; parsed.include.sort(); original.include.sort();
    assert.deepEqual(parsed, original, "preserve concurrent changes to the web config"); original.include = originalOrder;
    writeFileSync(configPath, configBefore);
  }
  if (envBefore !== null && readFileSync(envPath, "utf8").replaceAll(".next-f21/", ".next/") === envBefore) writeFileSync(envPath, envBefore);
  for (const directory of [out, nextOut]) if (existsSync(directory)) rmSync(directory, { recursive: true, force: true });
}
