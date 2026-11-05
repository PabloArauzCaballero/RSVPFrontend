// F05: the real web app (expo export with EXPO_PUBLIC_API_URL=http://localhost:28000, served on :8081 because
// Kong's CORS plugin only allows http://localhost:3000 and :8081) against the REAL gateway and Identity. No stand-in:
// this is what observes CORS with credentials in Chrome (preflight, Allow-Origin/Credentials, httpOnly cookie, reload restore).
//   APP=http://localhost:8081 API=http://localhost:28000 node apps/universal/scripts/auth-e2e-kong.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8081";
const API = process.env.API ?? "http://localhost:28000";
const OUT = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F05/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const PASSWORD = "correct-horse-battery";
const email = `kong-${Date.now()}@example.com`;
const results = []; const log = []; const note = (line) => { log.push(line); console.log(line); };
const check = async (label, fn) => { try { await fn(); results.push({ label, ok: true }); note(`PASS ${label}`); } catch (error) { results.push({ label, ok: false }); note(`FAIL ${label}: ${String(error.message).split("\n")[0]}`); } };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO" });
context.setDefaultTimeout(15000);
const page = await context.newPage();
const exchanges = [];
page.on("response", async (response) => {
  const url = new URL(response.url());
  if (!response.url().startsWith(API)) return;
  const h = response.headers();
  exchanges.push({ method: response.request().method(), path: url.pathname, status: response.status(), acao: h["access-control-allow-origin"], acac: h["access-control-allow-credentials"], setCookie: Boolean(h["set-cookie"]) });
});
const field = (label) => page.getByLabel(label, { exact: true }).filter({ visible: true });

await check("the app reaches the gateway from its origin (the real preflight is the first OPTIONS in the exchange list below)", async () => {
  await page.goto(`${APP}/registro`);
  const pre = await page.evaluate(async (api) => { const r = await fetch(`${api}/identity/auth/refresh`, { method: "OPTIONS", headers: { "access-control-request-method": "POST" } }); return r.status; }, API).catch(() => null);
  // Chrome sends the preflight itself on the first credentialed POST below; here only prove the page can reach the gateway.
  assert.notEqual(pre, null);
});
await check("register through the UI: cross-origin credentialed POST succeeds (no CORS error), roles land the host", async () => {
  await field("Correo electrónico").fill(email); await field("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).filter({ visible: true }).click();
  await page.waitForURL(/\/celebraciones|\/inicio|\/onboarding/, { timeout: 20000 });
  const reg = exchanges.find((e) => e.method === "POST" && e.path.endsWith("/auth/register"));
  assert.ok(reg, "no register exchange seen");
  assert.equal(reg.acao, APP); assert.equal(reg.acac, "true");
  await page.screenshot({ path: `${OUT}kong-registro-ok-1280.png`, fullPage: true });
});
await check("Identity set the httpOnly refresh cookie through Kong; scripts cannot read it; no token in web storage", async () => {
  const cookie = (await context.cookies()).find((c) => c.name === "rsvp_refresh");
  assert.ok(cookie, "rsvp_refresh cookie missing");
  assert.equal(cookie.httpOnly, true);
  assert.equal(await page.evaluate(() => document.cookie.includes("rsvp_refresh")), false);
  assert.equal(await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]).includes("eyJ")), false);
  note(`  cookie: httpOnly=${cookie.httpOnly} sameSite=${cookie.sameSite} path=${cookie.path} secure=${cookie.secure} domain=${cookie.domain}`);
});
await check("reload restores the session through POST /identity/auth/refresh (credentials: include) and stays signed in", async () => {
  const before = exchanges.length;
  await page.reload();
  await page.waitForTimeout(1500);
  const refresh = exchanges.slice(before).find((e) => e.path.endsWith("/auth/refresh"));
  assert.ok(refresh, "no refresh on reload");
  assert.equal(refresh.status, 200); assert.equal(refresh.acao, APP); assert.equal(refresh.acac, "true");
  assert.ok(!/\/login/.test(page.url()), `bounced to ${page.url()}`);
  await page.screenshot({ path: `${OUT}kong-recarga-sesion-1280.png`, fullPage: true });
});
await check("sign out revokes: POST /identity/auth/logout 2xx and the cookie is gone", async () => {
  const before = exchanges.length;
  await page.getByRole("button", { name: "Cerrar sesión" }).filter({ visible: true }).first().click();
  await page.waitForTimeout(1500);
  const out = exchanges.slice(before).find((e) => e.path.endsWith("/auth/logout"));
  assert.ok(out && out.status < 300, JSON.stringify(out));
  assert.equal((await context.cookies()).some((c) => c.name === "rsvp_refresh" && c.value), false);
});
await check("a wrong password through the gateway is a neutral 401, not a CORS failure", async () => {
  await page.goto(`${APP}/login`);
  await field("Correo electrónico").fill(email); await field("Contraseña").fill("wrong-password-123");
  await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await page.getByText("El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.").waitFor();
  const login = exchanges.filter((e) => e.path.endsWith("/auth/login")).at(-1);
  assert.equal(login.status, 401); assert.equal(login.acao, APP);
});
note(`\nexchanges seen by Chrome:\n${exchanges.map((e) => `${e.method} ${e.path} ${e.status} ACAO=${e.acao} ACAC=${e.acac}`).join("\n")}`);
writeFileSync(`${OUT}auth-e2e-kong.log`, log.join("\n") + "\n");
writeFileSync(`${OUT}auth-e2e-kong-result.json`, JSON.stringify({ app: APP, api: API, results, exchanges }, null, 2));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
