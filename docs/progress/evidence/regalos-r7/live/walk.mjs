import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire("/home/user/RSVPFrontend/package.json");
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default ?? require("@axe-core/playwright");
const OUT = "/home/user/RSVPFrontend/docs/progress/evidence/regalos-r7/screens";
const world = () => JSON.parse(readFileSync("/var/tmp/r7-live/world.json", "utf8"));
const W = world();
const APP = "http://localhost:8310", GW = "http://localhost:28300";
const results = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(ok ? "PASS" : "FAIL", name, detail); };
const be = async (method, path, { as, body, headers = {} } = {}) => {
  const r = await fetch(world().base + path, { method, headers: { ...(as ? { authorization: `Bearer ${as}` } : {}), ...(body ? { "content-type": "application/json" } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : undefined };
};
const C = W.celebrationId;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const axeRun = async (page, label) => {
  await page.waitForTimeout(1800); // let the entrance animations settle: contrast is measured on the settled state
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  note(`axe ${label}`, bad.length === 0, bad.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")}`).join("; ") || `${r.violations.length} minor/moderate, 0 critical/serious`);
  return r;
};
async function open(page, scheme) {
  await page.goto(`${APP}/regalos?c=${C}`);
  await page.getByTestId(`gift-${W.items.dead}`).waitFor({ timeout: 60000 });
}
// 1 · real-backend facts that need no UI
{
  const host = await be("GET", `/celebrations/${C}/items`, { as: W.hostToken });
  const dead = host.body.items.find((i) => i.id === W.items.dead);
  note("BE host list: dead gift is availability UNAVAILABLE, status AVAILABLE, reason OUT_OF_STOCK", dead.availability === "UNAVAILABLE" && dead.status === "AVAILABLE" && dead.unavailableReason === "OUT_OF_STOCK", JSON.stringify({ a: dead.availability, s: dead.status, r: dead.unavailableReason }));
  const guest = await be("GET", `/celebrations/${C}/items`, { as: W.guestSecret });
  note("BE guest list: the UNAVAILABLE gifts are NOT sent to a guest (contract decision 2026-11-26)", guest.status === 200 && !guest.body.items.some((i) => [W.items.dead, W.items.deadNoReplacements].includes(i.id)), `guest sees ${guest.body.items.length} item(s)`);
  const g403 = await be("GET", `/celebrations/${C}/items/${W.items.dead}/replacements`, { as: W.guestSecret });
  note("BE 403 replacements for a guest credential", g403.status === 403, String(g403.status));
  const nf = await be("GET", `/celebrations/${C}/items/00000000-0000-4000-8000-000000000000/replacements`, { as: W.hostToken });
  note("BE 404 replacements for an unknown gift", nf.status === 404, String(nf.status));
  const na = await be("GET", `/celebrations/${C}/items/${W.items.dead}/replacements`);
  note("BE 401 replacements without token", na.status === 401, String(na.status));
}
for (const [width, scheme, locale] of [[360, "light", "es-BO"], [768, "dark", "es-BO"], [1280, "light", "en-US"]]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale, colorScheme: scheme });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  const tag = `${width}-${scheme}-${locale}`;
  await fetch(`${GW}/__r7/blackout?mode=`);
  await open(page, scheme);
  const es = locale === "es-BO";
  const status = await page.getByTestId(`gift-status-${W.items.dead}`).innerText();
  note(`[${tag}] dead gift chip says ${es ? "No disponible" : "Unavailable"}`, status.trim().toLowerCase() === (es ? "no disponible" : "unavailable"), status);
  const reason = await page.getByTestId(`gift-unavailable-reason-${W.items.dead}`).innerText();
  note(`[${tag}] reason shown`, reason === (es ? "Se agotó." : "It is out of stock."), reason);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/host-list-${tag}.png`, fullPage: true });
  await page.getByTestId(`replacements-toggle-${W.items.dead}`).click();
  await page.getByTestId(`replacements-${W.items.dead}`).waitFor();
  await page.getByTestId(new RegExp(`^swap-${W.items.dead}-`)).first().waitFor().catch(() => undefined);
  const swaps = await page.locator(`[data-testid^="swap-${W.items.dead}-"]`).count();
  note(`[${tag}] 3 replacements of the same idea`, swaps === 3, String(swaps));
  const log = await (await fetch(`${GW}/__r7/log`)).json();
  note(`[${tag}] replacements read with eventType`, log.some((l) => l.includes(`/items/${W.items.dead}/replacements`) && l.includes("eventType=WEDDING")), log.filter((l) => l.includes("replacements")).slice(-1)[0]);
  await page.screenshot({ path: `${OUT}/host-replacements-${tag}.png`, fullPage: true });
  await axeRun(page, `host list + panel ${tag}`);
  // keyboard: the toggle is reachable and exposes its state
  const expanded = await page.getByTestId(`replacements-toggle-${W.items.dead}`).getAttribute("aria-expanded");
  note(`[${tag}] toggle exposes aria-expanded=true`, expanded === "true", String(expanded));
  await context.close();
}
// 2 · negative: 503 and network on the replacements read, then recovery with «Reintentar»
{
  const context = await browser.newContext({ viewport: { width: 768, height: 900 }, locale: "es-BO" });
  context.setDefaultTimeout(40000);
  const page = await context.newPage();
  for (const mode of ["503", "network"]) {
    await fetch(`${GW}/__r7/blackout?mode=${mode}`);
    await open(page);
    await page.getByTestId(`replacements-toggle-${W.items.dead}`).click();
    const err = await page.getByTestId(`replacements-error-${W.items.dead}`).waitFor({ timeout: 40000 }).then(() => page.getByTestId(`replacements-error-${W.items.dead}`).innerText());
    note(`[${mode}] error shown, nothing changed`, /No se cambió nada/.test(err), err);
    await page.screenshot({ path: `${OUT}/host-replacements-error-${mode}.png`, fullPage: true });
    await fetch(`${GW}/__r7/blackout?mode=`);
    await page.getByTestId(`replacements-retry-${W.items.dead}`).click();
    await page.locator(`[data-testid^="swap-${W.items.dead}-"]`).first().waitFor();
    note(`[${mode}] «Reintentar» loads the replacements`, true);
  }
  await context.close();
}
// 3 · the gift with an idea nobody serves: empty state
{
  const context = await browser.newContext({ viewport: { width: 768, height: 900 }, locale: "es-BO" });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  await open(page);
  await page.getByTestId(`replacements-toggle-${W.items.deadNoReplacements}`).click();
  await page.getByTestId(`replacements-empty-${W.items.deadNoReplacements}`).waitFor();
  note("empty replacements shows the empty state with the catalog action", true);
  await page.screenshot({ path: `${OUT}/host-replacements-empty.png`, fullPage: true });
  await context.close();
}
// 4 · the one-touch swap, against the real gift-list-service
{
  const context = await browser.newContext({ viewport: { width: 768, height: 900 }, locale: "es-BO" });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  await open(page);
  await page.getByTestId(`replacements-toggle-${W.items.dead}`).click();
  const first = page.locator(`[data-testid^="swap-${W.items.dead}-"]`).first();
  await first.waitFor();
  const listing = (await first.getAttribute("data-testid")).slice(`swap-${W.items.dead}-`.length);
  await first.click();
  await page.getByTestId("gift-swapped").waitFor();
  const msg = await page.getByTestId("gift-swapped").innerText();
  note("swap success notice", /Cambiaste «Juego de platos» por «/.test(msg), msg);
  await page.screenshot({ path: `${OUT}/host-after-swap.png`, fullPage: true });
  const after = await be("GET", `/celebrations/${C}/items`, { as: world().hostToken });
  const added = after.body.items.find((i) => i.productListingId === listing);
  note("BE: the replacement exists with the same idea, quantity 2 and group switch", !!added && added.giftIdeaCode === "TABLEWARE" && added.quantity === 2 && added.groupGiftEnabled === true && added.availability === "AVAILABLE", JSON.stringify(added && { idea: added.giftIdeaCode, q: added.quantity, g: added.groupGiftEnabled, av: added.availability }));
  note("BE: the unavailable gift stays on the list, marked", after.body.items.find((i) => i.id === W.items.dead)?.availability === "UNAVAILABLE");
  const guest = await be("GET", `/celebrations/${C}/items`, { as: world().guestSecret });
  note("BE guest now sees the replacement and still not the dead gift", guest.body.items.some((i) => i.productListingId === listing) && !guest.body.items.some((i) => i.id === W.items.dead));
  const again = await be("GET", `/celebrations/${C}/items/${W.items.dead}/replacements`, { as: world().hostToken });
  note("BE: the swapped product is no longer offered as a replacement", !again.body.items.some((r) => r.listingId === listing), `${again.body.items.length} left`);
  const dup = await be("POST", `/celebrations/${C}/items/batch`, { as: world().hostToken, body: { items: [{ productListingId: listing, giftIdeaCode: "TABLEWARE", quantity: 2, groupGiftEnabled: true }] }, headers: { "idempotency-key": "r7-dup-" + Date.now() } });
  note("BE 422 when the idea already has a live gift (DUPLICATE_GIFT_IDEA)", dup.status === 422 && dup.body.code === "DUPLICATE_GIFT_IDEA", `${dup.status} ${dup.body?.code}`);
  await context.close();
}
// 5 · guest card (app). The REAL gift-list never sends an UNAVAILABLE gift to a guest, so the payload of ONE gift is marked by the gateway (SIMULATED) to see and scan the card.
for (const [width, scheme, locale] of [[360, "light", "es-BO"], [1280, "dark", "en-US"]]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale, colorScheme: scheme });
  context.setDefaultTimeout(40000);
  const page = await context.newPage();
  const tag = `${width}-${scheme}-${locale}`;
  const id = world().items.alive;
  const es = locale === "es-BO";
  await fetch(`${GW}/__r7/inject?on=0`);
  await page.goto(`${APP}/c/ana-y-luis/regalos/${world().guestSecret}`);
  await page.getByTestId(`gift-${id}`).waitFor();
  const normal = await page.getByTestId(`reserve-${id}`).count();
  note(`[guest ${tag}] real payload: normal card with its reserve button`, normal === 1, `reserve buttons: ${normal}`);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/guest-available-${tag}.png`, fullPage: true });
  await fetch(`${GW}/__r7/inject?on=1`);
  await page.goto(`${APP}/c/ana-y-luis/regalos/${world().guestSecret}`);
  await page.getByTestId(`gift-unavailable-note-${id}`).waitFor();
  const text = await page.getByTestId(`gift-unavailable-note-${id}`).innerText();
  note(`[guest ${tag}] SIMULATED UNAVAILABLE: muted card says the sentence`, text === (es ? "El proveedor ya no lo ofrece" : "The provider no longer offers this"), text);
  const controls = await page.locator(`[data-testid="gift-${id}"] button, [data-testid="gift-${id}"] [role="button"]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")).filter((t) => t && /^(reserve|whatsapp|partner|store|units)-/.test(t)));
  note(`[guest ${tag}] no reserve / store / WhatsApp / units control`, controls.length === 0, JSON.stringify(controls));
  const links = await page.locator(`[data-testid="gift-${id}"] a[href*="/r/"]`).count();
  note(`[guest ${tag}] no /r/ partner link`, links === 0, String(links));
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/guest-unavailable-${tag}.png`, fullPage: true });
  await axeRun(page, `guest unavailable card ${tag}`);
  await fetch(`${GW}/__r7/inject?on=0`);
  await context.close();
}
await browser.close();
writeFileSync("/var/tmp/r7-live/results.json", JSON.stringify(results, null, 1));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
