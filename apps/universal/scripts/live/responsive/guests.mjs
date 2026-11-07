// Responsive/i18n/a11y matrix for the host "guests" area: route x width {360,768,1280} x locale {es-BO,en-US} x scheme {light,dark},
// real session through the login screen against the REAL gateway, Chrome real.
//   WORLD=world.json APP=http://localhost:8100 API=http://localhost:28000 CHROMIUM_PATH=".../Google Chrome" \
//     [WIDTHS=360,768] [LOCALES=en-US] [SCHEMES=dark] [ROUTES=/inicio,/invitados] [OUT=file.json] node apps/universal/scripts/live/responsive/guests.mjs
import { writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { APP, C, G, assert, host, http, isCall, launch, makeGuest, sleep, tid, track, waitGuests, world } from "../lib.mjs";

const list = (name, all) => (process.env[name] ? process.env[name].split(",").map((v) => v.trim()) : all);
const WIDTHS = list("WIDTHS", ["360", "768", "1280"]).map(Number);
const LOCALES = list("LOCALES", ["es-BO", "en-US"]);
const SCHEMES = list("SCHEMES", ["light", "dark"]);
const only = process.env.ROUTES ? process.env.ROUTES.split(",") : null;
const stamp = Date.now().toString(36);

// Known benign noise only: the anonymous session refresh (401) and the media/push backends that are not part of this environment (502/503).
const benign = (status, url) => (status === 401 && /\/identity\/auth\/refresh/.test(url)) || ((status === 502 || status === 503) && /\/(media|templates|push)\b|\/notifications\/.*push|push-|\/notifications\/celebrations\/[^/]+\/devices/.test(url));
const SPANISH = ["Guardar", "Cancelar", "Cargando", "Reintentar", "Acompañantes", "Invitados", "Agregar", "Importar", "Volver", "Ajustes", "Enviar", "Eliminar", "Buscar", "Notificaciones", "Preferencias", "Aprobar", "Rechazar", "Grupos", "Pendientes", "Confirmados", "Solicitudes", "Actualizar", "Conexión", "Correo"];
const RAW_KEY = /(?<![\w@./-])(?:guests|host|common|rsvp|errors|notifications|preferences|push|celebration|gifts|ui|auth)\.[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)*(?![\w@-])/g;

const rows = [];
const record = (width, locale, scheme, route, check, ok, evidence = "") => {
  rows.push({ width, locale, scheme, route, check, status: ok ? "PASS" : "FAIL", evidence });
  if (!ok) console.log(`  FAIL ${width} ${locale} ${scheme} ${route} | ${check} | ${evidence}`);
};

const browser = await launch();
const guest = await makeGuest("resp", { allowedCompanions: 1 });
const ROUTES = [
  ["/inicio", "inicio"], ["/invitados", "lista"], ["/invitados/nuevo", "nuevo"], ["/invitados/importar", "importar"], ["/invitados/grupos", "grupos"],
  ["/invitados/ajustes", "ajustes"], [`/invitados/${guest.id}`, "ficha"], ["/rsvp/reporte", "reporte"], ["/bandeja/acompanantes", "acompanantes"],
  ["/notificaciones", "notificaciones"], ["/preferencias", "preferencias"], ["/permisos-push", "permisos-push"],
].filter(([path, name]) => !only || only.includes(path) || only.includes(name));

async function open(width, locale, scheme) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale, colorScheme: scheme, acceptDownloads: true });
  context.setDefaultTimeout(25000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP }).catch(() => undefined);
  const page = await context.newPage();
  const bag = { errors: [], bad: [] };
  page.on("pageerror", (error) => bag.errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) bag.errors.push(`console.error: ${message.text().slice(0, 200)}`); });
  page.on("response", (response) => { if (response.status() >= 400 && !benign(response.status(), response.url())) bag.bad.push(`${response.status()} ${response.request().method()} ${response.url().replace(/\?.*/, "")}`); });
  await page.goto(`${APP}/login`);
  // The login screen's current labels ("Correo"/"Entrar") and the earlier ones both work.
  await page.getByLabel(/^(Correo( electrónico)?|Email)$/).filter({ visible: true }).fill(world.host.email);
  await page.getByLabel(/^(Contraseña|Password)$/).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: /^(Entrar|Iniciar sesión|Sign in)$/ }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
  return { context, page, bag };
}
const visit = async (page, path) => { await page.goto(`${APP}${path}${path.includes("?") ? "&" : "?"}c=${C}`); await page.waitForLoadState("networkidle").catch(() => undefined); await sleep(1500); };

async function routeChecks(width, locale, scheme) {
  const { context, page, bag } = await open(width, locale, scheme);
  for (const [path, name] of ROUTES) {
    const R = name;
    bag.errors.length = 0; bag.bad.length = 0;
    try { await visit(page, path); } catch (error) { record(width, locale, scheme, R, "carga", false, String(error.message).split("\n")[0]); continue; }
    const noise = [...bag.errors, ...bag.bad];
    record(width, locale, scheme, R, "(a) sin pageerror/console.error/HTTP>=400", noise.length === 0, [...new Set(noise)].slice(0, 3).join(" ; "));
    const body = await page.evaluate(() => ({ text: document.body.innerText, overflow: document.documentElement.scrollWidth - window.innerWidth, bg: (() => { // first opaque background found from the middle of the screen upwards, then html/body
      const opaque = (el) => { const c = getComputedStyle(el).backgroundColor; return c && !/rgba\(.*, 0\)$|transparent/.test(c) ? c : null; };
      let el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      while (el) { const c = opaque(el); if (c) return c; el = el.parentElement; }
      return "rgb(255, 255, 255) (default canvas)";
    })() }));
    record(width, locale, scheme, R, "contenido no vacio", body.text.trim().length > 40, `len=${body.text.trim().length}`);
    record(width, locale, scheme, R, "(b) sin scroll horizontal", body.overflow <= 1, `exceso=${body.overflow}px`);
    const keys = [...new Set(body.text.match(RAW_KEY) ?? [])];
    record(width, locale, scheme, R, "(c) sin claves i18n crudas", keys.length === 0, keys.slice(0, 5).join(", "));
    if (locale === "en-US") {
      const es = SPANISH.filter((word) => new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "iu").test(body.text.replace(/Live resp[^\n]*/g, "")));
      record(width, locale, scheme, R, "(c) sin literales espanoles en en-US", es.length === 0, es.join(", "));
    }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const severe = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    record(width, locale, scheme, R, "(d)(f) axe WCAG2.1 A/AA serious/critical", severe.length === 0, severe.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")}`).slice(0, 3).join(" ; "));
    if (width === 360) {
      const small = await page.evaluate(() => [...document.querySelectorAll('button, [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], input:not([type=hidden]), a[href]')]
        .filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; })
        .filter((el) => { const inText = el.tagName === "A" && el.closest("p, li") && el.parentElement?.childNodes.length > 1; return !inText; })
        .map((el) => ({ h: Math.round(el.getBoundingClientRect().height), label: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("data-testid") || el.tagName).slice(0, 40).replace(/\s+/g, " ") }))
        .filter((item) => item.h < 44));
      record(width, locale, scheme, R, "(e) objetivos tactiles >=44px", small.length === 0, small.slice(0, 4).map((s) => `${s.label}=${s.h}px`).join(" ; "));
    }
    if (scheme === "dark") {
      // Informative: do these screens follow the OS scheme? (they use a fixed light palette by design)
      const m = body.bg.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
      record(width, locale, scheme, R, "(f) fondo en dark (informativo: paleta clara fija si es claro)", true, `bg=${body.bg} ${m[0] + m[1] + m[2] > 600 ? "TEMA CLARO FIJO (no sigue el esquema)" : "oscuro"}`);
    }
  }
  await context.close();
}

/** (g) en-US flows driven only by testIDs, verified with GETs to the real backend. */
async function flows(width, scheme) {
  const locale = "en-US";
  const { context, page, bag } = await open(width, locale, scheme);
  const flow = async (name, fn) => { try { const evidence = await fn(); record(width, locale, scheme, "flujos", name, true, evidence ?? ""); } catch (error) { record(width, locale, scheme, "flujos", name, false, String(error.message).split("\n")[0].slice(0, 250)); } await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => undefined); };
  const tag = `${stamp}${width}${scheme[0]}`;
  await flow("(g) valido: agregar invitado (GET guest-list)", async () => {
    await visit(page, "/invitados/nuevo"); await tid(page, "save-guest").waitFor();
    const email = `flow.${tag}@example.com`;
    await tid(page, "guest-name").fill(`Flow ${tag}`); await tid(page, "guest-email").fill(email); await tid(page, "save-guest").click();
    let found = []; for (let i = 0; i < 25 && !found.length; i++) { found = await waitGuests(email, 1, 1500); }
    assert.equal(found.length, 1, "guest not in GET guest-list"); assert.equal(found[0].name, `Flow ${tag}`); return "GET guest-list: 1 invitado";
  });
  await flow("(g) valido: emitir y copiar enlace (token abre RSVP)", async () => {
    const g = await makeGuest(`lnk${width}`); await visit(page, `/invitados/${g.id}`); await tid(page, "issue-link").waitFor(); await tid(page, "issue-link").click(); await tid(page, "masked-link").waitFor();
    await tid(page, "copy-link").click(); await sleep(500);
    const copied = await page.evaluate(() => navigator.clipboard.readText()); const res = await http("GET", `/rsvp/celebrations/${C}/guest`, { token: copied.split("/").pop() });
    assert.equal(res.status, 200, `guest resource ${res.status}`); return "GET /rsvp/.../guest con el token copiado: 200";
  });
  await flow("(g) valido: guardar ajustes por defecto (GET guest-settings)", async () => {
    const value = String(width % 97 + (scheme === "dark" ? 1 : 0) + 2);
    await visit(page, "/invitados/ajustes"); await tid(page, "default-companions").waitFor(); await tid(page, "default-companions").fill(value); await tid(page, "save-defaults").click();
    let got; for (let i = 0; i < 20; i++) { got = (await host("GET", `${G}/guest-settings`)).json.defaultAllowedCompanions; if (String(got) === value) break; await sleep(400); }
    assert.equal(String(got), value); await host("PUT", `${G}/guest-settings`, { defaultAllowedCompanions: 0 }); return `GET guest-settings = ${value}`;
  });
  await flow("(g) valido: crear grupo (GET groups)", async () => {
    const name = `Grp ${tag}`; await visit(page, "/invitados/grupos"); await tid(page, "group-name").waitFor(); await tid(page, "group-name").fill(name); await tid(page, "create-group").click();
    let ok = false; for (let i = 0; i < 25 && !ok; i++) { const res = await host("GET", `${G}/groups`); ok = JSON.stringify(res.json ?? "").includes(name); if (!ok) await sleep(500); }
    assert.ok(ok, "group not in GET groups"); return "GET groups contiene el grupo";
  });
  await flow("(g) error: red caida al guardar invitado muestra aviso (es o en)", async () => {
    await visit(page, "/invitados/nuevo"); await tid(page, "save-guest").waitFor();
    await page.route(/\/guests\/celebrations\/[^/]+\/guests$/, (route) => (route.request().method() === "POST" ? route.abort("failed") : route.continue()));
    const posts = track(page, isCall("POST", /\/guests$/));
    await tid(page, "guest-name").fill(`Offline ${tag}`); await tid(page, "guest-email").fill(`off.${tag}@example.com`); await tid(page, "save-guest").click();
    const notice = page.getByText(/No hay conexión|No connection|offline|network|connection/i).filter({ visible: true }).first(); await notice.waitFor(); posts.stop();
    assert.ok(posts.count() >= 1, "no POST attempted"); assert.equal((await waitGuests(`off.${tag}@example.com`, 0)).length, 0); return `aviso: "${(await notice.innerText()).slice(0, 60)}"`;
  });
  await context.close();
}

console.log(`responsive guests: widths=${WIDTHS} locales=${LOCALES} schemes=${SCHEMES} routes=${ROUTES.length}`);
for (const width of WIDTHS) for (const locale of LOCALES) for (const scheme of SCHEMES) {
  console.log(`== ${width} ${locale} ${scheme}`);
  try { await routeChecks(width, locale, scheme); } catch (error) { record(width, locale, scheme, "*", "seccion", false, String(error.message).split("\n")[0]); }
  if (locale === "en-US" && !only) { try { await flows(width, scheme); } catch (error) { record(width, locale, scheme, "flujos", "seccion", false, String(error.message).split("\n")[0]); } }
}
console.log("\nancho | idioma | esquema | PASS | FAIL");
for (const width of WIDTHS) for (const locale of LOCALES) for (const scheme of SCHEMES) {
  const mine = rows.filter((r) => r.width === width && r.locale === locale && r.scheme === scheme);
  console.log(`${width} | ${locale} | ${scheme} | ${mine.filter((r) => r.status === "PASS").length} | ${mine.filter((r) => r.status === "FAIL").length}`);
}
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(rows, null, 2));
await browser.close();
process.exit(rows.some((r) => r.status === "FAIL") ? 1 : 0);
