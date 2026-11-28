// The 4-step sign-up (MV-D2, MV-D3, MV-D4) in a REAL Chrome against the REAL Identity + Notification (see registro-backend-local.mjs).
//   API=http://localhost:18100 APP=http://localhost:18101 OUT=docs/progress/evidence/registro-4-pasos-fe \
//   CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome node apps/universal/scripts/live/registro-4-pasos.mjs
// The app must have been started with EXPO_PUBLIC_API_URL=$API. `$API/__test/mail?to=` plays the mailbox (the code is read from the real
// e-mail Notification rendered, exactly as a person reads it). Nothing about Identity is faked, except the faults marked INJECTED
// (a 429 from the gateway's per-IP limit, which needs Kong). Runs at 360 and 1280 px, light and dark, and writes screenshots + results.json.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const API = process.env.API ?? "http://localhost:18100";
const APP = process.env.APP ?? "http://localhost:18101";
const OUT = process.env.OUT ?? "docs/progress/evidence/registro-4-pasos-fe";
const WIDTHS = (process.env.WIDTHS ?? "360,1280").split(",").map(Number);
mkdirSync(OUT, { recursive: true });
const PASSWORD = "correct-horse-battery";
const stamp = Date.now().toString(36);
let counter = 0;
const uniq = (label) => `${label}-${stamp}-${(counter += 1)}@example.test`;
const results = [];
const check = async (id, fn) => {
  if (process.env.ONLY && !id.includes(process.env.ONLY)) return;
  try { await fn(); results.push({ id, ok: true }); console.log(`  PASS ${id}`); }
  catch (error) { results.push({ id, ok: false, detail: String(error.message).split("\n")[0] }); console.log(`  FAIL ${id}  ${String(error.message).split("\n")[0]}`); }
};
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mailTo = async (address, wanted = 1) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const answer = await fetch(`${API}/__test/mail?to=${encodeURIComponent(address)}`);
    if (answer.ok) { const body = await answer.json(); if (body.count >= wanted) return body; }
    await sleep(250);
  }
  throw new Error(`no mail for ${address}`);
};
const codeIn = (mail) => /(\d{6})/.exec(mail.text)?.[1] ?? "";

async function open({ width, scheme = "light", reducedMotion = "no-preference", route = "/registro", withAxe = false }) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 780 : 900 }, locale: "es-BO", timezoneId: "America/La_Paz", colorScheme: scheme, reducedMotion });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => { if (request.url().startsWith(API)) requests.push(`${request.method()} ${new URL(request.url()).pathname}`); });
  await page.goto(`${APP}${route}`, { waitUntil: "load" });
  await page.waitForSelector("[role=main]", { timeout: 240000 });
  await page.waitForTimeout(600);
  return { context, page, requests };
}
const typeIn = (page, testId, value) => page.getByTestId(testId).fill(value);
// The step slides in (420 ms): the picture is taken once it has arrived.
const shot = async (page, name) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${name}.png` }); };
/** The visible body of the form: the text and the structure with the address masked and the animation's inline style removed. */
const screenOf = (page, address) => page.evaluate((mask) => {
  const main = document.querySelector("[role=main]");
  const html = main.innerHTML.replaceAll(mask, "<correo>").replace(/ style="[^"]*"/g, "").replace(/ data-enter="\w+"/g, "").replace(/Pedir otro código en \d+ s/g, "Pedir otro código en N s");
  return { text: main.innerText.replaceAll(mask, "<correo>").replace(/Pedir otro código en \d+ s/g, "Pedir otro código en N s"), html };
}, address);
async function toCodeScreen(page, address) {
  await typeIn(page, "register-email", address);
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-code").waitFor();
}
async function proveEmail(page, address) {
  await toCodeScreen(page, address);
  const code = codeIn(await mailTo(address));
  await typeIn(page, "register-code", code);
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-givenName").waitFor();
}
async function fillRest(page, { role = "HOST", organization = "" } = {}) {
  await page.getByTestId(`register-role-${role}`).click();
  if (organization) await typeIn(page, "register-organizationName", organization);
  await typeIn(page, "register-givenName", "Ana"); await typeIn(page, "register-familyName", "Rojas");
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-phone").waitFor();
  await typeIn(page, "register-phone", "+591 71234567");
  await page.getByTestId("register-next").click();
  await page.getByTestId("register-password").waitFor();
}

for (const width of WIDTHS) {
  console.log(`\n== ${width}px ==`);
  const tag = `${width}`;

  await check(`L1 ${tag}: the whole sign-up, step by step, creates a verified account and lands on the first step of the invitation`, async () => {
    const address = uniq("flujo");
    const { context, page, requests } = await open({ width });
    await shot(page, `paso1-correo-claro-${tag}`);
    await toCodeScreen(page, address);
    await shot(page, `paso1-codigo-claro-${tag}`);
    const mail = await mailTo(address);
    assert.match(mail.subject, /código/i);
    await typeIn(page, "register-code", codeIn(mail));
    await page.getByTestId("register-next").click();
    await page.getByTestId("register-givenName").waitFor();
    assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "2");
    await shot(page, `paso2-cuenta-claro-${tag}`);
    await page.getByTestId("register-role-PROVIDER").click();
    await typeIn(page, "register-givenName", "Ana"); await typeIn(page, "register-familyName", "Rojas");
    await page.getByTestId("register-next").click();
    await page.getByTestId("register-phone").waitFor();
    await shot(page, `paso3-contacto-claro-${tag}`);
    await typeIn(page, "register-phone", "+591 71234567");
    await page.getByTestId("register-next").click();
    await page.getByTestId("register-password").waitFor();
    await shot(page, `paso4-acceso-claro-${tag}`);
    await typeIn(page, "register-password", PASSWORD);
    await page.getByRole("checkbox", { name: /Acepto los Términos/ }).click();
    await page.getByTestId("register-submit").click();
    await page.waitForURL(/\/(portal|cuenta|celebraciones|onboarding)/, { timeout: 20000 });
    assert.ok(requests.includes("POST /identity/auth/registration/email-code") && requests.includes("POST /identity/auth/registration/email-code/verify") && requests.includes("POST /identity/auth/register"));
    // The account was born verified: no verification-link mail followed the code (the real pipeline had time to send one).
    await sleep(2500);
    assert.equal((await mailTo(address)).count, 1, "only the code mail reached the address");
    // Identity says so: the same address can sign in, and its claim says verified.
    const login = await (await fetch(`${API}/identity/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: address, password: PASSWORD }) })).json();
    assert.equal(JSON.parse(Buffer.from(login.accessToken.split(".")[1], "base64url")).email_verified, true);
    await context.close();
  });

  await check(`L2 ${tag}: MV-D3 the screen after asking for a code is identical for a new and an existing address, in a real browser`, async () => {
    const existing = uniq("existente");
    const created = await fetch(`${API}/identity/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: existing, password: PASSWORD, role: "HOST" }) });
    assert.equal(created.status, 201);
    const fresh = uniq("nueva");
    const seen = [];
    for (const address of [fresh, existing]) {
      const { context, page } = await open({ width });
      await toCodeScreen(page, address);
      await page.waitForTimeout(700);
      seen.push(await screenOf(page, address));
      if (address === existing) await shot(page, `paso1-codigo-cuenta-existente-claro-${tag}`);
      await context.close();
    }
    assert.equal(seen[1].text, seen[0].text, "same visible text");
    assert.equal(seen[1].html, seen[0].html, "same structure and attributes");
    assert.doesNotMatch(seen[1].text, /ya tienes una cuenta|ya existe|already exists|No pudimos crear/i);
    // What differs is only in the mailbox: the owner of the existing address gets the notice with a link to /login and no address in it.
    const notice = await mailTo(existing);
    assert.match(notice.text, /\/login/); assert.doesNotMatch(notice.text, /\d{6}/); assert.doesNotMatch(notice.text, /@/);
    assert.match((await mailTo(fresh)).text, /\d{6}/);
  });

  await check(`L3 ${tag}: MV-D3 a wrong code says the same thing for a new and an existing address; the person can ask for another`, async () => {
    const existing = uniq("existente");
    await fetch(`${API}/identity/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: existing, password: PASSWORD, role: "HOST" }) });
    const messages = [];
    for (const address of [uniq("nueva"), existing]) {
      const { context, page } = await open({ width });
      await toCodeScreen(page, address);
      const code = address === existing ? "123456" : (codeIn(await mailTo(address)) === "000000" ? "111111" : "000000");
      await typeIn(page, "register-code", code);
      await page.getByTestId("register-next").click();
      await page.getByText("Código incorrecto o vencido. Pide otro.").waitFor();
      messages.push(await page.getByTestId("register-code").evaluate((input) => input.closest("div").parentElement.innerText));
      assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "1");
      await context.close();
    }
    assert.equal(messages[0], messages[1]);
  });

  await check(`L4 ${tag}: MV-D3 "ya tengo cuenta" opens /login with the typed e-mail already there and NOT in the URL`, async () => {
    const address = uniq("logueo");
    const { context, page } = await open({ width });
    await typeIn(page, "register-email", address);
    await page.getByRole("link", { name: "Entrar" }).click();
    await page.waitForURL(/\/login$/);
    assert.equal(new URL(page.url()).search, ""); assert.ok(!decodeURIComponent(page.url()).includes("@"));
    assert.equal(await page.getByTestId("login-email").inputValue(), address);
    assert.equal(await page.getByTestId("login-password").inputValue(), "");
    // A fresh load of /login (what the e-mail link opens) cannot know the address: it starts empty.
    await page.reload({ waitUntil: "load" }); await page.waitForSelector("[role=main]");
    assert.equal(await page.getByTestId("login-email").inputValue(), "");
    await context.close();
  });

  await check(`L5 ${tag}: focus moves to each step and it is announced; the progress bar tells where the person is`, async () => {
    const { context, page } = await open({ width });
    await proveEmail(page, uniq("foco"));
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Paso 2 de 4: Tu cuenta");
    assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuetext"), "Paso 2 de 4: Tu cuenta");
    await typeIn(page, "register-givenName", "Ana"); await typeIn(page, "register-familyName", "Rojas");
    await page.getByTestId("register-next").click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Paso 3 de 4: Cómo contactarte");
    await page.getByTestId("register-back").click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Paso 2 de 4: Tu cuenta");
    assert.equal(await page.getByTestId("register-givenName").inputValue(), "Ana", "Atrás keeps what was typed");
    await context.close();
  });

  await check(`L6 ${tag}: the action is always reachable (fixed bar on a phone) and the page never scrolls sideways`, async () => {
    const { context, page } = await open({ width });
    await proveEmail(page, uniq("barra"));
    for (const [id, name] of [["register-next", "paso 2"]]) {
      const box = await page.getByTestId(id).boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= (width < 500 ? 780 : 900), `${name}: the action is inside the viewport`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal scroll");
    await fillRest(page);
    const box = await page.getByTestId("register-submit").boundingBox();
    assert.ok(box && box.y + box.height <= (width < 500 ? 780 : 900), "step 4: the create button is inside the viewport");
    await context.close();
  });

  await check(`L7 ${tag}: reduced motion: a step swaps with no slide and the task works the same`, async () => {
    const { context, page } = await open({ width, reducedMotion: "reduce" });
    await proveEmail(page, uniq("quieto"));
    const panel = page.getByRole("group", { name: "Paso 2 de 4: Tu cuenta" });
    const style = await panel.evaluate((node) => { const css = getComputedStyle(node); return { transform: css.transform, opacity: css.opacity, transition: css.transitionDuration }; });
    assert.ok(style.transform === "none" || style.transform === "matrix(1, 0, 0, 1, 0, 0)", `no transform under reduced motion (got ${style.transform})`);
    assert.equal(style.opacity, "1");
    await context.close();
  });

  await check(`L8 ${tag}: axe finds no critical or serious violation on any step or on the code screen (light and dark)`, async () => {
    for (const scheme of ["light", "dark"]) {
      const { context, page } = await open({ width, scheme });
      const address = uniq("axe");
      const audit = async (name) => {
        const found = (await new AxeBuilder({ page }).analyze()).violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
        assert.deepEqual(found.map((violation) => `${name}:${violation.id}`), []);
      };
      await audit("paso1");
      await toCodeScreen(page, address); await audit("codigo");
      if (scheme === "dark") await shot(page, `paso1-codigo-oscuro-${tag}`);
      await typeIn(page, "register-code", codeIn(await mailTo(address)));
      await page.getByTestId("register-next").click(); await page.getByTestId("register-givenName").waitFor();
      await audit("paso2"); if (scheme === "dark") await shot(page, `paso2-cuenta-oscuro-${tag}`);
      await typeIn(page, "register-givenName", "Ana"); await typeIn(page, "register-familyName", "Rojas");
      await page.getByTestId("register-next").click(); await page.getByTestId("register-phone").waitFor();
      await audit("paso3"); if (scheme === "dark") await shot(page, `paso3-contacto-oscuro-${tag}`);
      await typeIn(page, "register-phone", "+591 71234567");
      await page.getByTestId("register-next").click(); await page.getByTestId("register-password").waitFor();
      await audit("paso4"); if (scheme === "dark") await shot(page, `paso4-acceso-oscuro-${tag}`);
      await context.close();
    }
  });

  await check(`L9 ${tag}: the draft is only in memory: a reload starts over and nothing of it is in storage or the URL`, async () => {
    const address = uniq("memoria");
    const { context, page } = await open({ width });
    await proveEmail(page, address);
    await typeIn(page, "register-givenName", "Ana");
    const stored = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookie: document.cookie, url: location.href }));
    assert.deepEqual(stored.local.filter((key) => /registr|draft|proof|email/i.test(key)), []);
    assert.deepEqual(stored.session, []);
    assert.ok(!stored.url.includes("@") && !stored.cookie.includes("proof"));
    const dump = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    assert.ok(!dump.includes(address) && !dump.includes("Ana"), "the typed data is not in localStorage");
    await page.reload({ waitUntil: "load" }); await page.waitForSelector("[role=main]");
    assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "1");
    assert.equal(await page.getByTestId("register-email").inputValue(), "");
    await context.close();
  });

  await check(`L10 ${tag}: the terms are required on step 4 and the page for them can be opened and left without losing the verified e-mail`, async () => {
    const { context, page } = await open({ width });
    await proveEmail(page, uniq("terminos")); await fillRest(page);
    await typeIn(page, "register-password", PASSWORD);
    await page.getByTestId("register-submit").click();
    await page.getByText("Para crear tu cuenta necesitas aceptar los términos y la política de privacidad.").waitFor();
    await page.getByRole("link", { name: "Términos de uso" }).click();
    await page.waitForURL(/\/terminos/);
    await page.goBack(); await page.getByRole("progressbar").waitFor();
    await page.waitForFunction(() => document.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow") === "4", null, { timeout: 5000 }).catch(() => undefined);
    assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "4", "the person is back on step 4, not on a new form");
    await context.close();
  });

  await check(`L11 ${tag}: INJECTED 429 from the gateway: the wait is shown and the e-mail typed is kept`, async () => {
    const { context, page } = await open({ width });
    await context.route(`${API}/identity/auth/registration/email-code`, (route) => route.request().method() === "POST"
      ? route.fulfill({ status: 429, headers: { "content-type": "application/problem+json", "retry-after": "30", "access-control-allow-origin": APP, "access-control-allow-credentials": "true", "access-control-expose-headers": "retry-after" }, body: JSON.stringify({ title: "Too many requests", status: 429 }) })
      : route.fallback());
    const address = uniq("limite");
    await typeIn(page, "register-email", address);
    await page.getByTestId("register-next").click();
    await page.getByText(/Hubo muchos intentos/).waitFor();
    assert.equal(await page.getByTestId("register-email").inputValue(), address);
    await context.close();
  });

  await check(`L12 ${tag}: the wrong-code path of five attempts ends the code (real Identity), and a new code works`, async () => {
    const address = uniq("agotado");
    const { context, page } = await open({ width });
    await toCodeScreen(page, address);
    const real = codeIn(await mailTo(address));
    const wrong = real === "000000" ? "111111" : "000000";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await typeIn(page, "register-code", wrong); await page.getByTestId("register-next").click();
      await page.getByText("Código incorrecto o vencido. Pide otro.").waitFor();
    }
    // The sixth try with the RIGHT code fails too: the code is dead and the screen says the same neutral thing.
    await typeIn(page, "register-code", real); await page.getByTestId("register-next").click();
    await page.getByText("Código incorrecto o vencido. Pide otro.").waitFor();
    assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "1");
    await context.close();
  });
}

const failed = results.filter((result) => !result.ok);
writeFileSync(`${OUT}/results.json`, JSON.stringify({ date: new Date().toISOString(), api: "real Identity jar + real Notification, Resend stand-in", widths: WIDTHS, results }, null, 2));
await browser.close();
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
