// Espejo web/móvil · every public or shared route, the public site (seo-web) against the app served on the web, Chrome real.
//   APP=https://dev.done.arauzsoftware.com SITE=https://rsvp-web.161.97.85.216.sslip.io SLUG=qa-espejo-movil PARTNER=multicenter-59388c \
//   [ONLY=<regex of route ids>] [TAG=antes|despues] CHROMIUM_PATH=... node apps/universal/scripts/live/public-routes-mirror.mjs
// Per route and locale it reads what a reader sees on each side (headings, the state drawing, the actions) and records
// whether both say the same. Writes side-by-side screenshots and public-routes-results.json to docs/progress/evidence/espejo-web-movil/.
// Guest tokens are fabricated (never real credentials): the invalid-link state is the only guest state reachable without one.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8300";
const SITE = process.env.SITE ?? "https://rsvp-web.161.97.85.216.sslip.io";
const SLUG = process.env.SLUG ?? "qa-espejo-movil";
const PARTNER = process.env.PARTNER ?? "multicenter-59388c";
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : undefined;
/** Suffix of the evidence files (`antes`, `despues`), so a before/after pair does not overwrite itself. */
const TAG = process.env.TAG ? `-${process.env.TAG}` : "";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const FAKE = "aW52YWxpZC10b2tlbi1lc3Blam8tcGFyaWRhZA";
const ROUTES = [
  { id: "celebracion", path: `/c/${SLUG}` },
  { id: "celebracion-404", path: "/c/no-existe-espejo-paridad" },
  { id: "rsvp-abierto", path: `/c/${SLUG}/rsvp` },
  { id: "rsvp-enlace-invalido", path: `/c/${SLUG}/rsvp/${FAKE}` },
  { id: "rsvp-legado-invalido", path: `/rsvp/${FAKE}` },
  { id: "regalos-sin-enlace", path: `/c/${SLUG}/regalos` },
  { id: "regalos-enlace-invalido", path: `/c/${SLUG}/regalos/${FAKE}` },
  { id: "directorio", path: "/proveedores" },
  { id: "directorio-buscar", path: "/proveedores/buscar" },
  { id: "directorio-vacio", path: "/proveedores/salones/santa-cruz" },
  { id: "partner", path: `/p/${PARTNER}` },
  { id: "partner-agenda", path: `/p/${PARTNER}/agenda` },
  { id: "partner-404", path: "/p/no-existe-espejo-paridad" },
  { id: "privacidad", path: "/privacidad" },
  { id: "terminos", path: "/terminos" },
  { id: "404", path: "/ruta-que-no-existe-espejo" },
  { id: "catalogo-componentes", path: "/catalogo" }
].filter((route) => !ONLY || ONLY.test(route.id));

const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.same ? "SAME" : "DIFF"} ${entry.route} ${entry.locale}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });

/** What a reader sees: headings in order, the state drawing (app `data-illustration`, site `data-art`) and the visible actions. */
const read = (page) => page.evaluate(() => {
  const shown = (node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
  const text = (node) => (node.getAttribute("aria-label") || node.textContent || "").replace(/\s+/g, " ").trim();
  // Only the site chrome is left out (seo-web's top bar and footer, the app's tab bar): page headers count.
  const inChrome = (node) => Boolean(node.closest(".site-header, .site-footer, [role='tablist'], [role='banner'], [role='contentinfo']"));
  return {
    headings: [...document.querySelectorAll("h1, h2, [role='heading']")].filter(shown).filter((n) => !inChrome(n)).map(text).filter(Boolean),
    art: [...document.querySelectorAll("[data-illustration], [data-art]")].filter(shown).map((n) => n.getAttribute("data-illustration") ?? n.getAttribute("data-art")),
    actions: [...document.querySelectorAll("a, button, [role='button'], [role='link']")].filter(shown).filter((n) => !inChrome(n)).map(text).filter(Boolean).slice(0, 12)
  };
});

async function visit(base, path, locale) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: "light", locale });
  const page = await context.newPage();
  const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  let seen;
  for (let attempt = 0; attempt < 3 && !seen; attempt += 1) {
    // A client redirect (for instance the app's not-found) can replace the document while it is read: read the settled page.
    seen = await read(page).catch(async () => { await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined); return undefined; });
  }
  seen ??= { headings: [], art: [], actions: [] };
  const finalUrl = page.url();
  return { context, page, status: response?.status() ?? 0, finalUrl, ...seen };
}

const norm = (list) => list.map((value) => value.toLowerCase());
try {
  for (const route of ROUTES) for (const locale of ["es-BO", "en-US"]) {
    const site = await visit(SITE, route.path, locale);
    const app = await visit(APP, route.path, locale);
    const sameHeadings = JSON.stringify(norm(site.headings)) === JSON.stringify(norm(app.headings));
    const sameArt = JSON.stringify(site.art) === JSON.stringify(app.art);
    const detail = [
      sameHeadings ? "" : `headings web=${JSON.stringify(site.headings)} app=${JSON.stringify(app.headings)}`,
      sameArt ? "" : `art web=${JSON.stringify(site.art)} app=${JSON.stringify(app.art)}`
    ].filter(Boolean).join(" · ");
    record({ route: route.id, path: route.path.replace(FAKE, "{token-falso}"), locale, same: sameHeadings && sameArt, webStatus: site.status, appUrl: app.finalUrl.replace(FAKE, "{token-falso}"), web: site.headings, app: app.headings, webArt: site.art, appArt: app.art, webActions: site.actions, appActions: app.actions, detail });
    if (locale === "es-BO") {
      await site.page.screenshot({ path: `${OUT}rutas-${route.id}-web-360${TAG}.png`, fullPage: false });
      await app.page.screenshot({ path: `${OUT}rutas-${route.id}-app-360${TAG}.png`, fullPage: false });
    }
    await site.context.close();
    await app.context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}public-routes-results${TAG}${ONLY ? "-subset" : ""}.json`, `${JSON.stringify({ app: APP, site: SITE, results }, null, 2)}\n`);
}
console.log(`${results.filter((r) => r.same).length}/${results.length} same`);
