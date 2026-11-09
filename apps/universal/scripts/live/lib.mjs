// Shared harness for the live button matrices: Chrome real against the exported web app and the REAL gateway.
// Sign-in goes through the login screen; persistence is verified with direct HTTP reads, never from the UI alone.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

export const APP = process.env.APP ?? "http://localhost:3000";
export const API = process.env.API ?? "http://localhost:28000";
export const world = JSON.parse(readFileSync(process.env.WORLD ?? "", "utf8"));
export const C = world.celebration.id;
export const WIDTHS = [360, 768, 1280];
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export { assert };

export async function http(method, path, { token, body, headers, raw } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { ...(body !== undefined || raw !== undefined ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await response.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  return { status: response.status, json, text, retryAfter: response.headers.get("retry-after") };
}

let cached = { token: "", at: 0 };
/** Host JWT for direct reads/writes (15 min lifetime: refreshed after 10). */
export async function hostToken() {
  if (Date.now() - cached.at < 10 * 60 * 1000) return cached.token;
  const login = await http("POST", "/identity/auth/login", { body: { email: world.host.email, password: world.password } });
  assert.equal(login.status, 200, `host login ${login.status}`);
  cached = { token: login.json.accessToken, at: Date.now() };
  return cached.token;
}
export const G = `/guests/celebrations/${C}`;
export const N = `/notifications/celebrations/${C}`;
export const host = async (method, path, body, headers) => http(method, path, { token: await hostToken(), body, headers });

export async function launch() {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
}

export async function session(browser, email, width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO", acceptDownloads: true });
  context.setDefaultTimeout(15000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP }).catch(() => undefined);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|net::ERR|status of (4|5)\d\d/.test(message.text())) errors.push(message.text()); });
  await page.goto(`${APP}/login`);
  await page.getByLabel(/^(Correo electrónico|Correo)$/).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: /^(Iniciar sesión|Entrar)$/ }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  return { page, context, errors };
}

export async function go(page, path) {
  await page.goto(`${APP}${path}${path.includes("?") ? "&" : "?"}c=${C}`);
  await page.waitForLoadState("networkidle").catch(() => undefined);
}
export const tid = (page, id) => page.locator(`[data-testid="${id}"]`);
export const button = (page, name) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).first();
export const text = (page, pattern) => page.getByText(pattern).filter({ visible: true }).first();
export const noBlank = async (page, label) => {
  const length = await page.evaluate(() => document.body.innerText.trim().length);
  assert.ok(length > 40, `blank screen after ${label}`);
};
export const noOverflow = async (page, label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `horizontal scroll: ${label}`);

/** Counts requests matching a predicate, so "double click sends exactly one" is an assertion and not a hope. */
export function track(page, predicate) {
  const seen = [];
  const listener = (request) => { if (predicate(request)) seen.push(request); };
  page.on("request", listener);
  return { count: () => seen.length, requests: () => seen, stop: () => page.off("request", listener) };
}
export const isCall = (method, pattern) => (request) => request.method() === method && pattern.test(request.url());

// Kong does not list Retry-After in exposed_headers, so a browser never sees it on the real gateway; the injected 429 exposes it explicitly to exercise the "wait N s" wording.
export const problem = (status, title = "x", headers = {}) => ({ status, headers: { "content-type": "application/problem+json", ...(headers["retry-after"] ? { "access-control-expose-headers": "retry-after" } : {}), ...headers }, body: JSON.stringify({ type: "about:blank", title, status, code: "Injected" }) });

/** Matrix of results: screen | button | scenario | status | evidence. */
export class Matrix {
  rows = [];
  async check(screen, button_, scenario, fn) {
    try { const evidence = await fn(); this.rows.push({ screen, button: button_, scenario, status: "PASS", evidence: evidence ?? "" }); console.log(`  PASS ${screen} | ${button_} | ${scenario}${evidence ? ` | ${evidence}` : ""}`); }
    catch (error) { const message = String(error?.message ?? error).split("\n")[0].slice(0, 300); this.rows.push({ screen, button: button_, scenario, status: "FAIL", evidence: message }); console.log(`  FAIL ${screen} | ${button_} | ${scenario} | ${message}`); }
  }
  gap(screen, button_, scenario, evidence) { this.rows.push({ screen, button: button_, scenario, status: "BRECHA", evidence }); console.log(`  BRECHA ${screen} | ${button_} | ${scenario} | ${evidence}`); }
  finish(out) {
    const failed = this.rows.filter((row) => row.status === "FAIL");
    console.log(`\n${this.rows.length} checks · ${this.rows.filter((r) => r.status === "PASS").length} PASS · ${this.rows.filter((r) => r.status === "BRECHA").length} BRECHA · ${failed.length} FAIL`);
    if (out) writeFileSync(out, JSON.stringify(this.rows, null, 2));
    return failed.length;
  }
}

/** A guest created straight through the API (the host's own celebration), for scenarios that need a known record. */
export async function makeGuest(tag, extra = {}) {
  const email = `${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;
  const res = await host("POST", `${G}/guests`, { name: `Live ${tag}`, email, allowedCompanions: 1, ...extra });
  assert.equal(res.status, 201, `makeGuest ${res.status} ${res.text}`);
  return res.json;
}

/** The guest list is a read model (eventually consistent): poll until it holds `count` rows for `search`. */
export async function waitGuests(search, count = 1, timeoutMs = 12000) {
  const started = Date.now();
  if (count === 0) await sleep(3000); // let the projection catch up before trusting an empty answer
  for (;;) {
    const items = (await host("GET", `${G}/guest-list?limit=100&search=${encodeURIComponent(search)}`)).json.items;
    if (items.length === count || Date.now() - started > timeoutMs) return items;
    await sleep(500);
  }
}
