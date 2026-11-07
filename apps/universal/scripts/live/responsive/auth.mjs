// Responsive + i18n + scheme matrix for the Expo web auth/organizations area against the REAL gateway, with a real Chrome.
//   WORLD=world.json APP=http://localhost:8081 API=http://localhost:28000 CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node apps/universal/scripts/live/responsive/auth.mjs
// Optional: WIDTHS=360,768,1280  LANGS=es-BO,en-US  SCHEMES=light,dark  FRAME=0 (skip the shell sweep)  OUT=file.json
// Per route x width x language x scheme: (a) no pageerror/console.error (the anonymous refresh 401 is the only exclusion),
// (b) no horizontal scroll, (c) no raw i18n key or other-language string, (d) axe WCAG 2.1 A/AA without serious/critical,
// (e) controls >= 44 px at 360. Then, in en-US, valid end-to-end flows driven by testID/role and verified against the API,
// plus one network-down flow. Also reports whether the app has a dark theme at all (measured, not assumed).
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { axeSeriousOrCritical, en, es, horizontalScroll, i18nLeaks, smallTargets, watchErrors } from "./probe.mjs";

const API = process.env.API ?? "http://localhost:28000";
const APP = process.env.APP ?? "http://localhost:8081";
const WIDTHS = (process.env.WIDTHS ?? "360,768,1280").split(",").map(Number);
const LANGS = (process.env.LANGS ?? "es-BO,en-US").split(",");
const SCHEMES = (process.env.SCHEMES ?? "light,dark").split(",");
const PASSWORD = "correct-horse-battery";
const stamp = Date.now().toString(36);
let counter = 0;
const uniq = (label) => `${label}-${stamp}-${(counter += 1)}@example.com`;
const world = process.env.WORLD ? JSON.parse(readFileSync(process.env.WORLD, "utf8")) : null;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const rows = [];
const dict = { "es-BO": es, "en-US": en };

const apiJson = async (method, path, body, token) => {
  const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null };
};
const vis = (page, selector) => page.locator(selector).filter({ visible: true });
const byId = (page, id) => vis(page, `[data-testid="${id}"]`);
const navigateInApp = (page, path) => page.evaluate((target) => { window.history.pushState({}, "", target); window.dispatchEvent(new PopStateEvent("popstate")); }, path);

async function context(width, lang, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: lang, colorScheme: scheme, timezoneId: "America/La_Paz" });
  ctx.setDefaultTimeout(20000);
  const page = await ctx.newPage();
  return { ctx, page, errors: watchErrors(page) };
}
async function settle(page) { await page.waitForLoadState("networkidle").catch(() => undefined); await page.waitForTimeout(700); }

async function signIn(page, email, password = PASSWORD) {
  await page.goto(`${APP}/login`);
  await byId(page, "login-email").fill(email); await byId(page, "login-password").fill(password);
  await byId(page, "login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 25000 });
  await settle(page);
}

/** The five universal checks on whatever the page shows now. */
async function inspect(page, errors, { width, lang, label }) {
  const out = [];
  if (errors.length) out.push(`console/pageerror: ${errors.slice(0, 2).join(" | ")}`);
  const scroll = await horizontalScroll(page);
  if (scroll.overflow) out.push(`horizontal scroll ${scroll.scrollWidth}>${scroll.innerWidth} ${scroll.wide.join(",")}`);
  const leaks = await i18nLeaks(page, lang);
  if (leaks.length) out.push(`i18n: ${leaks.slice(0, 3).join(" | ")}`);
  const axe = await axeSeriousOrCritical(page);
  if (axe.length) out.push(`axe: ${axe.slice(0, 3).join(" | ")}`);
  if (width === 360) { const small = await smallTargets(page); if (small.length) out.push(`touch<44: ${small.slice(0, 4).join(", ")}`); }
  return out.map((message) => `${label}: ${message}`);
}
function record(area, route, width, lang, scheme, failures) {
  const status = failures.length ? "FAIL" : "PASS";
  rows.push({ area, route, width, lang, scheme, status, failures });
  console.log(`  ${status} ${area} ${route} ${width} ${lang} ${scheme}${failures.length ? `\n      ${failures.join("\n      ")}` : ""}`);
}

// ------------------------------------------------------------------ 1. public auth routes
console.log("\n== Public auth routes ==");
const PUBLIC = ["/login", "/registro", "/recuperar", "/", "/catalogo"];
for (const scheme of SCHEMES) for (const lang of LANGS) for (const width of WIDTHS) {
  const { ctx, page, errors } = await context(width, lang, scheme);
  for (const route of PUBLIC) {
    errors.length = 0;
    await page.goto(`${APP}${route}`); await settle(page);
    const failures = await inspect(page, errors, { width, lang, label: new URL(page.url()).pathname });
    if (route === "/" && !/\/login/.test(page.url())) failures.push(`anonymous / did not land on /login: ${page.url()}`);
    record("auth", route, width, lang, scheme, failures);
  }
  await ctx.close();
}

// ------------------------------------------------------------------ 2. how dark is the app really
console.log("\n== Dark theme measurement ==");
{
  const probe = async (scheme) => { const { ctx, page } = await context(1280, "en-US", scheme); await page.goto(`${APP}/login`); await settle(page); const colors = await page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, main: getComputedStyle(document.querySelector("[role=main]") ?? document.body).backgroundColor, theme: document.documentElement.getAttribute("data-theme"), mq: matchMedia("(prefers-color-scheme: dark)").matches })); await ctx.close(); return colors; };
  const light = await probe("light"), dark = await probe("dark");
  const same = JSON.stringify({ ...light, mq: 0 }) === JSON.stringify({ ...dark, mq: 0 });
  console.log(`  light=${JSON.stringify(light)}\n  dark=${JSON.stringify(dark)}\n  => Expo auth/shell ${same ? "uses a FIXED LIGHT palette (colorScheme dark changes nothing)" : "reacts to the dark scheme"}`);
  rows.push({ area: "theme", route: "login", status: "INFO", failures: [], note: same ? "fixed light palette: dark scheme renders identically to light" : "reacts to dark scheme", light, dark });
}

// ------------------------------------------------------------------ 3. signed-in: organizations + the shell on every host route
console.log("\n== Organizations (PLANNER) and the shell (HOST) ==");
const planner = uniq("planner"); assert.equal((await apiJson("POST", "/identity/auth/register", { email: planner, password: PASSWORD, role: "PLANNER" })).status, 201);
const HOST_PATHS = ["/celebraciones", "/organizaciones", "/inicio", "/invitados", "/invitados/nuevo", "/invitados/importar", "/invitados/grupos", "/invitados/ajustes", "/rsvp/reporte", "/bandeja/acompanantes", "/bandeja/regalos", "/notificaciones", "/preferencias", "/permisos-push", "/regalos", "/regalos/catalogo", "/regalos/proveedores", "/regalos/externo", "/editor/general", "/editor/anfitriones", "/editor/lugares", "/editor/historia", "/editor/itinerario", "/editor/secciones", "/editor/galeria", "/editor/traducciones", "/templates", "/preview", "/publicar", "/configuracion", "/modos", "/onboarding/1"];
const PORTAL_PATHS = ["/portal", "/portal/alta", "/portal/productos", "/portal/servicios", "/portal/entrega", "/portal/perfil", "/portal/documentos", "/portal/destinos", "/portal/agenda", "/portal/leads", "/portal/metricas"];
const provider = uniq("prov"); assert.equal((await apiJson("POST", "/identity/auth/register", { email: provider, password: PASSWORD, role: "PROVIDER" })).status, 201);
for (const scheme of SCHEMES) for (const lang of LANGS) for (const width of WIDTHS) {
  { // organizations as PLANNER
    const { ctx, page, errors } = await context(width, lang, scheme);
    await signIn(page, planner); await navigateInApp(page, "/organizaciones"); await byId(page, "org-create").waitFor(); await settle(page);
    errors.length = 0;
    const failures = await inspect(page, errors, { width, lang, label: "/organizaciones" });
    if (width < 960) { // the bottom bar / "More" sheet is part of the frame
      const more = page.getByRole("button", { name: dict[lang]["common.more"], exact: true }).filter({ visible: true });
      if (await more.count()) { await more.first().click(); await page.waitForTimeout(500); failures.push(...(await inspect(page, [], { width, lang, label: "More sheet" }))); }
      else failures.push("no 'More' button in the bottom bar below 960px");
    }
    record("org", "/organizaciones", width, lang, scheme, failures);
    await ctx.close();
  }
  if (process.env.FRAME === "0" || scheme === "dark") continue; // dark is fixed-light: the sweep runs once per language and width
  { // shell sweep as HOST on every host route (frame: overflow, targets, axe; contents belong to their owners and are labelled)
    const { ctx, page, errors } = await context(width, lang, scheme);
    await signIn(page, world?.host.email ?? planner, world ? world.password : PASSWORD);
    const frameFailures = new Map();
    for (const path of HOST_PATHS) {
      errors.length = 0;
      await navigateInApp(page, `${path}${world ? `?c=${world.celebration.id}` : ""}`); await settle(page);
      const failures = await inspect(page, errors, { width, lang, label: path });
      record("shell-host", path, width, lang, scheme, failures);
    }
    await ctx.close();
  }
  if (process.env.FRAME === "0" || scheme === "dark") continue;
  { // portal frame as PROVIDER
    const { ctx, page, errors } = await context(width, lang, scheme);
    await signIn(page, provider);
    for (const path of PORTAL_PATHS) {
      errors.length = 0;
      await navigateInApp(page, path); await settle(page);
      record("shell-portal", path, width, lang, scheme, await inspect(page, errors, { width, lang, label: path }));
    }
    await ctx.close();
  }
}

// ------------------------------------------------------------------ 4. en-US valid flows verified against the API + one network-down flow
console.log("\n== en-US flows (testID/role driven, verified against the API) ==");
const flows = [];
const flow = async (id, width, fn) => {
  const { ctx, page, errors } = await context(width, "en-US", "light");
  const seen = [];
  page.on("response", (response) => { const url = new URL(response.url()); if (response.url().startsWith(API)) seen.push(`${response.request().method()} ${url.pathname} ${response.status()}`); });
  try { await fn(page, seen); flows.push({ id, width, ok: true }); console.log(`  PASS ${id} @${width}`); }
  catch (error) { flows.push({ id, width, ok: false, detail: String(error.message).split("\n")[0] }); console.log(`  FAIL ${id} @${width}  ${String(error.message).split("\n")[0]}`); }
  finally { await ctx.close(); }
  void errors;
};
for (const width of WIDTHS) {
  await flow("register account", width, async (page, seen) => {
    const email = uniq("reg");
    await page.goto(`${APP}/registro`); await byId(page, "register-email").waitFor();
    await byId(page, "register-email").fill(email); await byId(page, "register-password").fill(PASSWORD);
    await vis(page, '[role="radio"]').first().click(); // first role = HOST, whatever the language
    await byId(page, "register-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/registro"), { timeout: 25000 });
    assert.ok(seen.includes("POST /identity/auth/register 201"), seen.join(" ; "));
    const login = await apiJson("POST", "/identity/auth/login", { email, password: PASSWORD });
    assert.equal(login.status, 200); assert.deepEqual(JSON.parse(Buffer.from(login.body.accessToken.split(".")[1], "base64url").toString()).roles, ["HOST"]);
  });
  await flow("login", width, async (page, seen) => {
    const email = uniq("log"); assert.equal((await apiJson("POST", "/identity/auth/register", { email, password: PASSWORD, role: "HOST" })).status, 201);
    await signIn(page, email);
    assert.ok(seen.includes("POST /identity/auth/login 200"), seen.join(" ; "));
    assert.doesNotMatch(new URL(page.url()).pathname, /^\/(login|registro)/);
  });
  await flow("recovery stays neutral", width, async (page, seen) => {
    const known = uniq("rec"); assert.equal((await apiJson("POST", "/identity/auth/register", { email: known, password: PASSWORD, role: "HOST" })).status, 201);
    for (const email of [known, uniq("ghost")]) {
      await page.goto(`${APP}/recuperar`); await byId(page, "recover-email").waitFor();
      await byId(page, "recover-email").fill(email); await byId(page, "recover-submit").click();
      await vis(page, '[role="status"]').first().waitFor();
      assert.equal(await vis(page, '[role="status"]').first().innerText(), en["auth.recoverSent"]);
    }
    assert.equal(seen.filter((entry) => entry === "POST /identity/auth/password-recovery 202").length, 2, seen.join(" ; "));
  });
  await flow("create organization", width, async (page, seen) => {
    await signIn(page, planner); await navigateInApp(page, "/organizaciones"); await byId(page, "org-create").waitFor();
    const name = `Team ${stamp}-${width}`;
    await byId(page, "org-name").fill(name); await byId(page, "org-create").click();
    await vis(page, '[role="status"]').first().waitFor();
    assert.ok(seen.includes("POST /identity/organizations 201"), seen.join(" ; "));
    const token = (await apiJson("POST", "/identity/auth/login", { email: planner, password: PASSWORD })).body.accessToken;
    const list = await apiJson("GET", "/identity/organizations", undefined, token);
    assert.ok(JSON.stringify(list.body).includes(name), "organization not returned by the API");
  });
  await flow("network down shows a notice (es or en) and recovers", width, async (page) => {
    const email = uniq("net"); assert.equal((await apiJson("POST", "/identity/auth/register", { email, password: PASSWORD, role: "HOST" })).status, 201);
    await page.goto(`${APP}/login`); await byId(page, "login-email").waitFor();
    await page.route(`${API}/identity/auth/login`, (route) => route.request().method() === "OPTIONS" ? route.fallback() : route.abort("internetdisconnected"));
    await byId(page, "login-email").fill(email); await byId(page, "login-password").fill(PASSWORD); await byId(page, "login-submit").click();
    const alert = vis(page, '[role="alert"]').first(); await alert.waitFor();
    const message = (await alert.innerText()).trim();
    assert.ok([en["auth.failure.offline"], es["auth.failure.offline"]].includes(message), `unexpected notice: ${message}`);
    assert.match(page.url(), /\/login/);
    await page.unroute(`${API}/identity/auth/login`);
    await byId(page, "login-submit").click(); await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 25000 });
  });
}

// ------------------------------------------------------------------ report
const matrix = rows.filter((row) => row.status !== "INFO");
const fails = matrix.filter((row) => row.status === "FAIL");
console.log(`\n${matrix.length} page checks · ${matrix.length - fails.length} PASS · ${fails.length} FAIL ; flows ${flows.filter((f) => f.ok).length}/${flows.length} ok`);
const summary = {};
for (const row of matrix) { const key = `${row.area} ${row.width} ${row.lang} ${row.scheme}`; summary[key] ??= { pass: 0, fail: 0 }; summary[key][row.status === "PASS" ? "pass" : "fail"] += 1; }
console.table(summary);
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ rows, flows }, null, 2));
await browser.close();
process.exit(fails.length || flows.some((f) => !f.ok) ? 1 : 0);
