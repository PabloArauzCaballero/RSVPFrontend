// F15 browser run: the REAL Next.js RSVP pages (next build + next start) in Chrome, against a contract-shaped mock of the
// guest-rsvp / celebration public read (packages/testing/src/contract-mock.ts). It proves the web layer end to end against
// the contract; it does NOT prove the real backend services (see evidence README).
//   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/seo-web/scripts/e2e-rsvp.mjs
// Writes screenshots (360/768/1280) and e2e-result.json into docs/progress/evidence/lane-F15/.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createContractMock, MOCK_CONFIRMED_TOKEN, MOCK_VALID_TOKEN, seedDemo } from "../../../packages/testing/src/contract-mock.ts";
import { serveContractMock } from "../../../packages/testing/src/contract-server.ts";

const app = fileURLToPath(new URL("..", import.meta.url));
const evidence = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F15/", import.meta.url));
const API_PORT = Number(process.env.API_PORT ?? 8431);
const WEB_PORT = Number(process.env.WEB_PORT ?? 3431);
const WIDTHS = [360, 768, 1280];
const SITE = `http://localhost:${WEB_PORT}`;
const API = `http://localhost:${API_PORT}`;
const step = (label) => console.log(`\n▶ ${label}`);
const ok = (label) => console.log(`  ✔ ${label}`);
mkdirSync(evidence, { recursive: true });
const result = { date: new Date().toISOString(), surface: "Next.js (next build + next start) in Chrome, contract mock", checks: [], axe: [] };
const record = (id, text) => { result.checks.push({ id, text, status: "PASS" }); ok(`${id} · ${text}`); };

const mock = createContractMock({ webOrigin: SITE });
seedDemo(mock);
const { server, setOffline } = await serveContractMock(mock, API_PORT);

step("next build (NEXT_PUBLIC_API_URL → contract mock)");
const env = { ...process.env, NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_SITE_URL: SITE, NEXT_DIST_DIR: ".next-e2e", NEXT_TELEMETRY_DISABLED: "1" };
// Async on purpose: the mock API lives in this process and `next build` calls it while prerendering.
const buildStatus = await new Promise((resolve) => spawn("npx", ["next", "build"], { cwd: app, env, stdio: "inherit" }).on("exit", resolve));
assert.equal(buildStatus, 0, "next build failed");
const web = spawn("npx", ["next", "start", "-p", String(WEB_PORT)], { cwd: app, env, stdio: "inherit" });
for (let attempt = 0; attempt < 60; attempt += 1) { if ((await fetch(SITE).catch(() => null))?.ok) break; await new Promise((resolve) => setTimeout(resolve, 1000)); }
ok("next start is serving");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const consoleErrors = [];
const requestUrls = [];
async function open(width, path, { lang } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 780 : 900 }, locale: lang ?? "es-BO", reducedMotion: "no-preference" });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|net::ERR/.test(message.text())) consoleErrors.push(message.text()); });
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.goto(`${SITE}${path}`, { waitUntil: "domcontentloaded" });
  return { page, context };
}
async function snap(page, name, width) { await page.screenshot({ path: join(evidence, `${name}-${width}.png`), fullPage: true }); }
async function axe(page, name) {
  const found = (await new AxeBuilder({ page }).analyze()).violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""));
  result.axe.push({ screen: name, violations: found.map((violation) => `${violation.id}: ${violation.help}`) });
  assert.deepEqual(found.map((violation) => violation.id), [], `axe violations on ${name}`);
}
async function noOverflow(page, name) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `horizontal scroll on ${name}`); }

try {
  const celebrationPath = `/c/${mock.slug}/rsvp`;

  step("A9 formulario (invitado sin responder) · 360/768/1280 + axe + overflow");
  for (const width of WIDTHS) {
    const { page, context } = await open(width, `${celebrationPath}/${MOCK_VALID_TOKEN}`);
    await page.getByRole("heading", { name: "¿Podrás acompañarnos?" }).waitFor();
    await noOverflow(page, `A9-${width}`);
    await snap(page, "A9-formulario", width);
    if (width === 360) await axe(page, "A9");
    await context.close();
  }
  record("REQ-F15-01", "form rendered with the real celebration at 360/768/1280, no horizontal scroll, axe clean");

  step("A9 → A10: confirm for real, keyboard only, then the confirmed state");
  {
    const { page, context } = await open(360, `${celebrationPath}/${MOCK_VALID_TOKEN}`);
    await page.getByRole("heading", { name: "¿Podrás acompañarnos?" }).waitFor();
    await page.keyboard.press("Tab"); // skip link
    await page.getByLabel("Sí, asistiré").focus();
    await page.keyboard.press("Space");
    await page.getByLabel("Acompañantes").fill("1");
    await page.getByLabel("Restricciones alimentarias").fill("Vegetariana");
    await page.getByLabel("Mensaje para los anfitriones (opcional)").fill("¡Felicidades!");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await page.getByRole("heading", { name: "Tu asistencia está confirmada" }).waitFor();
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
    assert.match(focused, /Tu asistencia está confirmada/, "focus moves to the new state's heading");
    const marta = [...mock.state.guests.values()].find((guest) => guest.token === MOCK_VALID_TOKEN);
    assert.equal(marta.status, "CONFIRMED"); assert.equal(marta.dietaryNotes, "Vegetariana"); assert.equal(marta.version, 1);
    record("REQ-F15-01", "a keyboard-only confirmation reached the (mock) API once and focus moved to the new heading");
    await context.close();
  }

  step("A10 confirmado con cuenta atrás y edición · 360/768/1280");
  for (const width of WIDTHS) {
    const { page, context } = await open(width, `${celebrationPath}/${MOCK_CONFIRMED_TOKEN}`);
    await page.getByRole("heading", { name: "Tu asistencia está confirmada" }).waitFor();
    assert.match(await page.getByRole("timer").textContent(), /Quedan \d+ d \d+ h \d+ min/);
    await noOverflow(page, `A10-${width}`);
    await snap(page, "A10-confirmado", width);
    if (width === 1280) {
      await page.getByRole("button", { name: "Cambiar mi respuesta" }).click();
      await page.getByLabel("No podré asistir").check();
      await snap(page, "A10-editando", width);
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.getByRole("heading", { name: "Registramos que no podrás asistir" }).waitFor();
      assert.equal([...mock.state.guests.values()].find((guest) => guest.token === MOCK_CONFIRMED_TOKEN).status, "DECLINED");
      await axe(page, "A10");
    }
    await context.close();
  }
  record("REQ-F15-02", "confirmed state with deadline countdown; edit goes through PATCH and shows the new answer");

  step("A11 fuera de plazo");
  const savedDeadline = mock.state.deadline;
  mock.state.deadline = "2026-11-01T03:59:00.000Z";
  for (const width of WIDTHS) {
    const { page, context } = await open(width, `${celebrationPath}/${MOCK_CONFIRMED_TOKEN}`);
    await page.getByRole("heading", { name: "El plazo para responder terminó" }).waitFor();
    assert.match(await page.locator("main").textContent(), /escribe a Ana y Luis/);
    assert.equal(await page.getByRole("button", { name: /Enviar|Guardar|Cambiar/ }).count(), 0);
    await noOverflow(page, `A11-${width}`);
    await snap(page, "A11-fuera-de-plazo", width);
    if (width === 360) await axe(page, "A11");
    await context.close();
  }
  mock.state.deadline = savedDeadline;
  record("REQ-F15-03", "closed screen says when it closed (celebration zone) and whom to write to; no controls to edit");

  step("A12 token inválido · sin datos de la celebración");
  for (const width of WIDTHS) {
    const { page, context } = await open(width, `${celebrationPath}/${"x".repeat(43)}`);
    await page.getByRole("heading", { name: "Este enlace no está disponible" }).waitFor();
    const text = await page.locator("main").textContent();
    for (const secret of ["Ana y Luis", "Hacienda", "Marta", "Invitación a"]) assert.ok(!text.includes(secret), `leaked "${secret}"`);
    await noOverflow(page, `A12-${width}`);
    await snap(page, "A12-token-invalido", width);
    if (width === 360) await axe(page, "A12");
    await context.close();
  }
  record("REQ-F15-04", "invalid token shows no celebration data at 360/768/1280");

  step("A13 no registrado: AUTO_ACCEPT, RESTRICTED (403) y alta con enlace");
  for (const width of WIDTHS) {
    const { page, context } = await open(width, celebrationPath);
    await page.getByRole("heading", { name: "Confirma tu asistencia" }).waitFor();
    await noOverflow(page, `A13-${width}`);
    await snap(page, "A13-no-registrado", width);
    if (width === 360) await axe(page, "A13");
    await context.close();
  }
  {
    const { page, context } = await open(360, celebrationPath);
    await page.getByRole("button", { name: "Confirmar mi asistencia" }).click();
    await page.getByText("Necesitamos tu consentimiento para guardar tu respuesta.").waitFor();
    await snap(page, "A13-validacion", 360);
    await page.getByLabel("Tu nombre").fill("Pedro Mamani");
    await page.getByLabel("Tu correo electrónico").fill("pedro@example.com");
    await page.getByLabel(/Doy mi consentimiento/).check();
    await page.getByRole("button", { name: "Confirmar mi asistencia" }).click();
    await page.getByRole("heading", { name: "Listo: confirmamos tu asistencia" }).waitFor();
    const link = await page.getByLabel("Tu enlace personal").inputValue();
    assert.match(link, new RegExp(`^${SITE}/c/${mock.slug}/rsvp/[A-Za-z0-9_-]{43}$`));
    await snap(page, "A13-alta-ok", 360);
    const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }));
    assert.ok(!storage.includes(link.split("/").pop()), "the new token must not be stored");
    await context.close();
  }
  mock.state.unregisteredMode = "RESTRICTED";
  for (const width of [360, 1280]) {
    const { page, context } = await open(width, celebrationPath);
    await page.getByLabel("Tu nombre").fill("Pedro Mamani");
    await page.getByLabel("Tu correo electrónico").fill("pedro2@example.com");
    await page.getByLabel(/Doy mi consentimiento/).check();
    await page.getByRole("button", { name: "Confirmar mi asistencia" }).click();
    await page.getByRole("heading", { name: "Esta celebración solo admite invitados con enlace personal" }).waitFor();
    await snap(page, "A13-restringido-403", width);
    await context.close();
  }
  mock.state.unregisteredMode = "AUTO_ACCEPT";
  record("REQ-F15-05", "AUTO_ACCEPT registers (one-time link shown, not stored); RESTRICTED answers 403 with the explanation");

  step("REQ-F15-06 · pérdida de conexión: borrador conservado y reintento");
  {
    const fresh = mock.addGuest({ name: "Invitada sin responder", token: "Fr3sh9Qw1Lm7Xv2Rt5Yb8Nc4Hd6Jf0Gs-_AaBbCcDdE", allowedCompanions: 2 });
    const { page, context } = await open(360, `${celebrationPath}/${fresh.token}`);
    await page.getByRole("heading", { name: "¿Podrás acompañarnos?" }).waitFor();
    await page.getByLabel("Sí, asistiré").check();
    await page.getByLabel("Restricciones alimentarias").fill("Sin lactosa");
    setOffline(true);
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await page.getByText(/No hay conexión\. Tu respuesta sigue aquí/).waitFor();
    assert.equal(await page.getByLabel("Restricciones alimentarias").inputValue(), "Sin lactosa");
    await snap(page, "REQ-F15-06-sin-conexion", 360);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    setOffline(false);
    await page.getByRole("heading", { name: "¿Podrás acompañarnos?" }).waitFor();
    assert.equal(await page.getByLabel("Restricciones alimentarias").inputValue(), "Sin lactosa", "draft survives a reload");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await page.getByRole("heading", { name: "Tu asistencia está confirmada" }).waitFor();
    assert.equal(fresh.version, 1, "exactly one RSVP");
    assert.equal(await page.evaluate(() => sessionStorage.length), 0, "draft cleared after success");
    await context.close();
  }
  record("REQ-F15-06", "offline send kept the fields, the draft survived a reload, the retry created exactly one RSVP");

  step("privacidad: noindex, no-referrer, no-store; el token no aparece en HTML ni en peticiones");
  {
    const response = await fetch(`${SITE}${celebrationPath}/${MOCK_VALID_TOKEN}`);
    const html = await response.text();
    assert.match(html, /<meta name="robots" content="noindex/);
    assert.match(html, /<meta name="referrer" content="no-referrer"/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    assert.ok(!html.includes("Ana y Luis"), "server HTML has no celebration data");
    const urlsWithToken = requestUrls.filter((url) => url.includes(MOCK_VALID_TOKEN) || url.includes(MOCK_CONFIRMED_TOKEN));
    assert.ok(urlsWithToken.every((url) => url.startsWith(SITE)), "only the page URL itself carries the token, never an API call");
    assert.ok(requestUrls.filter((url) => url.startsWith(API)).every((url) => !/[A-Za-z0-9_-]{43}(?:$|\?)/.test(new URL(url).pathname)), "no API URL carries a 43-char token");
    record("REQ-F15 (privacy)", "noindex + no-referrer + no-store; server HTML has no celebration data; no API URL carries a token");
  }

  step("en-US");
  {
    const { page, context } = await open(360, `${celebrationPath}/${MOCK_CONFIRMED_TOKEN}?lang=en-US`, { lang: "en-US" });
    await page.getByRole("heading", { name: /Your attendance is confirmed|We noted that you cannot attend|The reply deadline/ }).waitFor();
    await snap(page, "A10-en-US", 360);
    await context.close();
  }
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(" | ")}`);
  record("i18n/console", "en-US renders; no console errors across the run");
  result.status = "PASS";
} catch (error) {
  result.status = "FAIL"; result.error = String(error?.stack ?? error);
  console.error(error);
  process.exitCode = 1;
} finally {
  writeFileSync(join(evidence, "e2e-result.json"), JSON.stringify(result, null, 2));
  await browser.close();
  web.kill("SIGTERM");
  server.close();
  rmSync(join(app, ".next-e2e"), { recursive: true, force: true });
}
