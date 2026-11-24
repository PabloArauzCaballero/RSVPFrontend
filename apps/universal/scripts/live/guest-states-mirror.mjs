// Espejo web/móvil · the guest's journey on the public site and in the app: same title, same drawing, same cover, no overflow, axe.
//   APP=https://dev.done.arauzsoftware.com SITE=http://localhost:3199 SLUG=qa-espejo-movil API=https://rsvp-api.161.97.85.216.sslip.io \
//   [TOKEN_FILE=/path/to/token] [ONLY=<regex of case ids>] CHROMIUM_PATH=... node apps/universal/scripts/live/guest-states-mirror.mjs
// Matrix: 360/768/1280 × light/dark × es-BO/en-US on both sides. "Sin conexión" aborts every gateway request in the browser
// (both sides read the celebration from the browser on the personal-link page). Dead-end tokens are fabricated.
// M21 · with TOKEN_FILE (a VALID personal link of a QA guest, read from the file and never printed or written) it also walks
// the journey: the pending question («Voy / No puedo») on both sides, ONE real answer sent from the site («Voy» + 1 companion),
// the confirmed state on both sides and the gift list on both sides. The answer is real: use a guest made for this run.
// Writes screenshots and guest-states-results.json to docs/progress/evidence/espejo-web-movil/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8300";
const SITE = process.env.SITE ?? "http://localhost:3100";
const SLUG = process.env.SLUG ?? "qa-espejo-movil";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const FAKE = "aW52YWxpZC10b2tlbi1lc3Blam8tcGFyaWRhZA";
const API = process.env.API ?? "https://rsvp-api.161.97.85.216.sslip.io";
const TOKEN = process.env.TOKEN_FILE ? readFileSync(process.env.TOKEN_FILE, "utf8").trim() : "";
// The invitation's title: every guest screen that knows the celebration shows it as the h1 on the cover (M21).
const COVER = await fetch(`${API}/celebrations/public/${SLUG}`).then((r) => r.json()).then((v) => v.content?.title ?? "").catch(() => "");

const CASES = [
  { id: "enlace-invalido", path: `/c/${SLUG}/rsvp/${FAKE}`, art: "linkExpired", title: { "es-BO": "Este enlace ya no funciona", "en-US": "This link no longer works" } },
  { id: "enlace-legado-invalido", path: `/rsvp/${FAKE}`, art: "linkExpired", title: { "es-BO": "Este enlace ya no funciona", "en-US": "This link no longer works" } },
  { id: "solo-con-enlace", path: `/c/${SLUG}/rsvp`, art: "noAccess", cover: true, title: { "es-BO": "Esta celebración solo recibe respuestas con enlace personal", "en-US": "This celebration only takes answers with a personal link" } },
  { id: "sin-conexion", path: `/c/${SLUG}/rsvp/${FAKE}`, offline: true, art: "offline", title: { "es-BO": "Sin conexión por ahora", "en-US": "No connection right now" } },
  { id: "regalos-sin-enlace", path: `/c/${SLUG}/regalos`, art: "linkExpired", title: { "es-BO": "Abre tu enlace de invitación", "en-US": "Open your invitation link" } }
];
// M21 · the journey with a valid link. The site takes the credential in the fragment (`#t=`), the app in the last segment.
const JOURNEY = TOKEN ? {
  pending: { id: "invitado-pendiente", path: `/c/${SLUG}/rsvp/${TOKEN}`, cover: true, full: true, title: { "es-BO": "¿Nos acompañas?", "en-US": "Are you coming?" }, visible: { "es-BO": ["Voy", "No puedo"], "en-US": ["I am in", "Cannot make it"] } },
  confirmed: { id: "invitado-confirmado", path: `/c/${SLUG}/rsvp/${TOKEN}`, cover: true, full: true, title: { "es-BO": "Tu asistencia está confirmada", "en-US": "Your attendance is confirmed" }, visible: { "es-BO": ["Ver la lista de regalos", "Cambiar mi respuesta"], "en-US": ["See the gift list", "Change my answer"] } },
  gifts: { id: "regalos", path: { web: `/c/${SLUG}/regalos#t=${TOKEN}`, app: `/c/${SLUG}/regalos/${TOKEN}` }, full: true, title: { "es-BO": "Regalos", "en-US": "Gifts" }, visible: { "es-BO": ["Reservar"], "en-US": ["Reserve"] } }
} : null;
const pattern = (text) => new RegExp(`^\\s*${text.split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+")}\\s*$`);

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
  const path = typeof item.path === "string" ? item.path : item.path[side];
  // The token is never printed: a case is named by its id, not by its address.
  const name = `${item.id} ${side} ${width}px ${scheme} ${locale}`;
  try {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    // Whitespace-tolerant: a title may wrap with a line break inside the heading.
    const heading = page.getByRole("heading", { name: pattern(item.title[locale]) }).filter({ visible: true });
    await heading.first().waitFor();
    await page.waitForTimeout(600);
    const art = item.art ? await page.locator(`[data-illustration="${item.art}"], [data-art="${item.art}"]`).filter({ visible: true }).count() : 1;
    // M21: the invitation's title is the h1 on the cover, above the state (whose title then is a level-2 heading).
    const cover = item.cover ? await page.getByRole("heading", { level: 1, name: pattern(COVER) }).filter({ visible: true }).count() : 1;
    const missing = [];
    for (const text of item.visible?.[locale] ?? []) if (!(await page.getByText(pattern(text)).filter({ visible: true }).count())) missing.push(text);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id);
    const ok = art >= 1 && cover >= 1 && missing.length === 0 && overflow <= 0 && serious.length === 0 && errors.length === 0;
    record({ case: name, ok, detail: `art=${item.art ? art : "-"} cover=${item.cover ? cover : "-"} missing=${missing.length}${missing.length ? `:${missing.join("|")}` : ""} overflow=${overflow} axe(critical+serious)=${serious.length}${serious.length ? `:${serious.join(",")}` : ""} errors=${errors.length}${errors.length ? `:${errors[0].slice(0, 120)}` : ""}` });
    const prefix = item.full ? "recorrido" : "estado";
    if (locale === "es-BO" && (width === 360 || (width === 1280 && scheme === "light"))) await page.screenshot({ path: `${OUT}${prefix}-${item.id}-${side}-${width}-${scheme}.png`, fullPage: Boolean(item.full) });
    if (item.full && locale === "en-US" && width === 360 && scheme === "light") await page.screenshot({ path: `${OUT}${prefix}-${item.id}-${side}-${width}-${scheme}-en-US.png`, fullPage: true });
  } catch (error) {
    record({ case: name, ok: false, detail: String(error.message ?? error).split("\n")[0].replaceAll(TOKEN || "\u0000", "<token>") });
  } finally {
    await context.close();
  }
}

/** The one real answer of the run, from the site: «Voy» + 1 companion. Then the drawn check and the gifts call to action. */
async function answerFromSite() {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: "light", locale: "es-BO" });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const sent = [];
  page.on("request", (request) => { if (request.method() === "POST" && /\/rsvp\/celebrations\/[^/]+\/rsvp$/.test(request.url())) sent.push(request.headers()["idempotency-key"]); });
  try {
    await page.goto(`${SITE}${JOURNEY.pending.path}`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Voy", { exact: true }).check();
    await page.getByRole("button", { name: "Agregar un acompañante" }).click();
    await page.screenshot({ path: `${OUT}recorrido-invitado-voy-web-360-light.png`, fullPage: true });
    const submit = page.getByRole("button", { name: "Confirmar que voy" });
    await submit.dblclick();
    await page.getByRole("heading", { name: pattern("Listo, estás dentro.") }).waitFor();
    await page.waitForTimeout(800);
    const cta = await page.getByRole("button", { name: "Ver la lista de regalos" }).count();
    await page.screenshot({ path: `${OUT}recorrido-invitado-listo-web-360-light.png`, fullPage: true });
    record({ case: "respuesta real desde la web (Voy + 1)", ok: sent.length === 1 && cta === 1, detail: `posts=${sent.length} idempotencyKey=${sent[0] ? "yes" : "no"} giftsCta=${cta}` });
  } catch (error) {
    record({ case: "respuesta real desde la web (Voy + 1)", ok: false, detail: String(error.message ?? error).split("\n")[0] });
  } finally {
    await context.close();
  }
}

const matrix = async (item) => {
  for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    await check("web", SITE, item, width, scheme, locale);
    await check("app", APP, item, width, scheme, locale);
  }
};

try {
  for (const item of CASES.filter((c) => !ONLY || ONLY.test(c.id))) await matrix(item);
  if (JOURNEY) {
    if (!ONLY || ONLY.test(JOURNEY.pending.id)) await matrix(JOURNEY.pending);
    if (!ONLY || ONLY.test("respuesta")) await answerFromSite();
    if (!ONLY || ONLY.test(JOURNEY.confirmed.id)) await matrix(JOURNEY.confirmed);
    if (!ONLY || ONLY.test(JOURNEY.gifts.id)) await matrix(JOURNEY.gifts);
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}guest-states-results${ONLY ? "-subset" : ""}.json`, `${JSON.stringify({ app: APP, site: SITE, results }, null, 2)}\n`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} PASS`);
process.exitCode = failed ? 1 : 0;
