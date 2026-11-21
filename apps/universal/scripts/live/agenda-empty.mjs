// Agenda empty state on both surfaces, Chrome real against the REAL gateway, for a partner whose calendar has no days
// (no availability configured). Read-only: nothing is requested or booked.
//   APP=http://localhost:8320 WEB=http://localhost:3320 API=http://localhost:8320/api SLUG=<partner> CHROMIUM_PATH=... node apps/universal/scripts/live/agenda-empty.mjs
// WEB is optional (seo-web); writes screenshots and agenda-empty-results.json to docs/progress/evidence/espejo-web-movil/.
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8320";
const WEB = process.env.WEB ?? "";
const API = process.env.API ?? "http://localhost:8320/api";
const SLUG = process.env.SLUG ?? "";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
assert.ok(SLUG, "SLUG is required");
mkdirSync(OUT, { recursive: true });
const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const get = async (path) => (await fetch(`${API}${path}`)).json();

// The precondition, from the API: the partner's provider and an empty month in its zone.
const page1 = await get(`/providers?slug=${SLUG}&page=1&pageSize=12`);
const card = page1.items.find((item) => item.providerSlug === SLUG);
assert.ok(card, `${SLUG} not in the directory`);
const providerId = (await get(`/listings/${card.listingId}`)).providerId;
const profile = await get(`/providers/${providerId}`);
const month = new Intl.DateTimeFormat("en-CA", { timeZone: profile.timeZone, year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const calendar = await get(`/providers/${providerId}/calendar?month=${month}`);
assert.equal(calendar.days.length, 0, `precondition: ${SLUG} has days in ${month}; pick a partner without availability`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const surfaces = [["app", `${APP}/p/${SLUG}/agenda`], ...(WEB ? [["web", `${WEB}/p/${SLUG}/agenda`]] : [])];
try {
  for (const [surface, url] of surfaces) for (const width of [360, 1280]) for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, colorScheme: scheme, locale: "es-BO" });
    context.setDefaultTimeout(30000);
    const page = await context.newPage();
    const errors = [];
    const posts = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|Download the React DevTools/.test(message.text())) errors.push(message.text()); });
    page.on("request", (request) => { if (request.method() === "POST" && /bookings|quotes/.test(request.url())) posts.push(request.url()); });
    await page.goto(url);
    const empty = page.locator('[data-testid="agenda-empty"]').filter({ visible: true });
    await empty.waitFor();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(500);
    const text = (await empty.textContent()) ?? "";
    const grid = await page.locator('[data-testid="agenda-grid"]').filter({ visible: true }).count();
    const request = await page.getByRole("button", { name: "Solicitar esta fecha" }).filter({ visible: true }).count();
    const role = await empty.getAttribute("role");
    // Document overflow misses content clipped inside a scroll view: the month buttons must be whole inside the viewport.
    const next = await page.getByRole("button", { name: "Mes siguiente", exact: true }).filter({ visible: true }).first().boundingBox();
    const clipped = next ? Math.max(0, Math.round(next.x + next.width - width)) : -1;
    const overflow = Math.max(clipped, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    const file = `agenda-vacia-${surface}-${width}-${scheme}.png`;
    await page.screenshot({ path: `${OUT}${file}`, fullPage: true });
    record({ case: `${surface} ${width}px ${scheme}: empty month explained, no empty grid, no dead request button`, ok: role === "status" && text.includes("todavía no publicó sus días") && grid === 0 && request === 0 && overflow <= 0 && !serious.length && !errors.length && !posts.length,
      detail: `role=${role} grid=${grid} requestButton=${request} overflow=${overflow} axe(critical+serious)=${serious.map((v) => `${v.id}:${v.nodes.length}`).join(",") || 0} errors=${errors.length}`, screenshot: file });
    if (width === 360 && scheme === "light") {
      const quote = surface === "app" ? page.locator('[data-testid="agenda-empty-quote"]').filter({ visible: true }) : page.getByRole("link", { name: "Pedir cotización" });
      await quote.click();
      await page.waitForURL(`**/p/${SLUG}/cotizar`);
      record({ case: `${surface}: "Pedir cotización" opens the quote`, ok: new URL(page.url()).pathname === `/p/${SLUG}/cotizar` });
    }
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}agenda-empty-results.json`, `${JSON.stringify({ app: APP, web: WEB || null, slug: SLUG, month, apiDays: calendar.days.length, results }, null, 2)}\n`);
}
const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
