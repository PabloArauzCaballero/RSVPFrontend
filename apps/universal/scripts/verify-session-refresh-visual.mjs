// Compare the deployed UI and the candidate against the same synthetic, unpublished celebration.
// Uses real services and a fresh Chrome profile; never accepts another person's account or celebration.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const APP = process.env.APP ?? "http://localhost:8340";
const BASELINE = process.env.BASELINE_ORIGIN ?? "https://dev.doneapp.events";
const OUT = resolve(process.env.EVIDENCE_DIR ?? "docs/progress/evidence/session-refresh/publication-audit/visual");
assert.ok(process.env.CHROMIUM_PATH, "Set CHROMIUM_PATH to the installed Chrome executable");
mkdirSync(OUT, { recursive: true });
const stamp = Date.now().toString(36);
const email = `compare-${stamp}@example.invalid`;
const password = randomBytes(24).toString("hex");
async function api(path, body, token) {
  const response = await fetch(`${APP}/api${path}`, {
    method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body)
  });
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return response.json();
}
const account = await api("/identity/auth/register", { email, password, role: "HOST" });
const celebration = await api("/celebrations", {
  slug: `compare-${stamp}`, eventTypeCode: "WEDDING", timeZone: "America/La_Paz", currency: "BOB",
  content: { title: "Prueba de actualización", hosts: { BRIDE: "Prueba", GROOM: "DOne" }, eventDate: "2027-06-12T20:00:00Z", venueName: "Entorno de prueba" }
}, account.accessToken);
await api(`/guests/celebrations/${celebration.id}/guests`, { name: "Invitado de prueba", email: `guest-${stamp}@example.invalid`, allowedCompanions: 0 }, account.accessToken);
await api(`/gifts/celebrations/${celebration.id}/gift-list`, {}, account.accessToken);
await api(`/gifts/celebrations/${celebration.id}/items`, { source: "EXTERNAL", title: "Vajilla de prueba de actualización", url: "https://shop.example.invalid/gift", price: { amountMinor: 15000, currency: "BOB" } }, account.accessToken);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const results = [];
let completed = false;
async function capture(origin, width, scheme, locale, prefix) {
  const english = locale === "en-US";
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale, colorScheme: scheme, reducedMotion: "reduce" });
  try {
    await context.addInitScript(({ locale }) => { localStorage.setItem("rsvp.locale", locale); localStorage.removeItem("rsvp.theme"); }, { locale });
    const page = await context.newPage();
    const visibleText = (name) => page.getByText(name, { exact: true }).filter({ visible: true });
    const path = `/editor/galeria?c=${celebration.id}`;
    await page.goto(`${origin}/login?returnTo=${encodeURIComponent(path)}`);
    await page.getByLabel(english ? "Email" : "Correo", { exact: true }).filter({ visible: true }).fill(email);
    await page.getByLabel(english ? "Password" : "Contraseña", { exact: true }).filter({ visible: true }).fill(password);
    await page.getByRole("button", { name: english ? "Sign in" : "Entrar", exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(`${origin}${path}`);
    const files = {};
    for (const surface of ["gallery", "guests", "gifts"]) {
      if (surface === "gallery") {
        await expect(page.getByTestId("add-photo")).toBeVisible();
        await expect(visibleText(english ? "Your story's photos go here" : "Aquí van las fotos de su historia")).toBeVisible();
      } else {
        await visibleText(surface === "guests" ? (english ? "Guests" : "Invitados") : (english ? "Gifts" : "Regalos")).first().click();
        await expect(visibleText(surface === "guests" ? "Invitado de prueba" : "Vajilla de prueba de actualización").first()).toBeVisible();
      }
      await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      files[surface] = `${OUT}/${prefix}-${surface}-${width}-${scheme}-${locale}.png`;
      await page.screenshot({ path: files[surface], fullPage: true, animations: "disabled" });
    }
    return files;
  } finally { await context.close(); }
}
try {
  for (const width of [360, 768, 1280]) for (const scheme of ["light", "dark"]) for (const locale of ["es-BO", "en-US"]) {
    const baseline = await capture(BASELINE, width, scheme, locale, "baseline");
    const candidate = await capture(APP, width, scheme, locale, "candidate");
    for (const surface of ["gallery", "guests", "gifts"]) {
      const before = await sharp(baseline[surface]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const after = await sharp(candidate[surface]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.deepEqual(after.info, before.info, `image dimensions ${surface} ${width} ${scheme} ${locale}`);
      let differentPixels = 0;
      for (let offset = 0; offset < before.data.length; offset += 4) {
        if (before.data[offset] !== after.data[offset] || before.data[offset + 1] !== after.data[offset + 1] || before.data[offset + 2] !== after.data[offset + 2]) differentPixels += 1;
      }
      const ratio = differentPixels / (before.info.width * before.info.height);
      results.push({ surface, width, scheme, locale, differentPixels, ratio, unchanged: ratio <= 0.002 });
      console.log(`${ratio <= 0.002 ? "PASS" : "DIFF"} ${surface} ${width} ${scheme} ${locale}: ${differentPixels} pixels`);
    }
  }
  completed = true;
  assert.ok(results.every((result) => result.unchanged), "Visual differences require inspection; see results.json");
} catch (error) {
  // Avoid including Playwright's request/header details in a persisted error.
  throw new Error(error.message.split("\n")[0]);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ status: completed && results.every((result) => result.unchanged) ? "PASS" : "FAIL", date: new Date().toISOString(), baseline: BASELINE, candidate: APP, browser: browser.version(), noInterception: true, sameSyntheticData: true, threshold: 0.002, comparison: "exact RGB pixel difference, same Windows Chrome; no masks", results }, null, 2));
}
