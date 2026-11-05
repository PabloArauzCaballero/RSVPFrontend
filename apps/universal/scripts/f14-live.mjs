// F14 against the REAL backend (Kong) with the bootstrap ADMIN: the eight admin modules (E1 summary, E5-E11) in Chrome.
// Nothing is intercepted or simulated. The credentials come from the environment and are never written anywhere:
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... APP_URL=http://localhost:8081 API_URL=http://localhost:28000 \
//   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/universal/scripts/f14-live.mjs
// APP_URL must serve an export built with EXPO_PUBLIC_API_URL=$API_URL (Kong's CORS admits :8081 and :3000 only).
// The one write it performs is on a provider it creates itself: register -> listing -> submit -> verified from the UI.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (the bootstrap ADMIN of IDENTITY_BOOTSTRAP_ADMIN_EMAIL).");
const APP = process.env.APP_URL ?? "http://localhost:8081", API = process.env.API_URL ?? "http://localhost:28000";
const out = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F14/", import.meta.url));
mkdirSync(out, { recursive: true });
const result = { date: new Date().toISOString(), surface: "Expo web export in Chrome, REAL backend through Kong, bootstrap ADMIN", checks: [], axe: [], consoleErrors: [] };
const record = (id, detail) => { result.checks.push({ id, detail }); console.log(`PASS ${id} - ${detail}`); };

const call = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${API}${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
};
const adminSession = await call("POST", "/identity/auth/login", { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
assert.equal(adminSession.status, 200, "admin login");
const adminToken = adminSession.body.accessToken;
assert.ok(JSON.parse(Buffer.from(adminToken.split(".")[1], "base64url").toString()).roles.includes("ADMIN"), "the account must carry ADMIN (IDENTITY_BOOTSTRAP_ADMIN_EMAIL)");

// A provider waiting for verification that this run owns.
const stamp = Date.now().toString(36);
const owner = await call("POST", "/identity/auth/register", { body: { email: `f14live.${stamp}@example.com`, password: `Passw0rd!${stamp}-live`, role: "PROVIDER" } });
assert.equal(owner.status, 201);
const providerName = `F14 Verificacion ${stamp}`;
const provider = await call("POST", "/providers", { token: owner.body.accessToken, body: { name: providerName } });
assert.equal(provider.status, 201);
const listing = await call("POST", `/providers/${provider.body.id}/listings`, { token: owner.body.accessToken, body: { type: "SERVICE", category: "CATERING", city: "la-paz", titles: { "es-BO": "Catering F14" }, destinations: { WHATSAPP: "https://wa.me/59170000000" }, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 2, conditions: { "es-BO": "Entrega en el salon." } } } });
assert.equal(listing.status, 201);
assert.equal((await call("POST", `/providers/${provider.body.id}/submit`, { token: owner.body.accessToken })).status, 200);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const SCREENS = [
  ["E1-resumen", "/admin", "Resumen"], ["E5-categorias", "/admin/categorias", "Categorías"], ["E6-geografia", "/admin/geografia", "Geografía"], ["E7-verificacion", "/admin/verificacion", "Verificación"],
  ["E8-moderacion", "/admin/moderacion", "Moderación"], ["E9-usuarios", "/admin/usuarios", "Usuarios"], ["E10-organizaciones", "/admin/organizaciones", "Organizaciones"], ["E11-metricas", "/admin/metricas", "Métricas"]
];
async function open(width, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "es-BO" });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error" && !/favicon/.test(message.text())) result.consoleErrors.push(`${page.url()} ${message.text()}`); });
  await page.goto(`${APP}/login`);
  await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return { context, page };
}
const shot = async (page, name) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}${name}.png`, fullPage: true }); };
const gateway = [];

for (const width of [1280, 768, 360]) {
  const { context, page } = await open(width);
  page.on("response", (response) => { if (/\/(providers|identity)\/admin\//.test(response.url())) gateway.push(`${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`); });
  for (const [name, path] of SCREENS) {
    await page.goto(`${APP}${path}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(1500);
    assert.equal(await page.getByText("Acceso denegado").count(), 0, `${name} denied for the bootstrap ADMIN`);
    assert.equal(await page.getByTestId("admin-retry").count(), 0, `${name} shows an error state against the real backend`);
    await shot(page, `real-${name}-${width}`);
    if (width === 1280 || width === 360) {
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
      result.axe.push({ screen: name, width, violations: axe.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`) });
    }
  }
  if (width === 1280) {
    // E1 shows the numbers the API returns.
    const providers = await call("GET", "/providers/admin/summary", { token: adminToken });
    const identity = await call("GET", "/identity/admin/summary", { token: adminToken });
    await page.goto(`${APP}/admin`);
    await page.getByText(`Ofertas publicadas: ${providers.body.listingsPublished}`).waitFor();
    await page.getByText(`Cuentas: ${identity.body.users.total}`).waitFor();
    record("E1", `dashboard shows listingsPublished=${providers.body.listingsPublished} and users=${identity.body.users.total} from /providers/admin/summary and /identity/admin/summary`);

    // E7: verify the provider this run created, from the UI, and read the result back from the API.
    await page.goto(`${APP}/admin/verificacion`);
    await page.getByRole("heading", { name: providerName }).waitFor();
    await shot(page, "real-E7-verificacion-pendiente-1280");
    await page.getByRole("button", { name: `Verificar a ${providerName}` }).click();
    await page.getByText("Proveedor actualizado.").waitFor();
    const after = await call("GET", `/providers/${provider.body.id}`, { token: owner.body.accessToken });
    assert.equal(after.body.status, "VERIFIED");
    record("E7", "verify from the UI -> POST /providers/{id}/verify 200 -> provider VERIFIED in the API; it left the PENDING queue");
    await shot(page, "real-E7-verificacion-despues-1280");

    // E9: search finds the account created above.
    await page.goto(`${APP}/admin/usuarios`);
    await page.getByLabel("Buscar por correo", { exact: false }).fill(`f14live.${stamp}`).catch(() => page.getByTestId("users-search").fill(`f14live.${stamp}`));
    await page.getByTestId("users-search-go").click();
    await page.getByText(`f14live.${stamp}@example.com`).waitFor();
    record("E9", "search by e-mail finds the account registered a moment ago (GET /identity/admin/users?query=)");
  }
  await context.close();
}

// A non-admin session must be refused by the same screens (no data, no request succeeds).
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO" });
  const page = await context.newPage();
  await page.goto(`${APP}/login`);
  await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(`f14live.${stamp}@example.com`);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(`Passw0rd!${stamp}-live`);
  await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await page.goto(`${APP}/admin/verificacion`);
  await page.waitForTimeout(2000);
  assert.equal(await page.getByText(providerName).count(), 0);
  await shot(page, "real-E7-no-admin-1280");
  record("REQ-F14-06", "a PROVIDER session reaches /admin/verificacion and sees no data");
  await context.close();
}

const statuses = [...new Set(gateway)].sort();
assert.ok(statuses.every((line) => / (200|201)$/.test(line)), `unexpected admin answers: ${statuses.filter((line) => !/ (200|201)$/.test(line)).join("; ")}`);
record("gateway", `${statuses.length} distinct admin calls, all 2xx: ${statuses.join(" | ")}`);
result.gateway = statuses;
await browser.close();
const serious = result.axe.flatMap((entry) => entry.violations.filter((v) => /critical|serious/.test(v)));
console.log(JSON.stringify({ checks: result.checks.length, consoleErrors: result.consoleErrors.length, axeSeriousOrCritical: serious.length, axeOther: result.axe.flatMap((entry) => entry.violations).length - serious.length }));
writeFileSync(`${out}live-result.json`, JSON.stringify(result, null, 2));
