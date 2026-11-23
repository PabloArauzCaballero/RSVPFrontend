// Portada en la web: the app's `/` without a session against the public site's home, Chrome real.
//   APP=http://localhost:8340 SITE=https://rsvp-web.161.97.85.216.sslip.io CHROMIUM_PATH=... node apps/universal/scripts/live/landing-mirror.mjs
// Writes side-by-side screenshots and landing-results.json to docs/progress/evidence/espejo-web-movil/.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8340";
const SITE = process.env.SITE ?? "https://rsvp-web.161.97.85.216.sslip.io";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const SHOT = { 360: true, 1280: true };

/** The headings of a page, in order: what a reader scanning the page sees. */
const headings = (page) => page.evaluate(() => [...document.querySelectorAll("h1, h2, [role='heading']")].filter((node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden").map((node) => (node.textContent ?? "").trim()).filter(Boolean));

try {
  for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, colorScheme: scheme, locale });
    const app = await context.newPage();
    const errors = [];
    app.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    app.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|status of 401/.test(message.text())) errors.push(message.text()); });
    await app.goto(`${APP}/`);
    await app.locator("[data-testid='landing-screen']").waitFor({ timeout: 20000 });
    await app.waitForLoadState("networkidle").catch(() => undefined);
    await app.waitForTimeout(900);
    // The site follows its own language negotiation; ask it in the same language as the app's browser.
    const site = await context.newPage();
    await site.setExtraHTTPHeaders({ "accept-language": locale });
    await site.goto(`${SITE}/?lang=${locale}`);
    await site.waitForLoadState("networkidle").catch(() => undefined);
    const appHeadings = await headings(app);
    let siteHeadings = await headings(site);
    if (!siteHeadings.length) { await site.reload(); await site.waitForLoadState("networkidle").catch(() => undefined); siteHeadings = await headings(site); }
    const missing = siteHeadings.filter((text) => !appHeadings.includes(text));
    const url = new URL(app.url()).pathname;
    // One drawing per side of the party on both sides of the mirror, all three decorative.
    const appArt = await app.locator("[data-testid='landing-roles'] svg[data-illustration][aria-hidden='true']").count();
    const siteArt = await site.locator(".roles__art[aria-hidden='true']").count();
    const overflow = await app.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = await new AxeBuilder({ page: app }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    if (SHOT[width] && locale === "es-BO") {
      await app.screenshot({ path: `${OUT}portada-app-${width}-${scheme}.png`, fullPage: false });
      await site.screenshot({ path: `${OUT}portada-sitio-${width}-${scheme}.png`, fullPage: false });
    }
    record({ case: `/ ${width}px ${scheme} ${locale}`, ok: url === "/" && siteHeadings.length > 0 && missing.length === 0 && appArt === 3 && siteArt === 3 && overflow <= 0 && !serious.length && !errors.length,
      detail: `stays at "${url}", headings app=${appHeadings.length} site=${siteHeadings.length} missing=${JSON.stringify(missing)} roleArt app=${appArt} site=${siteArt} overflow=${overflow} axe(critical+serious)=${serious.map((v) => `${v.id}:${v.nodes.length}`).join(",") || 0} errors=${errors.length}` });
    await context.close();
  }

  // The one way in: create → sign-up, sign-in → login, directory → /proveedores, all inside the app.
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: "es-BO" });
  const page = await context.newPage();
  for (const [id, target] of [["landing-create", "/registro"], ["landing-sign-in", "/login"], ["landing-directory", "/proveedores"]]) {
    await page.goto(`${APP}/`);
    await page.locator(`[data-testid='${id}']`).first().click();
    await page.waitForURL(`**${target}`, { timeout: 15000 }).catch(() => undefined);
    record({ case: `${id} → ${target}`, ok: new URL(page.url()).pathname === target, detail: new URL(page.url()).pathname });
  }
  await context.close();
} finally {
  await browser.close();
  writeFileSync(`${OUT}landing-results.json`, `${JSON.stringify({ app: APP, site: SITE, results }, null, 2)}\n`);
}
const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
