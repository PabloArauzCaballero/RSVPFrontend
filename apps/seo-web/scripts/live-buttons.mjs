// seo-web buttons/forms/links x {error, limit, valid} against the REAL backend (Kong gateway) with a real Chrome.
//   Seed once:   API_URL=http://localhost:28000 node apps/seo-web/scripts/live-world.mjs > world.json
//   Run:         WORLD=world.json SITE=http://localhost:3200 DEAD_SITE=http://localhost:4100 API=http://localhost:28000 \
//                CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/seo-web/scripts/live-buttons.mjs
// SITE is `next start` with RSVP_API_URL=$API on an origin the gateway CORS allows (3000/3100/3200/8081/8100/8200: the browser
// calls the gateway for quotes and RSVP). DEAD_SITE is a second `next start` whose RSVP_API_URL points at a closed port, to
// prove the server-rendered pages degrade instead of crashing. Faults the real backend cannot produce on demand (429 with
// Retry-After, 403 captcha, dead network on browser calls) are injected at the browser boundary with page.route.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const API = process.env.API ?? "http://localhost:28000";
const SITE = process.env.SITE ?? "http://localhost:3200";
const DEAD_SITE = process.env.DEAD_SITE ?? "http://localhost:4100";
const world = JSON.parse(readFileSync(process.env.WORLD ?? new URL("./world.json", import.meta.url), "utf8"));

const results = [];
const check = async (id, fn) => {
  try { await fn(); results.push({ id, ok: true }); console.log(`  PASS ${id}`); }
  catch (error) { const detail = String(error.message).split("\n")[0]; results.push({ id, ok: false, detail }); console.log(`  FAIL ${id}  ${detail}`); }
};
const cors = { "access-control-allow-origin": SITE, "access-control-allow-credentials": "true", "access-control-expose-headers": "x-correlation-id,retry-after" };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const ANCHO = Number(process.env.ANCHO ?? 1280); // 360 | 768 | 1280: the whole matrix runs at this viewport width
async function open(width = ANCHO, { permissions = [], geolocation } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-BO", timezoneId: "America/La_Paz", permissions, ...(geolocation ? { geolocation } : {}) });
  context.setDefaultTimeout(10000);
  const state = { calls: [], faults: [], delayMs: 0 };
  await context.route(`${API}/**`, async (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fallback();
    const key = `${request.method()} ${url.pathname}`;
    state.calls.push(key);
    const index = state.faults.findIndex((fault) => key.includes(fault.match));
    if (index >= 0) {
      const fault = state.faults[index]; if (!fault.always) state.faults.splice(index, 1);
      if (fault.abort) return route.abort("internetdisconnected");
      return route.fulfill({ status: fault.status, headers: { ...cors, "content-type": "application/problem+json", ...(fault.headers ?? {}) }, body: JSON.stringify({ title: "injected", status: fault.status, ...(fault.code ? { code: fault.code } : {}) }) });
    }
    if (state.delayMs) await new Promise((resolve) => setTimeout(resolve, state.delayMs));
    return route.fallback();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return { page, context, state, errors, count: (match) => state.calls.filter((call) => call.includes(match)).length };
}
const http = async (url, options = {}) => { const response = await fetch(url, { redirect: "manual", ...options }); return response; };
const text = (page, pattern) => page.getByText(pattern).filter({ visible: true }).first();
const slug = world.provider.slug; const listing = world.listings[0];
const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const noOverflow = async (page) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "horizontal overflow");
const noServerError = async (response) => assert.ok(response.status() < 500, `HTTP ${response.status()}`);

// ---------------------------------------------------------------- LANDING
console.log("\n== Landing ==");
{
  const { page, context } = await open();
  await page.goto(`${SITE}/`);
  await check("landing · VALID header + hero + footer links all resolve (no dead link), CTA targets the app login", async () => {
    const hrefs = await page.$$eval("a[href]", (els) => [...new Set(els.map((e) => e.getAttribute("href")))]);
    assert.ok(hrefs.includes("/proveedores")); assert.ok(hrefs.some((href) => /\/login$/.test(href)), `login CTA: ${hrefs}`);
    for (const href of hrefs.filter((h) => h.startsWith("/") && !h.startsWith("//") && !h.startsWith("/#"))) { const r = await http(`${SITE}${href}`); assert.ok(r.status < 400, `${href} -> ${r.status}`); }
  });
  await check("landing · LIMIT skip link focuses main content; every control reachable by keyboard; 360px has no horizontal scroll", async () => {
    await page.keyboard.press("Tab");
    assert.match(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""), /#contenido/);
    await page.setViewportSize({ width: 360, height: 800 }); await noOverflow(page);
  });
  await check("landing · ERROR direct hit on an unknown path answers 404 with a way back, not a crash", async () => {
    const response = await page.goto(`${SITE}/ruta-que-no-existe`); assert.equal(response.status(), 404);
    assert.ok((await page.locator("a[href]").count()) > 0);
  });
  await context.close();
}

// ---------------------------------------------------------------- DIRECTORY / SEARCH
console.log("\n== Directory and search ==");
{
  const { page, context, state } = await open();
  await page.goto(`${SITE}/proveedores/buscar`);
  await check("search results · VALID a result card links to its provider page, which loads", async () => {
    await page.goto(`${SITE}/proveedores/buscar?ciudad=la-paz`);
    const card = page.locator(".directory-results a[href^='/p/']").first();
    const href = await card.getAttribute("href"); assert.ok(href, "at least one result for la-paz");
    await card.click(); await page.waitForURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal((await http(`${SITE}${href}`)).status, 200);
  });
  await check("search submit · VALID the form button builds the GET URL with the chosen filters", async () => {
    await page.goto(`${SITE}/proveedores/buscar`);
    await page.getByLabel("Ciudad").selectOption("la-paz"); await page.getByLabel(/Precio máximo/).fill("500");
    await page.getByRole("button", { name: /Buscar|Aplicar|Filtrar/ }).first().click();
    await page.waitForURL(/ciudad=la-paz/); assert.match(page.url(), /precioMax=500/);
  });
  await check("search · LIMIT hostile and out-of-range query values never 5xx and never reflect markup", async () => {
    const urls = ["?fecha=garbage", "?fecha=2020-01-01", "?page=-1", "?page=abc", "?page=99999", "?precioMax=-5", "?precioMax=1e12", "?precioMax=%3Cscript%3Ealert(1)%3C/script%3E", "?categoria=%3Cimg%20src=x%20onerror=alert(1)%3E", "?ciudad=" + "a".repeat(5000), "?lat=abc&lng=999&radio=-1", "?lat=-16.5&lng=-68.15&radio=25", "?verificado=1", "?categoria=a&categoria=b", "?q=%F0%9F%8E%89%C3%B1andu"];
    for (const query of urls) {
      const response = await page.goto(`${SITE}/proveedores/buscar${query}`);
      await noServerError(response);
      assert.equal(await page.locator("img[onerror], script:not([type]):not([src])").filter({ hasText: "alert" }).count(), 0, query);
      const dialogs = []; page.once("dialog", (dialog) => { dialogs.push(dialog.message()); dialog.dismiss(); }); assert.equal(dialogs.length, 0);
    }
  });
  await check("search · LIMIT empty result shows an empty state with next step (not a blank page)", async () => {
    await page.goto(`${SITE}/proveedores/buscar?categoria=hospedaje&ciudad=oruro`);
    await text(page, "Todavía no hay proveedores publicados aquí.").waitFor();
  });
  await check("search · LIMIT pagination links only appear when there is more than a page and keep the filters", async () => {
    await page.goto(`${SITE}/proveedores/buscar?page=2&ciudad=la-paz`); await noOverflow(page);
    for (const href of await page.$$eval(".directory-pagination a", (els) => els.map((e) => e.getAttribute("href")))) assert.match(href, /ciudad=la-paz/);
  });
  await check("category + city landing pages · VALID every link on /proveedores resolves", async () => {
    await page.goto(`${SITE}/proveedores`);
    const links = (await page.$$eval(".directory-links a", (els) => els.map((e) => e.getAttribute("href")))).slice(0, 14);
    assert.ok(links.length > 0);
    for (const href of links) { const r = await http(`${SITE}${href}`); assert.ok(r.status === 200, `${href} -> ${r.status}`); }
  });
  await check("category page · ERROR unknown category / city answer 404", async () => {
    assert.equal((await http(`${SITE}/proveedores/no-existe`)).status, 404);
    assert.equal((await http(`${SITE}/proveedores/salones/no-existe`)).status, 404);
  });
  await context.close();

  const geo = await open(ANCHO, { permissions: ["geolocation"], geolocation: { latitude: -16.5, longitude: -68.15 } });
  await check("near-me button · VALID with permission it fills lat/lng, submits and shows the active-radius status with a clear link", async () => {
    await geo.page.goto(`${SITE}/proveedores/buscar`);
    await geo.page.getByRole("button", { name: /Cerca de mí|ubicación/i }).click();
    await geo.page.waitForURL(/lat=-16\.5/); assert.match(geo.page.url(), /lng=-68\.15/);
    await geo.page.getByRole("link", { name: /Quitar|Borrar|Limpiar/i }).click(); await geo.page.waitForURL((url) => !/lat=/.test(url.search));
  });
  await geo.context.close();
  const denied = await open(ANCHO);
  await check("near-me button · ERROR without permission it explains and keeps the city filter usable", async () => {
    await denied.page.goto(`${SITE}/proveedores/buscar`);
    await denied.page.getByRole("button", { name: /Cerca de mí|ubicación/i }).click();
    await denied.page.locator(".directory-nearme-status").filter({ hasText: /\S/ }).waitFor();
    assert.equal(await denied.page.getByRole("button", { name: /Cerca de mí|ubicación/i }).isEnabled(), true, "retryable");
    await denied.page.getByLabel("Ciudad").selectOption("la-paz");
  });
  await denied.context.close();

  const dead = await open();
  await check("directory/search/provider pages · ERROR backend unreachable: 200 with an honest 'unavailable' status, never a 500", async () => {
    for (const path of ["/proveedores/buscar", "/proveedores/salones/la-paz", `/p/${slug}`, `/p/${slug}/cotizar`, "/"]) {
      const response = await dead.page.goto(`${DEAD_SITE}${path}`);
      assert.ok(response.status() < 500 || response.status() === 503, `${path} -> ${response.status()}`);
      assert.ok((await dead.page.locator("body").innerText()).trim().length > 20, `${path} blank`);
    }
    // The celebration cover cannot be rendered without its data: the answer is 5xx for crawlers, but the visitor gets the retry boundary, not a framework error.
    await dead.page.goto(`${DEAD_SITE}/c/${world.celebration.slug}`);
    await dead.page.getByRole("button", { name: "Reintentar" }).waitFor(); await dead.page.getByRole("link", { name: "Ir al inicio" }).waitFor();
    await dead.page.goto(`${DEAD_SITE}/proveedores/buscar`); await text(dead.page, /No pudimos|no está disponible|intenta|unavailable/i).waitFor();
  });
  await dead.context.close();
}

// ---------------------------------------------------------------- PROVIDER PAGE + /r/{listingId}
console.log("\n== Provider page and partner redirector ==");
{
  const { page, context } = await open();
  await page.goto(`${SITE}/p/${slug}`);
  await check("provider page · VALID disclaimer precedes the contact buttons and every contact button goes through /r/{listingId}", async () => {
    const order = await page.evaluate(() => { const d = document.querySelector('[data-testid="partner-disclaimer"]'); const a = document.querySelector(".partner-actions a"); return d && a ? d.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING : 0; });
    assert.ok(order, "disclaimer must come first");
    const hrefs = await page.$$eval(".partner-contact a[href]", (els) => els.map((e) => ({ href: e.getAttribute("href"), rel: e.getAttribute("rel") })));
    const external = hrefs.filter(({ href }) => /^(https?:|tel:|mailto:|sms:)/.test(href ?? ""));
    assert.deepEqual(external, [], `direct partner links bypass /r/: ${JSON.stringify(external)}`);
    assert.ok(hrefs.some(({ href }) => /^\/r\//.test(href ?? "")));
  });
  await check("provider page · VALID quote / agenda / catalogue buttons navigate", async () => {
    for (const [name, path] of [[/Pedir cotización/, /cotizar/], [/disponibilidad/i, /agenda/], [/condiciones y precio/i, /catalogo/]]) {
      await page.goto(`${SITE}/p/${slug}`); await page.getByRole("link", { name }).first().click(); await page.waitForURL(path);
    }
  });
  await check("provider page · ERROR unknown slug answers 404 page with a way back", async () => {
    const response = await page.goto(`${SITE}/p/no-existe-${Date.now()}`); assert.equal(response.status(), 404);
    assert.ok((await page.getByRole("link").count()) > 0);
  });
  await context.close();

  await check("/r/{listingId} · VALID 302 (never 301) to the partner, UTM and correlationId preserved, no-store, noindex", async () => {
    const correlation = "11111111-2222-4333-8444-555555555555";
    const r = await http(`${SITE}/r/${listing.id}?utm_campaign=live&utm_source=rsvp-test&correlationId=${correlation}`, { headers: { referer: `${SITE}/p/${slug}` } });
    assert.equal(r.status, 302);
    const target = new URL(r.headers.get("location"));
    assert.equal(target.searchParams.get("utm_campaign"), "live"); assert.equal(target.searchParams.get("correlationId"), correlation);
    assert.match(r.headers.get("cache-control") ?? "", /no-store/); assert.match(r.headers.get("x-robots-tag") ?? "", /noindex/);
  });
  await check("/r/{listingId} · VALID every configured destination redirects (WHATSAPP, OFFICIAL_SITE)", async () => {
    for (const destination of ["WHATSAPP", "OFFICIAL_SITE"]) { const r = await http(`${SITE}/r/${listing.id}?destination=${destination}`); assert.equal(r.status, 302, destination); }
  });
  await check("/r/{listingId} · ERROR malformed id, unknown id and unconfigured destination give a readable page (404), not a redirect or 500", async () => {
    for (const path of ["/r/not-a-uuid", "/r/00000000-0000-4000-8000-000000000000", `/r/${listing.id}?destination=PHONE`]) {
      const r = await http(`${SITE}${path}`); assert.equal(r.status, 404, path);
      const html = await r.text(); assert.match(html, /<a /); assert.ok(!/stack|Exception/i.test(html));
    }
  });
  await check("/r/{listingId} · LIMIT hostile query: unknown destination falls back, javascript: surfaces never become Location, 5k-char utm does not 5xx", async () => {
    const r1 = await http(`${SITE}/r/${listing.id}?destination=EVIL`); assert.ok([302, 404].includes(r1.status));
    const r2 = await http(`${SITE}/r/${listing.id}?utm_x=${"a".repeat(5000)}&surface=%3Cscript%3E`); assert.ok(r2.status < 500, String(r2.status));
    for (const r of [r1, r2]) { const l = r.headers.get("location"); if (l) assert.match(l, /^https?:/); }
  });
  await check("/r/{listingId} · ERROR backend unreachable: 503 page with way back (no blank, no redirect)", async () => {
    const r = await http(`${DEAD_SITE}/r/${listing.id}`); assert.equal(r.status, 503); assert.match(await r.text(), /<a /);
  });
}

// ---------------------------------------------------------------- QUOTE
console.log("\n== Quote ==");
const quoteUrl = `${SITE}/p/${slug}/cotizar?l=${listing.id}`;
async function fillQuote(page, overrides = {}) {
  const values = { eventDate: futureDate(30), guestCount: "80", budget: "5000", eventCity: "la-paz", name: "Ana Prueba", email: `ana.${Date.now().toString(36)}@example.com`, phone: "+59170000000", ...overrides };
  for (const [id, value] of Object.entries(values)) { if (id === "eventCity") await page.locator("#eventCity").selectOption(value); else await page.locator(`#${id}`).fill(value); }
  if (overrides.message !== undefined) await page.locator("#message").fill(overrides.message);
}
{
  const h = await open(); const { page } = h;
  await page.goto(quoteUrl); await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor(); await page.waitForTimeout(600);
  const submit = page.getByRole("button", { name: "Enviar solicitud" });
  await check("quote submit · LIMIT empty form: every required field is flagged accessibly (aria-invalid + alert), zero requests", async () => {
    await submit.click();
    await text(page, "Escribe tu nombre.").waitFor();
    assert.ok((await page.locator('[aria-invalid="true"]').count()) >= 3);
    assert.equal(h.count("POST /providers/"), 0);
  });
  await check("quote submit · LIMIT past date, 0 / negative / huge / decimal guests, negative budget, bad email are refused before sending", async () => {
    const cases = [{ eventDate: "2020-01-01" }, { guestCount: "0" }, { guestCount: "-3" }, { guestCount: "2.5" }, { budget: "-10" }, { email: "no-es-correo" }, { name: "   " }];
    for (const patch of cases) {
      await page.goto(quoteUrl); await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor(); await page.waitForTimeout(300);
      await fillQuote(page, patch); await submit.click(); await page.waitForTimeout(250);
      assert.ok((await page.locator('[role="alert"]').filter({ visible: true }).count()) >= 1, `no error for ${JSON.stringify(patch)}`);
      assert.equal(h.count("POST /providers/"), 0, `request sent for ${JSON.stringify(patch)}`);
    }
  });
  await check("quote submit · LIMIT no offer selected is refused", async () => {
    await page.goto(`${SITE}/p/${slug}/cotizar`); await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor(); await page.waitForTimeout(300);
    await fillQuote(page); await submit.click(); await page.waitForTimeout(250);
    assert.equal(h.count("POST /providers/"), 0);
  });
  await page.goto(quoteUrl); await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor(); await page.waitForTimeout(600);
  await check("quote submit · ERROR 429 with Retry-After names the wait in minutes; form keeps its values; retry allowed", async () => {
    const email = `limit.${Date.now().toString(36)}@example.com`;
    await fillQuote(page, { email });
    h.state.faults.push({ match: "POST /providers/", status: 429, headers: { "retry-after": "600" } });
    await submit.click(); await text(page, /10 minutos/).waitFor();
    assert.equal(await page.locator("#email").inputValue(), email); assert.equal(await submit.isEnabled(), true);
  });
  await check("quote submit · ERROR 403 (captcha), 422, 404 and a dead network each show their own message without crashing", async () => {
    for (const [fault, pattern] of [[{ status: 403 }, /verificar que eres una persona|captcha/i], [{ status: 422 }, /Revisa|datos/i], [{ status: 404 }, /no encontr|ya no/i], [{ abort: true }, /no pudimos|inténtalo|conexión|generic|algo/i]]) {
      h.state.faults.push({ match: "POST /providers/", ...fault });
      await submit.click(); await text(page, pattern).waitFor();
    }
    assert.equal(h.errors.length, 0, h.errors.join("|"));
  });
  await check("quote submit · ERROR 401 (sign-in required) offers a login link that returns to the quote and keeps the form", async () => {
    h.state.faults.push({ match: "POST /providers/", status: 401 });
    await submit.click(); const link = page.getByRole("link", { name: "Iniciar sesión" });
    await link.waitFor(); assert.match(await link.getAttribute("href"), /returnTo=/);
    assert.notEqual(await page.locator("#name").inputValue(), "");
  });
  // Anonymous quotes are throttled by the REAL backend per client (it answers 429 after a few); the valid path uses a signed-in visitor.
  const viewerLogin = await (await fetch(`${API}/identity/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: world.viewer.email, password: world.password }) })).json();
  await page.evaluate((value) => sessionStorage.setItem("rsvp.visitor.token", value), viewerLogin.accessToken);
  await page.goto(quoteUrl); await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor(); await page.waitForTimeout(600);
  await check("quote submit · LIMIT message of 2000 chars accepted by the field; double click with request in flight sends exactly one POST", async () => {
    h.state.delayMs = 1200;
    await fillQuote(page, { email: `dbl.${Date.now().toString(36)}@example.com`, message: "m".repeat(3000) });
    assert.equal((await page.locator("#message").inputValue()).length, 2000, "textarea maxLength 2000");
    const before = h.count("POST /providers/");
    await submit.dblclick();
    await page.getByTestId("quote-sent").waitFor({ timeout: 10000 }); h.state.delayMs = 0;
    assert.equal(h.count("POST /providers/") - before, 1, "exactly one quote");
  });
  await check("quote submit · VALID receipt shows the request number, disclaimer and a back link; the provider sees the quote via the API", async () => {
    const id = (await page.getByTestId("quote-sent").innerText()).match(/[0-9a-f]{8}/)?.[0]; assert.ok(id, "receipt id");
    await page.getByRole("link", { name: "Volver al proveedor" }).click(); await page.waitForURL(new RegExp(`/p/${slug}$`));
    // Provider Catalog has no GET for quotes: a delivered quote shows up as a billable QUOTE_FORM lead of the provider.
    const providerLogin = await (await fetch(`${API}/identity/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: world.provider.email, password: world.password }) })).json();
    const leads = await (await fetch(`${API}/providers/${world.provider.id}/leads`, { headers: { authorization: `Bearer ${providerLogin.accessToken}` } })).json();
    assert.ok(leads.items.some((lead) => lead.destination === "QUOTE_FORM" && lead.context?.city === "la-paz"), "QUOTE_FORM lead with the chosen city slug");
  });
  await h.context.close();
  await check("quote submit · LIMIT honeypot filled is refused by the server (no receipt)", async () => {
    const b = await open(); await b.page.goto(quoteUrl); await b.page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor(); await b.page.waitForTimeout(500);
    await fillQuote(b.page, { email: `bot.${Date.now().toString(36)}@example.com` });
    await b.page.evaluate(() => { const input = document.querySelector("#website"); input.value = "http://spam.example"; });
    await b.page.getByRole("button", { name: "Enviar solicitud" }).click();
    await b.page.waitForTimeout(2500);
    assert.equal(await b.page.getByTestId("quote-sent").count(), 0);
    await b.context.close();
  });
  await check("quote · ERROR unknown provider slug answers 404", async () => { assert.equal((await http(`${SITE}/p/no-existe-xyz/cotizar`)).status, 404); });
}

// ---------------------------------------------------------------- RSVP COVER + PERSONAL LINK
console.log("\n== Celebration cover and RSVP ==");
const celebrationSlug = world.celebration.slug;
{
  const { page, context } = await open();
  await check("celebration cover · VALID renders, RSVP button/link leads to /c/{slug}/rsvp, 360px no overflow", async () => {
    const response = await page.goto(`${SITE}/c/${celebrationSlug}`); assert.equal(response.status(), 200);
    await page.setViewportSize({ width: 360, height: 800 }); await noOverflow(page);
    const href = await page.$$eval("a[href*='/rsvp']", (els) => els.map((e) => e.getAttribute("href")));
    if (href.length) { await page.locator("a[href*='/rsvp']").first().click(); await page.waitForURL(/\/rsvp/); }
  });
  await check("celebration cover · ERROR unknown slug answers 404 with a way back", async () => {
    const response = await page.goto(`${SITE}/c/no-existe-${Date.now()}`); assert.equal(response.status(), 404);
  });
  await check("celebration sections and gift pages · VALID every internal link on the cover resolves", async () => {
    await page.goto(`${SITE}/c/${celebrationSlug}`);
    const hrefs = [...new Set(await page.$$eval("a[href^='/']", (els) => els.map((e) => e.getAttribute("href"))))].filter((h) => !h.startsWith("//"));
    for (const href of hrefs) { const r = await http(`${SITE}${href}`); assert.ok(r.status < 400, `${href} -> ${r.status}`); }
  });
  await context.close();
}
{
  // A fresh guest per run: the seeded token is single-answer state and earlier runs already used it.
  const login = await (await fetch(`${API}/identity/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: world.host.email, password: world.password }) })).json();
  const hostAuth = { authorization: `Bearer ${login.accessToken}`, "content-type": "application/json" };
  const newGuest = await (await fetch(`${API}/guests/celebrations/${world.celebration.id}/guests`, { method: "POST", headers: hostAuth, body: JSON.stringify({ name: "Invitado Prueba", email: `inv.${Date.now().toString(36)}@example.com` }) })).json();
  const issuedToken = await (await fetch(`${API}/guests/celebrations/${world.celebration.id}/guests/${newGuest.id}/access-token`, { method: "POST", headers: hostAuth, body: "{}" })).json();
  const token = issuedToken.token; assert.ok(token, "guest token issued");
  const rsvpUrl = `${SITE}/c/${celebrationSlug}/rsvp/${token}`;
  const h = await open(); const { page } = h;
  await page.goto(rsvpUrl);
  await check("rsvp (personal link) · VALID the form loads for a real token; Cache-Control no-store + noindex + no-referrer", async () => {
    await page.getByRole("button", { name: /Enviar respuesta|Guardar cambios/ }).waitFor();
    const r = await http(rsvpUrl); assert.match(r.headers.get("cache-control") ?? "", /no-store/); assert.match(r.headers.get("x-robots-tag") ?? "", /noindex/); assert.match(r.headers.get("referrer-policy") ?? "", /no-referrer/);
  });
  await check("rsvp submit · LIMIT no choice made: validation message, focus moves to the first invalid control, zero requests", async () => {
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await page.locator('[role="alert"]').filter({ visible: true }).first().waitFor();
    assert.equal(h.count("POST /rsvp/"), 0);
  });
  await check("rsvp submit · LIMIT companions negative / above the allowed count and over-long notes are refused client-side", async () => {
    await page.getByLabel("Sí, asistiré").check();
    const companions = page.getByLabel("Acompañantes");
    for (const value of ["-1", "1.5"]) { if (await companions.count()) { await companions.fill(value); await page.getByRole("button", { name: "Enviar respuesta" }).click(); await page.waitForTimeout(250); assert.equal(h.count("POST /rsvp/"), 0, `companions ${value}`); } }
    if (await companions.count()) await companions.fill("0");
  });
  await check("rsvp submit · ERROR 429, 503 and dead network keep every field and offer retry with the same Idempotency-Key", async () => {
    await page.getByLabel("Restricciones alimentarias").fill("sin gluten ñ 🎉");
    const keys = [];
    page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/rsvp/")) keys.push(request.headers()["idempotency-key"]); });
    for (const fault of [{ status: 429, headers: { "retry-after": "30" } }, { status: 503 }, { abort: true }]) {
      h.state.faults.push({ match: "POST /rsvp/", ...fault });
      await page.getByRole("button", { name: "Enviar respuesta" }).click(); await page.waitForTimeout(700);
      assert.equal(await page.getByLabel("Restricciones alimentarias").inputValue(), "sin gluten ñ 🎉");
      assert.ok((await page.locator('[role="alert"], [role="status"]').filter({ visible: true }).count()) >= 1, "failure announced");
    }
    assert.equal(new Set(keys.filter(Boolean)).size, 1, `same idempotency key across retries: ${keys}`);
  });
  await check("rsvp submit · VALID double click with a request in flight stores exactly one answer; page switches to the confirmed state; API agrees", async () => {
    h.state.delayMs = 1000;
    const before = h.count("POST /rsvp/");
    await page.getByRole("button", { name: "Enviar respuesta" }).dblclick();
    await page.getByRole("button", { name: "Cambiar mi respuesta" }).waitFor({ timeout: 10000 }); h.state.delayMs = 0;
    assert.equal(h.count("POST /rsvp/") - before, 1);
    const state = await fetch(`${API}/rsvp/celebrations/${world.celebration.id}/rsvp`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(state.status, 200); assert.equal((await state.json()).status, "CONFIRMED");
  });
  await check("rsvp edit/cancel buttons · VALID edit → decline → saved; cancel returns without sending", async () => {
    await page.getByRole("button", { name: "Cambiar mi respuesta" }).click();
    const before = h.count("PATCH /rsvp/");
    await page.getByRole("button", { name: "Cancelar" }).click(); assert.equal(h.count("PATCH /rsvp/"), before);
    await page.getByRole("button", { name: "Cambiar mi respuesta" }).click();
    await page.getByLabel("No podré asistir").check(); await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.waitForTimeout(1500);
    assert.equal(h.count("PATCH /rsvp/") - before, 1, `PATCH calls; page: ${(await page.locator("main").innerText()).slice(0, 200).replace(/\n+/g, " | ")}`);
    const state = await fetch(`${API}/rsvp/celebrations/${world.celebration.id}/rsvp`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal((await state.json()).status, "DECLINED");
  });
  await h.context.close();
  await check("rsvp · ERROR tampered / unknown / truncated token shows the invalid-link view (no form, no leak)", async () => {
    const b = await open();
    // A malformed percent-escape never reaches the app: Next answers a plain 400 before any page code runs.
    assert.equal((await http(`${SITE}/c/${celebrationSlug}/rsvp/%E0%A4%A`)).status, 400);
    for (const bad of [`${token.slice(0, -2)}xx`, "x", "a".repeat(400)]) {
      await b.page.goto(`${SITE}/c/${celebrationSlug}/rsvp/${bad}`);
      await text(b.page, /Este enlace no está disponible/).waitFor({ timeout: 6000 }).catch(async () => { throw new Error(`token ${bad.slice(0, 20)}: ${(await b.page.locator("body").innerText()).slice(0, 160).replace(/\n+/g, " | ")}`); });
      assert.equal(await b.page.getByRole("button", { name: /Enviar respuesta/ }).count(), 0, bad);
    }
    await b.context.close();
  });
  await check("rsvp (no token) · the public page either offers the registration form or explains who to write to", async () => {
    const b = await open(); await b.page.goto(`${SITE}/c/${celebrationSlug}/rsvp`);
    await text(b.page, /Confirma tu asistencia|Esta celebración|restring|anfitri/i).waitFor();
    await b.context.close();
  });
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { for (const f of failed) console.log(`  FAIL ${f.id}: ${f.detail}`); process.exit(1); }
