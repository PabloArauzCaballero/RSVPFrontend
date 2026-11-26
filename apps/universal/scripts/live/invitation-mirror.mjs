// Espejo web · the public invitation in the app (/c/{slug} and /c/{slug}/{section}), Chrome real against the REAL gateway.
//   APP=http://localhost:8300 API=<gateway> SLUGS=a,b CHROMIUM_PATH=... node apps/universal/scripts/live/invitation-mirror.mjs
// APP serves the exported app (`expo export --platform web`) built with EXPO_PUBLIC_API_URL pointing at the same gateway.
// Writes screenshots and results.json to docs/progress/evidence/espejo-web-movil/. Exits 1 on the first failed assertion.
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8300";
const API = process.env.API ?? "http://localhost:8300/api";
const SLUGS = (process.env.SLUGS ?? "").split(",").filter(Boolean);
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
const WIDTHS = [360, 768, 1280];
const SCHEMES = ["light", "dark"];
const LOCALES = ["es-BO", "en-US"];
const SECTION_PATHS = { story: "historia", schedule: "itinerario", venues: "lugares", gallery: "galeria", dressCode: "dress-code", faq: "faq", recommendations: "recomendaciones" };
assert.ok(SLUGS.length, "SLUGS is required (published celebrations of the gateway)");
mkdirSync(OUT, { recursive: true });

const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const json = async (path, headers = {}) => { const response = await fetch(`${API}${path}`, { headers }); return { status: response.status, body: response.ok ? await response.json() : null }; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
async function open(width, scheme, locale) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, colorScheme: scheme, locale });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|status of 404/.test(message.text())) errors.push(message.text()); });
  return { context, page, errors };
}
const settle = async (page) => { await page.waitForLoadState("networkidle").catch(() => undefined); await page.waitForTimeout(600); };
// The Stack keeps the previous screen mounted (hidden) on web: only the visible one is the current page.
const tid = (page, id) => page.locator(`[data-testid="${id}"]`).filter({ visible: true });
const current = (page) => tid(page, "invitation-screen");

try {
  for (const slug of SLUGS) {
    const view = await json(`/celebrations/public/${slug}`, { "accept-language": "es-BO" });
    assert.equal(view.status, 200, `${slug} is not published on the gateway`);

    // 1 · Every width, scheme and language: the invitation renders the server's title, with no horizontal overflow and no runtime error.
    for (const width of WIDTHS) for (const scheme of SCHEMES) for (const locale of LOCALES) {
      const { context, page, errors } = await open(width, scheme, locale);
      const localized = await json(`/celebrations/public/${slug}`, { "accept-language": locale });
      await page.goto(`${APP}/c/${slug}`);
      await tid(page, "invitation-screen").waitFor();
      await settle(page);
      const heading = (await current(page).getByRole("heading", { level: 1 }).first().textContent())?.trim();
      const title = String(localized.body.content.title ?? "").trim();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const file = `invitacion-${slug}-${width}-${scheme}-${locale}.png`;
      await page.screenshot({ path: `${OUT}${file}`, fullPage: true });
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
      const ok = heading === title && overflow <= 0 && !errors.length && !serious.length;
      record({ case: `A1 ${slug} ${width}px ${scheme} ${locale}`, ok, detail: `h1="${heading}" server="${title}" overflow=${overflow} errors=${errors.length} axe(critical+serious)=${serious.map((v) => `${v.id}:${v.nodes.length}`).join(",") || 0} other=${axe.violations.length - serious.length}`, screenshot: file });
      await context.close();
    }

    // 2 · Navigation: each linked section opens its own page at the web's address, with only that section.
    const { context, page, errors } = await open(360, "light", "es-BO");
    await page.goto(`${APP}/c/${slug}`);
    await tid(page, "invitation-screen").waitFor();
    await settle(page);
    const nav = tid(page, "celebration-nav");
    if (await nav.count()) {
      const labels = (await nav.getByRole("link").allTextContents()).slice(1);
      for (const label of labels) {
        await page.goto(`${APP}/c/${slug}`);
        await tid(page, "invitation-screen").waitFor();
        await settle(page);
        await tid(page, "celebration-nav").getByRole("link", { name: label, exact: true }).click();
        await page.waitForURL((url) => url.pathname.split("/").length === 4);
        await tid(page, "invitation-screen").waitFor();
        await settle(page);
        const path = new URL(page.url()).pathname.split("/")[3];
        const sections = await current(page).locator("[data-testid^='section-']").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
        const heading = (await current(page).getByRole("heading", { level: 1 }).first().textContent())?.trim();
        const file = `seccion-${slug}-${path}-360.png`;
        await page.screenshot({ path: `${OUT}${file}`, fullPage: true });
        const ok = Object.values(SECTION_PATHS).includes(path) && sections.length === 1 && heading === label;
        record({ case: `A2–A8 ${slug} nav → ${label}`, ok, detail: `url=/c/${slug}/${path} sections=${sections.join(",")} h1="${heading}"`, screenshot: file });
      }
    } else record({ case: `A2–A8 ${slug} nav`, ok: true, detail: "N/A: the template places no section with its own page" });

    // 3 · "Cómo llegar" opens maps outside the app (a new tab on web), never a partner.
    await page.goto(`${APP}/c/${slug}`);
    await tid(page, "invitation-screen").waitFor();
    await settle(page);
    const directions = current(page).getByRole("link", { name: "Cómo llegar" }).first();
    if (await directions.count()) {
      const [popup] = await Promise.all([page.context().waitForEvent("page"), directions.click()]);
      const target = popup.url();
      const host = new URL(target).hostname;
      record({ case: `Venues ${slug} cómo llegar`, ok: /(^|\.)google\.|maps\.apple\.com|waze\.com|openstreetmap\.org|goo\.gl$/.test(host), detail: target.slice(0, 120) });
      await popup.close();
    } else record({ case: `Venues ${slug} cómo llegar`, ok: true, detail: "N/A: no venue section" });
    record({ case: `Runtime ${slug}`, ok: !errors.length, detail: errors.slice(0, 3).join(" | ") || "no console errors" });
    await context.close();
  }

  // 4 · Negative cases against the gateway: unknown slug (404) and a path that is not a section.
  const { context, page } = await open(360, "light", "es-BO");
  const missing = await json("/celebrations/public/no-existe-espejo-qa");
  await page.goto(`${APP}/c/no-existe-espejo-qa`);
  await page.getByText("Esta celebración no está disponible").waitFor();
  await page.screenshot({ path: `${OUT}negativo-404-360.png`, fullPage: true });
  record({ case: "Negative 404 unknown slug", ok: missing.status === 404, detail: `gateway=${missing.status}, screen shows not-available`, screenshot: "negativo-404-360.png" });
  const requests = [];
  page.on("request", (request) => { if (request.url().includes("/celebrations/public/")) requests.push(request.url()); });
  await page.goto(`${APP}/c/${SLUGS[0]}/inventado`);
  await page.getByText("Esta celebración no está disponible").waitFor();
  record({ case: "Negative path that is not a section", ok: requests.length === 0, detail: `celebration requests=${requests.length}` });
  await context.close();
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, `${JSON.stringify({ app: APP, api: API, slugs: SLUGS, results }, null, 2)}\n`);
}
const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
