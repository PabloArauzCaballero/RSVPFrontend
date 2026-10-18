// Lane B browser audit of the public site, against a running seo-web (next start) and real API:
//   screenshots at 360/768/1280, axe (no critical/serious violations), keyboard focus, Lighthouse SEO ≥ 95.
// Usage: BASE=http://localhost:3317 API=http://localhost:8000 node apps/seo-web/scripts/audit.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import lighthouse from "lighthouse";

const BASE = process.env.BASE ?? "http://localhost:3317";
const API = process.env.API ?? "http://localhost:8000";
const evidence = fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url));
const WIDTHS = [360, 768, 1280];
const SEO_MINIMUM = 0.95;
const DEBUG_PORT = 9333;

const slugs = (await (await fetch(`${API}/celebrations/public?limit=100`)).json()).items.map((item) => item.slug);
const slug = process.env.SLUG ?? slugs.find((candidate) => candidate.startsWith("boda-live")) ?? slugs[0];
if (!slug) throw new Error("No published celebration to audit; run RSVPBackend e2e/gateway/leo-live.mjs first");

const routes = [
  { lane: "lane-F08", name: "home", path: "/", indexable: true },
  { lane: "lane-F10", name: "A1-portada", path: `/c/${slug}`, indexable: true },
  { lane: "lane-F10", name: "A1-portada-en", path: `/c/${slug}?lang=en-US`, indexable: false },
  { lane: "lane-F10", name: "A3-itinerario", path: `/c/${slug}/itinerario`, indexable: true, optional: true },
  { lane: "lane-F10", name: "A4-lugares", path: `/c/${slug}/lugares`, indexable: true },
  { lane: "lane-F10", name: "A5-galeria", path: `/c/${slug}/galeria`, indexable: true },
  { lane: "lane-F10", name: "A21-no-publicada", path: "/c/esta-celebracion-no-existe", indexable: false, expected: 404 },
  { lane: "lane-F24", name: "B1-directorio", path: "/proveedores", indexable: true },
  { lane: "lane-F24", name: "B2-categoria", path: "/proveedores/salones", indexable: true },
  { lane: "lane-F24", name: "B3-categoria-ciudad", path: "/proveedores/salones/santa-cruz", indexable: true },
  { lane: "lane-F24", name: "B4-buscar", path: "/proveedores/buscar?ciudad=la-paz&verificado=1", indexable: false }
];

const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
const report = { base: BASE, slug, at: new Date().toISOString(), routes: [] };
let failures = 0;

for (const route of routes) {
  const entry = { ...route, status: null, axe: {}, screenshots: [], keyboard: null, lighthouse: null };
  mkdirSync(join(evidence, route.lane), { recursive: true });
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-BO", timezoneId: "Europe/Madrid" });
    const page = await context.newPage();
    const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    entry.status = response?.status() ?? null;
    if (route.optional && entry.status === 404) { await context.close(); entry.skipped = "section has no content in this celebration"; break; }
    if (entry.status !== (route.expected ?? 200)) { failures += 1; console.error(`✖ ${route.path} → ${entry.status}`); }
    const file = `${route.name}-${width}.png`;
    await page.screenshot({ path: join(evidence, route.lane, file), fullPage: true });
    entry.screenshots.push(`${route.lane}/${file}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) { failures += 1; console.error(`✖ ${route.path} @${width}: horizontal scroll`); }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const blocking = axe.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    entry.axe[width] = axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }));
    if (blocking.length) { failures += 1; console.error(`✖ ${route.path} @${width}: axe ${blocking.map((violation) => violation.id).join(", ")}`); }
    if (width === WIDTHS[0]) {
      await page.keyboard.press("Tab");
      entry.keyboard = await page.evaluate(() => { const element = document.activeElement; return element && element !== document.body ? `${element.tagName.toLowerCase()}:${(element.textContent ?? "").trim().slice(0, 40)}` : null; });
      if (!entry.keyboard) { failures += 1; console.error(`✖ ${route.path}: nothing focusable with Tab`); }
    }
    await context.close();
  }
  if (route.indexable && !entry.skipped) {
    const result = await lighthouse(`${BASE}${route.path}`, { port: DEBUG_PORT, onlyCategories: ["seo", "accessibility"], output: "json", logLevel: "error", formFactor: "mobile", screenEmulation: { mobile: true, width: 360, height: 800, deviceScaleFactor: 2 } });
    const categories = result?.lhr.categories ?? {};
    entry.lighthouse = { seo: categories.seo?.score ?? null, accessibility: categories.accessibility?.score ?? null, failedSeoAudits: Object.values(result?.lhr.audits ?? {}).filter((audit) => audit.score === 0 && result.lhr.categories.seo.auditRefs.some((ref) => ref.id === audit.id)).map((audit) => audit.id) };
    if ((entry.lighthouse.seo ?? 0) < SEO_MINIMUM) { failures += 1; console.error(`✖ ${route.path}: Lighthouse SEO ${entry.lighthouse.seo}`, entry.lighthouse.failedSeoAudits); }
  }
  report.routes.push(entry);
  console.log(`✔ ${route.name} ${entry.status}${entry.lighthouse ? ` · SEO ${Math.round(entry.lighthouse.seo * 100)} · a11y ${Math.round(entry.lighthouse.accessibility * 100)}` : ""}${entry.skipped ? ` (skipped: ${entry.skipped})` : ""}`);
}

await browser.close();
writeFileSync(join(evidence, "lane-F08", "audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(failures ? `\n${failures} problem(s)` : "\nAudit passed");
process.exit(failures ? 1 : 0);
