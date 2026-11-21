// The app's partner links reach the public site's redirector, not the app's own domain, when the two live on different
// domains (TEST). Chrome real against the REAL gateway; the contact is opened and the redirector's answer is read.
//   APP=http://localhost:8330 SITE=https://rsvp-web… SLUG=<verified partner> CHROMIUM_PATH=... node apps/universal/scripts/live/partner-redirector-origin.mjs
// The app must be exported with EXPO_PUBLIC_SITE_URL=$SITE and an EXPO_PUBLIC_RSVP_ORIGIN on another domain.
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8330";
const SITE = process.env.SITE ?? "";
const SLUG = process.env.SLUG ?? "";
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
assert.ok(SITE && SLUG, "SITE and SLUG are required");
mkdirSync(OUT, { recursive: true });
const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: "es-BO" });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  await page.goto(`${APP}/p/${SLUG}`);
  await page.locator('[data-testid="partner-contact"]').filter({ visible: true }).waitFor();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const buttons = await page.locator('[data-testid^="contact-"]').filter({ visible: true }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
  assert.ok(buttons.length, "the partner has no contact buttons");
  for (const id of buttons) {
    const [request] = await Promise.all([
      context.waitForEvent("request", (candidate) => candidate.url().includes("/r/")),
      page.locator(`[data-testid="${id}"]`).filter({ visible: true }).click()
    ]);
    const response = await request.response();
    const url = new URL(request.url());
    const status = response?.status() ?? 0;
    const location = response ? (await response.allHeaders())["location"] ?? "" : "";
    record({ case: `${id} → public site redirector`, ok: url.origin === new URL(SITE).origin && url.pathname.startsWith("/r/") && url.searchParams.get("surface") === "APP" && status === 302 && Boolean(location),
      detail: `${url.origin}${url.pathname}?${url.searchParams.toString()} → ${status} ${location.slice(0, 60)}` });
    for (const other of context.pages()) if (other !== page) await other.close();
  }
  await context.close();
} finally {
  await browser.close();
  writeFileSync(`${OUT}redirector-origin-results.json`, `${JSON.stringify({ app: APP, site: SITE, slug: SLUG, results }, null, 2)}\n`);
}
const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
