// Responsive + i18n + scheme matrix for seo-web (next start) against the REAL gateway, with a real Chrome.
//   Seed once: API_URL=http://localhost:28000 node apps/seo-web/scripts/live-world.mjs > world.json
//   WORLD=world.json SITE=http://localhost:3000 API=http://localhost:28000 CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node apps/seo-web/scripts/live-responsive.mjs
// Optional: WIDTHS=360,768,1280  LANGS=es-BO,en-US  SCHEMES=light,dark  ONLY_FLOWS=1  OUT=file.json
// Per route x width x language x scheme: (a) no pageerror/console.error, (b) no horizontal scroll, (c) no raw i18n key or
// other-language string, (d) axe WCAG 2.1 A/AA without serious/critical, (e) controls >= 44 px at 360, (f) the dark scheme
// really changes the page (measured against light). The language comes from the browser (Accept-Language), like a visitor's.
// Then, in en-US, a valid quote flow verified through the provider's leads, plus a dead-network flow.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { axeSeriousOrCritical, en, es, horizontalScroll, i18nLeaks, smallTargets, watchErrors } from "../../universal/scripts/live/responsive/probe.mjs";

const API = process.env.API ?? "http://localhost:28000";
const SITE = process.env.SITE ?? "http://localhost:3000";
const WIDTHS = (process.env.WIDTHS ?? "360,768,1280").split(",").map(Number);
const LANGS = (process.env.LANGS ?? "es-BO,en-US").split(",");
const SCHEMES = (process.env.SCHEMES ?? "light,dark").split(",");
const world = JSON.parse(readFileSync(process.env.WORLD ?? new URL("./world.json", import.meta.url), "utf8"));
const slug = world.provider.slug; const listing = world.listings[0]; const cslug = world.celebration.slug; const token = world.guest.issued.token;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const rows = [];
const cors = { "access-control-allow-origin": SITE, "access-control-allow-credentials": "true", "access-control-expose-headers": "x-correlation-id,retry-after" };

// own: celebration/RSVP pages render in the celebration's content language (it ships es-BO only), so those pages only check for raw keys (chrome follows the visitor, content follows the celebration).
// notFound: the route must answer 404 with a way back. devOnly: the component catalog is an internal Spanish-only showcase.
const ROUTES = [
  { path: "/" }, { path: "/proveedores" }, { path: "/proveedores/catering" }, { path: "/proveedores/catering/la-paz" }, { path: "/proveedores/buscar?categoria=catering" },
  { path: "/catalogo", devOnly: true },
  { path: `/p/${slug}` }, { path: `/p/${slug}/cotizar?l=${listing.id}` }, { path: `/p/${slug}/catalogo` }, { path: `/p/${slug}/agenda` },
  { path: `/c/${cslug}`, own: true }, { path: `/c/${cslug}/rsvp`, own: true }, { path: `/c/${cslug}/regalos#t=${token}`, own: true }, { path: `/rsvp/${token}`, own: true },
  { path: "/ruta-que-no-existe", notFound: true }, { path: "/p/no-existe-xyz", notFound: true }
];

async function context(width, lang, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: lang, colorScheme: scheme, timezoneId: "America/La_Paz", extraHTTPHeaders: { "accept-language": `${lang},${lang.slice(0, 2)};q=0.9` } });
  ctx.setDefaultTimeout(20000);
  const page = await ctx.newPage();
  // 404 pages and the unknown provider legitimately answer 404 for the document itself: only script/console faults count.
  const state = { notFoundUrl: null };
  return { ctx, page, state, errors: watchErrors(page, { expectNotFoundFor: () => state.notFoundUrl }) };
}
async function settle(page) { await page.waitForLoadState("networkidle").catch(() => undefined); await page.waitForTimeout(500); }
const paint = (page) => page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, text: getComputedStyle(document.body).color, htmlLang: document.documentElement.lang }));

async function inspect(page, errors, { width, lang, own = false, devOnly = false }) {
  const out = [];
  if (errors.length) out.push(`console/pageerror: ${errors.slice(0, 2).join(" | ")}`);
  const scroll = await horizontalScroll(page);
  if (scroll.overflow) out.push(`horizontal scroll ${scroll.scrollWidth}>${scroll.innerWidth} ${scroll.wide.join(",")}`);
  const leaks = devOnly ? [] : await i18nLeaks(page, own ? null : lang);
  if (leaks.length) out.push(`i18n: ${leaks.slice(0, 3).join(" | ")}`);
  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  if (!htmlLang.toLowerCase().startsWith(lang.slice(0, 2))) out.push(`<html lang="${htmlLang}"> does not match ${lang}`);
  const axe = await axeSeriousOrCritical(page);
  if (axe.length) out.push(`axe: ${axe.slice(0, 3).join(" | ")}`);
  if (width === 360) { const small = await smallTargets(page); if (small.length) out.push(`touch<44: ${small.slice(0, 4).join(", ")}`); }
  return out;
}
function record(route, width, lang, scheme, failures) {
  const status = failures.length ? "FAIL" : "PASS";
  rows.push({ route, width, lang, scheme, status, failures });
  console.log(`  ${status} ${route} ${width} ${lang} ${scheme}${failures.length ? `\n      ${failures.join("\n      ")}` : ""}`);
}

console.log("\n== seo-web pages ==");
const lightPaint = new Map();
for (const scheme of SCHEMES) for (const lang of LANGS) for (const width of WIDTHS) {
  const { ctx, page, errors, state } = await context(width, lang, scheme);
  for (const { path: route, own, notFound, devOnly } of process.env.ONLY_FLOWS ? [] : ROUTES) {
    errors.length = 0;
    state.notFoundUrl = notFound ? `${SITE}${route}` : null;
    const response = await page.goto(`${SITE}${route}`); await settle(page);
    const failures = await inspect(page, errors, { width, lang, own, devOnly });
    if (notFound && response?.status() !== 404) failures.push(`expected HTTP 404, got ${response?.status()}`);
    if (notFound && (await page.locator("a[href]").filter({ visible: true }).count()) < 1) failures.push("404 without a way back");
    const key = `${route}|${width}|${lang}`;
    const painted = await paint(page);
    if (scheme === "light") lightPaint.set(key, painted);
    else if (lightPaint.has(key) && lightPaint.get(key).body === painted.body && lightPaint.get(key).text === painted.text) failures.push(`dark scheme paints exactly like light (body ${painted.body}, text ${painted.text})`);
    record(route, width, lang, scheme, failures);
  }
  await ctx.close();
}

console.log("\n== en-US flows ==");
const flows = [];
const flow = async (id, width, fn) => {
  const { ctx, page } = await context(width, "en-US", "light");
  const calls = []; const faults = [];
  await ctx.route(`${API}/**`, async (route) => {
    const request = route.request(); if (request.method() === "OPTIONS") return route.fallback();
    calls.push(`${request.method()} ${new URL(request.url()).pathname}`);
    const fault = faults.shift(); if (fault) return fault === "abort" ? route.abort("internetdisconnected") : route.fulfill({ status: fault, headers: { ...cors, "content-type": "application/problem+json" }, body: JSON.stringify({ status: fault, title: "injected" }) });
    return route.fallback();
  });
  try { await fn(page, { calls, faults }); flows.push({ id, width, ok: true }); console.log(`  PASS ${id} @${width}`); }
  catch (error) { flows.push({ id, width, ok: false, detail: String(error.message).split("\n")[0] }); console.log(`  FAIL ${id} @${width}  ${String(error.message).split("\n")[0]}`); }
  finally { await ctx.close(); }
};
const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const quoteUrl = `${SITE}/p/${slug}/cotizar?l=${listing.id}`;
const login = async (email) => (await (await fetch(`${API}/identity/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: world.password }) })).json()).accessToken;
async function fillQuote(page, email) {
  const values = { eventDate: futureDate(30), guestCount: "80", budget: "5000", name: "Ana Test", email, phone: "+59170000000" };
  await page.locator("#eventCity").selectOption("la-paz");
  for (const [id, value] of Object.entries(values)) await page.locator(`#${id}`).fill(value);
}
for (const width of WIDTHS) {
  await flow("quote request (valid)", width, async (page) => {
    const viewer = await login(world.viewer.email);
    await page.goto(quoteUrl); await page.evaluate((value) => sessionStorage.setItem("rsvp.visitor.token", value), viewer);
    await page.goto(quoteUrl); await page.locator("#eventDate").waitFor(); await page.waitForTimeout(500);
    const city = `la-paz`;
    await fillQuote(page, `en.${Date.now().toString(36)}@example.com`);
    const before = (await (await fetch(`${API}/providers/${world.provider.id}/leads`, { headers: { authorization: `Bearer ${await login(world.provider.email)}` } })).json()).items.filter((lead) => lead.destination === "QUOTE_FORM").length;
    await page.locator("form button[type=submit], form [type=submit]").first().click();
    await page.getByTestId("quote-sent").waitFor({ timeout: 15000 });
    assert.match(await page.getByTestId("quote-sent").innerText(), /[0-9a-f]{8}/);
    const leads = (await (await fetch(`${API}/providers/${world.provider.id}/leads`, { headers: { authorization: `Bearer ${await login(world.provider.email)}` } })).json()).items.filter((lead) => lead.destination === "QUOTE_FORM");
    assert.equal(leads.length, before + 1, "the provider sees exactly one new QUOTE_FORM lead");
    assert.ok(leads.some((lead) => lead.context?.city === city));
  });
  await flow("quote request (network down)", width, async (page, { faults }) => {
    const viewer = await login(world.viewer.email);
    await page.goto(quoteUrl); await page.evaluate((value) => sessionStorage.setItem("rsvp.visitor.token", value), viewer);
    await page.goto(quoteUrl); await page.locator("#eventDate").waitFor(); await page.waitForTimeout(500);
    await fillQuote(page, `net.${Date.now().toString(36)}@example.com`);
    faults.push("abort");
    await page.locator("form button[type=submit], form [type=submit]").first().click();
    // Next's route announcer is an empty role=alert: only an alert that carries words counts as the form's notice.
    const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)').filter({ hasText: /\S{3,}/ }).filter({ visible: true }).first(); await alert.waitFor();
    assert.ok((await alert.innerText()).trim().length > 8);
    assert.equal(await page.locator("#name").inputValue(), "Ana Test", "the form keeps what the person typed");
  });
}

const matrix = rows; const fails = matrix.filter((row) => row.status === "FAIL");
console.log(`\n${matrix.length} page checks · ${matrix.length - fails.length} PASS · ${fails.length} FAIL ; flows ${flows.filter((f) => f.ok).length}/${flows.length} ok`);
const summary = {};
for (const row of matrix) { const key = `${row.width} ${row.lang} ${row.scheme}`; summary[key] ??= { pass: 0, fail: 0 }; summary[key][row.status === "PASS" ? "pass" : "fail"] += 1; }
console.table(summary);
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ rows, flows }, null, 2));
await browser.close();
process.exit(fails.length || flows.some((f) => !f.ok) ? 1 : 0);
void es; void en;
