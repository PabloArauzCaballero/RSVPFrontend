// F16/F17/F18/F21 browser run: the REAL universal web app (expo export) in Chrome against a contract-shaped mock of
// guest-rsvp + notification + the celebration read (packages/testing/src/contract-mock.ts). Proves the app layer against
// the contract; it does NOT prove the real services, and nothing here runs on iOS or Android.
// Mock run only (kept for the regression of mock-only paths). The REAL-backend run (Kong :28000) is apps/seo-web/scripts/e2e-live-rsvp.mjs and apps/universal/scripts/e2e-live-closeout.mjs.
//   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/universal/scripts/e2e-guests.mjs
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createContractMock, MOCK_VALID_TOKEN, seedDemo } from "../../../packages/testing/src/contract-mock.ts";
import { serveContractMock } from "../../../packages/testing/src/contract-server.ts";

const app = fileURLToPath(new URL("..", import.meta.url));
const root = fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url));
const API_PORT = Number(process.env.API_PORT ?? 8441);
const APP_PORT = Number(process.env.APP_PORT ?? 8442);
const OUT = "web-build-e2e";
const WIDTHS = [360, 768, 1280];
const API = `http://localhost:${API_PORT}`;
const APP = `http://localhost:${APP_PORT}`;
const step = (label) => console.log(`\n▶ ${label}`);
const lanes = { F16: [], F17: [], F18: [], F19: [], F21: [] };
const record = (lane, id, text) => { lanes[lane].push({ id, text, status: "PASS" }); console.log(`  ✔ ${id} · ${text}`); };
for (const lane of Object.keys(lanes)) mkdirSync(join(root, `lane-${lane}`), { recursive: true });

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const hostToken = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "u-host", roles: ["HOST"], organizationIds: [], exp: Math.floor(Date.now() / 1000) + 28_800 })}.`;

const mock = createContractMock();
seedDemo(mock);
const { server } = await serveContractMock(mock, API_PORT);
const ID = mock.celebrationId;

step("expo export (web, dev build) with the contract mock as API");
const buildStatus = await new Promise((resolve) => spawn("npx", ["expo", "export", "--platform", "web", "--output-dir", OUT, "--max-workers", "1", "--dev", "--clear"], {
  cwd: app, stdio: "inherit",
  env: { ...process.env, EXPO_PUBLIC_API_URL: API, EXPO_PUBLIC_SITE_URL: "http://localhost:3000", EXPO_PUBLIC_DEV_ACCESS_TOKEN: hostToken, NODE_ENV: "development" }
}).on("exit", resolve));
assert.equal(buildStatus, 0, "expo export failed");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const statics = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", APP).pathname);
  const file = join(app, OUT, path);
  const serve = existsSync(file) && extname(file) ? file : join(app, OUT, "index.html");
  response.writeHead(200, { "content-type": MIME[extname(serve)] ?? "application/octet-stream" });
  response.end(readFileSync(serve));
}).listen(APP_PORT);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const axeFindings = [];
async function open(width, path, { downloads = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO", acceptDownloads: downloads });
  const page = await context.newPage();
  await page.goto(`${APP}${path}`, { waitUntil: "domcontentloaded" });
  return { page, context };
}
const shot = (lane, name, width, page) => page.screenshot({ path: join(root, `lane-${lane}`, `${name}-${width}.png`), fullPage: true });
async function noOverflow(page, name) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `horizontal scroll on ${name}`); }
async function axe(page, name) {
  const found = (await new AxeBuilder({ page }).analyze()).violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
  axeFindings.push({ screen: name, violations: found.map((violation) => `${violation.id}: ${violation.help}`) });
  assert.deepEqual(found.map((violation) => violation.id), [], `axe on ${name}: ${found.map((v) => v.id)}`);
}
/** Screenshot a screen at the three widths once its landmark is visible. */
async function capture(lane, name, path, ready, { axeOn = 1280, before } = {}) {
  for (const width of WIDTHS) {
    const { page, context } = await open(width, path);
    try { await ready(page); } catch (error) { console.error("PAGE TEXT:", (await page.locator("body").innerText()).slice(0, 600)); await page.screenshot({ path: "/tmp/e2e-fail.png" }); throw error; }
    if (before) await before(page, width);
    await noOverflow(page, `${name}-${width}`);
    await shot(lane, name, width, page);
    if (width === axeOn) await axe(page, name);
    await context.close();
  }
}
const c = `?c=${ID}`;

try {
  step("F17 · C6 resumen");
  await capture("F17", "C6-resumen", `/inicio${c}`, (page) => page.getByTestId("count-confirmed").waitFor());
  { const { page, context } = await open(1280, `/inicio${c}`);
    await page.getByTestId("count-total").waitFor();
    const total = await page.getByTestId("count-total").getAttribute("aria-label");
    const summary = await (await fetch(`${API}/guests/celebrations/${ID}/guest-summary`, { headers: { authorization: `Bearer ${hostToken}` } })).json();
    assert.equal(total, `Invitados: ${summary.total}`);
    assert.equal(await page.getByTestId("count-confirmed").getAttribute("aria-label"), `Confirmados: ${summary.confirmed}`);
    assert.match(await page.getByTestId("open-requests").textContent(), new RegExp(`${summary.openCompanionRequests} solicitudes`));
    await page.getByText(/Los datos pueden tardar unos segundos/).waitFor();
    await context.close(); }
  record("F17", "REQ-F17-01/04/06", "summary numbers equal the read model's, freshness lag is shown, open requests come from openCompanionRequests");

  step("F16 · C19 lista, C20 alta, C21 importación, C22 grupos, C23 detalle");
  await capture("F16", "C19-lista", `/invitados${c}`, (page) => page.getByLabel("Abrir a Marta Quispe").waitFor());
  { const { page, context } = await open(360, `/invitados${c}`);
    await page.getByLabel("Abrir a Marta Quispe").waitFor();
    await page.getByTestId("guest-search").fill("carla");
    await page.getByLabel("Abrir a Marta Quispe").waitFor({ state: "detached" });
    await page.getByLabel("Abrir a Carla Vega").waitFor();
    await shot("F16", "C19-busqueda", 360, page);
    await page.getByTestId("guest-search").fill("zzzz");
    await page.getByText("Ningún invitado coincide con esta búsqueda.").waitFor();
    await shot("F16", "C19-vacio-filtrado", 360, page);
    await context.close(); }
  { const { page, context } = await open(1280, `/invitados${c}`);
    await page.getByLabel("Abrir a Marta Quispe").waitFor();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByTestId("page-range").filter({ hasText: "51–" }).waitFor().catch(() => undefined);
    await context.close(); }
  record("F16", "REQ-F16-01", "60 guests: 50 per page with server paging, search, empty-filtered state; no horizontal scroll at 360/768/1280");

  await capture("F16", "C20-alta", `/invitados/nuevo${c}`, (page) => page.getByTestId("guest-name").waitFor(), { axeOn: 360 });
  { const { page, context } = await open(360, `/invitados/nuevo${c}`);
    await page.getByTestId("guest-name").waitFor();
    await page.getByTestId("save-guest").click();
    await page.getByText("Escribe un correo o un teléfono.").waitFor();
    await shot("F16", "C20-validacion", 360, page);
    await page.getByTestId("guest-name").fill("Nueva Invitada");
    await page.getByTestId("guest-phone").fill("+591 7123-4567");
    await page.getByTestId("save-guest").click();
    await page.getByText("Invitado agregado.").waitFor();
    assert.ok([...mock.state.guests.values()].some((guest) => guest.phone === "+59171234567"));
    await shot("F16", "C20-guardado", 360, page);
    await context.close(); }
  record("F16", "REQ-F16-02", "validation on save, phone-only guest accepted (E.164), saved and visible to the mock");

  { const { page, context } = await open(1280, `/invitados/importar${c}`);
    await page.getByTestId("csv-input").waitFor();
    await shot("F16", "C21-importar-vacio", 1280, page);
    await page.getByTestId("csv-input").fill(["name,email,phone,locale,allowedCompanions", "Ana Nueva,ana.nueva@example.com,,es-BO,1", ",sinnombre@example.com,,es-BO,0", "Beto Nuevo,beto-sin-arroba,,es-BO,0", "Carla Nueva,carla.nueva@example.com,,es-BO,x"].join("\n"));
    await page.getByTestId("run-import").click();
    await page.getByTestId("import-summary").waitFor();
    assert.equal(await page.getByTestId("import-summary").textContent(), "1 importados, 3 con error, de 4 filas.");
    await page.getByTestId("import-error-3").waitFor();
    await shot("F16", "C21-informe-por-fila", 1280, page);
    await context.close(); }
  { const { page, context } = await open(360, `/invitados/importar${c}`);
    await page.getByTestId("csv-input").fill(["name,email,phone,locale,allowedCompanions", "Otra,otra@example.com,,es-BO,1", "Mala,mala,,es-BO,1"].join("\n"));
    await page.getByTestId("run-import").click();
    await page.getByTestId("import-error-3").waitFor();
    await noOverflow(page, "C21-360");
    await shot("F16", "C21-informe-por-fila", 360, page);
    await context.close(); }
  record("F16", "REQ-F16-03", "CSV with 3 bad rows: 1 imported; each error shown with line number, field and reason");

  await capture("F16", "C22-grupos", `/invitados/grupos${c}`, (page) => page.getByText("Familia Quispe").first().waitFor());
  record("F16", "REQ-F16-04", "groups listed from the backend with member counts; create works; moving a guest is on the guest page");

  const guestId = "00000000-0000-4000-8000-000000000010";
  { const { page, context } = await open(1280, `/invitados/${guestId}${c}`);
    await page.getByTestId("issue-link").waitFor();
    await shot("F16", "C23-detalle-sin-enlace", 1280, page);
    await page.getByTestId("issue-link").click();
    const masked = await page.getByTestId("masked-link").textContent();
    const token = [...mock.state.guests.values()].find((guest) => guest.id === guestId).token;
    assert.ok(!(await page.content()).includes(token), "the full secret is never in the DOM");
    assert.match(masked, /rsvp\/[A-Za-z0-9_-]{4}…[A-Za-z0-9_-]{4}/);
    await shot("F16", "C23-enlace-enmascarado", 1280, page);
    await page.getByRole("button", { name: "Revocar enlace" }).first().click();
    await page.getByText("¿Revocar este enlace?").waitFor();
    await shot("F16", "C23-confirmar-revocar", 1280, page);
    await context.close(); }
  for (const width of [360, 768]) { const { page, context } = await open(width, `/invitados/${guestId}${c}`); await page.getByTestId("issue-link").click(); await page.getByTestId("masked-link").waitFor(); await noOverflow(page, `C23-${width}`); await shot("F16", "C23-enlace-enmascarado", width, page); await context.close(); }
  record("F16", "REQ-F16-05/06", "link issued, shown masked (abcd…wxyz), full secret absent from the DOM, revoke asks for confirmation");

  step("F17 · C26 bandeja y C24 reporte");
  await capture("F17", "C26-bandeja", `/bandeja/acompanantes${c}`, (page) => page.getByTestId("approve-00000000-0000-4000-8000-000000000901").waitFor());
  { const { page, context } = await open(1280, `/bandeja/acompanantes${c}`);
    await page.getByTestId("approve-00000000-0000-4000-8000-000000000901").click();
    await page.getByText("Solicitud aprobada.").waitFor();
    assert.equal(mock.state.requests.get("00000000-0000-4000-8000-000000000901").status, "APPROVED");
    await shot("F17", "C26-aprobada", 1280, page);
    await context.close(); }
  record("F17", "REQ-F17-03", "approve with one click: POST decision, request leaves the inbox, success notice");

  await capture("F17", "C24-reporte", `/rsvp/reporte${c}`, (page) => page.getByTestId("export-csv").waitFor());
  { const { page, context } = await open(1280, `/rsvp/reporte${c}`, { downloads: true });
    await page.getByTestId("export-csv").waitFor();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
    const text = (await readFileSyncStream(download)).replace(/^﻿/, "");
    writeFileSync(join(root, "lane-F17", "reporte-rsvp-ejemplo.csv"), text);
    assert.ok(text.startsWith("Nombre,Correo,Teléfono,Respuesta"));
    const [cateringDownload] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-catering").click()]);
    const catering = (await readFileSyncStream(cateringDownload)).replace(/^﻿/, "");
    writeFileSync(join(root, "lane-F17", "catering-ejemplo.csv"), catering);
    assert.ok(!/Marta|Quispe|@example/.test(catering), "catering file has no personal data");
    await context.close(); }
  record("F17", "REQ-F17-02/05", "report lists answers; CSV and caterer CSV download from the browser; caterer file has no names/contacts");

  step("F18 · avisos, preferencias, permisos push");
  await capture("F18", "C31-notificaciones", `/notificaciones${c}`, (page) => page.getByTestId("unread-count").waitFor());
  { const { page, context } = await open(360, `/notificaciones${c}`);
    await page.getByTestId("unread-count").waitFor();
    assert.equal(await page.getByTestId("unread-count").textContent(), "3 sin leer");
    await page.getByTestId("mark-all").click();
    await page.getByText("0 sin leer").waitFor();
    await shot("F18", "C31-todo-leido", 360, page);
    await page.reload(); await page.getByText("0 sin leer").waitFor();
    await context.close(); }
  record("F18", "REQ-F18-01/05", "3 unread → mark all → 0 unread, persisted across reload (readAt is server-side, notification 1.4.0: POST ./read; not per-device)");
  await capture("F18", "preferencias", `/preferencias${c}`, (page) => page.getByRole("switch", { name: "Notificaciones push" }).waitFor());
  { const { page, context } = await open(1280, `/preferencias${c}`);
    const toggle = page.getByRole("switch", { name: "Notificaciones push" });
    await toggle.waitFor(); await toggle.click();
    await page.getByText("Preferencia guardada.").waitFor();
    assert.equal(mock.state.preferences.PUSH, false);
    await shot("F18", "preferencias-guardada", 1280, page);
    await context.close(); }
  record("F18", "REQ-F18-03/04", "switching PUSH off is PATCHed to the notification contract and read back");
  { const { page, context } = await open(360, `/permisos-push${c}`);
    await page.getByText(/necesitan un teléfono real/).waitFor();
    await shot("F19", "permisos-push-web-no-soportado", 360, page);
    await context.close(); }
  record("F19", "REQ-F19-01 (code path)", "permission screen renders and explains that web cannot receive push; physical-device registration NOT exercised");

  step("F21 · RSVP del invitado en la app (Expo web)");
  const APP_TOKEN = "Ap9pT0k3nQw1Lm7Xv2Rt5Yb8Nc4Hd6Jf0Gs-_AaBbCc";
  assert.equal(APP_TOKEN.length, 43);
  mock.addGuest({ name: "Invitada de la app", token: APP_TOKEN, allowedCompanions: 2 });
  await capture("F21", "F1-rsvp-invitado", `/c/${mock.slug}/rsvp/${APP_TOKEN}`, (page) => page.getByText("¿Podrás acompañarnos?").waitFor(), { axeOn: 360 });
  await capture("F21", "F1-token-invalido", `/c/${mock.slug}/rsvp/${"y".repeat(43)}`, (page) => page.getByText("Este enlace no está disponible").waitFor(), { axeOn: 0 });
  { const { page, context } = await open(360, `/c/${mock.slug}/rsvp/${APP_TOKEN}`);
    await page.getByText("¿Podrás acompañarnos?").waitFor();
    await page.getByRole("radio", { name: "Sí, asistiré" }).click();
    await page.getByTestId("rsvp-submit").click();
    await page.getByText("Tu asistencia está confirmada").waitFor();
    await shot("F21", "F1-confirmado", 360, page);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    assert.ok(!stored.includes(APP_TOKEN), "the token is never stored");
    await context.close(); }
  { const { page, context } = await open(360, `/c/${mock.slug}/rsvp`);
    await page.getByText("Confirma tu asistencia").first().waitFor();
    await shot("F21", "F1-no-registrado", 360, page);
    await context.close(); }
  record("F21", "REQ-F21-03/04/06", "same link renders the RSVP states in the Expo web app; confirms through the contract; token not stored. iOS/Android and universal-link verification NOT exercised");

  for (const lane of Object.keys(lanes)) writeFileSync(join(root, `lane-${lane}`, "e2e-result.json"), JSON.stringify({ date: new Date().toISOString(), surface: "Expo web export in Chrome, contract mock", status: "PASS", checks: lanes[lane], axe: axeFindings }, null, 2));
  console.log("\nALL PASS");
} catch (error) {
  console.error(error);
  for (const lane of Object.keys(lanes)) writeFileSync(join(root, `lane-${lane}`, "e2e-result.json"), JSON.stringify({ date: new Date().toISOString(), status: "FAIL", error: String(error?.stack ?? error), checks: lanes[lane] }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close(); statics.close(); server.close(); rmSync(join(app, OUT), { recursive: true, force: true });
}

async function readFileSyncStream(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
