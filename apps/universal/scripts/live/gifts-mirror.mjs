// Espejo web · the guest gift list in the app (/c/{slug}/regalos, /regalos/{id}, /regalos/{token}), Chrome real against the REAL gateway.
//   APP=http://localhost:8300 WORLD=world.json CHROMIUM_PATH=... node apps/universal/scripts/live/gifts-mirror.mjs
// WORLD: { slug, guestToken, items: [{ id, title, amountMinor }] } of a published celebration with an approved gift list
// (the token is read from the file and never printed). Writes screenshots and gifts-results.json to docs/progress/evidence/espejo-web-movil/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:8300";
const world = JSON.parse(readFileSync(process.env.WORLD ?? "", "utf8"));
const OUT = fileURLToPath(new URL("../../../../docs/progress/evidence/espejo-web-movil/", import.meta.url));
const { slug, guestToken: token } = world;
assert.ok(slug && token && world.items?.length, "WORLD needs slug, guestToken and items");
mkdirSync(OUT, { recursive: true });

const results = [];
const record = (entry) => { results.push({ ...entry, at: new Date().toISOString() }); console.log(`${entry.ok ? "PASS" : "FAIL"} ${entry.case}${entry.detail ? ` · ${entry.detail}` : ""}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
async function open(width = 360, scheme = "light", locale = "es-BO") {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, colorScheme: scheme, locale });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  const errors = [];
  const bearer = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|status of 40[14]/.test(message.text())) errors.push(message.text()); });
  page.on("request", (request) => { if (/\/gifts\/celebrations\/[^/]+\/items/.test(request.url())) bearer.push(request.headers()["authorization"] === `Bearer ${token}`); });
  return { context, page, errors, bearer };
}
const visible = (page, id) => page.locator(`[data-testid="${id}"]`).filter({ visible: true });
const settle = async (page) => { await page.waitForLoadState("networkidle").catch(() => undefined); await page.waitForTimeout(500); };
const giftRows = (page) => page.locator("[data-testid^='gift-']").filter({ visible: true }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")).filter((id) => /^gift-[0-9a-f]{8}-[0-9a-f]{4}-/.test(id ?? "")));
const cheapest = [...world.items].sort((a, b) => a.amountMinor - b.amountMinor);

try {
  // 1 · The personal link opens the list with the credential as Bearer, and keeps it for the session.
  {
    const { context, page, errors, bearer } = await open();
    await page.goto(`${APP}/c/${slug}/regalos/${encodeURIComponent(token)}`);
    await visible(page, "gift-count").waitFor();
    await settle(page);
    const rows = await giftRows(page);
    const kept = await page.evaluate((key) => sessionStorage.getItem(key), `rsvp.guest.credential.${slug}`);
    record({ case: "A14 personal link → list", ok: rows.length === world.items.length && bearer.length > 0 && bearer.every(Boolean) && kept === token && !errors.length, detail: `rows=${rows.length}/${world.items.length} bearer=${bearer.every(Boolean)} kept=${kept === token} errors=${errors.length}` });

    // 2 · Same tab, address without the token: the list opens from the kept credential.
    await page.goto(`${APP}/c/${slug}/regalos`);
    await visible(page, "gift-count").waitFor();
    await settle(page);
    record({ case: "A14 /c/{slug}/regalos with the kept credential", ok: (await giftRows(page)).length === world.items.length && !page.url().includes(token), detail: page.url().replace(APP, "") });

    // 3 · Filters, as on the web: max price, only available, source.
    const limit = Math.floor(cheapest[1].amountMinor / 100);
    await visible(page, "filter-max-price").fill(String(limit));
    await page.waitForTimeout(300);
    const underLimit = world.items.filter((item) => item.amountMinor <= limit * 100).length;
    const count = await visible(page, "gift-count").textContent();
    record({ case: "Filters · max price", ok: (await giftRows(page)).length === underLimit, detail: `max=${limit} rows=${(await giftRows(page)).length} expected=${underLimit} count="${count}"` });
    await page.getByRole("radio", { name: "De nuestros aliados" }).filter({ visible: true }).click();
    await page.waitForTimeout(300);
    const emptyShown = await page.getByText("Ningún regalo coincide con estos filtros.").filter({ visible: true }).count();
    record({ case: "Filters · source partner (none in this list) → filtered empty state", ok: emptyShown === 1 && (await giftRows(page)).length === 0, detail: `empty=${emptyShown}` });
    await visible(page, "filter-clear").click();
    await page.waitForTimeout(300);
    record({ case: "Filters · clear", ok: (await giftRows(page)).length === world.items.length });
    await page.screenshot({ path: `${OUT}regalos-lista-360.png`, fullPage: true });

    // 4 · A gift's own page at the web's address.
    const first = cheapest[0];
    await visible(page, `open-${first.id}`).click();
    await page.waitForURL(`**/c/${slug}/regalos/${first.id}`);
    await visible(page, `gift-${first.id}`).waitFor();
    await settle(page);
    const heading = (await page.getByRole("heading", { level: 1 }).filter({ visible: true }).first().textContent())?.trim();
    record({ case: "A15 detail /c/{slug}/regalos/{id}", ok: heading === first.title && (await giftRows(page)).length === 1, detail: `h1="${heading}"` });
    await page.screenshot({ path: `${OUT}regalos-detalle-360.png`, fullPage: true });

    // 5 · "Ver en la tienda" opens the host's store link outside the app. The seed uses the reserved `.example` domain, which never
    //     resolves, so the evidence is the URL the new tab requested, not the page it loaded.
    const [popupRequest] = await Promise.all([context.waitForEvent("request", (request) => request.url().includes("tienda.example")), visible(page, `store-${first.id}`).click()]);
    record({ case: "Store link opens outside", ok: new URL(popupRequest.url()).hostname === "tienda.example", detail: popupRequest.url() });
    for (const other of context.pages()) if (other !== page) await other.close();
    await context.close();
  }

  // 6 · Negative: a new tab without the link has no anonymous list; it asks for the link.
  {
    const { context, page } = await open();
    await page.goto(`${APP}/c/${slug}/regalos`);
    await page.getByText("Abre tu enlace de invitación").filter({ visible: true }).waitFor();
    await page.screenshot({ path: `${OUT}regalos-sin-enlace-360.png`, fullPage: true });
    record({ case: "Negative · no credential → asks for the link (401)", ok: true });
    await context.close();
  }

  // 7 · Negative: a forged token is refused and forgotten.
  {
    const { context, page } = await open();
    const forged = "Q".repeat(43);
    await page.goto(`${APP}/c/${slug}/regalos/${forged}`);
    await page.getByText("Tu enlace ya no funciona").filter({ visible: true }).waitFor();
    await page.waitForTimeout(300);
    const kept = await page.evaluate((key) => sessionStorage.getItem(key), `rsvp.guest.credential.${slug}`);
    record({ case: "Negative · forged token → expired, credential forgotten", ok: kept === null, detail: `kept=${kept}` });
    await context.close();
  }

  // 8 · Every width, scheme and language with axe.
  for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    const { context, page, errors } = await open(width, scheme, locale);
    await page.goto(`${APP}/c/${slug}/regalos/${encodeURIComponent(token)}`);
    await visible(page, "gift-count").waitFor();
    await settle(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    if (width !== 360 || scheme !== "light" || locale !== "es-BO") await page.screenshot({ path: `${OUT}regalos-${width}-${scheme}-${locale}.png`, fullPage: true });
    record({ case: `A14 ${width}px ${scheme} ${locale}`, ok: overflow <= 0 && !serious.length && !errors.length, detail: `overflow=${overflow} axe(critical+serious)=${serious.map((v) => `${v.id}:${v.nodes.length}`).join(",") || 0} errors=${errors.length}` });
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}gifts-results.json`, `${JSON.stringify({ app: APP, slug, results }, null, 2)}\n`);
}
const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
