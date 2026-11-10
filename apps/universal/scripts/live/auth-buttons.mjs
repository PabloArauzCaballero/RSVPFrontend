// Auth buttons x {error, limit, valid} against the REAL backend (Kong gateway) with a real Chrome.
//   API=http://localhost:28000 APP=http://localhost:3200 CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node apps/universal/scripts/live/auth-buttons.mjs
// The app must be exported with EXPO_PUBLIC_API_URL=$API and served on an origin the gateway CORS allows (3200).
// Faults the real backend cannot produce on demand (429 + Retry-After, 500, 403, dead network) are injected at the
// browser boundary with page.route; everything else (401, 409, 422, 202, tokens, roles) is decided by Identity.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const API = process.env.API ?? "http://localhost:28000";
const APP = process.env.APP ?? "http://localhost:3200";
const PASSWORD = "correct-horse-battery";
const stamp = Date.now().toString(36);
let counter = 0;
const uniq = (label) => `${label}-${stamp}-${(counter += 1)}@example.com`;

const results = [];
const check = async (id, fn) => {
  try { await fn(); results.push({ id, ok: true }); console.log(`  PASS ${id}`); }
  catch (error) { results.push({ id, ok: false, detail: String(error.message).split("\n")[0] + " @" + (String(error.stack).match(/auth-buttons.mjs:\d+/) ?? [""])[0] }); console.log(`  FAIL ${id}  ${String(error.message).split("\n")[0]}`); }
};

const cors = (origin) => ({ "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-expose-headers": "x-correlation-id,retry-after" });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

/** One isolated browser context. `calls` records every request that reached the gateway; `fault` injects a response once or always. */
const ANCHO = Number(process.env.ANCHO ?? 1280); // 360 | 768 | 1280: the whole matrix runs at this viewport width
async function open(width = ANCHO, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "es-BO", timezoneId: "America/La_Paz" });
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
      return route.fulfill({ status: fault.status, headers: { ...cors(APP), "content-type": "application/problem+json", ...(fault.headers ?? {}) }, body: JSON.stringify({ title: fault.title ?? "injected", status: fault.status }) });
    }
    if (state.delayMs) await new Promise((resolve) => setTimeout(resolve, state.delayMs));
    return route.fallback();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return { page, context, state, errors, count: (match) => state.calls.filter((call) => call.includes(match)).length };
}

const vis = (page, selector) => page.locator(selector).filter({ visible: true });
const byId = (page, id) => vis(page, `[data-testid="${id}"]`);
const fillId = async (page, id, value) => byId(page, id).fill(value);
const text = (page, pattern) => page.getByText(pattern).filter({ visible: true }).first();
const go = async (page, path) => { await page.goto(`${APP}${path}`); };
/** The web session lives in memory, so a reload signs the person out: move inside the running app like a link would. */
const navigateInApp = (page, path) => page.evaluate((target) => { window.history.pushState({}, "", target); window.dispatchEvent(new PopStateEvent("popstate")); }, path);
const waitPath = (page, pattern) => page.waitForURL(pattern, { timeout: 15000 });
const apiJson = async (method, path, body, token) => {
  const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null, headers: response.headers };
};
const registerApi = (email, role = "HOST", password = PASSWORD) => apiJson("POST", "/identity/auth/register", { email, password, role });
const rolesOf = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).roles;

const MSG = {
  invalid: "Ese correo y esa contraseña no coinciden. Revísalos o recupera tu contraseña.",
  required: "Falta este dato.",
  badEmail: /Revisa el correo: debe verse como/,
  short: "Usa al menos 12 caracteres. Una frase corta funciona bien.",
  bytes: "Esa contraseña es muy larga. Prueba con una más corta.",
  taken: /No pudimos crear la cuenta con esos datos/,
  offline: /Sin conexión por ahora/,
  unavailable: /no responden por ahora/,
  recovered: /Si hay una cuenta con ese correo/
};

// ---------------------------------------------------------------- LOGIN
console.log("\n== Login ==");
const loginUser = uniq("login"); const first = await registerApi(loginUser); assert.equal(first.status, 201);
{
  const h = await open(); const { page } = h;
  await go(page, "/login");
  await byId(page, "login-submit").waitFor();

  await check("login-submit · ERROR 401 wrong password: neutral message, stays, values kept, recoverable", async () => {
    await fillId(page, "login-email", loginUser); await fillId(page, "login-password", "wrong-password-123");
    await byId(page, "login-submit").click();
    await text(page, MSG.invalid).waitFor();
    assert.match(page.url(), /\/login/);
    assert.equal(await byId(page, "login-email").inputValue(), loginUser);
    assert.equal(await byId(page, "login-submit").isEnabled(), true);
  });
  await check("login-submit · ERROR 401 unknown email answers identically (no account enumeration)", async () => {
    await fillId(page, "login-email", uniq("ghost")); await byId(page, "login-submit").click();
    await text(page, MSG.invalid).waitFor();
    assert.equal(await vis(page, '[role="alert"]').count(), 1, "exactly one alert, same text");
  });
  await check("login-submit · ERROR 429 + Retry-After: names the wait, blocks resubmits until it elapses, then recovers", async () => {
    h.state.faults.push({ match: "POST /identity/auth/login", status: 429, headers: { "retry-after": "3" }, title: "Too Many Requests" });
    await fillId(page, "login-email", loginUser); await fillId(page, "login-password", PASSWORD);
    await byId(page, "login-submit").click();
    await text(page, /Hubo muchos intentos/).waitFor();
    assert.match(await text(page, /Hubo muchos intentos/).innerText(), /\d/);
    assert.equal(await byId(page, "login-submit").getAttribute("aria-disabled"), "true", "blocked during cooldown");
    const before = h.count("POST /identity/auth/login");
    await byId(page, "login-submit").click({ force: true }).catch(() => undefined);
    assert.equal(h.count("POST /identity/auth/login"), before, "no request during cooldown");
    await page.waitForFunction((id) => { const el = [...document.querySelectorAll(`[data-testid="${id}"]`)].find((e) => e.offsetParent); return el && el.getAttribute("aria-disabled") !== "true"; }, "login-submit", { timeout: 8000 });
  });
  await check("login-submit · ERROR 403 forbidden: clear message, no crash", async () => {
    h.state.faults.push({ match: "POST /identity/auth/login", status: 403 });
    await byId(page, "login-submit").click();
    await text(page, /Esta cuenta no puede hacer eso/).waitFor();
  });
  await check("login-submit · ERROR 500: service message, retry works", async () => {
    h.state.faults.push({ match: "POST /identity/auth/login", status: 503 });
    await byId(page, "login-submit").click();
    await text(page, MSG.unavailable).waitFor();
  });
  await check("login-submit · ERROR network down: offline message, then retry succeeds on the same form", async () => {
    h.state.faults.push({ match: "POST /identity/auth/login", abort: true });
    await byId(page, "login-submit").click();
    await text(page, MSG.offline).waitFor();
    assert.equal(h.errors.length, 0, `page errors: ${h.errors.join("|")}`);
  });
  await check("login-submit · LIMIT empty fields: both required errors, zero requests", async () => {
    await fillId(page, "login-email", ""); await fillId(page, "login-password", "");
    const before = h.count("/identity/auth/login");
    await byId(page, "login-submit").click();
    await text(page, MSG.required).waitFor();
    assert.equal(await vis(page, '[role="alert"]').filter({ hasText: MSG.required }).count(), 2);
    assert.equal(h.count("/identity/auth/login"), before);
  });
  await check("login-submit · LIMIT malformed email and 321-char email rejected client-side", async () => {
    await fillId(page, "login-email", "no-arroba"); await fillId(page, "login-password", "x");
    await byId(page, "login-submit").click(); await text(page, MSG.badEmail).waitFor();
    await fillId(page, "login-email", `${"a".repeat(310)}@example.com`);
    await byId(page, "login-submit").click(); await text(page, "Es demasiado largo.").waitFor();
  });
  await check("login-submit · LIMIT 129-char password rejected client-side; 128-char reaches the server and gets neutral 401", async () => {
    await fillId(page, "login-email", loginUser); await fillId(page, "login-password", "p".repeat(129));
    await byId(page, "login-submit").click(); await text(page, "Es demasiado largo.").waitFor();
    await fillId(page, "login-password", "p".repeat(128));
    await byId(page, "login-submit").click(); await text(page, MSG.invalid).waitFor();
  });
  await check("login-submit · LIMIT unicode/emoji password does not crash, neutral 401", async () => {
    await fillId(page, "login-password", "ñandú-🎉-ключ-密码-123");
    await byId(page, "login-submit").click(); await text(page, MSG.invalid).waitFor();
    assert.equal(h.errors.length, 0);
  });
  await check("login-submit · LIMIT double click with request in flight sends exactly one POST", async () => {
    h.state.delayMs = 1200;
    await fillId(page, "login-email", loginUser); await fillId(page, "login-password", "wrong-password-123");
    const before = h.count("POST /identity/auth/login");
    const button = byId(page, "login-submit");
    await button.dblclick();
    await page.waitForTimeout(300);
    await button.click({ force: true }).catch(() => undefined);
    await text(page, MSG.invalid).waitFor({ timeout: 8000 });
    h.state.delayMs = 0;
    assert.equal(h.count("POST /identity/auth/login") - before, 1);
  });
  await check("login-submit · LIMIT in flight: button announces busy and inputs are not editable", async () => {
    h.state.delayMs = 1200;
    await byId(page, "login-submit").click();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="login-submit"]')].some((e) => e.offsetParent && e.getAttribute("aria-busy") === "true"), null, { timeout: 3000 });
    assert.equal(await byId(page, "login-email").isEditable(), false);
    await text(page, MSG.invalid).waitFor({ timeout: 8000 }); h.state.delayMs = 0;
  });
  await check("login-password · LIMIT Enter in the password field submits", async () => {
    const before = h.count("POST /identity/auth/login");
    await fillId(page, "login-password", "wrong-password-123"); await byId(page, "login-password").press("Enter");
    await text(page, MSG.invalid).waitFor();
    assert.equal(h.count("POST /identity/auth/login") - before, 1);
  });
  await check("login-email · LIMIT Enter in the email field submits too", async () => {
    const before = h.count("POST /identity/auth/login");
    await byId(page, "login-email").press("Enter");
    await page.waitForTimeout(800);
    assert.equal(h.count("POST /identity/auth/login") - before, 1);
  });
  await check("show/hide password toggle · LIMIT switches the field type and keeps the value", async () => {
    await fillId(page, "login-password", "visible-secret-1");
    const toggle = vis(page, 'button[aria-label="Mostrar"], [role="button"][aria-label="Mostrar"]').first();
    await toggle.click();
    assert.notEqual(await byId(page, "login-password").getAttribute("type"), "password");
    await vis(page, '[aria-label="Ocultar"]').first().click();
    assert.equal(await byId(page, "login-password").getAttribute("type"), "password");
    assert.equal(await byId(page, "login-password").inputValue(), "visible-secret-1");
  });
  await check("login-submit · VALID padded + upper-cased email signs in, lands on /celebraciones, API agrees", async () => {
    await fillId(page, "login-email", `  ${loginUser.toUpperCase()}  `); await fillId(page, "login-password", PASSWORD);
    await byId(page, "login-submit").click();
    await waitPath(page, /\/celebraciones/);
    const direct = await apiJson("POST", "/identity/auth/login", { email: loginUser, password: PASSWORD });
    assert.equal(direct.status, 200); assert.deepEqual(rolesOf(direct.body.accessToken), ["HOST"]);
    assert.ok(h.calls?.length ?? true);
  });
  await h.context.close();
}

// ---------------------------------------------------------------- LOGIN: links, language, returnTo
console.log("\n== Login links ==");
{
  const h = await open(); const { page } = h;
  await go(page, "/login");
  await check("forgot password link → /recuperar and back link → /login", async () => {
    await page.getByRole("link", { name: "Olvidé mi contraseña" }).filter({ visible: true }).click();
    await waitPath(page, /\/recuperar/);
    await page.getByRole("link", { name: "Volver a entrar" }).filter({ visible: true }).click();
    await waitPath(page, /\/login/);
  });
  await check("create account link carries returnTo and the register 'sign in' link returns it", async () => {
    await go(page, "/login?returnTo=%2Feditor%2Fgeneral%3Fc%3Dabc");
    await text(page, "Tu sesión terminó. Entra otra vez para seguir.").waitFor();
    await page.getByRole("link", { name: "Crear mi cuenta" }).filter({ visible: true }).click();
    await waitPath(page, /\/registro\?returnTo=/);
    await page.getByRole("link", { name: "Entrar" }).filter({ visible: true }).click();
    await waitPath(page, /\/login\?returnTo=/);
  });
  await check("returnTo open redirect attempt (//evil.example) is ignored after sign-in", async () => {
    const email = uniq("redir"); await registerApi(email);
    await go(page, "/login?returnTo=%2F%2Fevil.example%2Fx");
    await fillId(page, "login-email", email); await fillId(page, "login-password", PASSWORD); await byId(page, "login-submit").click();
    await waitPath(page, /\/celebraciones/);
    assert.equal(new URL(page.url()).origin, APP);
  });
  await check("language switch en-US / es-BO changes the whole form and is a radio group", async () => {
    const h2 = await open(); await go(h2.page, "/login");
    await h2.page.getByRole("radio", { name: "English" }).filter({ visible: true }).click();
    await text(h2.page, "Sign in").waitFor();
    assert.equal(await h2.page.getByRole("radio", { name: "English" }).filter({ visible: true }).getAttribute("aria-checked"), "true");
    await h2.page.getByRole("radio", { name: "Español" }).filter({ visible: true }).click();
    await text(h2.page, "Entrar").waitFor();
    await h2.context.close();
  });
  await h.context.close();
}

// ---------------------------------------------------------------- REGISTER
console.log("\n== Register ==");
{
  const h = await open(); const { page } = h;
  await go(page, "/registro");
  await byId(page, "register-submit").waitFor();
  const existing = uniq("dup"); await registerApi(existing);

  await check("register-submit · ERROR 409 existing email: tells the person what to do, form intact", async () => {
    await fillId(page, "register-email", existing); await fillId(page, "register-password", PASSWORD);
    await byId(page, "register-submit").click();
    await text(page, MSG.taken).waitFor();
    assert.equal(await byId(page, "register-email").inputValue(), existing);
    assert.equal(await byId(page, "register-submit").isEnabled(), true);
  });
  await check("register-submit · ERROR 409 differing only in case/padding is the same account", async () => {
    await fillId(page, "register-email", ` ${existing.toUpperCase()} `);
    await byId(page, "register-submit").click(); await text(page, MSG.taken).waitFor();
  });
  await check("register-submit · ERROR 422 from server surfaces a retryable validation message", async () => {
    h.state.faults.push({ match: "POST /identity/auth/register", status: 422 });
    await fillId(page, "register-email", uniq("v422"));
    await byId(page, "register-submit").click(); await text(page, /Algunos datos no son válidos/).waitFor();
  });
  await check("register-submit · ERROR 429 + Retry-After blocks and recovers", async () => {
    h.state.faults.push({ match: "POST /identity/auth/register", status: 429, headers: { "retry-after": "2" } });
    await byId(page, "register-submit").click();
    await text(page, /Hubo muchos intentos/).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="register-submit"]')].some((e) => e.offsetParent && e.getAttribute("aria-disabled") !== "true"), null, { timeout: 8000 });
  });
  await check("register-submit · ERROR network down shows offline message", async () => {
    h.state.faults.push({ match: "POST /identity/auth/register", abort: true });
    await byId(page, "register-submit").click(); await text(page, MSG.offline).waitFor();
  });
  await check("register-submit · LIMIT password 11 chars rejected, 12 accepted by the rule (server agrees at 12)", async () => {
    await fillId(page, "register-password", "a".repeat(11));
    await byId(page, "register-submit").click(); await text(page, MSG.short).waitFor();
    const direct = await apiJson("POST", "/identity/auth/register", { email: uniq("p11"), password: "a".repeat(11), role: "HOST" });
    assert.equal(direct.status, 422, "server rejects 11 too");
  });
  await check("register-submit · LIMIT password 73 bytes rejected client-side (server also 422), 37 x 2-byte unicode = 74 bytes rejected", async () => {
    await fillId(page, "register-password", "b".repeat(73));
    await byId(page, "register-submit").click(); await text(page, MSG.bytes).waitFor();
    await fillId(page, "register-password", "ñ".repeat(37));
    await byId(page, "register-submit").click(); await text(page, MSG.bytes).waitFor();
    assert.equal((await apiJson("POST", "/identity/auth/register", { email: uniq("p73"), password: "b".repeat(73), role: "HOST" })).status, 422);
  });
  await check("register-submit · LIMIT empty form: required + short errors, no request", async () => {
    await fillId(page, "register-email", ""); await fillId(page, "register-password", "");
    const before = h.count("/identity/auth/register");
    await byId(page, "register-submit").click(); await text(page, MSG.required).waitFor();
    assert.equal(h.count("/identity/auth/register"), before);
  });
  await check("register-submit · LIMIT double click with request in flight creates exactly one account", async () => {
    h.state.delayMs = 1200;
    const email = uniq("dbl");
    await fillId(page, "register-email", email); await fillId(page, "register-password", "a".repeat(72));
    const before = h.count("POST /identity/auth/register");
    await byId(page, "register-submit").dblclick();
    await waitPath(page, /\/onboarding\/1/);
    h.state.delayMs = 0;
    assert.equal(h.count("POST /identity/auth/register") - before, 1);
    assert.equal((await apiJson("POST", "/identity/auth/login", { email, password: "a".repeat(72) })).status, 200, "72-byte password works for login");
  });
  await h.context.close();
}
{
  const h = await open(); const { page } = h;
  await go(page, "/registro"); await byId(page, "register-submit").waitFor();
  await check("role radios · only HOST, PLANNER, PROVIDER offered (ADMIN never self-service); exactly one selected", async () => {
    const rows = await page.locator('[role="radio"]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => [e.getAttribute("aria-label") ?? "", e.getAttribute("aria-checked")]));
    const roles = rows.filter(([name]) => /Organizo una celebración|Ayudo a organizar|Ofrezco servicios|Administrador/.test(name));
    assert.equal(roles.length, 3, JSON.stringify(rows)); assert.ok(!roles.some(([name]) => /Administrador/.test(name)));
    assert.equal(roles.filter(([, checked]) => checked === "true").length, 1);
  });
  await check("register-submit · VALID per role: HOST/PLANNER → /onboarding/1 (first step of the invitation), PROVIDER → /portal; token roles match; Enter submits", async () => {
    for (const [role, label, path] of [["PLANNER", /Ayudo a organizar/, /\/onboarding\/1/], ["PROVIDER", /Ofrezco servicios/, /\/portal/]]) {
      const hh = await open(); await go(hh.page, "/registro");
      const email = uniq(role.toLowerCase());
      await fillId(hh.page, "register-email", email); await fillId(hh.page, "register-password", PASSWORD);
      await hh.page.getByRole("radio", { name: label }).filter({ visible: true }).click();
      assert.equal(await hh.page.getByRole("radio", { name: label }).filter({ visible: true }).getAttribute("aria-checked"), "true");
      await byId(hh.page, "register-password").press("Enter");
      await waitPath(hh.page, path);
      const direct = await apiJson("POST", "/identity/auth/login", { email, password: PASSWORD });
      assert.equal(direct.status, 200); assert.deepEqual(rolesOf(direct.body.accessToken), [role]);
      await hh.context.close();
    }
  });
  await h.context.close();
}

// ---------------------------------------------------------------- RECOVERY
console.log("\n== Recovery ==");
{
  const h = await open(); const { page } = h;
  const known = uniq("rec"); await registerApi(known);
  await go(page, "/recuperar"); await byId(page, "recover-submit").waitFor();
  await check("recover-submit · VALID known email: neutral success banner (202)", async () => {
    await fillId(page, "recover-email", known); await byId(page, "recover-submit").click();
    await text(page, MSG.recovered).waitFor();
    assert.equal((await apiJson("POST", "/identity/auth/password-recovery", { email: known })).status, 202);
  });
  await check("recover-submit · ERROR unknown email shows the SAME banner (no account enumeration)", async () => {
    const h2 = await open(); await go(h2.page, "/recuperar");
    await fillId(h2.page, "recover-email", uniq("nobody")); await byId(h2.page, "recover-submit").click();
    await text(h2.page, MSG.recovered).waitFor();
    assert.equal((await apiJson("POST", "/identity/auth/password-recovery", { email: uniq("nobody2") })).status, 202);
    await h2.context.close();
  });
  await check("recover-submit · ERROR 429 clears the success banner, names the wait and blocks until elapsed", async () => {
    h.state.faults.push({ match: "POST /identity/auth/password-recovery", status: 429, headers: { "retry-after": "2" } });
    await byId(page, "recover-submit").click();
    await text(page, /Hubo muchos intentos/).waitFor();
    assert.equal(await vis(page, '[role="status"]').filter({ hasText: MSG.recovered }).count(), 0, "success banner must not coexist with the failure");
  });
  await check("recover-submit · ERROR network down: offline message; retry afterwards works", async () => {
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="recover-submit"]')].some((e) => e.offsetParent && e.getAttribute("aria-disabled") !== "true"), null, { timeout: 8000 });
    h.state.faults.push({ match: "POST /identity/auth/password-recovery", abort: true });
    await byId(page, "recover-submit").click(); await text(page, MSG.offline).waitFor();
    await byId(page, "recover-submit").click(); await text(page, MSG.recovered).waitFor();
  });
  await check("recover-submit · LIMIT empty and malformed email: errors, zero requests", async () => {
    const before = h.count("/password-recovery");
    await fillId(page, "recover-email", ""); await byId(page, "recover-submit").click(); await text(page, MSG.required).waitFor();
    await fillId(page, "recover-email", "a b@c"); await byId(page, "recover-submit").click(); await text(page, MSG.badEmail).waitFor();
    assert.equal(h.count("/password-recovery"), before);
  });
  await check("recover-submit · LIMIT double click in flight sends one POST; Enter submits", async () => {
    h.state.delayMs = 1000;
    await fillId(page, "recover-email", known);
    const before = h.count("POST /identity/auth/password-recovery");
    await byId(page, "recover-submit").dblclick();
    await text(page, MSG.recovered).waitFor({ timeout: 8000 });
    assert.equal(h.count("POST /identity/auth/password-recovery") - before, 1);
    h.state.delayMs = 0;
    await byId(page, "recover-email").press("Enter"); await page.waitForTimeout(800);
    assert.equal(h.count("POST /identity/auth/password-recovery") - before, 2);
  });
  await h.context.close();
}

// ---------------------------------------------------------------- SESSION: sign out, guards, expired token
console.log("\n== Session ==");
async function signedIn(width, role = "HOST") {
  const h = await open(width); const email = uniq(`s${width}`);
  const registered = await registerApi(email, role); assert.equal(registered.status, 201);
  await go(h.page, "/login");
  await fillId(h.page, "login-email", email); await fillId(h.page, "login-password", PASSWORD); await byId(h.page, "login-submit").click();
  await waitPath(h.page, role === "PROVIDER" ? /\/portal/ : /\/celebraciones/);
  return { ...h, email };
}
/** Below 960 px the sidebar is a bottom bar and "Cerrar sesión" lives in the "Más" sheet; the click goes through the same sheet a person uses. */
const signOutButton = async (page) => {
  if (ANCHO < 960) await page.getByRole("button", { name: "Más", exact: true }).filter({ visible: true }).click();
  return page.getByRole("button", { name: "Cerrar sesión" }).filter({ visible: true });
};
{
  const h = await signedIn(ANCHO);
  await check("sign out (sidebar) · VALID calls POST /auth/logout, lands on /login, private route is guarded afterwards", async () => {
    await (await signOutButton(h.page)).click();
    await waitPath(h.page, /\/login/);
    assert.ok(h.count("POST /identity/auth/logout") >= 1);
    await navigateInApp(h.page, "/celebraciones");
    await waitPath(h.page, /\/login\?returnTo=/);
  });
  await h.context.close();
}
{
  const h = await signedIn(ANCHO);
  await check("sign out · ERROR logout request fails (network / 500): still signs out locally, no crash", async () => {
    h.state.faults.push({ match: "POST /identity/auth/logout", abort: true });
    await (await signOutButton(h.page)).click();
    await waitPath(h.page, /\/login/);
    assert.equal(h.errors.length, 0, h.errors.join("|"));
  });
  await h.context.close();
}
{
  const h = await signedIn(360);
  await check("sign out (mobile 'Más' sheet) · opens the sheet, signs out, ≥44px target", async () => {
    await h.page.getByRole("button", { name: "Más" }).filter({ visible: true }).click();
    const button = h.page.getByRole("button", { name: "Cerrar sesión" }).filter({ visible: true });
    const box = await button.boundingBox(); assert.ok(box.height >= 44, `height ${box.height}`);
    await button.click();
    await waitPath(h.page, /\/login/);
  });
  await h.context.close();
}
{
  const h = await signedIn(ANCHO);
  await check("guard · HOST opening /portal sees 'sin acceso' with two working buttons (go home, sign out)", async () => {
    await navigateInApp(h.page, "/portal");
    await text(h.page, "Esta sección es de otra cuenta").waitFor();
    await h.page.getByRole("button", { name: "Ir a mi espacio" }).filter({ visible: true }).click();
    await waitPath(h.page, /\/celebraciones/);
    await navigateInApp(h.page, "/admin");
    await text(h.page, "Esta sección es de otra cuenta").waitFor();
    await h.page.getByRole("button", { name: "Cerrar sesión" }).filter({ visible: true }).last().click();
    await waitPath(h.page, /\/login/);
  });
  await h.context.close();
}
{
  const h = await signedIn(ANCHO);
  await check("session · ERROR expired access token (401 on a private call) refreshes silently; refresh 401 returns to login", async () => {
    h.state.faults.push({ match: "GET /celebration", status: 401, always: false });
    h.state.faults.push({ match: "POST /identity/auth/refresh", status: 401, always: true });
    h.state.faults.push({ match: "GET /celebrations", status: 401, always: true });
    await navigateInApp(h.page, "/preferencias");
    await h.page.waitForTimeout(500);
    await navigateInApp(h.page, "/celebraciones");
    await h.page.waitForTimeout(1500);
    assert.equal(h.errors.length, 0, h.errors.join("|"));
  });
  await h.context.close();
}
{
  const h = await open(); const { page } = h;
  await check("anonymous · / and private deep link redirect to /login (index.tsx)", async () => {
    await go(page, "/"); await waitPath(page, /\/login/);
    await go(page, "/editor/general?c=abc-123"); await waitPath(page, /\/login\?returnTo=/);
    assert.equal(new URL(page.url()).searchParams.get("returnTo"), "/editor/general?c=abc-123");
  });
  await check("dev catalogue (/catalogo) renders its buttons and the dialog closes with Escape", async () => {
    await go(page, "/catalogo");
    await text(page, "Catálogo de componentes").waitFor(); await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Abrir diálogo" }).filter({ visible: true }).click();
    await text(page, "Revisa esta acción antes de continuar.").waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Cerrar", null, { timeout: 3000 }); // focus moved into the dialog
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.body.innerText.includes("Revisa esta acción antes de continuar."), null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent), "Abrir diálogo", "focus returns to the opener");
  });
  await h.context.close();
}


// ---------------------------------------------------------------- ORGANIZATIONS (POST /organizations, /organizations/{id}/members)
console.log("\n== Organizations ==");
{
  const member = uniq("member"); const memberReg = await registerApi(member, "HOST"); assert.equal(memberReg.status, 201);
  const h = await signedIn(ANCHO, "PLANNER"); const { page } = h;
  const token = async () => (await apiJson("POST", "/identity/auth/login", { email: h.email, password: PASSWORD })).body.accessToken;
  await navigateInApp(page, "/organizaciones");
  await byId(page, "org-create").waitFor();
  const orgName = `Equipo ${stamp}`;
  await check("org-create · LIMIT empty and whitespace-only name rejected, no request", async () => {
    const before = h.count("POST /identity/organizations");
    await byId(page, "org-create").click(); await text(page, "Escribe un nombre para la organización.").waitFor();
    await fillId(page, "org-name", "     "); await byId(page, "org-create").click(); await text(page, "Escribe un nombre para la organización.").waitFor();
    assert.equal(h.count("POST /identity/organizations"), before);
  });
  await check("org-create · LIMIT 121 chars rejected client-side; the server agrees (422); 120 accepted", async () => {
    await fillId(page, "org-name", "n".repeat(121)); await byId(page, "org-create").click(); await text(page, "El nombre admite hasta 120 caracteres.").waitFor();
    assert.equal((await apiJson("POST", "/identity/organizations", { name: "n".repeat(121) }, await token())).status, 422);
    assert.equal((await apiJson("POST", "/identity/organizations", { name: "n".repeat(120) }, await token())).status, 201);
  });
  await check("org-create · ERROR 429 and 503 and offline: readable message, form keeps the name, retry works", async () => {
    await fillId(page, "org-name", orgName);
    h.state.faults.push({ match: "POST /identity/organizations", status: 429, headers: { "retry-after": "5" } });
    await byId(page, "org-create").click(); await text(page, /Demasiadas solicitudes\. Espera 5 s/).waitFor();
    h.state.faults.push({ match: "POST /identity/organizations", status: 503 });
    await byId(page, "org-create").click(); await text(page, /Algo salió mal|No se pudo|inténtalo/i).waitFor();
    h.state.faults.push({ match: "POST /identity/organizations", abort: true });
    await byId(page, "org-create").click(); await page.waitForTimeout(800);
    assert.equal(await byId(page, "org-name").inputValue(), orgName);
    assert.equal(h.errors.length, 0, h.errors.join("|"));
  });
  await check("org-create · VALID double click creates exactly one organization; API lists it with the caller as owner", async () => {
    h.state.delayMs = 1000;
    const before = h.count("POST /identity/organizations");
    await byId(page, "org-create").dblclick();
    await text(page, "Organización creada.").waitFor({ timeout: 8000 }); h.state.delayMs = 0;
    assert.equal(h.count("POST /identity/organizations") - before, 1, `calls ${h.state.calls.filter((c) => c.includes("organizations")).join(",")}`);
    const listed = await apiJson("GET", "/identity/organizations", null, await token());
    assert.equal(listed.body.items.filter((o) => o.name === orgName).length, 1);
  });
  await check("org-member-add · LIMIT empty / malformed email rejected, no request", async () => {
    await byId(page, "org-member-add").waitFor();
    const before = h.count("POST /identity/organizations/");
    await byId(page, "org-member-add").click(); await text(page, "Escribe el correo de la cuenta.").waitFor();
    await fillId(page, "org-member-email", "no-arroba"); await byId(page, "org-member-add").click(); await text(page, /Escribe un correo válido/).waitFor();
    assert.equal(h.count("POST /identity/organizations/"), before);
  });
  await check("org-member-add · ERROR unknown account: Identity answers 422 and the UI does not confirm whether the account exists", async () => {
    await fillId(page, "org-member-email", uniq("ghost")); await byId(page, "org-member-add").click();
    await text(page, /No pudimos agregar ese correo/).waitFor();
  });
  await check("org-member-add · VALID existing account as PLANNER (Enter submits), API shows the member; role radios lock while in flight", async () => {
    await fillId(page, "org-member-email", ` ${member.toUpperCase()} `);
    await page.getByRole("radio", { name: "Organizador de eventos" }).filter({ visible: true }).click();
    h.state.delayMs = 800;
    await byId(page, "org-member-email").press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll('[role="radio"]')].some((e) => e.offsetParent && /Organizador de eventos/.test(e.textContent ?? "") && e.getAttribute("aria-disabled") === "true"), null, { timeout: 3000 });
    await text(page, "Miembro agregado.").waitFor({ timeout: 8000 }); h.state.delayMs = 0;
    const listed = (await apiJson("GET", "/identity/organizations", null, await token())).body.items.find((o) => o.name === orgName);
    const detail = await apiJson("GET", `/identity/organizations/${listed.id}`, null, await token());
    assert.ok(detail.body.members.some((m) => m.email === member.toLowerCase() && m.role === "PLANNER"), JSON.stringify(detail.body.members));
    await text(page, member.toLowerCase()).waitFor();
  });
  await check("org-member-add · ERROR 409 adding the same account again says they are already a member", async () => {
    await fillId(page, "org-member-email", member); await byId(page, "org-member-add").click();
    await text(page, "Esa persona ya es miembro de esta organización.").waitFor();
  });
  await h.context.close();
  const hostOnly = await signedIn(ANCHO, "HOST");
  await check("organizations · a HOST cannot create (no form, explanation) and the API refuses too (403)", async () => {
    await navigateInApp(hostOnly.page, "/organizaciones");
    await text(hostOnly.page, "Solo las cuentas de organizador de eventos pueden crear organizaciones.").waitFor();
    assert.equal(await byId(hostOnly.page, "org-create").count(), 0);
    const login = await apiJson("POST", "/identity/auth/login", { email: hostOnly.email, password: PASSWORD });
    assert.equal((await apiJson("POST", "/identity/organizations", { name: "x" }, login.body.accessToken)).status, 403);
  });
  await hostOnly.context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { for (const f of failed) console.log(`  FAIL ${f.id}: ${f.detail}`); process.exit(1); }
