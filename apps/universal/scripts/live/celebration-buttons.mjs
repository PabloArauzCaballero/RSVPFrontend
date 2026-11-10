// Host celebration buttons x {ERROR, LIMIT, VALID} in Chrome against the REAL backend (Kong :28000, exported web app).
// VALID always ends with a direct GET to the API: the UI alone is not evidence. Template/media routes (/media/*) are not
// deployed in this environment (502), so those flows are exercised with page.route mocks and reported as MOCK, never VERIFIED.
//   WORLD=world.json APP=http://localhost:8100 CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/live/celebration-buttons.mjs [filter]
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { pickTime, timeButton } from "./time-field.mjs";

const APP = process.env.APP ?? "http://localhost:8100";
const API = process.env.API ?? "http://localhost:28000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const only = process.argv[2];
const ANCHO = Number(process.env.ANCHO ?? 1280); // 360 / 768 / 1280
const results = [];
// The client sends credentials, so a mocked answer needs explicit (non-wildcard) CORS headers, exactly like Kong.
const CORS = { "access-control-allow-origin": APP, "access-control-allow-credentials": "true", "access-control-allow-headers": "authorization,content-type,if-match,x-correlation-id,accept,accept-language", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "etag,retry-after,x-correlation-id" };
const stamp = Date.now().toString(36);
let seq = 0;

async function http(method, path, { token, body, version, headers } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(version != null ? { "if-match": `"${version}"` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: response.status, json };
}
let cached = { at: 0, token: "" };
async function token() {
  if (Date.now() - cached.at > 6 * 60_000) cached = { at: Date.now(), token: (await http("POST", "/identity/auth/login", { body: { email: world.host.email, password: world.password } })).json.accessToken };
  return cached.token;
}
const get = async (id) => (await http("GET", `/celebrations/${id}`, { token: await token() })).json;
async function draft(extra = {}) {
  const slug = `btn-${stamp}-${++seq}`;
  const created = await http("POST", "/celebrations", { token: await token(), body: { slug, eventTypeCode: "WEDDING", timeZone: "America/La_Paz", content: { title: `Boda ${slug}`, ...extra } } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  return created.json;
}
const completeContent = { eventDate: "2027-06-12T16:00", venueName: "Iglesia Central", hosts: { BRIDE: "Ana", GROOM: "Luis" } };
const patchAs = async (id, patch) => {
  const current = await get(id);
  const response = await http("PATCH", `/celebrations/${id}`, { token: await token(), version: current.version, body: patch });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  return response.json;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: ANCHO, height: ANCHO < 500 ? 800 : 900 }, locale: "es-BO" });
context.setDefaultTimeout(15000);
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|net::ERR/.test(message.text())) consoleErrors.push(message.text()); });
const requests = [];
page.on("request", (request) => { if (request.url().startsWith(API)) requests.push(`${request.method()} ${new URL(request.url()).pathname}`); });
const count = (method, pathPart) => requests.filter((line) => line.startsWith(`${method} `) && line.includes(pathPart)).length;

const go = async (path) => { await page.goto(`${APP}${path}`); await page.waitForLoadState("networkidle").catch(() => undefined); };
const open = (section, id) => go(`${section}?c=${id}`);
const btn = (name) => page.getByRole("button", { name, exact: true }).filter({ visible: true });
// Row actions (move, remove, make cover, delete) live in each row's «⋯» menu, named «Más opciones: <row>»; page actions in the header's «⋯».
const rowMenu = (nth = 0) => page.getByRole("button", { name: /^Más opciones: / }).filter({ visible: true }).nth(nth);
const rowAction = async (action, nth = 0) => { await rowMenu(nth).click(); await page.getByRole("menuitem", { name: action, exact: true }).click(); };
const field = (label) => page.getByLabel(label, { exact: true }).filter({ visible: true }).first();
const text = (re) => page.getByText(re).filter({ visible: true }).first();
const notBlank = async () => assert.ok((await page.locator("body").innerText()).trim().length > 40, "blank screen");
const settle = () => page.waitForLoadState("networkidle").catch(() => undefined);
async function login(email) {
  await page.goto(`${APP}/login`);
  const emailField = page.getByLabel(/^(Correo electrónico|Correo)$/).filter({ visible: true });
  if (!(await emailField.first().waitFor({ timeout: 4000 }).then(() => true, () => false))) return; // already signed in
  await emailField.fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: /^(Iniciar sesión|Entrar)$/ }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
/** Abort every API call that matches while fn runs (network down). */
async function offline(pattern, fn) {
  const handler = (route) => route.abort("connectionrefused");
  await page.route(pattern, handler);
  try { await fn(); } finally { await page.unroute(pattern, handler); }
}
async function respond(pattern, status, body, headers, fn) {
  const cors = CORS;
  const handler = (route) => route.request().method() === "OPTIONS" ? route.fulfill({ status: 204, headers: cors }) : route.fulfill({ status, contentType: "application/problem+json", headers: { ...cors, ...(headers ?? {}) }, body: JSON.stringify(body) });
  await page.route(pattern, handler);
  try { await fn(); } finally { await page.unroute(pattern, handler); }
}

async function check(id, label, fn) {
  if (only && !id.startsWith(only)) return;
  try { await fn(); results.push({ id, label, ok: true }); console.log(`  PASS ${id} ${label}`); }
  catch (error) { results.push({ id, label, ok: false, error: String(error.message ?? error).split("\n")[0] }); console.log(`  FAIL ${id} ${label}\n       ${String(error.stack ?? error).split("\n").filter((line) => line.trim() && !line.includes("node:internal")).slice(0, 8).join("\n       ")}`); await page.screenshot({ path: `${process.env.SHOTS ?? "."}/fail-${id}.png` }).catch(() => undefined); }
}

await login(world.host.email);

// ---------------------------------------------------------------- CELEBRACIONES (create-celebration, list)
const listed = await draft();
await check("P1-valid", "celebraciones: la lista muestra el borrador real y el boton abre el editor", async () => {
  await go("/celebraciones");
  await page.getByTestId(`celebration-${listed.id}`).click();
  await page.waitForURL(new RegExp(`/editor/general\\?c=${listed.id}`));
  assert.equal((await get(listed.id)).status, "DRAFT");
});
await check("P1-error", "celebraciones: red caida muestra error + Reintentar y se recupera", async () => {
  await offline("**/celebrations?limit=100", async () => { await go("/celebraciones"); await text(/No hay conexión con el servidor|No se pudo completar/).waitFor(); await notBlank(); });
  await btn("Reintentar").click();
  await page.getByTestId(`celebration-${listed.id}`).waitFor();
});
await check("P1-error500", "celebraciones: 502 del servidor muestra mensaje claro", async () => {
  await respond("**/celebrations?limit=100", 502, { title: "bad gateway", status: 502 }, {}, async () => { await go("/celebraciones"); await text(/El servidor no respondió/).waitFor(); });
});
await check("P1-limit-empty", "celebraciones: usuario sin celebraciones ve el vacio real y el boton Crear", async () => {
  const email = `empty.${stamp}@example.com`;
  const reg = await http("POST", "/identity/auth/register", { body: { email, password: world.password, role: "HOST" } });
  assert.ok([200, 201].includes(reg.status), JSON.stringify(reg.json));
  const fresh = await context.browser().newContext({ viewport: { width: ANCHO, height: ANCHO < 500 ? 800 : 900 }, locale: "es-BO" });
  const p = await fresh.newPage();
  await p.goto(`${APP}/login`);
  await p.getByLabel(/^(Correo electrónico|Correo)$/).filter({ visible: true }).fill(email);
  await p.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await p.getByRole("button", { name: /^(Iniciar sesión|Entrar)$/ }).filter({ visible: true }).click();
  await p.waitForURL((url) => !url.pathname.startsWith("/login"));
  await p.goto(`${APP}/celebraciones`);
  await p.getByText(/Aquí vivirán tus celebraciones/).first().waitFor();
  await p.getByTestId("create-celebration").waitFor();
  await fresh.close();
});

// ---------------------------------------------------------------- ONBOARDING (create flow)
const SLUG_FIELD = "Enlace de tu invitación";
const CREATE = "Crear mi invitación";
await check("P2-valid", "onboarding: 3 pasos (tipo, quien y cuando, nombre y enlace), vista previa en vivo y GET confirma borrador con titulo sugerido, slug, fecha y anfitriones", async () => {
  await go("/celebraciones");
  await page.getByTestId("create-celebration").click();
  await page.getByText(/¿Qué vas a celebrar\?/).first().waitFor();
  assert.equal(await page.getByTestId("onboarding-next").first().getAttribute("aria-disabled"), "true");
  await page.getByRole("radio", { name: /Boda/ }).first().click();
  await page.getByTestId("onboarding-next").click();
  await field("Novia").fill("Ana");
  await field("Novio").fill("Luis");
  await field("Fecha").fill("2027-08-14");
  await pickTime(page, timeButton(page, "Hora").first(), "17:30");
  await field("Ubicación").fill("Hacienda Sol");
  await page.getByRole("region", { name: "Así va quedando" }).filter({ visible: true }).first().getByText("Ana").first().waitFor();
  await page.getByTestId("onboarding-next").click();
  assert.equal(await field("Nombre de la celebración").inputValue(), "Ana y Luis");
  const slug = `onb-${stamp}`;
  await field(SLUG_FIELD).fill(slug);
  await btn(CREATE).click();
  await page.waitForURL(/\/onboarding\/listo\?c=/);
  await text(/Tu invitación está lista/).waitFor();
  const id = new URL(page.url()).searchParams.get("c");
  const stored = await get(id);
  assert.equal(stored.slug, slug); assert.equal(stored.status, "DRAFT"); assert.equal(stored.content.title, "Ana y Luis");
  assert.equal(stored.content.hosts.BRIDE, "Ana"); assert.equal(stored.content.hosts.GROOM, "Luis");
  assert.equal(stored.localTimes.eventDate.date, "2027-08-14"); assert.equal(stored.localTimes.eventDate.time, "17:30");
  await page.getByTestId("onboarding-finish").click();
  await page.waitForURL(/\/editor\/general/);
});
/** Event type -> who, when and where (all mandatory) -> name and link step. */
async function onboardingDetails() {
  await go("/onboarding/1");
  await page.getByRole("radio", { name: /Boda/ }).first().click();
  await page.getByTestId("onboarding-next").click();
  await field("Novia").fill("Ana"); await field("Novio").fill("Luis");
  await field("Fecha").fill("2027-08-14"); await pickTime(page, timeButton(page, "Hora").first(), "17:30");
  await field("Ubicación").fill("Hacienda Sol");
  await page.getByTestId("onboarding-next").click();
}
await check("P2-limit", "onboarding: titulo de 121 caracteres y enlace de 2 caracteres se bloquean sin enviar POST", async () => {
  await onboardingDetails();
  const before = count("POST", "/celebrations");
  await field("Nombre de la celebración").fill("x".repeat(121));
  await text(/Quita 1 carácter: el máximo es 120/).waitFor();
  await field(SLUG_FIELD).fill("ab");
  await text(/entre 3 y 80 caracteres/).waitFor();
  await btn(CREATE).click();
  await text(/Quita 1 carácter: el máximo es 120/).waitFor();
  assert.equal(count("POST", "/celebrations"), before);
});
await check("P2-limit-date", "onboarding: una fecha invalida o sin hora detiene el paso 2 con el motivo y sin enviar POST", async () => {
  await go("/onboarding/1");
  await page.getByRole("radio", { name: /Boda/ }).first().click();
  await page.getByTestId("onboarding-next").click();
  const before = count("POST", "/celebrations");
  // the date is the browser's picker and the time the product's own clock: both are mandatory
  assert.equal(await field("Fecha").getAttribute("type"), "date"); assert.equal(await timeButton(page, "Hora").first().getAttribute("aria-haspopup"), "dialog");
  await pickTime(page, timeButton(page, "Hora").first(), "17:30");
  await page.getByTestId("onboarding-next").click();
  await text("Elige la fecha.").waitFor();
  await field("Fecha").fill("2027-08-14"); await pickTime(page, timeButton(page, "Hora").first(), "");
  await page.getByTestId("onboarding-next").click();
  await text("Elige la hora.").waitFor();
  assert.equal(count("POST", "/celebrations"), before);
});
await check("P2-limit-double", "onboarding: doble clic en Crear mi invitación envia un unico POST y crea una unica celebracion", async () => {
  await onboardingDetails();
  const slug = `dbl-${stamp}`;
  await field("Nombre de la celebración").fill("Doble clic");
  await field(SLUG_FIELD).fill(slug);
  const before = count("POST", "/celebrations");
  await btn(CREATE).dblclick();
  await page.waitForURL(/\/onboarding\/listo\?c=/);
  assert.equal(count("POST", "/celebrations") - before, 1);
  const mine = (await http("GET", "/celebrations?limit=100", { token: await token() })).json.items.filter((item) => item.slug === slug);
  assert.equal(mine.length, 1);
});
await check("P2-error-slug", "onboarding: slug repetido -> 409 SLUG_TAKEN con mensaje propio (no 'alguien guardo')", async () => {
  await onboardingDetails();
  await field("Nombre de la celebración").fill("Repetida");
  await field(SLUG_FIELD).fill(listed.slug);
  await btn(CREATE).click();
  await text(/Ese enlace ya lo usa otra celebración/).waitFor();
  assert.equal(await page.getByText(/Alguien guardó cambios/).count(), 0);
});
await check("P2-error-network", "onboarding: red caida muestra error, conserva lo escrito y reintentar crea una sola", async () => {
  await onboardingDetails();
  const slug = `net-${stamp}`;
  await field("Nombre de la celebración").fill("Sin red");
  await field(SLUG_FIELD).fill(slug);
  await offline("**/celebrations", async () => { await btn(CREATE).click(); await text(/No hay conexión con el servidor/).waitFor(); });
  assert.equal(await field("Nombre de la celebración").inputValue(), "Sin red");
  await btn(CREATE).click();
  await page.waitForURL(/\/onboarding\/listo\?c=/);
  assert.equal((await http("GET", "/celebrations?limit=100", { token: await token() })).json.items.filter((item) => item.slug === slug).length, 1);
});
await check("P2-error-403", "onboarding: 422 del servidor (tipo invalido) se explica", async () => {
  await onboardingDetails();
  await field("Nombre de la celebración").fill("Rechazada");
  await field(SLUG_FIELD).fill(`rej-${stamp}`);
  await respond("**/celebrations", 422, { title: "Unknown event type", status: 422, code: "INVALID_EVENT_TYPE" }, {}, async () => { await btn(CREATE).click(); await text(/Revisa este dato: Unknown event type/).waitFor(); });
});
await check("P2-error-429", "onboarding: 429 con Retry-After muestra los segundos de espera", async () => {
  await onboardingDetails();
  await field("Nombre de la celebración").fill("Throttled");
  await field(SLUG_FIELD).fill(`thr-${stamp}`);
  await respond("**/celebrations", 429, { title: "Too many requests", status: 429 }, { "retry-after": "7" }, async () => { await btn(CREATE).click(); await text(/Espera 7 segundos/).waitFor(); });
});

// ---------------------------------------------------------------- EDITOR (save-content per section)
const ed = await draft(completeContent);
const edUrl = (section) => open(`/editor/${section}`, ed.id);
await check("P3-general-valid", "editor general: guardar titulo, subtitulo, lugar y fecha; GET lo confirma", async () => {
  await edUrl("general");
  await field("Nombre de la celebración").fill("Boda editada");
  await field("Frase de bienvenida").fill("Los esperamos");
  await field("Ubicación").fill("Hacienda Sol");
  await field("Fecha").fill("2027-09-01");
  await page.getByTestId("save-content").click();
  await text(/Cambios guardados/).waitFor();
  const stored = await get(ed.id);
  assert.equal(stored.content.title, "Boda editada"); assert.equal(stored.content.subtitle, "Los esperamos"); assert.equal(stored.content.venueName, "Hacienda Sol");
  assert.equal(stored.localTimes.eventDate.date, "2027-09-01");
});
await check("P3-general-limit", "editor general: 121 caracteres bloquean el guardado sin PATCH; 120 se guardan", async () => {
  await edUrl("general");
  const before = count("PATCH", `/celebrations/${ed.id}`);
  await field("Nombre de la celebración").fill("y".repeat(121));
  await text(/Quita 1 carácter/).waitFor();
  await page.getByTestId("save-content").click();
  await text(/Hay textos demasiado largos/).waitFor();
  assert.equal(count("PATCH", `/celebrations/${ed.id}`), before);
  await field("Nombre de la celebración").fill("y".repeat(120));
  await page.getByTestId("save-content").click();
  await text(/Cambios guardados/).waitFor();
  assert.equal((await get(ed.id)).content.title.length, 120);
});
await check("P3-general-empty-date", "editor general: fecha invalida (limite) se rechaza antes de enviar", async () => {
  await edUrl("general");
  const before = count("PATCH", `/celebrations/${ed.id}`);
  await pickTime(page, timeButton(page, "Hora").first(), "");
  await page.getByTestId("save-content").click();
  await text("Elige la hora.").waitFor();
  assert.equal(count("PATCH", `/celebrations/${ed.id}`), before);
});
await check("P3-general-double", "editor general: doble clic en Guardar envia un solo PATCH", async () => {
  await edUrl("general");
  await field("Frase de bienvenida").fill("Doble clic " + stamp);
  const before = count("PATCH", `/celebrations/${ed.id}`);
  await page.getByTestId("save-content").dblclick();
  await text(/Cambios guardados/).waitFor();
  assert.equal(count("PATCH", `/celebrations/${ed.id}`) - before, 1);
  assert.equal((await get(ed.id)).content.subtitle, "Doble clic " + stamp);
});
await check("P3-general-409", "editor general: version vieja -> 409, mensaje, 'Ver la versión nueva' recarga y conserva lo tecleado antes", async () => {
  await edUrl("general");
  await field("Frase de bienvenida").fill("Mi texto");
  await patchAs(ed.id, { content: { venueName: "Cambiado por otro" } });
  await page.getByTestId("save-content").click();
  await text(/Alguien guardó cambios mientras editabas/).waitFor();
  assert.equal(await field("Frase de bienvenida").inputValue(), "Mi texto", "typed text kept after 409");
  await btn("Ver la versión nueva").click();
  await page.waitForFunction(() => document.body.innerText.includes("Cambiado por otro") || [...document.querySelectorAll("input")].some((i) => i.value === "Cambiado por otro"));
  await field("Frase de bienvenida").fill("Mi texto");
  await page.getByTestId("save-content").click();
  await text(/Cambios guardados/).waitFor();
  assert.equal((await get(ed.id)).content.subtitle, "Mi texto");
});
await check("P3-general-network", "editor general: red caida -> mensaje claro, el texto sigue y reintentar guarda", async () => {
  await edUrl("general");
  await field("Frase de bienvenida").fill("Tras la caida");
  await offline(`**/celebrations/${ed.id}`, async () => { await page.getByTestId("save-content").click(); await text(/No hay conexión con el servidor/).waitFor(); await notBlank(); });
  assert.equal(await field("Frase de bienvenida").inputValue(), "Tras la caida");
  await page.getByTestId("save-content").click();
  await text(/Cambios guardados/).waitFor();
  assert.equal((await get(ed.id)).content.subtitle, "Tras la caida");
});
await check("P3-general-401", "editor general: 401 no deja pantalla en blanco (sesion vencida o login)", async () => {
  await edUrl("general");
  await field("Frase de bienvenida").fill("Con 401");
  await respond(`**/celebrations/${ed.id}`, 401, { title: "Unauthorized", status: 401 }, {}, async () => { await page.getByTestId("save-content").click(); await page.waitForTimeout(1500); await notBlank(); });
  await login(world.host.email);
});
await check("P3-general-403", "editor general: 403 explica que solo anfitriones pueden cambiar", async () => {
  await edUrl("general");
  await field("Frase de bienvenida").fill("Con 403");
  await respond(`**/celebrations/${ed.id}`, 403, { title: "Read only", status: 403 }, {}, async () => { await page.getByTestId("save-content").click(); await text(/solo los anfitriones o el planner/).waitFor(); });
});
await check("P3-slug", "editor general: cambiar la direccion (borrador) se guarda; invalida y repetida se rechazan con motivo", async () => {
  await edUrl("general");
  const slug = ed.slug + "-b";
  await field(SLUG_FIELD).fill("Mala Direccion");
  await text(/minúsculas, números y guiones/).waitFor();
  const before = count("PATCH", `/celebrations/${ed.id}`);
  await page.getByTestId("save-content").click();
  assert.equal(count("PATCH", `/celebrations/${ed.id}`), before);
  await field(SLUG_FIELD).fill(listed.slug);
  await page.getByTestId("save-content").click();
  await text(/Ese enlace ya lo usa otra celebración/).waitFor();
  await field(SLUG_FIELD).fill(slug);
  await page.getByTestId("save-content").click();
  await text(/Cambios guardados/).waitFor();
  assert.equal((await get(ed.id)).slug, slug);
});
await check("P3-hosts", "editor anfitriones: guardar nombres; GET lo confirma; vaciar uno lo borra", async () => {
  await edUrl("anfitriones");
  await field("Novia").fill("Ana María"); await field("Novio").fill("Luis Fernando");
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  let stored = await get(ed.id); assert.equal(stored.content.hosts.BRIDE, "Ana María"); assert.equal(stored.content.hosts.GROOM, "Luis Fernando");
  await edUrl("anfitriones");
  await field("Novio").fill("w".repeat(81));
  await text(/Quita 1 carácter: el máximo es 80/).waitFor();
  await field("Novio").fill("Luis Fernando");
});
await check("P3-venues", "editor lugares: agregar dos, reordenar, quitar uno; GET confirma orden y contenido", async () => {
  await edUrl("lugares");
  await btn("Agregar lugar").click();
  await field("Nombre del lugar").fill("Iglesia"); await field("Dirección").fill("Calle 1");
  await btn("Agregar lugar").click();
  await page.getByLabel("Nombre del lugar", { exact: true }).filter({ visible: true }).nth(1).fill("Salón");
  await rowAction("Subir", 1);
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  let stored = await get(ed.id);
  assert.deepEqual(stored.content.venues.map((v) => v.name), ["Salón", "Iglesia"]);
  await edUrl("lugares");
  await rowAction("Quitar", 0);
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  stored = await get(ed.id);
  assert.deepEqual(stored.content.venues.map((v) => v.name), ["Iglesia"]);
  await edUrl("lugares");
  await rowAction("Quitar", 0);
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  assert.deepEqual((await get(ed.id)).content.venues ?? [], []);
});
await check("P3-venues-empty-row", "editor lugares: una fila vacia agregada y no rellenada se descarta (limite) sin error", async () => {
  await edUrl("lugares");
  await btn("Agregar lugar").click();
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  assert.deepEqual((await get(ed.id)).content.venues ?? [], []);
});
await check("P3-story", "editor historia: guardar parrafos, limite 5000 y 5001", async () => {
  await edUrl("historia");
  await field("Su historia").fill("Primer párrafo.\n\nSegundo párrafo.");
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  assert.equal((await get(ed.id)).content.story, "Primer párrafo.\n\nSegundo párrafo.");
  await edUrl("historia");
  await field("Su historia").fill("s".repeat(5001));
  await text(/Quita 1 carácter: el máximo es 5000/).waitFor();
});
await check("P3-schedule", "editor itinerario: agregar actividad, guardar con hora local; GET confirma; quitar la elimina", async () => {
  await edUrl("itinerario");
  await btn("Agregar actividad").click();
  await field("Actividad").fill("Ceremonia"); await page.getByLabel("Fecha", { exact: true }).filter({ visible: true }).last().fill("2027-09-01");
  await pickTime(page, timeButton(page, "Hora").last(), "16:00");
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  let stored = await get(ed.id);
  assert.equal(stored.content.schedule.length, 1); assert.equal(stored.content.schedule[0].title, "Ceremonia");
  assert.equal(stored.localTimes[`schedule.${stored.content.schedule[0].id}`]?.time ?? "16:00", "16:00");
  await edUrl("itinerario");
  await rowAction("Quitar", 0);
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  assert.deepEqual((await get(ed.id)).content.schedule ?? [], []);
});
await check("P3-sections", "editor otras secciones: vestimenta, FAQ (agregar/subir/quitar) y recomendaciones; GET confirma", async () => {
  await edUrl("secciones");
  await field("Código de vestimenta").fill("Formal");
  await btn("Agregar pregunta").click();
  await field("Pregunta").fill("¿Hay estacionamiento?"); await field("Respuesta").fill("Sí");
  await btn("Agregar pregunta").click();
  await page.getByLabel("Pregunta", { exact: true }).filter({ visible: true }).nth(1).fill("¿Niños?");
  await rowAction("Subir", 1);
  await btn("Agregar recomendación").click();
  await page.getByLabel("Nombre", { exact: true }).filter({ visible: true }).first().fill("Hotel Sol");
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  let stored = await get(ed.id);
  assert.equal(stored.content.dressCode, "Formal"); assert.deepEqual(stored.content.faq.map((q) => q.question), ["¿Niños?", "¿Hay estacionamiento?"]);
  assert.equal(stored.content.recommendations[0].name, "Hotel Sol");
  await edUrl("secciones");
  await rowAction("Quitar", 0);
  await page.getByTestId("save-content").click(); await text(/Cambios guardados/).waitFor();
  stored = await get(ed.id);
  assert.equal(stored.content.faq.length, 1);
});

// ---------------------------------------------------------------- TRADUCCIONES
const tr = await draft(completeContent);
await check("P4-translations", "traducciones: agregar idioma, guardar titulo traducido, vaciar lo elimina; 409 y red caida", async () => {
  await open("/editor/traducciones", tr.id);
  await text(/solo idioma/).waitFor();
  await btn("Agregar idioma: English").click();
  await page.waitForFunction(() => document.body.innerText.includes("Original:"));
  assert.ok((await get(tr.id)).supportedLocales.includes("en-US"));
  await field("Nombre").fill("Wedding of Ana");
  await page.getByTestId("save-translation").click(); await text(/Cambios guardados/).waitFor();
  assert.equal((await get(tr.id)).translations["en-US"].title, "Wedding of Ana");
  // 409
  await field("Nombre").fill("Changed title");
  await patchAs(tr.id, { content: { subtitle: "otro" } });
  await page.getByTestId("save-translation").click();
  await text(/Alguien guardó cambios/).waitFor();
  await btn("Ver la versión nueva").click();
  await page.waitForTimeout(800);
  // network
  await field("Nombre").fill("After outage");
  await offline(`**/celebrations/${tr.id}`, async () => { await page.getByTestId("save-translation").click(); await text(/No hay conexión con el servidor/).waitFor(); });
  await page.getByTestId("save-translation").click(); await text(/Cambios guardados/).waitFor();
  assert.equal((await get(tr.id)).translations["en-US"].title, "After outage");
  // limit: 5001 chars blocks, then clear everything removes the translation
  await field("Nombre").fill("z".repeat(5001));
  await text(/Quita 1 carácter/).waitFor();
  assert.equal(await page.getByTestId("save-translation").first().getAttribute("aria-disabled"), "true");
  await field("Nombre").fill("");
  await page.getByTestId("save-translation").click(); await text(/Cambios guardados/).waitFor();
  assert.equal((await get(tr.id)).translations?.["en-US"], undefined);
});

// ---------------------------------------------------------------- PUBLICAR / DESPUBLICAR / ARCHIVAR
const incomplete = await draft();
await check("P5-publish-blocked", "publicar: con checklist incompleto el boton esta deshabilitado y lista lo que falta con enlace Completar", async () => {
  await open("/publicar", incomplete.id);
  await text(/Antes de publicar, completa/).waitFor();
  assert.equal(await page.getByTestId("publish").first().getAttribute("aria-disabled"), "true");
  assert.ok(await page.getByText(/La fecha del evento/).count() > 0);
  await btn("Completar").first().click();
  await page.waitForURL(/\/editor\//);
  const response = await http("POST", `/celebrations/${incomplete.id}/publish`, { token: await token(), version: (await get(incomplete.id)).version });
  assert.equal(response.status, 422, "server also refuses");
});
await check("P5-check-error", "publicar: si GET publish-check falla NO dice 'todo listo': error + Reintentar y publicar deshabilitado", async () => {
  const c = await draft(completeContent);
  await offline(`**/celebrations/${c.id}/publish-check`, async () => {
    await open("/publicar", c.id);
    await text(/No hay conexión con el servidor/).waitFor();
    assert.equal(await page.getByText(/lista para publicar/).count(), 0);
    assert.equal(await page.getByTestId("publish").first().getAttribute("aria-disabled"), "true");
  });
  await page.getByTestId("retry-check").click();
  await text(/lista para publicar/).waitFor();
});
const pub = await draft(completeContent);
await check("P5-publish-valid", "publicar: confirmar publica (doble clic = 1 POST) y GET devuelve PUBLISHED; 409 con version vieja", async () => {
  await open("/publicar", pub.id);
  await text(/lista para publicar/).waitFor();
  await page.getByTestId("publish").click();
  const before = count("POST", `/celebrations/${pub.id}/publish`);
  // Two activations of the confirm button in the same frame. Done on the element, not at its coordinates: once the dialog closes the second
  // pointer click would land on whatever is under it (the section tabs), which is not what this check is about.
  await page.getByRole("button", { name: "Publicar celebración", exact: true }).last().evaluate((el) => { el.click(); el.click(); });
  await text(/Tu invitación ya está publicada/).waitFor();
  assert.equal(count("POST", `/celebrations/${pub.id}/publish`) - before, 1);
  const stored = await get(pub.id); assert.equal(stored.status, "PUBLISHED");
  let publicStatus = 0;
  for (let attempt = 0; attempt < 20 && publicStatus !== 200; attempt++) { publicStatus = (await http("GET", `/celebrations/public/${stored.slug}`)).status; if (publicStatus !== 200) await new Promise((r) => setTimeout(r, 1000)); }
  assert.equal(publicStatus, 200, "public projection serves it (eventually consistent)");
});
await check("P5-publish-409", "publicar: version vieja -> 409 con mensaje de versión y recarga; transicion invalida -> mensaje propio", async () => {
  const c = await draft(completeContent);
  await open("/publicar", c.id);
  await text(/lista para publicar/).waitFor();
  await patchAs(c.id, { content: { subtitle: "otro cambio" } });
  await page.getByTestId("publish").click();
  await page.getByRole("button", { name: "Publicar celebración", exact: true }).last().click();
  await text(/Alguien guardó cambios mientras editabas/).waitFor();
  await btn("Ver la versión nueva").click();
  await page.waitForTimeout(800);
  await page.getByTestId("publish").click();
  await page.getByRole("button", { name: "Publicar celebración", exact: true }).last().click();
  await text(/Tu invitación ya está publicada/).waitFor();
  assert.equal((await get(c.id)).status, "PUBLISHED");
});
await check("P5-publish-network", "publicar: red caida al publicar -> error claro, sigue en borrador, reintentar publica", async () => {
  const c = await draft(completeContent);
  await open("/publicar", c.id);
  await text(/lista para publicar/).waitFor();
  await offline(`**/celebrations/${c.id}/publish`, async () => {
    await page.getByTestId("publish").click();
    await page.getByRole("button", { name: "Publicar celebración", exact: true }).last().click();
    await text(/No hay conexión con el servidor/).waitFor();
  });
  assert.equal((await get(c.id)).status, "DRAFT");
  await page.getByTestId("publish").click();
  await page.getByRole("button", { name: "Publicar celebración", exact: true }).last().click();
  await text(/Tu invitación ya está publicada/).waitFor();
  assert.equal((await get(c.id)).status, "PUBLISHED");
});
await check("P5-unpublish", "despublicar: cancelar no envia nada; confirmar con motivo (200 max) despublica; GET lo confirma", async () => {
  const c = await draft(completeContent);
  const cur = await get(c.id);
  assert.equal((await http("POST", `/celebrations/${c.id}/publish`, { token: await token(), version: cur.version })).status, 200);
  await open("/publicar", c.id);
  await page.getByTestId("more-publish").click();
  await page.getByTestId("unpublish").click();
  await btn("Cancelar").click();
  assert.equal(count("POST", `/celebrations/${c.id}/unpublish`), 0);
  await page.getByTestId("more-publish").click();
  await page.getByTestId("unpublish").click();
  await field("Motivo (opcional)").fill("r".repeat(201));
  await text(/Quita 1 carácter/).waitFor();
  await page.getByRole("button", { name: "Despublicar", exact: true }).last().click();
  assert.equal(count("POST", `/celebrations/${c.id}/unpublish`), 0, "over-limit reason is not sent");
  await field("Motivo (opcional)").fill("Corrección de datos");
  await page.getByRole("button", { name: "Despublicar", exact: true }).last().click();
  await text(/Borrador: solo tú la ves/).waitFor();
  assert.equal((await get(c.id)).status, "DRAFT");
  const audit = (await http("GET", `/celebrations/${c.id}/audit`, { token: await token() })).json.items;
  assert.ok(audit.some((entry) => entry.action === "UNPUBLISHED"));
});
await check("P5-archive", "archivar: ConfirmDialog; GET = ARCHIVED; luego editar/ajustes/modos muestran solo-lectura y no ofrecen guardar; 409 por doble archivo se explica", async () => {
  const c = await draft(completeContent);
  await open("/publicar", c.id);
  await page.getByTestId("more-publish").click();
  await page.getByTestId("archive").click();
  await btn("Cancelar").click();
  assert.equal((await get(c.id)).status, "DRAFT");
  await page.getByTestId("more-publish").click();
  await page.getByTestId("archive").click();
  await page.getByRole("button", { name: "Archivar", exact: true }).last().click();
  await text(/Archivada\./).waitFor();
  assert.equal((await get(c.id)).status, "ARCHIVED");
  for (const route of ["/editor/general", "/editor/galeria", "/editor/traducciones", "/templates", "/configuracion", "/modos"]) {
    await open(route, c.id);
    await text(/Esta celebración está archivada/).waitFor();
    assert.equal(await page.getByTestId("save-content").count(), 0);
  }
  // another tab archived it first -> publish page of a stale draft: archive again explains the state
  const c2 = await draft(completeContent);
  await open("/publicar", c2.id);
  await text(/lista para publicar/).waitFor();
  await page.getByTestId("more-publish").click();
  const cur = await get(c2.id);
  await http("POST", `/celebrations/${c2.id}/archive`, { token: await token(), version: cur.version });
  await page.getByTestId("archive").click();
  await page.getByRole("button", { name: "Archivar", exact: true }).last().click();
  await text(/ya no admite cambios|ya no corresponde al estado actual|Alguien guardó/).waitFor();
});

// ---------------------------------------------------------------- AJUSTES (configuracion)
const st = await draft(completeContent);
await check("P6-settings-general", "ajustes: idiomas/zona/moneda (en «Más opciones», como selector) guardan (GET confirma) con aviso de exito; 409 y red caida", async () => {
  await open("/configuracion", st.id);
  await page.getByTestId("more-settings").click();
  await page.getByTestId("settings-time-zone").selectOption("America/Lima");
  await page.getByTestId("settings-currency").selectOption("USD");
  await page.getByTestId("save-settings").click();
  await text(/Configuración guardada/).waitFor();
  const stored = await get(st.id); assert.equal(stored.timeZone, "America/Lima"); assert.equal(stored.currency, "USD");
  await page.getByTestId("settings-currency").selectOption("BOB");
  await patchAs(st.id, { content: { subtitle: "x" } });
  await page.getByTestId("save-settings").click();
  await text(/Alguien guardó cambios/).waitFor();
  await btn("Ver la versión nueva").click();
  await page.waitForTimeout(800);
  await page.getByTestId("settings-currency").selectOption("BOB");
  await offline(`**/celebrations/${st.id}`, async () => { await page.getByTestId("save-settings").click(); await text(/No hay conexión con el servidor/).waitFor(); });
  await page.getByTestId("save-settings").click();
  await text(/Configuración guardada/).waitFor();
  assert.equal((await get(st.id)).currency, "BOB");
});
await check("P6-deadline", "ajustes: fecha limite guardar/quitar (GET confirma); invalida se bloquea; 429 con espera (un solo Guardar)", async () => {
  await open("/configuracion", st.id);
  const before = count("PUT", "/settings");
  await pickTime(page, timeButton(page, "Hora").first(), "20:00");
  await page.getByTestId("save-settings").click();
  await text(/Revisa este dato/).waitFor();
  assert.equal(count("PUT", "/settings"), before);
  await field("Fecha").first().fill("2027-05-01"); await pickTime(page, timeButton(page, "Hora").first(), "20:00");
  await respond(`**/celebrations/${st.id}/settings`, 429, { title: "slow down", status: 429 }, { "retry-after": "3" }, async () => { await page.getByTestId("save-settings").click(); await text(/Espera 3 segundos/).waitFor(); });
  await page.getByTestId("save-settings").click();
  await text(/Configuración guardada/).waitFor();
  let stored = await get(st.id); assert.equal(new Date(stored.settings.rsvpDeadline).toISOString(), "2027-05-02T01:00:00.000Z", "20:00 in America/Lima (-05:00, set by the previous check) stored as an instant"); await page.reload(); await page.waitForLoadState("networkidle"); assert.equal(await field("Fecha").inputValue(), "2027-05-01", "the form shows it back in the celebration zone");
  await btn("Quitar fecha límite").click();
  await text(/Configuración guardada/).waitFor();
  stored = await get(st.id); assert.equal(stored.settings.rsvpDeadline, null);
});
await check("P6-eventtype", "ajustes: cambiar tipo (borrador) con confirmacion; GET confirma; cancelar no envia", async () => {
  await open("/configuracion", st.id);
  await page.getByTestId("more-settings").click();
  assert.equal(await page.getByTestId("save-event-type").first().getAttribute("aria-disabled"), "true");
  await page.getByRole("radio", { name: /Quinceañera|Cumpleaños/ }).first().click();
  const picked = await page.getByRole("radio", { checked: true }).evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
  await page.getByTestId("save-event-type").click();
  await btn("Cancelar").click();
  assert.equal(count("PUT", `/celebrations/${st.id}/event-type`), 0);
  await page.getByTestId("save-event-type").click();
  await page.getByRole("button", { name: "Cambiar tipo", exact: true }).last().click();
  await text(/Configuración guardada/).waitFor();
  assert.notEqual((await get(st.id)).eventTypeCode, "WEDDING", picked.join());
});
await check("P6-team", "ajustes equipo: UUID invalido bloqueado; dar acceso (GET confirma); quitar con ConfirmDialog (GET confirma)", async () => {
  await open("/configuracion", st.id);
  await page.getByTestId("more-settings").click();
  const user = "11111111-1111-4111-8111-" + String(Date.now()).padStart(12, "0").slice(-12);
  await field("Identificador de la persona (UUID)").fill("no-es-uuid");
  await text(/identificador de usuario válido/).waitFor();
  assert.equal(await page.getByTestId("add-member").first().getAttribute("aria-disabled"), "true");
  await field("Identificador de la persona (UUID)").fill(user);
  await page.getByRole("radio", { name: "Coanfitrión" }).click();
  await page.getByTestId("add-member").click();
  await text(/Acceso guardado/).waitFor();
  assert.deepEqual((await get(st.id)).collaborators.find((m) => m.userId === user)?.role, "CO_HOST");
  await page.getByTestId(`remove-member-${user}`).click();
  await btn("Cancelar").click();
  assert.ok((await get(st.id)).collaborators.some((m) => m.userId === user));
  await page.getByTestId(`remove-member-${user}`).click();
  await page.getByRole("button", { name: "Quitar acceso", exact: true }).last().click();
  await text(/Acceso quitado/).waitFor();
  assert.ok(!(await get(st.id)).collaborators.some((m) => m.userId === user));
});
await check("P6-audit", "ajustes historial: lista las acciones reales del audit log", async () => {
  await open("/configuracion", st.id);
  await page.getByTestId("more-settings").click();
  await text(/Historial de cambios/).waitFor();
  await text(/Creaste la celebración/).waitFor();
});

// ---------------------------------------------------------------- MODOS
const md = await draft(completeContent);
await check("P7-modes", "modos: cambiar (confirm) persiste (GET); cancelar no envia; 409 y red caida se recuperan; partner priority", async () => {
  await open("/modos", md.id);
  const key = "giftReservationMode";
  const was = (await get(md.id)).settings[key];
  await page.getByTestId(`switch-${key}`).click();
  await btn("Cancelar").click();
  assert.equal(count("PUT", `/celebrations/${md.id}/settings`), 0);
  await page.getByTestId(`switch-${key}`).click();
  await btn("Sí, cambiar").dblclick();
  await text(/Modo actualizado/).waitFor();
  assert.equal(count("PUT", `/celebrations/${md.id}/settings`), 1, "double click = one PUT");
  assert.notEqual((await get(md.id)).settings[key], was);
  // 409
  const unregisteredBefore = (await get(md.id)).settings.unregisteredRsvpMode;
  await patchAs(md.id, { content: { subtitle: "otro" } });
  await page.getByTestId("switch-unregisteredRsvpMode").click();
  await btn("Sí, cambiar").click();
  await text(/Alguien guardó cambios/).waitFor();
  await btn("Ver la versión nueva").click();
  await page.waitForTimeout(800);
  await offline(`**/celebrations/${md.id}/settings`, async () => { await page.getByTestId("switch-unregisteredRsvpMode").click(); await btn("Sí, cambiar").click(); await text(/No hay conexión con el servidor/).waitFor(); });
  await page.getByTestId("switch-unregisteredRsvpMode").click(); await btn("Sí, cambiar").click();
  await text(/Modo actualizado/).waitFor();
  const settings = (await get(md.id)).settings;
  assert.notEqual(settings.unregisteredRsvpMode, unregisteredBefore);
  await page.getByTestId("switch-partnerPriority").click(); await btn("Sí, cambiar").click();
  await text(/Modo actualizado/).waitFor();
  assert.equal((await get(md.id)).settings.partnerPriorityEnabled, !settings.partnerPriorityEnabled);
});

// ---------------------------------------------------------------- PLANTILLAS, GALERIA, PREVIEW
const gl = await draft(completeContent);
await check("P8-preview", "vista previa: selector de dispositivo cambia el ancho y no hay pantalla en blanco", async () => {
  await open("/preview", gl.id);
  await page.getByRole("radio", { name: /Tableta/ }).click();
  await page.getByTestId("preview-tablet").waitFor();
  await page.getByRole("radio", { name: /Escritorio/ }).click();
  await page.getByTestId("preview-desktop").waitFor();
  await notBlank();
});
await check("P8-templates-real502", "plantillas: /media/templates devuelve 502 real -> mensaje de servidor + Reintentar, sin pantalla en blanco", async () => {
  await open("/templates", gl.id);
  await text(/El servidor no respondió/).waitFor();
  await page.getByTestId("retry-templates").waitFor();
  await notBlank();
});
await check("P8-templates-mock", "plantillas (MOCK, backend no desplegado): aplicar plantilla envia PUT /template con If-Match", async () => {
  const tpl = { id: "22222222-2222-4222-8222-222222222222", name: "Clásica", description: "mock", eventTypeTags: ["wedding"], layout: "classic", theme: { palette: {}, fonts: {} }, sectionOrder: ["story"], status: "PUBLISHED", version: 1, publishedAt: null };
  let putBody = null; let ifMatch = null;
  await page.route("**/media/templates?*", (route) => route.request().method() === "OPTIONS" ? route.fulfill({ status: 204, headers: CORS }) : route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify({ items: [tpl] }) }));
  await page.route(`**/celebrations/${gl.id}/template`, (route) => { if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS }); putBody = route.request().postData(); ifMatch = route.request().headers()["if-match"]; return route.fulfill({ status: 409, contentType: "application/problem+json", headers: CORS, body: JSON.stringify({ title: "tpl", status: 409, code: "VERSION_CONFLICT" }) }); });
  try {
    await open("/templates", gl.id);
    await page.getByTestId("apply-template").click();
    await text(/Alguien guardó cambios/).waitFor();
    assert.match(putBody ?? "", /22222222/); assert.match(ifMatch ?? "", /^"\d+"$/);
  } finally { await page.unroute("**/media/templates?*"); await page.unroute(`**/celebrations/${gl.id}/template`); }
});
await check("P8-gallery-real502", "galeria: /media/.../assets devuelve 502 real -> mensaje de servidor, boton Agregar foto no rompe la pantalla", async () => {
  await open("/editor/galeria", gl.id);
  await text(/El servidor no respondió/).waitFor();
  await notBlank();
});
await check("P8-gallery-limits", "galeria: archivo no imagen y >10 MB se rechazan localmente sin ninguna peticion", async () => {
  await open("/editor/galeria", gl.id);
  const before = requests.filter((line) => line.includes("/media/uploads")).length;
  for (const [name, mimeType, size, message] of [["x.pdf", "application/pdf", 10, /no es una imagen JPG, PNG o WebP/], ["big.png", "image/png", 10_485_761, /supera los 10 MB/]]) {
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByTestId("add-photo").click()]);
    await chooser.setFiles({ name, mimeType, buffer: Buffer.alloc(size, 1) });
    await text(message).waitFor();
  }
  assert.equal(requests.filter((line) => line.includes("/media/uploads")).length, before);
});
await check("P8-gallery-mock", "galeria (MOCK, backend no desplegado): subir, portada, reordenar y eliminar con ConfirmDialog envian las llamadas correctas", async () => {
  const asset = (id, cover) => ({ id, status: "PROCESSED", isCover: cover, width: 10, height: 10, variants: { thumb: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", medium: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" } });
  let assets = [asset("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", true), asset("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", false)];
  const calls = [];
  const cors = CORS;
  await page.route("**/media/**", async (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    calls.push(`${request.method()} ${url.pathname}`);
    if (request.method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ items: assets }) });
    if (request.method() === "DELETE") { assets = assets.filter((a) => !url.pathname.endsWith(a.id)); return route.fulfill({ status: 204, headers: cors }); }
    if (request.method() === "PUT") { const body = JSON.parse(request.postData()); assets = body.assetIds.map((id) => ({ ...assets.find((a) => a.id === id), isCover: id === body.coverAssetId })); return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ items: assets }) }); }
    return route.fulfill({ status: 500, headers: cors });
  });
  try {
    await open("/editor/galeria", gl.id);
    await text(/Foto 2/).waitFor();
    await rowMenu(1).click();
    await page.getByTestId("cover-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb").click();
    await text(/Orden guardado/).waitFor();
    await rowAction("Bajar", 0);
    for (let i = 0; i < 40 && calls.filter((call) => call.startsWith("PUT")).length < 2; i++) await page.waitForTimeout(100);
    assert.equal(calls.filter((call) => call.startsWith("PUT")).length, 2, "cover and move each sent their PUT");
    await page.waitForTimeout(400);
    await rowMenu(1).click();
    await page.getByTestId("delete-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa").click();
    await btn("Cancelar").click();
    assert.ok(!calls.some((call) => call.startsWith("DELETE")));
    await rowMenu(1).click();
    await page.getByTestId("delete-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa").click();
    await page.getByRole("button", { name: "Eliminar", exact: true }).last().click();
    await text(/Foto eliminada/).waitFor();
    assert.equal(calls.filter((call) => call.startsWith("DELETE")).length, 1);
  } finally { await page.unroute("**/media/**"); }
});

// ---------------------------------------------------------------- Cross-cutting
await check("Z-console", "ninguna pantalla produjo errores de consola de la app (excluye fallos de red provocados)", async () => {
  const real = consoleErrors.filter((line) => !/ERR_|Failed to fetch|NetworkError|status of (4|5)\d\d/.test(line));
  assert.deepEqual(real, [], real.join(" | ").slice(0, 600));
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { for (const r of failed) console.log(`FAIL ${r.id}: ${r.error}`); process.exit(1); }
