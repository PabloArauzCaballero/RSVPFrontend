// Espejo web/móvil · the guest's dead ends on the public site and in the app: same title, same drawing, no overflow, axe.
//   APP=https://dev.done.arauzsoftware.com SITE=http://localhost:3199 SLUG=qa-espejo-movil CHROMIUM_PATH=... \
//   node apps/universal/scripts/live/guest-states-mirror.mjs
// Matrix: 360/768/1280 × light/dark × es-BO/en-US on both sides. "Sin conexión" aborts every gateway request in the browser
// (both sides read the celebration from the browser on the personal-link page). Tokens are fabricated, never real ones.
// Writes screenshots and guest-states-results.json to docs/progress/evidence/espejo-web-movil/.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8300";
const SITE = process.env.SITE ?? "http://localhost:3100";
const SLUG = process.env.SLUG ?? "qa-espejo-movil";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const FAKE = "aW52YWxpZC10b2tlbi1lc3Blam8tcGFyaWRhZA";

const CASES = [
  { id: "enlace-invalido", path: `/c/${SLUG}/rsvp/${FAKE}`, art: "linkExpired", title: { "es-BO": "Este enlace ya no funciona", "en-US": "This link no longer works" } },
  { id: "enlace-legado-invalido", path: `/rsvp/${FAKE}`, art: "linkExpired", title: { "es-BO": "Este enlace ya no funciona", "en-US": "This link no longer works" } },
  { id: "solo-con-enlace", path: `/c/${SLUG}/rsvp`, art: "noAccess", title: { "es-BO": "Esta celebración solo recibe respuestas con enlace personal", "en-US": "This celebration only takes answers with a personal link" } },
  { id: "sin-conexion", path: `/c/${SLUG}/rsvp/${FAKE}`, offline: true, art: "offline", title: { "es-BO": "Sin conexión por ahora", "en-US": "No connection right now" } },
  { id: "regalos-sin-enlace", path: `/c/${SLUG}/regalos`, art: "linkExpired", title: { "es-BO": "Abre tu enlace de invitación", "en-US": "Open your invitation link" } }
];

const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : undefined;
const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });

async function check(side, base, item, width, scheme, locale) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, colorScheme: scheme, locale });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|status of 40[134]|ERR_FAILED|net::ERR|Failed to fetch|NetworkError/.test(message.text())) errors.push(message.text()); });
  if (item.offline) await page.route(/\/api\//, (route) => route.abort("internetdisconnected"));
  try {
    await page.goto(`${base}${item.path}`, { waitUntil: "domcontentloaded" });
    // Whitespace-tolerant: a title may wrap with a line break inside the heading.
    const heading = page.getByRole("heading", { name: new RegExp(`^\\s*${item.title[locale].split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+")}\\s*$`) }).filter({ visible: true });
    await heading.first().waitFor();
    await page.waitForTimeout(600);
    const art = await page.locator(`[data-illustration="${item.art}"], [data-art="${item.art}"]`).filter({ visible: true }).count();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id);
    const ok = art === 1 && overflow <= 0 && serious.length === 0 && errors.length === 0;
    record({ case: `${item.id} ${side} ${width}px ${scheme} ${locale}`, ok, detail: `art=${art} overflow=${overflow} axe(critical+serious)=${serious.length}${serious.length ? `:${serious.join(",")}` : ""} errors=${errors.length}${errors.length ? `:${errors[0].slice(0, 120)}` : ""}` });
    if (locale === "es-BO" && (width === 360 || (width === 1280 && scheme === "light"))) await page.screenshot({ path: `${OUT}estado-${item.id}-${side}-${width}-${scheme}.png` });
  } catch (error) {
    record({ case: `${item.id} ${side} ${width}px ${scheme} ${locale}`, ok: false, detail: String(error.message ?? error).split("\n")[0] });
  } finally {
    await context.close();
  }
}

try {
  for (const item of CASES.filter((c) => !ONLY || ONLY.test(c.id))) for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    await check("web", SITE, item, width, scheme, locale);
    await check("app", APP, item, width, scheme, locale);
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}guest-states-results${ONLY ? "-subset" : ""}.json`, `${JSON.stringify({ app: APP, site: SITE, results }, null, 2)}\n`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} PASS`);
process.exitCode = failed ? 1 : 0;
