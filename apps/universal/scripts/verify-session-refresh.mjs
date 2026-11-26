// Run against the release Dockerfile served locally; its /api proxy must reach a real test backend.
// Creates its own unpublished celebration. Never pass a real user's celebration or credentials.
// APP=http://localhost:8340 CHROMIUM_PATH=<Chrome for Testing> node .../verify-session-refresh.mjs
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

const APP = process.env.APP ?? "http://localhost:8340";
// Optional production origin routed to the local release image; storage still sees its allowed web Origin.
const ORIGIN = process.env.BROWSER_ORIGIN ?? APP;
const OUT = resolve(process.env.EVIDENCE_DIR ?? "docs/progress/evidence/session-refresh");
const stamp = Date.now().toString(36);
const email = `refresh-${stamp}@example.invalid`;
const password = randomBytes(24).toString("hex");
const results = [];
mkdirSync(OUT, { recursive: true });
const record = (name, detail = {}) => { results.push({ name, ...detail }); console.log(`PASS ${name}`); };

async function api(method, path, body, token) {
  const response = await fetch(`${APP}/api${path}`, {
    method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  assert.ok(response.ok, `${method} ${path}: HTTP ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}

const account = await api("POST", "/identity/auth/register", { email, password, role: "HOST" });
const celebration = await api("POST", "/celebrations", {
  slug: `refresh-${stamp}`, eventTypeCode: "WEDDING", timeZone: "America/La_Paz", currency: "BOB",
  content: { title: "Prueba de actualización", hosts: { BRIDE: "Prueba", GROOM: "DOne" }, eventDate: "2027-06-12T20:00:00Z", venueName: "Entorno de prueba" }
}, account.accessToken);
const galleryPath = `/editor/galeria?c=${celebration.id}`;
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const closingContexts = new WeakSet();
async function newContext(options) {
  const created = await browser.newContext(options);
  if (ORIGIN !== APP) await created.route(`${ORIGIN}/**`, async (route) => {
    try {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: `${APP}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    } catch { if (!closingContexts.has(created)) throw new Error("Frontend test proxy transport failed"); }
  });
  return created;
}
let context;
let page;
let storageState;
let completed = false;
const visibleButton = (name) => page.getByRole("button", { name, exact: true }).filter({ visible: true });
async function requestSignOut(width, english) {
  if (width < 960) await visibleButton(english ? "More" : "Más").click();
  await visibleButton(english ? "Sign out" : "Cerrar sesión").click();
  await expect(page.getByTestId("confirm-sign-out")).toBeVisible();
}

try {
  context = await newContext({ locale: "es-BO", viewport: { width: 1280, height: 900 } });
  page = await context.newPage();
  await page.goto(`${ORIGIN}/login?returnTo=${encodeURIComponent(galleryPath)}`);
  await page.getByLabel("Correo", { exact: true }).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(password);
  await visibleButton("Entrar").click();
  await expect(page).toHaveURL(`${ORIGIN}${galleryPath}`);
  await expect(page.getByTestId("add-photo")).toBeVisible();
  const cookie = (await context.cookies()).find((item) => item.name === "rsvp_refresh");
  assert.ok(cookie?.httpOnly && cookie.secure && cookie.sameSite === "Strict");
  assert.equal(cookie.path, "/api/identity/auth");
  record("login through nginx preserves Secure, HttpOnly, Strict and rewrites the cookie path");

  let navigations = 0;
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations += 1; });
  const beforeUpload = navigations;
  const image = await sharp({ create: { width: 96, height: 96, channels: 3, background: "#65745e" } }).png().toBuffer();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByTestId("add-photo").click()]);
  const complete = page.waitForResponse((response) => /\/media\/uploads\/[^/]+\/complete$/.test(response.url()));
  await chooser.setFiles({ name: "prueba.png", mimeType: "image/png", buffer: image });
  assert.equal((await complete).status(), 202);
  await expect(page.getByText("Foto 1", { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 60_000 });
  assert.equal(navigations, beforeUpload);
  const assets = await api("GET", `/media/celebrations/${celebration.id}/assets`, undefined, account.accessToken);
  assert.equal(assets.items[0]?.status, "PROCESSED");
  assert.equal((await fetch(assets.items[0].variants.thumb)).status, 200);
  await page.screenshot({ path: `${OUT}/gallery-ready.png`, fullPage: true });
  record("real upload 202 -> worker PROCESSED -> visible photo, without document navigation");

  await page.goto(`${ORIGIN}/invitados?c=${celebration.id}`);
  await page.getByTestId("add-guest").click();
  await page.getByTestId("guest-name").fill("Invitado de prueba");
  await page.getByTestId("guest-email").fill(`guest-${stamp}@example.invalid`);
  await page.getByTestId("save-guest").click();
  await expect(page.getByText("Invitado de prueba ya está en tu lista.", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByText("Volver a la lista", { exact: true }).filter({ visible: true }).click();
  await expect(page.getByText("Invitado de prueba", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  const guests = await api("GET", `/guests/celebrations/${celebration.id}/guests`, undefined, account.accessToken);
  assert.ok(guests.items.some((guest) => guest.name === "Invitado de prueba"));
  record("real guest registration returns to an updated list");

  await page.goto(`${ORIGIN}/regalos/externo?c=${celebration.id}`);
  await page.getByTestId("external-title").fill("Vajilla de prueba de actualización");
  await page.getByTestId("external-url").fill("https://shop.example.invalid/gift");
  await page.getByTestId("external-price").fill("150");
  await page.getByTestId("external-submit").click();
  await page.getByTestId("see-list").click();
  await expect(page.getByText("Vajilla de prueba de actualización", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  const gifts = await api("GET", `/gifts/celebrations/${celebration.id}/items`, undefined, account.accessToken);
  assert.ok(gifts.items.some((gift) => gift.title === "Vajilla de prueba de actualización"));
  record("real gift creation returns to an updated list");
  closingContexts.add(context);
  await context.unrouteAll({ behavior: "wait" });
  await context.close();

  // Session verification goes directly to nginx: no route forwarding can supply or hide a cookie.
  context = await browser.newContext({ locale: "es-BO", viewport: { width: 1280, height: 900 } });
  page = await context.newPage();
  await page.goto(`${APP}/login?returnTo=${encodeURIComponent(galleryPath)}`);
  await page.getByLabel("Correo", { exact: true }).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(password);
  await visibleButton("Entrar").click();
  await expect(page).toHaveURL(`${APP}${galleryPath}`);
  await expect(page.getByTestId("add-photo")).toBeVisible();
  const directCookie = (await context.cookies()).find((item) => item.name === "rsvp_refresh" && item.domain === new URL(APP).hostname);
  assert.ok(directCookie?.httpOnly && directCookie.secure && directCookie.sameSite === "Strict");
  assert.equal(directCookie.path, "/api/identity/auth");

  // Deliberately interrupt only the auth request: the HTML still loads. Success and cookies remain real.
  await context.route("**/api/identity/auth/refresh", (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByTestId("retry-session")).toBeVisible();
  assert.equal(new URL(page.url()).pathname, "/editor/galeria");
  await context.unroute("**/api/identity/auth/refresh");
  await page.getByTestId("retry-session").click();
  await expect(page.getByText("Foto 1", { exact: true }).filter({ visible: true })).toBeVisible();
  record("simulated auth connection loss offers retry; real refresh restores the same route");
  storageState = await context.storageState();
  await context.unrouteAll({ behavior: "wait" });
  await context.close();

  for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    const english = locale === "en-US";
    const label = `${width}-${scheme}-${locale}`;
    context = await browser.newContext({ storageState, locale, colorScheme: scheme, reducedMotion: "reduce", viewport: { width, height: 900 } });
    await context.addInitScript(({ locale }) => { localStorage.setItem("rsvp.locale", locale); localStorage.removeItem("rsvp.theme"); }, { locale });
    page = await context.newPage();
    const requests = [];
    page.on("request", (request) => { if (request.url().includes("/api/")) requests.push(new URL(request.url()).pathname); });
    await page.goto(`${APP}${galleryPath}`);
    await expect(page.getByTestId("add-photo")).toBeVisible();
    const refreshRequest = page.waitForRequest((request) => request.url().endsWith("/api/identity/auth/refresh"));
    await page.reload();
    assert.ok((await (await refreshRequest).allHeaders()).cookie?.includes("rsvp_refresh="), `browser cookie ${label}`);
    await expect(page.getByTestId("add-photo")).toBeVisible();
    assert.equal(page.url(), `${APP}${galleryPath}`);
    await expect(page.getByText(english ? "Photo 1" : "Foto 1", { exact: true }).filter({ visible: true })).toBeVisible();
    await requestSignOut(width, english);
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter((item) => item.impact === "critical" || item.impact === "serious");
    assert.deepEqual(violations.map((item) => item.id), [], `axe ${label}`);
    const dialog = page.getByRole("dialog", { name: english ? "Are you sure you want to sign out?" : "¿Estás seguro de cerrar sesión?" });
    await expect(dialog).toBeVisible();
    await expect.poll(() => page.getByTestId("cancel-sign-out").evaluate((element) => {
      for (let node = element; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 1) return false;
      return true;
    })).toBe(true);
    await page.screenshot({ path: `${OUT}/dialog-${label}.png`, fullPage: true, animations: "disabled" });
    await page.getByTestId("cancel-sign-out").focus();
    await page.keyboard.press("Tab");
    assert.ok(await dialog.evaluate((element) => element.contains(document.activeElement)), `focus trap ${label}`);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("confirm-sign-out")).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.textContent ?? "")).toContain(width < 960 ? (english ? "More" : "Más") : (english ? "Sign out" : "Cerrar sesión"));
    await requestSignOut(width, english);
    await page.getByTestId("cancel-sign-out").click();
    await expect(page.getByTestId("add-photo")).toBeVisible();
    assert.ok(!requests.includes("/api/identity/auth/logout"));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
    record(`reload, cancel logout, axe and overflow ${label}`, { authRefreshes: requests.filter((path) => path.endsWith("/auth/refresh")).length, keyboard: { tabTrapped: true, escapeCancelled: true, focusReturned: true } });
    storageState = await context.storageState();
    if (width === 1280 && scheme === "dark" && english) {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await requestSignOut(360, true);
      await expect(page.getByRole("dialog", { name: "Are you sure you want to sign out?" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("confirm-sign-out")).not.toBeVisible();
      await expect.poll(() => page.evaluate(() => document.activeElement?.textContent ?? "")).toContain("More");
      record("mobile cancellation restores focus with default motion too");
      await page.setViewportSize({ width: 1280, height: 900 });
      await requestSignOut(width, true);
      const response = page.waitForResponse((answer) => answer.url().endsWith("/api/identity/auth/logout"));
      await page.getByTestId("confirm-sign-out").click();
      assert.equal((await response).status(), 204);
      await expect(page).toHaveURL(/\/login/);
      await page.reload();
      await expect(page.getByLabel("Email", { exact: true }).filter({ visible: true })).toBeVisible();
      assert.ok(!(await context.cookies()).some((item) => item.name === "rsvp_refresh"));
      record("confirmed logout revokes the session; reload stays signed out");
    }
    await context.unrouteAll({ behavior: "wait" });
    await context.close();
  }
  completed = true;
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true });
    writeFileSync(`${OUT}/failure.txt`, `${error.message.split("\n")[0]}\n${await page.locator("body").innerText()}`);
  }
  throw new Error(error.message.split("\n")[0]);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/live-results.json`, JSON.stringify({ status: completed ? "PASS" : "FAIL", date: new Date().toISOString(), app: APP, uploadBrowserOrigin: ORIGIN, matrixOrigin: APP, browser: { engine: "chromium", version: browser.version(), source: process.env.CHROMIUM_PATH ? "configured executable" : "Playwright bundled" }, results }, null, 2));
}
