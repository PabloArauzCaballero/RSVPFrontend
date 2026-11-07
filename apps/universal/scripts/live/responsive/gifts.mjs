// Responsive + i18n + a11y matrix for the gifts / guest-RSVP area: Chrome real against the exported web app and the REAL gateway.
//   WORLD=world.json APP=http://localhost:3100 API=http://localhost:28000 CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/live/responsive/gifts.mjs [pages|flows]
// Env: WIDTHS=360,768,1280  LANGS=es-BO,en-US  SCHEMES=light,dark  RESULTS=out.json  GREP=text
// pages: every route of the area x width x language x scheme, signed in through the login screen (host) and with the link credential (guest):
//   (a) no pageerror / console.error (the anonymous 401 of the session refresh is excluded) (b) no horizontal scroll (c) no raw i18n keys, no Spanish UI literals in en-US
//   (d) axe WCAG 2.1 A/AA without serious/critical (e) touch targets >= 44 px high at 360 (f) dark: background probe (host fixed light, guest reported).
// flows: en-US, valid end-to-end flows driven by testID with a direct GET after each one, plus one network-down flow.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = process.env.APP ?? "http://localhost:3100";
const API = process.env.API ?? "http://localhost:28000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const C = world.celebration.id;
const SLUG = world.celebration.slug;
const GUEST_TOKEN = world.guest.issued.token;
const WIDTHS = (process.env.WIDTHS ?? "360,768,1280").split(",").map(Number);
const LANGS = (process.env.LANGS ?? "es-BO,en-US").split(",");
const SCHEMES = (process.env.SCHEMES ?? "light,dark").split(",");
const only = process.argv[2];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rows = [];

async function http(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: response.status, json };
}
let cached = { token: "", at: 0 };
async function hostToken() {
  if (Date.now() - cached.at < 8 * 60 * 1000) return cached.token;
  const login = await http("POST", "/identity/auth/login", { body: { email: world.host.email, password: world.password } });
  assert.equal(login.status, 200, `host login ${login.status}`);
  cached = { token: login.json.accessToken, at: Date.now() };
  return cached.token;
}
const host = async (method, path, body, headers) => http(method, path, { token: await hostToken(), body, headers });
const items = async () => (await host("GET", `/gifts/celebrations/${C}/items`)).json.items;
async function setSettings(patch) {
  const { json: current } = await host("GET", `/celebrations/${C}`);
  const r = await host("PUT", `/celebrations/${C}/settings`, patch, { "if-match": String(current.version) });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  await sleep(2500);
}
let seq = 0;
const uniq = (p) => `${p} ${world.stamp}-${Date.now().toString(36)}-${seq++}`;
async function addGift(title) {
  const r = await host("POST", `/gifts/celebrations/${C}/items`, { source: "EXTERNAL", title, price: { amountMinor: 5000, currency: "BOB" }, url: "https://shop.example/x", partnerSuggestionsAcknowledged: true });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json;
}
async function newGuest(allowedCompanions = 2) {
  const guest = await host("POST", `/guests/celebrations/${C}/guests`, { name: uniq("Guest"), email: `g-${crypto.randomUUID().slice(0, 8)}@example.test`, allowedCompanions }, { "idempotency-key": crypto.randomUUID() });
  assert.equal(guest.status, 201, JSON.stringify(guest.json));
  const issued = await host("POST", `/guests/celebrations/${C}/guests/${guest.json.id}/access-token`, {});
  assert.equal(issued.status, 201, JSON.stringify(issued.json));
  return { id: guest.json.id, token: issued.json.token };
}

// ---------------------------------------------------------------- browser helpers
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const rsvpHits = [];
/** Kong limits /rsvp to 30/min per IP: wait until this run has used fewer than 14 in the last 60 s. */
async function rsvpBudget() { for (;;) { const now = Date.now(); if (rsvpHits.filter((t) => now - t < 60_000).length < 14) return; await sleep(3000); } }

const LOGIN = { email: /^(Correo electrónico|Email)$/, password: /^(Contraseña|Password)$/, submit: /^(Iniciar sesión|Sign in)$/ };
async function newSession({ width, lang, scheme, signedIn }) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: lang, colorScheme: scheme });
  context.setDefaultTimeout(25000);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location()?.url ?? "";
    // The anonymous session probe (refresh) answers 401 by design; any other failing resource or console error counts.
    if (/Failed to load resource/.test(message.text()) && /\/auth\/(refresh|session)/.test(url) && /401/.test(message.text())) return;
    errors.push(`console.error: ${message.text()} ${url}`.slice(0, 260));
  });
  page.on("request", (r) => { if (r.url().includes("/rsvp/")) rsvpHits.push(Date.now()); });
  if (signedIn) {
    await page.goto(`${APP}/login`);
    await page.getByLabel(LOGIN.email).filter({ visible: true }).first().fill(world.host.email);
    await page.getByLabel(LOGIN.password).filter({ visible: true }).first().fill(world.password);
    await page.getByRole("button", { name: LOGIN.submit }).filter({ visible: true }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
    errors.length = 0;
  }
  return { page, context, errors };
}
async function open(page, path, waitFor) {
  await page.goto(`${APP}${path}`);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  if (waitFor) await page.locator(waitFor).first().waitFor({ timeout: 25000 }).catch(() => undefined);
  await sleep(900);
}

const RAW_KEY = /\b(?:gifts|rsvp|host|invitation|stubs|partner|directory|common|auth|errors|celebration|guests)\.[A-Za-z][\w]*(?:\.[\w]+)*\b/g;
const SPANISH_UI = /\b(Reservar|Guardar|Cancelar|Cargando|Reintentar|Iniciar sesión|Confirmar mi asistencia|Lista de regalos|Regalos|Invitación|Aprobar|Rechazar|Agregar regalo|Buscar)\b/;

async function probe(page) {
  return page.evaluate((width) => {
    const out = {};
    out.text = document.body.innerText;
    out.scrollOk = document.documentElement.scrollWidth <= window.innerWidth + 1;
    out.scrollWidth = document.documentElement.scrollWidth;
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const sel = 'button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],[role="tab"],input:not([type="hidden"]),textarea,select,a[href]';
    const small = [];
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue; // inline links in running text are exempt (WCAG 2.5.8)
      if (r.height < 43.5) small.push(`${el.getAttribute("data-testid") ?? el.getAttribute("role") ?? el.tagName}:${Math.round(r.height)}px "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`);
    }
    out.small = small;
    // Background at the bottom-centre of the viewport: first non-transparent ancestor.
    let el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 6);
    let bg = "rgba(0, 0, 0, 0)";
    while (el) { const c = getComputedStyle(el).backgroundColor; if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") { bg = c; break; } el = el.parentElement; }
    out.bg = bg;
    const m = bg.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
    out.lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    return out;
  }, 0);
}

async function scan(page, errors, label, { lang, width, scheme, ignoreResourceErrors = false }) {
  const p = await probe(page);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const shownErrors = ignoreResourceErrors ? errors.filter((e) => !/Failed to load resource/.test(e)) : errors;
  const keys = [...new Set((p.text.match(RAW_KEY) ?? []))];
  const spanish = lang === "en-US" ? [...new Set(p.text.match(new RegExp(SPANISH_UI, "g")) ?? [])] : [];
  const checks = {
    errors: [shownErrors.length === 0, shownErrors.slice(0, 2).join(" || ")],
    noHScroll: [p.scrollOk, `scrollWidth ${p.scrollWidth} > ${width}`],
    noRawKeys: [keys.length === 0, keys.join(", ")],
    noSpanishInEn: [spanish.length === 0, spanish.join(", ")],
    axe: [bad.length === 0, bad.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")} :: ${(v.nodes[0]?.failureSummary ?? "").split("\n")[1] ?? ""}`).join("; ")],
    touch44: width === 360 ? [p.small.length === 0, p.small.slice(0, 6).join(", ")] : [true, "n/a (>360)"],
    notBlank: [p.text.trim().length > 30, "blank page"]
  };
  const fails = Object.entries(checks).filter(([, [ok]]) => !ok);
  rows.push({ label, width, lang, scheme, bg: p.bg, lum: Number(p.lum.toFixed(2)), status: fails.length ? "FAIL" : "PASS", fails: fails.map(([k, [, detail]]) => `${k}: ${detail}`) });
  console.log(`${fails.length ? "FAIL" : "PASS"} ${label} | ${width} ${lang} ${scheme} | bg ${p.bg}${fails.length ? ` | ${fails.map(([k, [, d]]) => `${k}: ${d}`).join(" ; ")}` : ""}`);
  errors.length = 0;
}

// ---------------------------------------------------------------- pages
const HC = `?c=${C}`;
const HOST_ROUTES = [["/regalos", "host /regalos"], ["/regalos/catalogo", "host /regalos/catalogo"], ["/regalos/proveedores", "host /regalos/proveedores"], ["/regalos/externo", "host /regalos/externo"], ["/bandeja/regalos", "host /bandeja/regalos"]];
const grep = (label) => !process.env.GREP || label.includes(process.env.GREP);

/** The press can land before hydration finishes: press again until the dialog is up. */
async function openDialog(page, id) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.locator(`[data-testid="${id}"]`).click();
    if (await page.getByTestId("reserve-confirm").waitFor({ timeout: 4000 }).then(() => true, () => false)) return;
  }
  throw new Error("reserve dialog did not open");
}

async function pagesSuite() {
  // Data the screens should show: available gifts, proposals, a pending reservation.
  await setSettings({ giftReservationMode: "AUTO_ACCEPT", externalGiftMode: "AUTO_ACCEPT", partnerPriorityEnabled: false });
  for (let i = 0; i < 2; i += 1) await addGift(uniq("Available gift"));
  await setSettings({ externalGiftMode: "RESTRICTED" });
  for (let i = 0; i < 2; i += 1) await addGift(uniq("Proposed gift"));
  for (const width of WIDTHS) for (const lang of LANGS) for (const scheme of SCHEMES) {
    const ctx = { width, lang, scheme };
    // ---- host
    if (HOST_ROUTES.some(([, l]) => grep(l))) {
      const { page, context, errors } = await newSession({ ...ctx, signedIn: true });
      for (const [path, label] of HOST_ROUTES) {
        if (!grep(label)) continue;
        try { await open(page, `${path}${HC}`, '[role="main"], h1, [role="heading"]'); await scan(page, errors, label, ctx); }
        catch (error) { rows.push({ label, ...ctx, status: "FAIL", fails: [String(error.message).split("\n")[0]] }); console.log(`FAIL ${label} | ${width} ${lang} ${scheme} | ${String(error.message).split("\n")[0]}`); }
      }
      await context.close();
    }
    // ---- guest (link credential, no account)
    const guestRoutes = [
      ["/invitacion", "guest /invitacion"], [`/rsvp/${GUEST_TOKEN}`, "guest /rsvp/{token} (resolves)"], [`/c/${SLUG}/rsvp/${GUEST_TOKEN}`, "guest /c/{slug}/rsvp/{token}"],
      [`/c/${SLUG}/rsvp`, "guest /c/{slug}/rsvp (public)"], [`/c/${SLUG}/rsvp/not-a-real-token-0000000000000000000000`, "guest /c/{slug}/rsvp/{invalid}"], [`/c/${SLUG}/regalos/${GUEST_TOKEN}`, "guest /c/{slug}/regalos/{token}"]
    ];
    if (guestRoutes.some(([, l]) => grep(l))) {
      const { page, context, errors } = await newSession({ ...ctx, signedIn: false });
      for (const [path, label] of guestRoutes) {
        if (!grep(label)) continue;
        try {
          await rsvpBudget();
          await open(page, path, '[role="main"], h1, [role="heading"]');
          if (label.includes("(resolves)")) await page.waitForURL(/\/c\/[^/]+\/rsvp\//, { timeout: 25000 });
          await scan(page, errors, label, { ...ctx, ignoreResourceErrors: label.includes("{invalid}") });
          if (label.endsWith("regalos/{token}")) {
            const id = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute("data-testid")).find((t) => /^reserve-[0-9a-f]{8}-/.test(t)));
            if (id) {
              await openDialog(page, id);
              await sleep(500);
              await scan(page, errors, "guest gifts reserve dialog", ctx);
            } else { rows.push({ label: "guest gifts reserve dialog", ...ctx, status: "FAIL", fails: ["no AVAILABLE gift with a reserve button"] }); console.log(`FAIL guest gifts reserve dialog | no reserve button`); }
          }
        } catch (error) { rows.push({ label, ...ctx, status: "FAIL", fails: [String(error.message).split("\n")[0]] }); console.log(`FAIL ${label} | ${width} ${lang} ${scheme} | ${String(error.message).split("\n")[0]}`); }
      }
      await context.close();
    }
  }
}

// ---------------------------------------------------------------- flows (en-US)
async function flow(name, width, fn) {
  if (!grep(name)) return;
  const started = Date.now();
  try { const evidence = await fn(); rows.push({ label: `flow ${name}`, width, lang: "en-US", scheme: "light", status: "PASS", fails: [], evidence }); console.log(`PASS flow ${name} | ${width} en-US | ${evidence}`); }
  catch (error) { rows.push({ label: `flow ${name}`, width, lang: "en-US", scheme: "light", status: "FAIL", fails: [String(error.message).split("\n")[0]] }); console.log(`FAIL flow ${name} | ${width} en-US | ${String(error.message).split("\n")[0]}`); }
  void started;
}

async function flowsSuite() {
  await setSettings({ giftReservationMode: "AUTO_ACCEPT", externalGiftMode: "AUTO_ACCEPT", partnerPriorityEnabled: false });
  const availableForReserve = [];
  for (let i = 0; i < WIDTHS.length * 2; i += 1) availableForReserve.push(await addGift(uniq("Flow reservable")));
  await setSettings({ externalGiftMode: "RESTRICTED" });
  const proposals = [];
  for (let i = 0; i < WIDTHS.length; i += 1) proposals.push(await addGift(uniq("Flow proposal")));
  let n = 0;
  for (const width of WIDTHS) {
    const ctx = { width, lang: "en-US", scheme: "light" };
    const mine = n++;
    await flow("host approves a proposal", width, async () => {
      const g = proposals[mine];
      assert.equal(g.status, "PROPOSED");
      const { page, context, errors } = await newSession({ ...ctx, signedIn: true });
      await open(page, `/regalos${HC}`, `[data-testid="approve-proposal-${g.id}"]`);
      await page.getByTestId(`approve-proposal-${g.id}`).click();
      await page.waitForFunction((id) => !document.querySelector(`[data-testid="approve-proposal-${id}"]`), g.id);
      assert.equal((await items()).find((i) => i.id === g.id).status, "AVAILABLE");
      assert.deepEqual(errors, []);
      await context.close();
      return `GET /items ${g.id.slice(0, 8)} PROPOSED -> AVAILABLE`;
    });
    await flow("host adds an external gift", width, async () => {
      const title = uniq("External flow");
      const { page, context, errors } = await newSession({ ...ctx, signedIn: true });
      await open(page, `/regalos/externo${HC}`, '[data-testid="external-title"]');
      await page.getByTestId("external-title").fill(title);
      await page.getByTestId("external-url").fill("https://shop.example/flow");
      await page.getByTestId("external-price").fill("42.50");
      await page.getByTestId("external-submit").click();
      await page.waitForFunction(() => document.querySelector('[data-testid="external-title"]')?.value === "");
      const found = (await items()).find((i) => i.title === title);
      assert.ok(found, "gift present in GET /items");
      assert.equal(found.price.amountMinor, 4250);
      assert.deepEqual(errors, []);
      await context.close();
      return `GET /items has ${found.id.slice(0, 8)} ${found.status} 42.50`;
    });
    await flow("guest reserves a gift", width, async () => {
      const g = availableForReserve[mine * 2];
      const guest = await newGuest(1);
      const { page, context, errors } = await newSession({ ...ctx, signedIn: false });
      await rsvpBudget();
      await open(page, `/c/${SLUG}/regalos/${guest.token}`, `[data-testid="reserve-${g.id}"]`);
      await openDialog(page, `reserve-${g.id}`);
      await page.getByTestId("reserve-name").fill("Flow Guest");
      await page.getByTestId("reserve-confirm").click();
      await page.getByTestId("reserve-confirm").waitFor({ state: "detached" });
      const after = (await items()).find((i) => i.id === g.id);
      assert.notEqual(after.status, "AVAILABLE", `status ${after.status}`);
      assert.deepEqual(errors, []);
      await context.close();
      return `GET /items ${g.id.slice(0, 8)} AVAILABLE -> ${after.status}`;
    });
    await flow("guest confirms the RSVP", width, async () => {
      const guest = await newGuest(2);
      const { page, context, errors } = await newSession({ ...ctx, signedIn: false });
      await rsvpBudget();
      await open(page, `/c/${SLUG}/rsvp/${guest.token}`, '[data-testid="rsvp-submit"]');
      await page.getByRole("radio").first().click(); // first choice = attend (order, not text, so the flow is language independent)
      await page.getByTestId("rsvp-submit").click();
      await page.getByTestId("open-gifts").waitFor();
      const read = await http("GET", `/rsvp/celebrations/${C}/rsvp`, { token: guest.token });
      assert.equal(read.status, 200);
      assert.equal(read.json.status, "CONFIRMED");
      assert.deepEqual(errors, []);
      await context.close();
      return `GET /rsvp status CONFIRMED for guest ${guest.id.slice(0, 8)}`;
    });
    await flow("guest reserve with network down shows a notice", width, async () => {
      const g = availableForReserve[mine * 2 + 1];
      const guest = await newGuest(1);
      const { page, context } = await newSession({ ...ctx, signedIn: false });
      await rsvpBudget();
      await open(page, `/c/${SLUG}/regalos/${guest.token}`, `[data-testid="reserve-${g.id}"]`);
      await page.route("**/gifts/celebrations/*/items/*/reservations", (route) => route.abort());
      await openDialog(page, `reserve-${g.id}`);
      await page.getByTestId("reserve-confirm").click();
      const notice = page.getByTestId("reserve-error");
      await notice.waitFor();
      const text = await notice.innerText();
      assert.match(text, /(No pudimos|conexi|Internet|internet|connection|reach|try again|intenta)/i, text);
      assert.equal((await items()).find((i) => i.id === g.id).status, "AVAILABLE");
      await context.close();
      return `notice "${text.slice(0, 70)}"; GET /items still AVAILABLE`;
    });
  }
}

try {
  if (!only || only === "pages") { console.log("\n== pages"); await pagesSuite(); }
  if (!only || only === "flows") { console.log("\n== flows"); await flowsSuite(); }
} finally { await browser.close(); }
const failed = rows.filter((r) => r.status === "FAIL");
if (process.env.RESULTS) writeFileSync(process.env.RESULTS, JSON.stringify(rows, null, 2));
console.log(`\n${rows.length - failed.length}/${rows.length} PASS`);
process.exit(failed.length ? 1 : 0);
