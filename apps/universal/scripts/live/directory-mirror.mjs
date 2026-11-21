// Espejo web · the provider directory in the app (/proveedores, /buscar, /{categoria}, /{categoria}/{ciudad}), Chrome real
// against the REAL gateway, compared with what GET /providers answers for the same query.
//   APP=http://localhost:8300 API=http://localhost:8300/api CHROMIUM_PATH=... node apps/universal/scripts/live/directory-mirror.mjs
// Writes screenshots and directory-results.json to docs/progress/evidence/espejo-web-movil/.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8300";
const API = process.env.API ?? "http://localhost:8300/api";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const api = async (query) => (await fetch(`${API}/providers?${query}&pageSize=12`)).json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
async function open(width = 360, scheme = "light", locale = "es-BO") {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, colorScheme: scheme, locale });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const errors = [];
  const impressions = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
  page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/providers/impressions")) impressions.push(JSON.parse(request.postData() ?? "{}")); });
  return { context, page, errors, impressions };
}
const visible = (page, id) => page.locator(`[data-testid="${id}"]`).filter({ visible: true });
const settle = async (page) => { await page.waitForLoadState("networkidle").catch(() => undefined); await page.waitForTimeout(600); };
const names = (page) => page.locator("[data-testid^='open-provider-']").filter({ visible: true }).allTextContents();

try {
  // 1 · B4 search equals GET /providers for the same query, and impressions are reported with ids + SEARCH only.
  {
    const { context, page, errors, impressions } = await open();
    const expected = await api("page=1");
    await page.goto(`${APP}/proveedores/buscar`);
    await visible(page, "directory-count").waitFor();
    await settle(page);
    const shown = await names(page);
    const rawKeys = await page.getByText(/directory\.category\./).count();
    record({ case: "Category labels: published names, never a raw key", ok: rawKeys === 0, detail: `raw keys=${rawKeys}` });
    record({ case: "B4 /proveedores/buscar = GET /providers", ok: shown.length === expected.items.length && shown.every((name, i) => name === expected.items[i].name), detail: `shown=${shown.length} api=${expected.items.length} total=${expected.total}` });
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(2500);
    const ids = impressions.flatMap((body) => body.listingIds ?? []);
    const clean = impressions.every((body) => Object.keys(body).sort().join() === "listingIds,surface" && body.surface === "SEARCH");
    record({ case: "Impressions (SEARCH, ids only, once each)", ok: ids.length > 0 && clean && new Set(ids).size === ids.length && ids.every((id) => expected.items.some((item) => item.listingId === id)), detail: `posts=${impressions.length} ids=${ids.length} clean=${clean}` });
    await page.screenshot({ path: `${OUT}directorio-buscar-360.png`, fullPage: true });

    // 2 · A result opens the partner microsite at the web's address.
    const first = expected.items[0];
    await visible(page, `open-provider-${first.listingId}`).click();
    await page.waitForURL(`**/p/${first.providerSlug}`);
    record({ case: "Result → /p/{slug}", ok: new URL(page.url()).pathname === `/p/${first.providerSlug}`, detail: new URL(page.url()).pathname });
    record({ case: "Runtime (search)", ok: !errors.length, detail: errors.slice(0, 2).join(" | ") || "no console errors" });
    await context.close();
  }

  // 3 · Filters through the form go to the web's address and match the API.
  {
    const { context, page } = await open();
    await page.goto(`${APP}/proveedores/buscar`);
    await visible(page, "directory-search").waitFor();
    await settle(page);
    await visible(page, "directory-search").getByRole("radio", { name: "Catering" }).click();
    await visible(page, "directory-submit").click();
    await page.waitForURL("**/proveedores/buscar?categoria=catering");
    await visible(page, "directory-count").waitFor();
    await settle(page);
    const expected = await api("category=CATERING&page=1");
    const shown = await names(page);
    record({ case: "Form → ?categoria=catering = GET /providers?category=CATERING", ok: shown.length === expected.items.length, detail: `shown=${shown.length} api=${expected.items.length}` });
    await context.close();
  }

  // 4 · B2, B3 and the negative pages.
  {
    const { context, page } = await open();
    const expected = await api("category=CATERING&verified=true&page=1");
    await page.goto(`${APP}/proveedores/catering`);
    await visible(page, "directory-count").waitFor();
    await settle(page);
    const count = await visible(page, "directory-count").textContent();
    record({ case: "B2 /proveedores/catering", ok: (await names(page)).length === expected.items.length && (count ?? "").includes(String(expected.total)), detail: `count="${count}"` });
    await page.screenshot({ path: `${OUT}directorio-categoria-360.png`, fullPage: true });
    const empty = await api("category=VENUE&city=santa-cruz&verified=true&page=1");
    await page.goto(`${APP}/proveedores/salones/santa-cruz`);
    if (empty.total === 0) { await visible(page, "directory-empty").waitFor(); record({ case: "B3 empty (salones/santa-cruz) → empty state", ok: true }); }
    else { await visible(page, "directory-count").waitFor(); record({ case: "B3 salones/santa-cruz", ok: (await names(page)).length === empty.items.length }); }
    await page.screenshot({ path: `${OUT}directorio-vacio-360.png`, fullPage: true });
    await page.goto(`${APP}/proveedores/catering/atlantida`);
    await visible(page, "directory-not-found").waitFor();
    record({ case: "Negative: unknown city → not a page", ok: true });
    await context.close();
  }

  // 5 · Every width, scheme and language with axe, on the home and the search.
  for (const path of ["/proveedores", "/proveedores/buscar"]) for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    const { context, page, errors } = await open(width, scheme, locale);
    await page.goto(`${APP}${path}`);
    await visible(page, path === "/proveedores" ? "directory-home" : "directory-count").waitFor();
    await settle(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    if ((width === 1280 && scheme === "light" && locale === "es-BO") || (width === 360 && scheme === "dark" && locale === "en-US")) await page.screenshot({ path: `${OUT}directorio${path.replace(/\//g, "-")}-${width}-${scheme}-${locale}.png`, fullPage: true });
    record({ case: `${path} ${width}px ${scheme} ${locale}`, ok: overflow <= 0 && !serious.length && !errors.length, detail: `overflow=${overflow} axe(critical+serious)=${serious.map((v) => `${v.id}:${v.nodes.length}`).join(",") || 0} errors=${errors.length}` });
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}directory-results.json`, `${JSON.stringify({ app: APP, results }, null, 2)}\n`);
}
const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
