// R8b FE against the REAL provider-catalog service (BE #169, PostgreSQL 16, production migrations) in Chrome real: «Productos» of the admin.
// The service is the one of the BE integration harness (3 published products of one verified provider); the app reads it through
// scripts/live/cors-proxy.mjs (bytes unchanged, CORS added). Every write is read back with a direct HTTP call, never from the UI alone.
//   STATE=<json with baseUrl, admin, owner, providerId, ids> APP=http://localhost:8320 API=http://localhost:28010 CHROMIUM_PATH=... node apps/universal/scripts/live/admin-productos.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8320";
const API = process.env.API ?? "http://localhost:28010";
const state = JSON.parse(readFileSync(process.env.STATE ?? "", "utf8"));
const out = fileURLToPath(new URL("../../../../docs/progress/evidence/regalos-r8b/", import.meta.url));
mkdirSync(out, { recursive: true });
const checks = [], wire = [], axe = [];

const http = async (method, path, { token = state.admin, body } = {}) => {
  const response = await fetch(`${API}${path}`, { method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : undefined };
};
const check = async (id, text, fn) => {
  try { const note = await fn(); checks.push({ id, text, status: "PASS", observed: note ?? null }); console.log(`PASS ${id} · ${text}${note ? ` -> ${note}` : ""}`); }
  catch (error) { const message = String(error.message).split("\n")[0]; checks.push({ id, text, status: "FAIL", observed: message }); console.log(`FAIL ${id} · ${text}: ${message}`); }
};

// A re-run starts from the seeded state: everything visible and not featured (the service is idempotent, so this is safe to repeat).
for (const id of state.ids) { await http("POST", `/providers/admin/listings/${id}/show`); await http("PUT", `/providers/admin/listings/${id}/featured`, { body: { featured: false } }); }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO" });
context.setDefaultTimeout(20000);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => { if (response.url().startsWith(API)) wire.push(`${response.request().method()} ${new URL(response.url()).pathname}${new URL(response.url()).search ? "?…" : ""} ${response.status()}`); });
const shot = async (name, widths = [1280]) => { for (const width of widths) { await page.setViewportSize({ width, height: width < 500 ? 900 : 1000 }); await page.waitForTimeout(900); await page.screenshot({ path: join(out, `live-${name}-${width}.png`) }); } await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(300); };
const checkAxe = async (name) => { const violations = (await new AxeBuilder({ page }).analyze()).violations.filter((item) => ["critical", "serious"].includes(item.impact ?? "")); axe.push({ screen: name, violations: violations.map((item) => `${item.id}: ${item.help}`) }); assert.equal(violations.length, 0, `axe ${name}: ${violations.map((item) => item.id)}`); };
const row = (id) => page.getByTestId(`product-${id}`);
const [A, B, C] = state.ids;
const posts = () => wire.filter((line) => /^(POST|PUT) /.test(line));

await check("L1", "the inbox lists the 3 products the service published, with the counters of the service", async () => {
  await page.goto(`${APP}/admin/productos`, { waitUntil: "domcontentloaded" });
  await page.getByTestId(`product-${A}`).waitFor({ timeout: 90000 });
  assert.equal(await page.locator("[data-testid^=product-]:not([data-testid*=-hide-]):not([data-testid*=-show-]):not([data-testid*=-featured-]):not([data-testid*=-reason-])").count(), 3);
  assert.equal(await page.getByTestId("products-count-recent").textContent(), "3");
  assert.equal(await page.getByTestId("products-count-hidden").textContent(), "0");
  const body = await page.locator("body").innerText();
  assert.ok(!/invitad|tel[eé]fono del|correo del/i.test(body), "PF-1: no personal data on the screen");
  await shot("bandeja", [1280, 768, 360]);
  await checkAxe("bandeja");
  return "3 rows, counters 3/0, axe 0 critical/serious";
});

await check("L2", "hide needs 3 to 500 characters: «ab» is refused in place and nothing is sent", async () => {
  const before = posts().length;
  await page.getByTestId(`product-hide-${A}`).click();
  await page.getByTestId("admin-reason").fill("ab");
  await page.getByRole("button", { name: "Ocultar", exact: true }).last().click();
  await page.getByText("El motivo necesita al menos 3 caracteres.").waitFor();
  assert.equal(posts().length, before);
  await shot("ocultar-validacion", [360]);
  await checkAxe("dialogo-ocultar");
});

await check("L3", "hide with a reason: the service records it, the product leaves the public reads and its owner sees why", async () => {
  await page.getByTestId("admin-reason").fill("La foto muestra un teléfono de contacto");
  await page.getByRole("button", { name: "Ocultar", exact: true }).last().click();
  await page.getByText("Producto oculto. Su dueño verá el motivo.").waitFor();
  await page.getByTestId(`product-${A}`).waitFor({ state: "detached", timeout: 10000 });
  const hiddenLine = wire.find((line) => line.startsWith(`POST /providers/admin/listings/${A}/hide`));
  assert.ok(hiddenLine?.endsWith(" 200"), hiddenLine);
  const publicRead = await http("GET", `/listings/${A}`, { token: null });
  assert.equal(publicRead.status, 404, "GET /listings/{id} is 404 once hidden");
  const control = await http("GET", `/listings/${C}`, { token: null });
  assert.equal(control.status, 200, `control: a visible product answers 200, got ${control.status}`);
  const redirect = await fetch(`${API}/r/${A}`, { redirect: "manual" });
  assert.equal(redirect.status, 404, "GET /r/{id} is 404 once hidden");
  const inbox = await http("GET", "/providers/admin/moderation/listings?view=HIDDEN");
  assert.equal(inbox.json.counts.hidden, 1);
  assert.equal(inbox.json.items[0].adminHiddenReason, "La foto muestra un teléfono de contacto");
  const sheet = await http("GET", `/providers/${state.providerId}/listings/${A}`, { token: state.owner });
  assert.equal(sheet.json.completeness, "HIDDEN_BY_ADMIN");
  assert.equal(sheet.json.adminHiddenReason, "La foto muestra un teléfono de contacto");
  const list = await http("GET", "/listings?pageSize=50", { token: null });
  assert.ok(!JSON.stringify(list.json).includes(A), "GET /listings no longer lists it");
  await shot("tras-ocultar", [1280]);
  return `GET /listings/{id} 404, GET /r/{id} ${redirect.status}, owner sheet HIDDEN_BY_ADMIN with the reason`;
});

await check("L4", "«Ocultos»: the hidden product shows its reason and date, and its featured switch is disabled", async () => {
  await page.getByTestId("products-tab-hidden").click();
  await page.getByTestId(`product-${A}`).waitFor();
  assert.equal(await page.getByTestId(`product-reason-${A}`).textContent(), "Motivo: La foto muestra un teléfono de contacto");
  assert.equal(await page.getByTestId(`product-featured-${A}`).getAttribute("aria-disabled"), "true");
  assert.equal(await page.getByTestId("products-count-hidden").textContent(), "1");
  await shot("ocultos", [1280, 360]);
  await checkAxe("ocultos");
  const featured = await http("PUT", `/providers/admin/listings/${A}/featured`, { body: { featured: true } });
  assert.equal(featured.status, 409);
  assert.equal(featured.json.code, "LISTING_HIDDEN");
  return "the service refuses it too: 409 LISTING_HIDDEN";
});

await check("L5", "featured on a visible product: the switch sends PUT, the service stores it and the UI reflects it", async () => {
  await page.getByTestId("products-tab-recent").click();
  await page.getByTestId(`product-${B}`).waitFor();
  assert.equal(await page.getByTestId(`product-featured-${B}`).getAttribute("aria-checked"), "false");
  await page.getByTestId(`product-featured-${B}`).click();
  await page.getByText("Producto destacado.").waitFor();
  await page.waitForFunction((id) => document.querySelector(`[data-testid="product-featured-${id}"]`)?.getAttribute("aria-checked") === "true", B);
  const inbox = await http("GET", "/providers/admin/moderation/listings?view=RECENT&featured=true");
  assert.deepEqual(inbox.json.items.map((item) => item.listingId), [B]);
  await shot("destacado", [1280]);
  return "filter featured=true returns only that product";
});

await check("L6", "filters reach the service: featured=false excludes the featured one", async () => {
  await page.getByLabel("Destacado", { exact: true }).selectOption("off");
  await page.getByTestId(`product-${B}`).waitFor({ state: "detached", timeout: 10000 });
  await page.getByTestId(`product-${C}`).waitFor();
  assert.ok(wire.some((line) => line.startsWith("GET /providers/admin/moderation/listings?…")));
  await page.getByLabel("Destacado", { exact: true }).selectOption("any");
  await page.getByTestId(`product-${B}`).waitFor();
});

await check("L7", "show: the product is visible again, republished and NOT featured again", async () => {
  await page.getByTestId("products-tab-hidden").click();
  await page.getByTestId(`product-show-${A}`).click();
  await page.getByText(/^Ya no está oculto\. Vuelve a mostrarse/).waitFor();
  const publicRead = await http("GET", `/listings/${A}`, { token: null });
  assert.equal(publicRead.status, 200, `GET /listings/{id} after show: ${publicRead.status} ${JSON.stringify(publicRead.json).slice(0, 200)}`);
  const inbox = await http("GET", "/providers/admin/moderation/listings?view=HIDDEN");
  assert.equal(inbox.json.counts.hidden, 0);
  const sheet = await http("GET", `/providers/${state.providerId}/listings/${A}`, { token: state.owner });
  assert.equal(sheet.json.completeness, "COMPLETE", `owner sheet after show: ${sheet.json.completeness}`);
  assert.equal(sheet.json.featured ?? false, false);
  await page.getByText("No hay productos ocultos con estos filtros.").waitFor();
  await shot("tras-mostrar-vacio", [1280, 360]);
  return "GET /listings/{id} 200, owner sheet COMPLETE, hidden counter 0";
});

await check("L8", "a network failure shows the error state with a retry that recovers", async () => {
  await page.goto(`${APP}/admin/productos`, { waitUntil: "domcontentloaded" });
  await page.getByTestId(`product-${A}`).waitFor();
  await context.route(`${API}/providers/admin/moderation/listings*`, (route) => route.abort());
  await page.getByTestId("products-tab-hidden").click();
  await page.getByTestId("admin-retry").waitFor();
  await shot("error-red", [360]);
  await context.unroute(`${API}/providers/admin/moderation/listings*`);
  await page.getByTestId("admin-retry").click();
  await page.getByText("No hay productos ocultos con estos filtros.").waitFor();
});

await check("L9", "no page errors in the console", async () => { assert.deepEqual(errors, []); });

writeFileSync(join(out, "live-admin-productos.json"), JSON.stringify({ date: new Date().toISOString(), app: APP, checks, axe, wire }, null, 2));
await browser.close();
const failed = checks.filter((item) => item.status === "FAIL");
console.log(`\n${checks.length - failed.length}/${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);
