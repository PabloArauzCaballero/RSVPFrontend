// Browser audit of the public site against a running seo-web (next start):
//   screenshots at 360/768/1280 (A1-A8 + A21, directory B1-B4, partner microsite), axe (no critical/serious),
//   keyboard focus, geolocation + redirector checks, Lighthouse (performance/a11y/best-practices/SEO) saved as JSON.
// Usage:
//   live:    BASE=http://localhost:3317 API=http://localhost:28000 node apps/seo-web/scripts/audit.mjs
//   fixture: MODE=fixture BASE=http://localhost:3318 API=http://localhost:28100 node apps/seo-web/scripts/audit.mjs
//            (API started with scripts/fixture-api.mjs; evidence files are suffixed "-fixture" and prove rendering only)
// CHROMIUM_PATH selects the browser binary.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import lighthouse from "lighthouse";

const MODE = process.env.MODE ?? "live";
const FIXTURE = MODE === "fixture";
const BASE = process.env.BASE ?? "http://localhost:3317";
const API = process.env.API ?? "http://localhost:28000";
const evidence = fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url));
const WIDTHS = [360, 768, 1280];
const SEO_MINIMUM = 0.95;
const DEBUG_PORT = 9333;
const SUFFIX = FIXTURE ? "-fixture" : "";
const CHROMIUM_PATH = process.env.CHROMIUM_PATH;
const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";

const slugs = (await (await fetch(`${API}/celebrations/public?limit=100`)).json()).items.map((item) => item.slug);
const slug = process.env.SLUG ?? (FIXTURE ? slugs[0] : slugs.find((candidate) => candidate.startsWith("boda-live")) ?? slugs[0]);
if (!slug) throw new Error("No published celebration to audit");

// `optional`: the section has no content in this celebration, so a 404 is the correct answer, not a failure.
const routes = [
  { lane: "lane-F08", name: "home", path: "/", indexable: true },
  { lane: "lane-F10", name: "A1-portada", path: `/c/${slug}`, indexable: true },
  { lane: "lane-F10", name: "A1-portada-en", path: `/c/${slug}?lang=en-US`, indexable: false },
  { lane: "lane-F10", name: "A2-historia", path: `/c/${slug}/historia`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A3-itinerario", path: `/c/${slug}/itinerario`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A4-lugares", path: `/c/${slug}/lugares`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A5-galeria", path: `/c/${slug}/galeria`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A6-dress-code", path: `/c/${slug}/dress-code`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A7-faq", path: `/c/${slug}/faq`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A8-recomendaciones", path: `/c/${slug}/recomendaciones`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A21-no-publicada", path: "/c/esta-celebracion-no-existe", indexable: false, expected: 404 },
  { lane: "lane-F24", name: "B1-directorio", path: "/proveedores", indexable: true },
  { lane: "lane-F24", name: "B2-categoria", path: "/proveedores/salones", indexable: true },
  { lane: "lane-F24", name: "B3-categoria-ciudad", path: "/proveedores/salones/santa-cruz", indexable: true },
  { lane: "lane-F24", name: "B4-buscar", path: "/proveedores/buscar?ciudad=la-paz&verificado=1", indexable: false },
  { lane: "lane-F24", name: "B4-buscar-cerca", path: "/proveedores/buscar?lat=-16.5&lng=-68.15&radio=10", indexable: false },
  { lane: "lane-F25", name: "B5-microsite", path: "/p/hotel-andino", indexable: FIXTURE, expected: FIXTURE ? 200 : 200 },
  { lane: "lane-F25", name: "B14-partner-no-existe", path: "/p/no-existe", indexable: false, expected: FIXTURE ? 404 : 200 }
];

const launchOptions = { args: [`--remote-debugging-port=${DEBUG_PORT}`], ...(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {}) };
const browser = await chromium.launch(launchOptions);
const report = { mode: MODE, base: BASE, api: API, slug, at: new Date().toISOString(), routes: [], checks: {} };
let failures = 0;
const fail = (message) => { failures += 1; console.error(`✖ ${message}`); };

for (const route of routes) {
  const entry = { ...route, status: null, axe: {}, screenshots: [], keyboard: null, lighthouse: null };
  mkdirSync(join(evidence, route.lane), { recursive: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-BO", timezoneId: "America/La_Paz" });
    const page = await context.newPage();
    const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    entry.status = response?.status() ?? null;
    if (route.optional && entry.status === 404) { await context.close(); entry.skipped = "section has no content in this celebration (correct 404)"; break; }
    if (entry.status !== (route.expected ?? 200)) fail(`${route.path} → ${entry.status}`);
    const file = `${route.name}${SUFFIX}-${width}.png`;
    await page.screenshot({ path: join(evidence, route.lane, file), fullPage: true });
    entry.screenshots.push(`${route.lane}/${file}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) fail(`${route.path} @${width}: horizontal scroll`);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const blocking = axe.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    entry.axe[width] = axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
    if (blocking.length) fail(`${route.path} @${width}: axe ${blocking.map((violation) => violation.id).join(", ")}`);
    if (width === WIDTHS[0]) {
      await page.keyboard.press("Tab");
      entry.keyboard = await page.evaluate(() => { const element = document.activeElement; return element && element !== document.body ? `${element.tagName.toLowerCase()}:${(element.textContent ?? "").trim().slice(0, 40)}` : null; });
      if (!entry.keyboard) fail(`${route.path}: nothing focusable with Tab`);
    }
    await context.close();
  }
  if (!entry.skipped && entry.status === 200) {
    const result = await lighthouse(`${BASE}${route.path}`, { port: DEBUG_PORT, onlyCategories: ["performance", "accessibility", "best-practices", "seo"], output: "json", logLevel: "error", formFactor: "mobile", screenEmulation: { mobile: true, width: 360, height: 800, deviceScaleFactor: 2 } });
    const lhr = result?.lhr;
    const scores = Object.fromEntries(Object.entries(lhr?.categories ?? {}).map(([id, category]) => [id, category.score]));
    const failedAudits = (id) => lhr.categories[id].auditRefs.map((ref) => lhr.audits[ref.id]).filter((audit) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "informative" && audit.scoreDisplayMode !== "notApplicable").map((audit) => ({ id: audit.id, score: audit.score, title: audit.title }));
    const metrics = Object.fromEntries(["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"].map((id) => [id, lhr.audits[id]?.numericValue ?? null]));
    entry.lighthouse = { seo: scores.seo ?? null, accessibility: scores.accessibility ?? null, performance: scores.performance ?? null, bestPractices: scores["best-practices"] ?? null };
    const dir = route.lane === "lane-F25" ? "lane-F24" : route.lane;
    const out = `lighthouse-${route.name}${SUFFIX}.json`;
    writeFileSync(join(evidence, dir, out), `${JSON.stringify({ tool: `lighthouse ${lhr.lighthouseVersion}`, mode: MODE, url: lhr.finalDisplayedUrl, route: route.path, fetchTime: lhr.fetchTime, formFactor: "mobile (360x800, simulated throttling)", userAgent: lhr.environment?.hostUserAgent, scores, metrics, failedAudits: Object.fromEntries(Object.keys(lhr.categories).map((id) => [id, failedAudits(id)])), note: FIXTURE ? "Fixture API (scripts/fixture-api.mjs); local next start, not CI." : "Live gateway on :28000; local next start, not CI." }, null, 2)}\n`);
    entry.lighthouseFile = `${dir}/${out}`;
    if (route.indexable && (entry.lighthouse.seo ?? 0) < SEO_MINIMUM) fail(`${route.path}: Lighthouse SEO ${entry.lighthouse.seo}`);
  }
  report.routes.push(entry);
  const pct = (value) => (value === null || value === undefined ? "–" : Math.round(value * 100));
  console.log(`✔ ${route.name} ${entry.status}${entry.lighthouse ? ` · perf ${pct(entry.lighthouse.performance)} a11y ${pct(entry.lighthouse.accessibility)} bp ${pct(entry.lighthouse.bestPractices)} seo ${pct(entry.lighthouse.seo)}` : ""}${entry.skipped ? ` (skipped: ${entry.skipped})` : ""}`);
}

// F24 REQ-04: "use my location" with the permission granted and denied; the city select stays the fallback.
{
  const granted = await browser.newContext({ viewport: { width: 360, height: 900 }, locale: "es-BO", permissions: ["geolocation"], geolocation: { latitude: -16.4897, longitude: -68.1193 } });
  const page = await granted.newPage();
  await page.goto(`${BASE}/proveedores/buscar?categoria=&ciudad=santa-cruz`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await page.waitForURL(/lat=-16\.49/, { timeout: 10_000 });
  const url = new URL(page.url());
  report.checks.geolocationGranted = { url: page.url(), lat: url.searchParams.get("lat"), lng: url.searchParams.get("lng"), radio: url.searchParams.get("radio"), activeNotice: await page.locator(".directory-nearme-active").textContent().catch(() => null), results: await page.locator(".directory-results li").count() };
  if (url.searchParams.get("lat") !== "-16.49" || !report.checks.geolocationGranted.activeNotice) fail("geolocation granted: URL/notice missing");
  await page.screenshot({ path: join(evidence, "lane-F24", `B4-geolocalizacion-concedida${SUFFIX}-360.png`), fullPage: true });
  await granted.close();

  const denied = await browser.newContext({ viewport: { width: 360, height: 900 }, locale: "es-BO", permissions: [] });
  await denied.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_ok, error) => error({ code: 1, message: "denied" }); });
  const deniedPage = await denied.newPage();
  await deniedPage.goto(`${BASE}/proveedores/buscar?ciudad=la-paz`, { waitUntil: "networkidle" });
  await deniedPage.getByRole("button", { name: "Usar mi ubicación" }).click();
  await deniedPage.getByText("No pudimos obtener tu ubicación").waitFor({ timeout: 5_000 });
  report.checks.geolocationDenied = { url: deniedPage.url(), message: await deniedPage.locator(".directory-nearme-status").textContent(), cityStillSelected: await deniedPage.locator('select[name="ciudad"]').inputValue() };
  if (!deniedPage.url().includes("ciudad=la-paz") || report.checks.geolocationDenied.cityStillSelected !== "la-paz") fail("geolocation denied: city fallback lost");
  await deniedPage.screenshot({ path: join(evidence, "lane-F24", `B4-geolocalizacion-denegada${SUFFIX}-360.png`), fullPage: true });
  await denied.close();
}

// F27: the redirector answers 302 (not followed) with the listing, or a clear error page when the catalogue is down.
{
  const cid = "11111111-2222-4333-8444-555555555555";
  const response = await fetch(`${BASE}/r/${LISTING}?destination=WHATSAPP&utm_campaign=boda-ana&surface=SEARCH`, { redirect: "manual", headers: { "x-correlation-id": cid } });
  const location = response.headers.get("location");
  report.checks.redirector = { status: response.status, location, correlationId: response.headers.get("x-correlation-id"), robots: response.headers.get("x-robots-tag"), cacheControl: response.headers.get("cache-control") };
  if (FIXTURE) {
    const final = location ? new URL(location) : null;
    if (response.status !== 302 || final?.searchParams.get("utm_campaign") !== "boda-ana" || final?.searchParams.get("correlationId") !== cid) fail(`redirector: ${response.status} ${location}`);
  } else {
    report.checks.redirector.body = (await response.text()).includes("No pudimos abrir el enlace") ? "error page with link back (catalogue not reachable behind the gateway)" : "unexpected";
    if (response.status === 301) fail("redirector answered 301");
  }
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  report.checks.sitemap = { partners: [...sitemap.matchAll(/<loc>[^<]*\/p\/([^<]+)<\/loc>/g)].map((match) => match[1]), hasRedirector: sitemap.includes("/r/"), hasSearch: sitemap.includes("/buscar") };
  report.checks.robots = { disallowsRedirector: /Disallow: \/r\//.test(robots), text: robots };
  if (report.checks.sitemap.hasRedirector || report.checks.sitemap.hasSearch || !report.checks.robots.disallowsRedirector) fail("sitemap/robots rules");
}

await browser.close();
writeFileSync(join(evidence, "lane-F08", `audit-${MODE}.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(failures ? `\n${failures} problem(s)` : "\nAudit passed");
process.exit(failures ? 1 : 0);
