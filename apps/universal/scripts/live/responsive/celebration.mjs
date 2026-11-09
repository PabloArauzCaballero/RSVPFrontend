// Responsive matrix for the host celebration area: route x width {360,768,1280} x language {es-BO,en-US} x scheme {light,dark}.
// Real Chrome, real login screen, real gateway. Per cell: (a) no pageerror/console.error, (b) no horizontal scroll, (c) no raw i18n
// keys / Spanish literals in en-US, (d) axe WCAG 2.1 A/AA without serious/critical, (e) touch targets >= 44 px high at 360,
// (f) whether the theme answers to the colour scheme. Then (g) en-US end-to-end flows driven by testID and verified with a GET.
//   WORLD=w.json APP=http://localhost:8200 API=http://localhost:28000 CHROMIUM_PATH=... node apps/universal/scripts/live/responsive/celebration.mjs
//   Optional: WIDTHS=360,768 LANGS=en-US SCHEMES=dark ROUTES=publicar,modos FLOWS=0|1 OUT=file.json
import { followsScheme, sampleSurface } from "./scheme.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8200";
const API = process.env.API ?? "http://localhost:28000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const C = world.celebration.id;
const WIDTHS = (process.env.WIDTHS ?? "360,768,1280").split(",").map(Number);
const LANGS = (process.env.LANGS ?? "es-BO,en-US").split(",");
const SCHEMES = (process.env.SCHEMES ?? "light,dark").split(",");
const ROUTE_FILTER = process.env.ROUTES?.split(",");
const stamp = Date.now().toString(36);

const ROUTES = [
  ["/celebraciones", false], ["/onboarding/1", false], [`/onboarding/listo?c=${C}`, true],
  ["/editor/general", true], ["/editor/anfitriones", true], ["/editor/lugares", true], ["/editor/historia", true],
  ["/editor/itinerario", true], ["/editor/secciones", true], ["/editor/galeria", true], ["/editor/traducciones", true],
  ["/preview", true], ["/publicar", true], ["/configuracion", true], ["/modos", true], ["/templates", true]
].filter(([route]) => !ROUTE_FILTER || ROUTE_FILTER.some((part) => route.includes(part)));

const LOGIN = { "es-BO": { email: /^(Correo electrónico|Correo)$/, password: "Contraseña", submit: /^(Iniciar sesión|Entrar)$/ }, "en-US": { email: "Email", password: "Password", submit: "Sign in" } };
const RAW_KEY = /\b(?:host|celebration|common|auth|errors|guests|gifts|admin|provider|portal|landing|ui)\.[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+)+\b/g;
const SPANISH = /\b(Guardar|Guardando|Cancelar|Cargando|Reintentar|Publicar|Despublicar|Siguiente|Atrás|Volver|Anfitriones|Configuración|Plantillas|Eliminar|Archivar|Continuar|Cerrar|Agregar|Añadir|Aceptar|Idioma|Fecha|Hora|Título|Subtítulo|Historia|Itinerario|Celebraciones|Vista previa|Traducciones|Galería|Lugares)\b/;
const KNOWN_NOISE = (url, status) => (status === 401 && /\/auth\/refresh/.test(url)) || ([502, 503].includes(status) && /\/(media|templates)\b/.test(url));

async function http(method, path, { token, body, version } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(version != null ? { "if-match": `"${version}"` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: response.status, json };
}
let cached = { at: 0, token: "" };
async function token() {
  if (Date.now() - cached.at > 6 * 60_000) cached = { at: Date.now(), token: (await http("POST", "/identity/auth/login", { body: { email: world.host.email, password: world.password } })).json.accessToken };
  return cached.token;
}
const get = async (id) => (await http("GET", `/celebrations/${id}`, { token: await token() })).json;
let seq = 0;
async function draft(extra = {}) {
  const slug = `rsp-${stamp}-${++seq}`;
  const created = await http("POST", "/celebrations", { token: await token(), body: { slug, eventTypeCode: "WEDDING", timeZone: "America/La_Paz", content: { title: `Boda ${slug}`, ...extra } } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  return created.json;
}
const completeContent = { eventDate: "2027-06-12T16:00", venueName: "Iglesia Central", hosts: { BRIDE: "Ana", GROOM: "Luis" } };

async function openSession(browser, width, locale, colorScheme) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale, colorScheme, extraHTTPHeaders: {} });
  context.setDefaultTimeout(25000);
  const page = await context.newPage();
  const state = { errors: [], badResponses: [] };
  page.on("pageerror", (error) => state.errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|net::ERR/.test(message.text())) state.errors.push(`console: ${message.text().slice(0, 200)}`); });
  page.on("response", (response) => { if (response.status() >= 400 && response.url().startsWith(API) && !KNOWN_NOISE(response.url(), response.status())) state.badResponses.push(`${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`); });
  await page.goto(`${APP}/login`);
  const labels = LOGIN[locale];
  await page.getByLabel(labels.email, typeof labels.email === "string" ? { exact: true } : {}).filter({ visible: true }).fill(world.host.email);
  await page.getByLabel(labels.password, { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: labels.submit }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
  return { page, context, state };
}

const withC = (route, needsC) => (needsC && !route.includes("?c=") ? `${route}?c=${C}` : route);
const settle = (page) => page.waitForLoadState("networkidle").catch(() => undefined);

/** Touch targets: interactive, visible, non-inline elements that are shorter than 44 px. */
const SMALL_TARGETS = () => {
  const selector = "button, [role=button], [role=radio], [role=checkbox], [role=tab], [role=switch], [role=link], a[href], input:not([type=hidden]), textarea, select";
  const out = [];
  for (const el of document.querySelectorAll(selector)) {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || style.display === "inline") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || el.closest("[aria-hidden=true]")) continue;
    if (rect.height < 43.5) out.push(`${el.getAttribute("data-testid") || el.getAttribute("aria-label") || (el.textContent || "").trim().slice(0, 30) || el.tagName}:${Math.round(rect.height)}`);
  }
  return out;
};

const results = [];
function record(cell, name, ok, evidence = "") {
  results.push({ ...cell, check: name, status: ok ? "PASS" : "FAIL", evidence });
  if (!ok) console.log(`  FAIL ${cell.width} ${cell.lang} ${cell.scheme} ${cell.route} ${name} | ${evidence}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const themeProbe = {};
for (const width of WIDTHS) for (const lang of LANGS) for (const scheme of SCHEMES) {
  const { page, context, state } = await openSession(browser, width, lang, scheme);
  console.log(`== ${width} ${lang} ${scheme}`);
  for (const [route, needsC] of ROUTES) {
    const cell = { width, lang, scheme, route };
    const before = state.errors.length, beforeBad = state.badResponses.length;
    await page.goto(`${APP}${withC(route, needsC)}`);
    await settle(page);
    await page.waitForTimeout(600);
    const body = await page.evaluate(() => document.body.innerText);
    // (a)
    const errors = [...state.errors.slice(before), ...state.badResponses.slice(beforeBad)];
    record(cell, "a-no-errors", errors.length === 0 && body.trim().length > 40, errors.join(" ; ") || (body.trim().length > 40 ? "" : "blank"));
    // (b)
    const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    record(cell, "b-no-hscroll", overflow.sw <= overflow.iw + 1, `${overflow.sw}>${overflow.iw}`);
    // (c)
    const raw = body.match(RAW_KEY) ?? [];
    const spanish = lang === "en-US" ? body.match(SPANISH) : null;
    record(cell, "c-i18n", raw.length === 0 && !spanish, `${raw.slice(0, 3).join(",")}${spanish ? ` es:${spanish[0]}` : ""}`);
    // (d)
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    record(cell, "d-axe", bad.length === 0, bad.map((v) => `${v.id}(${v.nodes.length}):${v.nodes[0]?.target?.join(" ").slice(0, 60)}`).join(" ; "));
    // (e)
    if (width === 360) { const small = await page.evaluate(SMALL_TARGETS); record(cell, "e-touch-44", small.length === 0, small.slice(0, 5).join(", ")); }
    // (f)
    { const surface = await sampleSurface(page); const verdict = followsScheme(scheme, surface); record(cell, "f-theme", verdict.ok, verdict.evidence); if (route === "/modos") themeProbe[`${lang}|${scheme}|${width}`] = verdict.evidence; }
  }
  await context.close();
}

// ---------------------------------------------------------------- (g) en-US flows by testID, verified with GET
if (process.env.FLOWS !== "0") for (const width of WIDTHS) {
  const { page, context, state } = await openSession(browser, width, "en-US", "light");
  const cell = { width, lang: "en-US", scheme: "light", route: "flow" };
  console.log(`== flows ${width}`);
  const flow = async (name, fn) => { try { const evidence = await fn(); record({ ...cell, route: name }, "g-flow", true, evidence ?? ""); } catch (error) { record({ ...cell, route: name }, "g-flow", false, String(error.message ?? error).split("\n")[0].slice(0, 300)); await page.screenshot({ path: `${process.env.SHOTS ?? "."}/flow-${name}-${width}.png` }).catch(() => undefined); } };
  const tid = (id) => page.getByTestId(id).filter({ visible: true }).first();

  await flow("valid-onboarding", async () => {
    const title = `Wedding ${stamp}-${width}`;
    await page.goto(`${APP}/onboarding/1`); await settle(page);
    await page.getByRole("radio").filter({ visible: true }).first().click();
    await tid("onboarding-next").click();
    await tid("onboarding-next").click();
    await tid("onboarding-title").fill(title);
    await tid("onboarding-create").click();
    await page.waitForURL(/\/onboarding\/listo\?c=/);
    const id = new URL(page.url()).searchParams.get("c");
    const created = await get(id);
    assert.equal(created.content.title, title);
    assert.equal(created.status, "DRAFT");
    await tid("onboarding-finish").click();
    await page.waitForURL(/\/editor\/general\?c=/);
    return `GET ${id} title=${created.content.title}`;
  });
  await flow("valid-general-content", async () => {
    const c = await draft();
    const title = `Edited ${stamp}-${width}`;
    await page.goto(`${APP}/editor/general?c=${c.id}`); await settle(page);
    await tid("field-title").fill(title);
    await tid("save-content").click();
    await page.waitForFunction(() => true);
    for (let i = 0; i < 30 && (await get(c.id)).content.title !== title; i++) await page.waitForTimeout(300);
    const saved = await get(c.id);
    assert.equal(saved.content.title, title);
    return `GET content.title=${saved.content.title} v${saved.version}`;
  });
  await flow("valid-publish-unpublish", async () => {
    const c = await draft(completeContent);
    await page.goto(`${APP}/publicar?c=${c.id}`); await settle(page);
    await tid("publish").waitFor();
    for (let i = 0; i < 20 && (await tid("publish").isDisabled().catch(() => true)); i++) await page.waitForTimeout(300);
    await tid("publish").click();
    await page.locator("[role=alert] button").filter({ visible: true }).first().click();
    for (let i = 0; i < 30 && (await get(c.id)).status !== "PUBLISHED"; i++) await page.waitForTimeout(300);
    assert.equal((await get(c.id)).status, "PUBLISHED");
    await tid("more-publish").click();
    await tid("unpublish").click();
    await page.locator("[role=alert] button").filter({ visible: true }).first().click();
    for (let i = 0; i < 30 && (await get(c.id)).status !== "DRAFT"; i++) await page.waitForTimeout(300);
    assert.equal((await get(c.id)).status, "DRAFT");
    return "GET status PUBLISHED then DRAFT";
  });
  await flow("error-network-down", async () => {
    const handler = (route) => route.abort("connectionrefused");
    await page.route("**/celebrations?limit=100", handler);
    try {
      await page.goto(`${APP}/celebraciones`); await settle(page);
      await page.getByText(/Cannot reach|can.?t reach|could not|No hay conexión|No se pudo/i).filter({ visible: true }).first().waitFor();
      assert.ok(await tid("retry-list").isVisible(), "retry button missing");
    } finally { await page.unroute("**/celebrations?limit=100", handler); }
    await tid("retry-list").click();
    await page.getByRole("link").filter({ visible: true }).first().waitFor();
    return "notice + retry, recovers";
  });
  await context.close();
}
await browser.close();

console.log("\nTheme probe (/modos body|html background):", JSON.stringify(themeProbe, null, 1));
const fails = results.filter((r) => r.status === "FAIL");
const bucket = {};
for (const r of results) { const k = `${r.width}|${r.lang}|${r.scheme}`; (bucket[k] ??= { pass: 0, fail: 0 })[r.status === "PASS" ? "pass" : "fail"]++; }
console.log("\nSummary per (width|lang|scheme):", JSON.stringify(bucket));
console.log(`${results.length} checks, ${fails.length} FAIL`);
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ results, themeProbe }, null, 2));
process.exit(fails.length ? 1 : 0);
