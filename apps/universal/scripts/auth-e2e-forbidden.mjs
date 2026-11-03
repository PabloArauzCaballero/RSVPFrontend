// F05-03 live: a REAL Identity access token for a PROVIDER (registered over HTTP) is injected the
// only supported way for development builds (EXPO_PUBLIC_DEV_ACCESS_TOKEN, `expo export --dev`), so
// the page can be opened directly on (admin) and (host) and the guard decides from real claims.
//   IDENTITY=http://localhost:3200 APP=http://localhost:8200 node apps/universal/scripts/auth-e2e-forbidden.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const IDENTITY = process.env.IDENTITY ?? "http://localhost:3200"; const APP = process.env.APP ?? "http://localhost:8200";
const OUT = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F05/", import.meta.url)); mkdirSync(OUT, { recursive: true });
const email = `dev-${Date.now()}@example.com`;
const res = await fetch(`${IDENTITY}/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "correct-horse-battery", role: process.env.ROLE ?? "PROVIDER" }) });
const { accessToken, roles } = await res.json();
if (process.argv[2] === "token") { console.log(accessToken); process.exit(0); }
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO" })).newPage();
page.setDefaultTimeout(10000);
const results = [];
const check = async (label, fn) => { try { await fn(); results.push({ label, ok: true }); console.log("  PASS", label); } catch (e) { results.push({ label, ok: false, detail: e.message.split("\n")[0] }); console.log("  FAIL", label, e.message.split("\n")[0]); } };
await check(`real Identity token carries roles ${JSON.stringify(roles)}`, async () => assert.deepEqual(roles, [process.env.ROLE ?? "PROVIDER"]));
await check("PROVIDER opening /admin sees the access-denied screen (no admin content)", async () => {
  await page.goto(`${APP}/admin`); await page.getByText("No tienes acceso a esta sección").waitFor();
  assert.equal(await page.getByText("Resumen").count(), 0);
  await page.screenshot({ path: `${OUT}acceso-denegado-provider-admin-1280.png`, fullPage: true });
});
await check("PROVIDER opening the host workspace is denied too", async () => { await page.goto(`${APP}/celebraciones`); await page.getByText("No tienes acceso a esta sección").waitFor(); });
await check("'Ir a mi espacio' leads the PROVIDER to /portal", async () => { await page.getByRole("button", { name: "Ir a mi espacio" }).click(); await page.waitForURL(/\/portal/); });
await check("PROVIDER reaches (provider)", async () => { await page.goto(`${APP}/portal`); await page.getByText("Portal del proveedor").waitFor(); });
await browser.close();
const failed = results.filter((r) => !r.ok);
writeFileSync(`${OUT}auth-e2e-forbidden-result.json`, JSON.stringify({ date: new Date().toISOString(), role: process.env.ROLE ?? "PROVIDER", passed: results.length - failed.length, failed: failed.length, results }, null, 2) + "\n");
process.exit(failed.length ? 1 : 0);
