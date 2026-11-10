// F20 only: real Expo web bundle and Chrome against local contract-shaped responses. No native or live-backend claim.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createContractMock, seedDemo } from "../../../packages/testing/src/contract-mock.ts";
import { serveContractMock } from "../../../packages/testing/src/contract-server.ts";

const app = fileURLToPath(new URL("..", import.meta.url));
const evidence = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F20/local-web/", import.meta.url));
const output = resolve(app, "web-build-f20");
assert.ok(output.startsWith(resolve(app) + sep), "build output must stay in the app workspace");
assert.ok(!existsSync(output), "web-build-f20 already exists; preserve it and choose a clean output before running");
const apiPort = Number(process.env.API_PORT ?? 8461);
const appPort = Number(process.env.APP_PORT ?? 8462);
const apiUrl = `http://localhost:${apiPort}`;
const appUrl = `http://localhost:${appPort}`;
const mock = createContractMock(); seedDemo(mock);
const celebrationId = mock.celebrationId;
const reservationId = "22222222-2222-4222-8222-222222222222";
const itemId = "33333333-3333-4333-8333-333333333333";
const pending = { id: reservationId, celebrationId, itemId, guestDisplayName: "María José Núñez", message: "Una vajilla para compartir muchos momentos. ¡Felicidades!", status: "PENDING_REVIEW", requestedAt: "2026-11-07T02:00:00Z" };
let reservation = { ...pending };
let mode = "normal";
let posts = 0;
const reply = (status, body) => ({ status, body, headers: { "content-type": "application/json" } });
const { server } = await serveContractMock({ ...mock, handle(input) {
  const path = input.path.split("?")[0];
  const prefix = `/gifts/celebrations/${celebrationId}`;
  if (path === `${prefix}/items`) return reply(200, { items: [{ id: itemId, celebrationId, listId: itemId, title: "Vajilla de cerámica para los nuevos comienzos", source: "CATALOGED", status: reservation.status === "COMMITTED" ? "COMMITTED" : "AVAILABLE", price: { amountMinor: 25000, currency: "BOB" }, version: 1, createdAt: pending.requestedAt }], partnerPriorityEnabled: true });
  if (path === `${prefix}/reservations`) {
    if (mode === "expired") return reply(401, { status: 401, title: "Unauthorized" });
    if (mode === "error") return reply(503, { status: 503, title: "Unavailable" });
    return reply(200, { items: mode === "empty" ? [] : [reservation] });
  }
  if (input.method === "POST" && path.startsWith(`${prefix}/reservations/${reservationId}/`)) {
    posts += 1;
    if (mode === "conflict" || reservation.status !== "PENDING_REVIEW") {
      reservation = { ...reservation, status: "COMMITTED" };
      return reply(409, { status: 409, code: "RESERVATION_NOT_PENDING", title: "Already resolved" });
    }
    reservation = { ...reservation, status: path.endsWith("/approve") ? "COMMITTED" : "REJECTED" };
    return reply(200, reservation);
  }
  return mock.handle(input);
} }, apiPort);
const b64 = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "u-host", roles: ["HOST"], organizationIds: [], exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
mkdirSync(evidence, { recursive: true });
const report = { date: new Date().toISOString(), surface: "Expo web + Chrome + contract mock; not a push device test", checks: [], axe: [] };
let statics; let browser;
try {
  const code = await new Promise((done, fail) => spawn(process.execPath, [fileURLToPath(import.meta.resolve("expo/bin/cli")), "export", "--platform", "web", "--output-dir", output, "--max-workers", "1", "--dev", "--clear"], {
    cwd: app, stdio: "inherit", env: { ...process.env, NODE_ENV: "development", EXPO_PUBLIC_API_URL: apiUrl, EXPO_PUBLIC_DEV_ACCESS_TOKEN: token }
  }).once("exit", done).once("error", fail));
  assert.equal(code, 0, "Expo export failed");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".ttf": "font/ttf" };
  statics = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", appUrl).pathname);
    const file = resolve(output, `.${pathname}`);
    if (!file.startsWith(output + sep) && file !== output) { response.writeHead(403).end(); return; }
    const served = existsSync(file) && extname(file) ? file : join(output, "index.html");
    response.writeHead(200, { "content-type": mime[extname(served)] ?? "application/octet-stream" }); response.end(readFileSync(served));
  });
  await new Promise((done) => statics.listen(appPort, done));
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  async function open(width, locale = "es-BO") {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale, timezoneId: "Asia/Tokyo", reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${appUrl}/bandeja/${reservationId}?c=${celebrationId}`, { waitUntil: "domcontentloaded" });
    return { page, context };
  }
  async function capture(page, name) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: overflow`);
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter((item) => ["critical", "serious"].includes(item.impact));
    report.axe.push({ name, violations: violations.map((item) => item.id) });
    assert.deepEqual(violations.map((item) => item.id), [], `${name}: axe`);
    await page.screenshot({ path: join(evidence, `${name}.png`), fullPage: true });
  }
  for (const width of [360, 768, 1280]) {
    mode = "normal"; reservation = { ...pending };
    const { page, context } = await open(width);
    await page.getByTestId("push-approve").waitFor();
    await page.getByText(/Solicitada el 6 nov.*2026.*10:00/).waitFor();
    await capture(page, `pending-${width}`);
    await page.getByTestId("push-approve").press("Enter");
    await page.getByTestId("push-request-status").filter({ hasText: "Reserva aprobada" }).waitFor();
    assert.equal(await page.getByTestId("push-reject").count(), 0);
    await capture(page, `approved-${width}`);
    await context.close();
  }
  report.checks.push("360/768/1280: pending -> approved by keyboard, celebration timezone despite Tokyo device, reduced motion");
  for (const state of ["empty", "error", "conflict"]) {
    mode = state; reservation = { ...pending };
    const { page, context } = await open(360);
    if (state === "empty") await page.getByText(/Esta solicitud no está disponible/).waitFor();
    if (state === "error") await page.getByText(/No pudimos confirmar el resultado/).waitFor();
    if (state === "conflict") {
      await page.getByTestId("push-approve").click();
      await page.getByText(/Esta solicitud ya fue resuelta/).waitFor();
      assert.equal(await page.getByTestId("push-approve").count(), 0);
    }
    await capture(page, `${state}-360`); await context.close();
  }
  mode = "normal"; reservation = { ...pending };
  { const { page, context } = await open(768, "en-US");
    await page.getByRole("button", { name: "Reject reservation" }).waitFor();
    await capture(page, "pending-en-US-768");
    await page.getByRole("button", { name: "Reject reservation" }).click();
    await page.getByText("Reservation rejected", { exact: true }).waitFor();
    await context.close(); }
  mode = "expired";
  { const { page, context } = await open(768);
    await page.waitForURL("**/login?returnTo=**");
    const destination = new URL(page.url()).searchParams.get("returnTo");
    assert.equal(destination, `/bandeja/${reservationId}?c=${celebrationId}`);
    await page.getByTestId("login-email").waitFor();
    await capture(page, "expired-session-768"); await context.close(); }
  report.checks.push("empty, service error, 409 race, English rejection and expired-session return destination");
  report.posts = posts; report.status = "PASS";
  console.log("F20 WEB PASS", report.checks);
} catch (error) {
  report.status = "FAIL"; report.error = String(error.stack ?? error); process.exitCode = 1; console.error(error);
} finally {
  writeFileSync(join(evidence, "result.json"), JSON.stringify(report, null, 2));
  await browser?.close(); statics?.close(); server.close();
  if (existsSync(output)) rmSync(output, { recursive: true, force: true });
}
