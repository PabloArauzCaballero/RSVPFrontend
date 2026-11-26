// Espejo web · the partner microsite in the app (/p/{slug}, /catalogo, /catalogo/{sku}, /agenda, /cotizar), Chrome real
// against the REAL gateway. Read-only on purpose: no valid quote is sent (it would create a real lead for the provider); the
// date request is made WITHOUT a session, which the server answers 401 without creating anything.
//   APP=http://localhost:8300 API=http://localhost:8300/api SLUG=<verified partner> CHROMIUM_PATH=... node apps/universal/scripts/live/partner-mirror.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8300";
const API = process.env.API ?? "http://localhost:8300/api";
const SLUG = process.env.SLUG ?? "";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
assert.ok(SLUG, "SLUG is required");
mkdirSync(OUT, { recursive: true });
const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const get = async (path) => { const response = await fetch(`${API}${path}`); return { status: response.status, body: response.ok ? await response.json() : null }; };

// What the API says the partner is: its cards across the directory pages, the provider behind them and its profile.
const cards = [];
for (let page = 1; page <= 20; page += 1) {
  const { body } = await get(`/providers?slug=${SLUG}&page=${page}&pageSize=12`);
  cards.push(...body.items.filter((card) => card.providerSlug === SLUG && card.verified));
  if (page * body.pageSize >= body.total) break;
}
assert.ok(cards.length, `${SLUG} has no verified cards`);
const listing = (await get(`/listings/${cards[0].listingId}`)).body;
const profile = (await get(`/providers/${listing.providerId}`)).body;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
async function open(width = 360, scheme = "light", locale = "es-BO") {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, colorScheme: scheme, locale });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const errors = [];
  const posts = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
  page.on("request", (request) => { if (request.method() === "POST") posts.push(new URL(request.url()).pathname); });
  return { context, page, errors, posts };
}
const visible = (page, id) => page.locator(`[data-testid="${id}"]`).filter({ visible: true });
const settle = async (page) => { await page.waitForLoadState("networkidle").catch(() => undefined); await page.waitForTimeout(600); };
const h1 = async (page) => (await page.getByRole("heading", { level: 1 }).filter({ visible: true }).first().textContent())?.trim();

try {
  {
    const { context, page, errors } = await open();
    await page.goto(`${APP}/p/${SLUG}`);
    await visible(page, "partner-screen").waitFor();
    await settle(page);
    record({ case: "B5 h1 = the provider's business name", ok: (await h1(page)) === profile.name, detail: `h1="${await h1(page)}" api="${profile.name}"` });
    const services = await visible(page, "partner-services").getByRole("link").count();
    record({ case: "B5 offers = the partner's verified cards", ok: services - 1 === cards.length, detail: `links=${services} (cards=${cards.length} + catalogue link)` });
    const order = await visible(page, "partner-contact").locator("[data-testid]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
    const firstButton = order.findIndex((id) => id?.startsWith("contact-"));
    record({ case: "B5 disclaimer before contact (REQ-F25-05)", ok: order.indexOf("partner-disclaimer") >= 0 && (firstButton === -1 || order.indexOf("partner-disclaimer") < firstButton), detail: order.join(",") });
    if (firstButton >= 0) {
      const [request] = await Promise.all([context.waitForEvent("request", (candidate) => candidate.url().includes("/r/")), visible(page, order[firstButton]).click()]);
      const url = new URL(request.url());
      record({ case: "B5 contact goes through /r/{listingId}", ok: url.pathname.startsWith("/r/") && url.searchParams.get("surface") === "APP" && Boolean(url.searchParams.get("destination")), detail: `${url.pathname}?${url.searchParams.toString()}` });
      for (const other of context.pages()) if (other !== page) await other.close();
    }
    const shownZones = (await visible(page, "partner-zones").textContent() ?? "").split("·").map((zone) => zone.trim().toLowerCase()).filter(Boolean);
    record({ case: "B5 coverage zones shown once", ok: shownZones.length > 0 && new Set(shownZones).size === shownZones.length, detail: shownZones.join(" | ").slice(0, 160) });
    await page.screenshot({ path: `${OUT}micrositio-360.png`, fullPage: true });
    record({ case: "Runtime (microsite)", ok: !errors.length, detail: errors.slice(0, 2).join(" | ") || "no console errors" });

    await page.goto(`${APP}/p/${SLUG}/catalogo`);
    await visible(page, "catalog-screen").waitFor();
    await settle(page);
    const offers = await page.locator("[data-testid^='offer-']").filter({ visible: true }).count();
    record({ case: "B6 catalogue", ok: offers === cards.length, detail: `offers=${offers}` });
    await page.goto(`${APP}/p/${SLUG}/catalogo/${cards[0].listingId}`);
    await visible(page, "offer-screen").waitFor();
    await settle(page);
    const ids = await visible(page, "offer-screen").locator("[data-testid]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
    record({ case: "B7 fulfillment before quote and contact (REQ-F25-04)", ok: ids.indexOf("fulfillment") >= 0 && ids.indexOf("fulfillment") < ids.indexOf("offer-quote"), detail: `fulfillment@${ids.indexOf("fulfillment")} quote@${ids.indexOf("offer-quote")}` });
    await page.screenshot({ path: `${OUT}micrositio-oferta-360.png`, fullPage: true });
    await context.close();
  }

  // B10/B11: the calendar is the provider's; a date request without a session is a 401 that offers sign-in (nothing created).
  {
    const { context, page, posts } = await open();
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: profile.timeZone, year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
    const calendar = (await get(`/providers/${listing.providerId}/calendar?month=${month}`)).body;
    await page.goto(`${APP}/p/${SLUG}/agenda`);
    await visible(page, "agenda-grid").waitFor();
    await settle(page);
    const shownDays = await visible(page, "agenda-grid").locator("[data-testid^='day-']").count();
    const freeShown = await visible(page, "agenda-grid").locator("[data-testid^='day-']:not([aria-disabled='true'])").count();
    const freeApi = calendar.days.filter((day) => day.available).length;
    const observed = calendar.days.length > 0;
    record({ case: `B10 calendar = GET /calendar (provider's zone)${observed ? "" : " — NOT OBSERVED"}`, ok: shownDays === calendar.days.length && freeShown === freeApi, observed, detail: `days=${shownDays}/${calendar.days.length} free=${freeShown}/${freeApi} zone=${calendar.timeZone}${observed ? "" : " (the provider has no availability configured: nothing to compare)"}` });
    await page.screenshot({ path: `${OUT}micrositio-agenda-360.png`, fullPage: true });
    const free = calendar.days.find((day) => day.available);
    if (free) {
      await visible(page, `day-${free.date}`).click();
      await visible(page, "agenda-request").click();
      await visible(page, "agenda-signin").waitFor();
      record({ case: "B11 negative: no session → 401 → this app's sign-in", ok: posts.some((path) => path.endsWith("/bookings")), detail: "server answered 401; nothing created" });
    } else record({ case: "B11 negative: no session", ok: true, detail: "N/A: no free day this month" });
    await context.close();
  }

  // B8 negative: an incomplete quote is refused on the device; nothing is sent.
  {
    const { context, page, posts } = await open();
    await page.goto(`${APP}/p/${SLUG}/cotizar?l=${cards[0].listingId}`);
    await visible(page, "quote-items").waitFor();
    await settle(page);
    const summary = await visible(page, "quote-summary").textContent();
    await visible(page, "quote-submit").click();
    await page.waitForTimeout(400);
    const alerts = await page.getByRole("alert").filter({ visible: true }).count();
    record({ case: "B8 preselected offer, incomplete form refused, nothing sent", ok: (summary ?? "").includes(cards[0].summary ?? cards[0].name) && alerts > 0 && !posts.some((path) => path.endsWith("/quotes")), detail: `alerts=${alerts} posts=${posts.join(",") || "none"}` });
    await page.screenshot({ path: `${OUT}micrositio-cotizar-360.png`, fullPage: true });
    await context.close();
  }

  // Negative: an unknown partner.
  {
    const { context, page } = await open();
    await page.goto(`${APP}/p/no-existe-espejo-qa`);
    await visible(page, "partner-not-found").waitFor();
    record({ case: "Negative: unknown partner → not found", ok: true });
    await context.close();
  }

  for (const path of [`/p/${SLUG}`, `/p/${SLUG}/agenda`, `/p/${SLUG}/cotizar`]) for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    const { context, page, errors } = await open(width, scheme, locale);
    await page.goto(`${APP}${path}`);
    await page.getByRole("heading", { level: 1 }).filter({ visible: true }).first().waitFor();
    await settle(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    record({ case: `${path.replace(SLUG, "{slug}")} ${width}px ${scheme} ${locale}`, ok: overflow <= 0 && !serious.length && !errors.length, detail: `overflow=${overflow} axe(critical+serious)=${serious.map((v) => `${v.id}:${v.nodes.length}`).join(",") || 0} errors=${errors.length}` });
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}partner-results.json`, `${JSON.stringify({ app: APP, slug: SLUG, results }, null, 2)}\n`);
}
const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
