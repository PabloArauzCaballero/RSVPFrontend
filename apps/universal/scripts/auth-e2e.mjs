// F05 live end-to-end: the real universal web app (expo export, served on :8200) against a REAL
// Identity service (Spring Boot, ephemeral Postgres/Redis). Identity runs straight on :3200 without
// Kong, so this script stands in for the gateway only for two things: it strips the `/identity`
// prefix and answers CORS. Every credential, token, rotation and revocation is decided by Identity.
//   IDENTITY=http://localhost:3200 APP=http://localhost:8200 node apps/universal/scripts/auth-e2e.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const IDENTITY = process.env.IDENTITY ?? "http://localhost:3200";
const APP = process.env.APP ?? "http://localhost:8200";
const OUT = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F05/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const WIDTHS = [360, 768, 1280];
const PASSWORD = "correct-horse-battery";
const stamp = Date.now();
const results = [];
const log = (label, ok = true, detail = "") => { results.push({ label, ok, detail }); console.log(`${ok ? "  PASS" : "  FAIL"} ${label}${detail ? ` (${detail})` : ""}`); };
const check = async (label, fn) => { try { await fn(); log(label); } catch (error) { log(label, false, String(error.message).split("\n")[0]); } };

const cors = { "access-control-allow-origin": APP, "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type,authorization,x-correlation-id,accept", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "x-correlation-id" };
const seen = []; // every request that reached Identity
let staleOnce = false; // the next authenticated API call is answered 401 (an expired access token), then calls pass
let offline = false; // simulated dead network: the gateway stand-in aborts instead of forwarding

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function newPage(width = 1280, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "es-BO", timezoneId: "America/La_Paz" });
  context.setDefaultTimeout(10000);
  await context.route(`${IDENTITY}/**`, async (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (offline) return route.abort("internetdisconnected");
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.startsWith("/celebrations")) {
      const auth = request.headers()["authorization"] ?? "";
      seen.push(`${request.method()} ${url.pathname} ${auth ? "bearer" : "anon"}`);
      if (staleOnce && auth) { staleOnce = false; return route.fulfill({ status: 401, headers: { ...cors, "content-type": "application/problem+json" }, body: JSON.stringify({ title: "expired", status: 401 }) }); }
      if (url.pathname === "/celebrations") return route.fulfill({ status: 200, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ items: [] }) });
      return route.fulfill({ status: 404, headers: { ...cors, "content-type": "application/problem+json" }, body: JSON.stringify({ title: "Not found", status: 404 }) });
    }
    const target = `${IDENTITY}${url.pathname.replace(/^\/identity/, "")}${url.search}`;
    seen.push(`${request.method()} ${url.pathname}`);
    const response = await route.fetch({ url: target });
    return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log("  pageerror:", error.message));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) console.log("  console.error:", message.text().slice(0, 200)); });
  return { page, context };
}
// expo-router keeps the previous screen mounted (hidden) under the new one: only look at what a person can see.
const visibleField = (page, label) => page.getByLabel(label, { exact: true }).filter({ visible: true });
const fill = async (page, label, value) => visibleField(page, label).fill(value);
const shot = async (page, name) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
const waitPath = async (page, pattern) => page.waitForURL(pattern, { timeout: 15000 });
// The web session lives in memory, so a full page load signs the person out: move inside the running app like a link would.
const navigateInApp = (page, path) => page.evaluate((target) => { window.history.pushState({}, "", target); window.dispatchEvent(new PopStateEvent("popstate")); }, path);
const registerViaUi = async (page, email, roleName) => {
  await page.goto(`${APP}/registro`);
  await fill(page, "Correo electrónico", email); await fill(page, "Contraseña", PASSWORD);
  if (roleName) await page.getByRole("radio", { name: new RegExp(roleName) }).click();
  await page.getByRole("button", { name: "Crear cuenta" }).filter({ visible: true }).click();
};

console.log("\n== Anonymous guard and sign-in with return to origin ==");
const host = await newPage();
const hostEmail = `host-${stamp}@example.com`;
await check("anonymous visit to a private deep link redirects to /login carrying returnTo", async () => {
  await host.page.goto(`${APP}/editor/general?c=abc-123`);
  await waitPath(host.page, /\/login\?returnTo=/);
  assert.equal(new URL(host.page.url()).searchParams.get("returnTo"), "/editor/general?c=abc-123");
  await host.page.getByText("Tu sesión terminó. Inicia sesión para continuar.").waitFor();
});
await check("wrong credentials against real Identity: neutral error, stays on /login, values kept", async () => {
  await fill(host.page, "Correo electrónico", "nadie@example.com"); await fill(host.page, "Contraseña", "wrong-password-123");
  await host.page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await host.page.getByText("El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.").waitFor();
  assert.match(host.page.url(), /\/login/);
  assert.equal(await visibleField(host.page, "Correo electrónico").inputValue(), "nadie@example.com");
  await shot(host.page, "login-credencial-invalida-1280");
});
await check("keyboard: Enter in the password field submits (no pointer)", async () => {
  await fill(host.page, "Contraseña", "x"); await visibleField(host.page, "Contraseña").press("Enter");
  await host.page.getByText("El correo o la contraseña no coinciden.").waitFor();
});
await check("offline: a dead network says so instead of blaming the password", async () => {
  offline = true;
  await host.page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await host.page.getByText("No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.").waitFor();
  await shot(host.page, "login-sin-conexion-1280");
  offline = false;
});
await check("sign up (real Identity, role HOST) from the deep link flow returns to the page that was asked for", async () => {
  await host.page.getByRole("link", { name: "Crear cuenta" }).filter({ visible: true }).click();
  await waitPath(host.page, /\/registro\?returnTo=/);
  await fill(host.page, "Correo electrónico", hostEmail); await fill(host.page, "Contraseña", PASSWORD);
  await host.page.getByRole("button", { name: "Crear cuenta" }).filter({ visible: true }).click();
  await waitPath(host.page, /\/editor\/general\?.*c=abc-123/); // expo-router also appends the dynamic segment (section=general)
});
await check("duplicate e-mail (409) is explained", async () => {
  const other = await newPage();
  await registerViaUi(other.page, hostEmail);
  await other.page.getByText("Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.").waitFor();
  await shot(other.page, "registro-correo-existente-1280");
  await other.context.close();
});
await check("password shorter than 12 is stopped before the network with a field error", async () => {
  const other = await newPage(); const before = seen.length;
  await other.page.goto(`${APP}/registro`); await fill(other.page, "Correo electrónico", `short-${stamp}@example.com`); await fill(other.page, "Contraseña", "corta");
  await other.page.getByRole("button", { name: "Crear cuenta" }).filter({ visible: true }).click();
  await other.page.getByText("La contraseña debe tener al menos 12 caracteres.").waitFor();
  assert.equal(seen.length, before);
  await other.context.close();
});

console.log("\n== Silent refresh (real rotation) and sign-out ==");
await check("REFRESH PROOF: expired bearer -> POST /identity/auth/refresh (real) -> retry with new bearer -> page keeps working", async () => {
  const { page } = await newPage();
  await page.goto(`${APP}/login`); await fill(page, "Correo electrónico", hostEmail); await fill(page, "Contraseña", PASSWORD);
  const requests = [];
  page.on("request", (req) => { if (/\/celebrations|\/auth\/refresh/.test(req.url())) requests.push(`${req.method()} ${new URL(req.url()).pathname} ${req.headers()["authorization"] ? "bearer" : ""}`); });
  staleOnce = true;
  await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await waitPath(page, /\/celebraciones/);
  await page.getByText("Todavía no tienes celebraciones. Crea la primera en tres pasos.").waitFor();
  assert.ok(requests.some((r) => r.startsWith("POST /identity/auth/refresh")), `refresh not seen: ${requests.join(" | ")}`);
  assert.ok(!/\/login/.test(page.url()));
  writeFileSync(`${OUT}refresh-requests.txt`, requests.join("\n") + "\n");
  await shot(page, "celebraciones-tras-refresh-1280");
  // Sign out from the UI: remote revocation + local wipe.
  const logout = page.waitForRequest((req) => req.url().endsWith("/identity/auth/logout"));
  await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
  const sent = await logout; assert.ok(sent.postDataJSON().refreshToken.length >= 32);
  await waitPath(page, /\/login/);
  // REQ-F05-06: the refresh token the app held is dead at Identity, not just forgotten locally.
  const replay = await fetch(`${IDENTITY}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: sent.postDataJSON().refreshToken }) });
  assert.equal(replay.status, 401);
  writeFileSync(`${OUT}logout-revocation.txt`, `POST /identity/auth/logout -> sent refresh token; replay POST /auth/refresh -> HTTP ${replay.status}\n`);
});

console.log("\n== Roles ==");
const providerEmail = `provider-${stamp}@example.com`;
const provider = await newPage();
await check("PROVIDER who arrived from a deep link to /admin is NOT sent there: role-aware return lands in /portal", async () => {
  await provider.page.goto(`${APP}/admin`);
  await waitPath(provider.page, /\/login\?returnTo=%2Fadmin/);
  await provider.page.getByRole("link", { name: "Crear cuenta" }).filter({ visible: true }).click();
  await fill(provider.page, "Correo electrónico", providerEmail); await fill(provider.page, "Contraseña", PASSWORD);
  await provider.page.getByRole("radio", { name: /Proveedor/ }).click();
  await provider.page.getByRole("button", { name: "Crear cuenta" }).filter({ visible: true }).click();
  await waitPath(provider.page, /\/portal/);
  await provider.page.getByText("Portal del proveedor").waitFor();
  await shot(provider.page, "portal-proveedor-1280");
});
await check("the Identity JWT really carries roles and organizationIds (contract) ", async () => {
  const res = await fetch(`${IDENTITY}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: providerEmail, password: PASSWORD }) });
  const body = await res.json(); const claims = JSON.parse(Buffer.from(body.accessToken.split(".")[1], "base64url").toString());
  assert.deepEqual(claims.roles, ["PROVIDER"]); assert.ok(Array.isArray(claims.organizationIds));
  writeFileSync(`${OUT}jwt-claims-provider.json`, JSON.stringify({ roles: claims.roles, organizationIds: claims.organizationIds, iss: claims.iss, ttlSeconds: claims.exp - claims.iat }, null, 2) + "\n");
});

console.log("\n== Recovery, invitation link, language ==");
const anon = await newPage();
await check("recovery request returns the neutral confirmation for an unknown e-mail (202)", async () => {
  await anon.page.goto(`${APP}/recuperar`); await fill(anon.page, "Correo electrónico", `ghost-${stamp}@example.com`);
  await anon.page.getByRole("button", { name: "Enviar instrucciones" }).click();
  await anon.page.getByText("Si existe una cuenta con ese correo, recibirás las instrucciones para crear una contraseña nueva.").waitFor();
  await shot(anon.page, "recuperar-enviado-1280");
});
await check("/rsvp/<token> opens the invitation landing in the app (fallback and universal-link target)", async () => {
  await anon.page.goto(`${APP}/rsvp/token-de-prueba-123`); await anon.page.getByText("Tu invitación", { exact: true }).waitFor();
  await shot(anon.page, "invitacion-enlace-1280");
});
await check("language switch: English applies at once and survives a reload (explicit choice)", async () => {
  await anon.page.goto(`${APP}/login`);
  await anon.page.getByRole("radio", { name: "English" }).click();
  await anon.page.getByText("Sign in to your account").waitFor();
  await anon.page.reload(); await anon.page.getByText("Sign in to your account").waitFor();
  await shot(anon.page, "login-en-1280");
  await anon.page.getByRole("radio", { name: "Español" }).click();
});

console.log("\n== Responsive captures and axe (login, registro, recuperar) ==");
for (const width of WIDTHS) {
  const { page, context } = await newPage(width, width === 360 ? 780 : 900);
  for (const route of ["login", "registro", "recuperar"]) {
    await page.goto(`${APP}/${route}`); await page.getByRole("heading", { level: 1 }).waitFor();
    await shot(page, `${route}-${width}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    await check(`${route} @${width}: no horizontal overflow`, async () => assert.equal(overflow, false));
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = axe.violations.filter((v) => ["critical", "serious"].includes(v.impact));
    writeFileSync(`${OUT}axe-${route}-${width}.json`, JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2) + "\n");
    await check(`${route} @${width}: axe has no critical/serious violations`, async () => assert.equal(serious.length, 0, serious.map((v) => v.id).join(",")));
  }
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
writeFileSync(`${OUT}auth-e2e-result.json`, JSON.stringify({ date: new Date().toISOString(), identity: IDENTITY, app: APP, passed: results.length - failed.length, failed: failed.length, results }, null, 2) + "\n");
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
