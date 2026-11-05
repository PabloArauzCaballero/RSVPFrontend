// F24 + F28 against the REAL backend: the directory reports impressions per batch (IntersectionObserver) and the provider's
// metrics (GET /providers/{id}/metrics) show them with a real CTR once a click is recorded through /r/{listingId}.
//   WORLD=world.json (node apps/seo-web/scripts/live-world.mjs) CHROMIUM_PATH=... node apps/seo-web/scripts/e2e-live-impressions.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chromium } from "playwright";

const API = "http://localhost:28000", SITE = "http://localhost:3000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const out = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F24/", import.meta.url));
mkdirSync(out, { recursive: true });
const login = async () => (await (await fetch(`${API}/identity/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: world.provider.email, password: world.password }) })).json()).accessToken;
const metrics = async (token) => (await (await fetch(`${API}/providers/${world.provider.id}/metrics`, { headers: { authorization: `Bearer ${token}` } })).json());
const token = await login();
const before = await metrics(token);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO" })).newPage();
const posts = [];
page.on("request", (r) => { if (r.url().endsWith("/providers/impressions")) posts.push({ method: r.method(), body: r.postData(), headers: r.headers() }); });
const responses = [];
page.on("response", (r) => { if (r.url().endsWith("/providers/impressions")) responses.push(r.status()); });
// The directory has no free-text search: walk the pages of the category until this provider's listing is on screen, scrolling each page.
const mine = new Set(world.listings.map((l) => l.id));
let found = false, pageNo = 1, cards = 0;
for (; pageNo <= 12 && !found; pageNo += 1) {
  await page.goto(`${SITE}/proveedores/buscar?categoria=catering${pageNo > 1 ? `&page=${pageNo}` : ""}`, { waitUntil: "networkidle" });
  const total = await page.locator("[data-listing-id]").count();
  if (!total) break;
  cards += total;
  for (let y = 0; y < 20; y += 1) { await page.mouse.wheel(0, 500); await page.waitForTimeout(150); }
  await page.waitForTimeout(2500);
  found = (await page.locator("[data-listing-id]").evaluateAll((nodes, ids) => nodes.some((n) => ids.includes(n.dataset.listingId)), [...mine]));
  if (found) await page.screenshot({ path: join(out, "live-impresiones-directorio-1280.png"), fullPage: true });
}
const ids = new Set(posts.flatMap((p) => JSON.parse(p.body).listingIds));
const ownReported = [...ids].filter((id) => mine.has(id)).length;
// a click through the redirect route, then metrics
const listingId = world.listings[0].id;
const click = await fetch(`${SITE}/r/${listingId}?d=WHATSAPP`, { redirect: "manual" }).catch(() => null);
await new Promise((r) => setTimeout(r, 6000));
const after = await metrics(token);
await browser.close();
const result = {
  date: new Date().toISOString(), cardsOnPage: cards, pagesWalked: pageNo - 1, ownListingsFoundOnScreen: found, ownListingsReported: ownReported, impressionPosts: posts.length, distinctIdsReported: ids.size, statuses: responses,
  bodiesOnlyListingIdsAndSurface: posts.every((p) => Object.keys(JSON.parse(p.body)).sort().join() === "listingIds,surface"),
  noCookieOrAuthHeader: posts.every((p) => !p.headers.cookie && !p.headers.authorization),
  clickStatus: click?.status ?? null,
  metricsBefore: before.totals, metricsAfter: after.totals
};
writeFileSync(join(out, "live-impresiones.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
