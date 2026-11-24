// Portada · dibujos: captures the hero, the three taps and the closing of the site and the web app, light and dark, 390 and 1280.
//   APP=http://localhost:8340 SITE=http://localhost:3100 CHROMIUM_PATH=... node apps/universal/scripts/live/landing-art-capture.mjs
// Writes portada-dibujos-{sitio,app}-{zona}-{ancho}-{tema}.png to docs/progress/evidence/ilustraciones-escena/.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8340";
const SITE = process.env.SITE ?? "http://localhost:3100";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/ilustraciones-escena/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const ZONES = {
  site: { hero: ".hero", pasos: ".steps", cierre: ".closing" },
  app: { hero: "[data-testid='landing-hero-art']", pasos: "[data-testid='landing-steps']", cierre: "[data-testid='landing-closing']" }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  for (const width of [390, 1280]) for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, locale: "es-BO", reducedMotion: "reduce" });
    for (const [side, url] of [["sitio", `${SITE}/?lang=es-BO`], ["app", `${APP}/`]]) {
      const page = await context.newPage();
      await page.goto(url);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.waitForTimeout(800);
      for (const [zone, selector] of Object.entries(ZONES[side === "sitio" ? "site" : "app"])) {
        const path = `${OUT}portada-dibujos-${side}-${zone}-${width}-${scheme}.png`;
        // The hero is what a visitor sees first: the top of the page as it opens (the site's sticky header would cover an element shot).
        if (zone === "hero") { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200); await page.screenshot({ path }); continue; }
        const target = page.locator(selector).first();
        await target.scrollIntoViewIfNeeded();
        await target.screenshot({ path });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      console.log(`${side} ${width} ${scheme} overflow=${overflow}`);
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
