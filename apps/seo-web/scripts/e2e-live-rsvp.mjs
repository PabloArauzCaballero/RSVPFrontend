// F15-F18 / F21 against the REAL backend (Kong :28000), in Chrome. No mock anywhere: a real host registers through Identity,
// publishes a celebration (AUTO_ACCEPT), registers guests, issues single-use links; the public web (Next, :3000) and the
// universal web app (Expo web, :8200) are driven in Chrome; every claim is cross-checked with the host API.
//
//   cd apps/seo-web && NEXT_PUBLIC_API_URL=http://localhost:28000 NEXT_PUBLIC_SITE_URL=http://localhost:3000 NEXT_DIST_DIR=.next-live npx next build && ... next start -p 3000
//   cd apps/universal && EXPO_PUBLIC_API_URL=http://localhost:28000 npx expo export --platform web --output-dir web-build-live --max-workers 1 --clear
//   (serve web-build-live on :8200 with SPA fallback; Kong CORS allows http://localhost:3000 and :8200)
//   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/seo-web/scripts/e2e-live-rsvp.mjs
//
// Writes screenshots and live-result.json to docs/progress/evidence/lane-F15 .. F21. Each check is recorded as PASS or FAIL with
// what was observed; a failing check does not stop the run.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const API = process.env.API_URL ?? "http://localhost:28000";
const SITE = process.env.SITE ?? "http://localhost:3000";
const APP = process.env.APP ?? "http://localhost:8200";
const root = fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url));
const WIDTHS = [360, 768, 1280];
const stamp = Date.now().toString(36);
const PASSWORD = "Passw0rd!Passw0rd-live";
const LANES = ["F15", "F16", "F17", "F18", "F21"];
const results = Object.fromEntries(LANES.map((lane) => [lane, { checks: [], axe: [], api: [] }]));
for (const lane of LANES) mkdirSync(join(root, `lane-${lane}`), { recursive: true });
const shotPath = (lane, name, width) => join(root, `lane-${lane}`, `live-${name}-${width}.png`);

async function http(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: response.status, json };
}
async function must(method, path, options) {
  const result = await http(method, path, options);
  if (result.status >= 300) throw new Error(`${method} ${path} -> ${result.status} ${JSON.stringify(result.json).slice(0, 300)}`);
  return result.json;
}
async function until(label, fn, { timeout = 30000, every = 1000 } = {}) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { const value = await fn(); if (value) return value; last = value; } catch (error) { last = error; } await new Promise((r) => setTimeout(r, every)); }
  throw new Error(`timeout waiting for ${label}${last instanceof Error ? `: ${last.message}` : ""}`);
}
async function check(lane, id, text, fn) {
  try { const note = await fn(); results[lane].checks.push({ id, text, status: "PASS", observed: note ?? null }); console.log(`  PASS ${lane} ${id} · ${text}${note ? ` -> ${note}` : ""}`); }
  catch (error) { const message = String(error?.message ?? error).split("\n")[0]; results[lane].checks.push({ id, text, status: "FAIL", observed: message }); console.log(`  FAIL ${lane} ${id} · ${text}: ${message}`); }
}

// ------------------------------------------------------------------ world (HTTP only)
const hostAuth = await must("POST", "/identity/auth/register", { body: { email: `f15host.${stamp}@example.com`, password: PASSWORD, role: "HOST" } });
let hostToken = hostAuth.accessToken;
const login = async () => { hostToken = (await must("POST", "/identity/auth/login", { body: { email: `f15host.${stamp}@example.com`, password: PASSWORD } })).accessToken; return hostToken; };
const slug = `f15-${stamp}`;
const celebration = await must("POST", "/celebrations", { token: hostToken, body: { slug, eventTypeCode: "WEDDING", content: { title: "Ana y Luis", eventDate: "2027-05-20T18:00", venueName: "Salon Los Pinos", hosts: { BRIDE: "Ana", GROOM: "Luis" }, hostContact: { email: "anayluis@example.com", phone: "+59171234567", consentPublic: true } } } });
const ID = celebration.id;
async function setSettings(patch) {
  const current = await must("GET", `/celebrations/${ID}`, { token: hostToken });
  return must("PUT", `/celebrations/${ID}/settings`, { token: hostToken, headers: { "if-match": String(current.version) }, body: { giftReservationMode: "RESTRICTED", unregisteredRsvpMode: "AUTO_ACCEPT", extraCompanionMode: "RESTRICTED", externalGiftMode: "RESTRICTED", partnerPriorityEnabled: false, ...patch } });
}
await setSettings({});
const check1 = await must("GET", `/celebrations/${ID}/publish-check`, { token: hostToken });
if (check1.ready) await must("POST", `/celebrations/${ID}/publish`, { token: hostToken, headers: { "if-match": String(check1.version) } });
console.log(`world: celebration ${ID} slug ${slug} published=${check1.ready}${check1.ready ? "" : ` missing=${check1.missingFields}`}`);
const addGuest = async (name, allowedCompanions) => {
  const guest = await must("POST", `/guests/celebrations/${ID}/guests`, { token: hostToken, body: { name, email: `${name.split(" ")[0].toLowerCase()}.${stamp}@example.com`, allowedCompanions } });
  const issued = await must("POST", `/guests/celebrations/${ID}/guests/${guest.id}/access-token`, { token: hostToken, body: {} });
  return { id: guest.id, name, token: issued.token };
};
const marta = await addGuest("Marta Invitada", 2);
const beto = await addGuest("Beto Pedidor", 1);
const carla = await addGuest("Carla Expo", 2);
const summaryOf = () => must("GET", `/guests/celebrations/${ID}/guest-summary`, { token: hostToken });

// ------------------------------------------------------------------ browser helpers
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const consoleErrors = [];
const seen = [];
async function newPage(width, { context } = {}) {
  const ctx = context ?? (await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO" }));
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text()}`); });
  page.on("response", (r) => { if (r.url().startsWith(API)) seen.push({ method: r.request().method(), path: new URL(r.url()).pathname, status: r.status() }); });
  return { page, ctx };
}
const noOverflow = async (page, name) => { if (!(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))) throw new Error(`horizontal scroll on ${name}`); };
async function axe(lane, page, name) {
  const found = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""));
  results[lane].axe.push({ screen: name, violations: found.map((v) => `${v.id}: ${v.help}`) });
  if (found.length) throw new Error(`axe ${name}: ${found.map((v) => v.id).join(",")}`);
}
async function capture(lane, name, path, ready, { base = SITE, axeOn = 1280 } = {}) {
  for (const width of WIDTHS) {
    const { page, ctx } = await newPage(width);
    try {
      await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
      await ready(page);
      await noOverflow(page, `${name}-${width}`);
      await page.screenshot({ path: shotPath(lane, name, width), fullPage: true });
      if (width === axeOn) await axe(lane, page, name);
    } finally { await ctx.close(); }
  }
}
const personal = (guest) => `/c/${slug}/rsvp/${guest.token}`;

// ================================================================== F15 · public web
console.log("\nF15 · RSVP público (Next, Chrome, Kong real)");
await check("F15", "REQ-F15-01 formulario", "personal link renders the real celebration at 360/768/1280, no horizontal scroll, axe clean", () =>
  capture("F15", "A9-formulario", personal(marta), (p) => p.getByRole("heading", { name: "¿Podrás acompañarnos?" }).waitFor({ timeout: 15000 })));

await check("F15", "REQ-F15-01 enviar", "confirms with 1 companion and diet; the host API then lists the RSVP as CONFIRMED", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${SITE}${personal(marta)}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "¿Podrás acompañarnos?" }).waitFor({ timeout: 15000 });
  await page.getByLabel("Sí, asistiré").check();
  await page.getByLabel("Acompañantes").fill("1");
  await page.getByLabel("Restricciones alimentarias").fill("Vegetariana");
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await page.getByRole("heading", { name: "Tu asistencia está confirmada" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: shotPath("F15", "A10-confirmado", 360), fullPage: true });
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  if (stored.includes(marta.token)) throw new Error("the token is stored in web storage");
  const rsvps = await until("host rsvps", async () => { const r = await must("GET", `/guests/celebrations/${ID}/rsvps?limit=50`, { token: hostToken }); return r.items.find((i) => i.guestId === marta.id && i.status === "CONFIRMED") ? r : null; });
  const mine = rsvps.items.find((i) => i.guestId === marta.id);
  await ctx.close();
  return `host sees status=${mine.status} requestedCompanions=${mine.requestedCompanions}`;
});

await check("F15", "REQ-F15-02 editar", "reload keeps the answer; editing sends PATCH and the host sees the new value", async () => {
  const { page, ctx } = await newPage(768);
  await page.goto(`${SITE}${personal(marta)}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Tu asistencia está confirmada" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: shotPath("F15", "A10-confirmado-recarga", 768), fullPage: true });
  await page.getByRole("button", { name: /Cambiar|Editar/ }).first().click();
  await page.getByLabel("Acompañantes").fill("2");
  await page.getByRole("button", { name: /Guardar/ }).click();
  await page.getByRole("status").filter({ hasText: /cambio|actualiz|guard/i }).first().waitFor({ timeout: 15000 }).catch(() => undefined);
  const patch = seen.filter((s) => s.method === "PATCH" && s.path.endsWith("/rsvp")).at(-1);
  if (!patch || patch.status !== 200) throw new Error(`no PATCH 200 (${JSON.stringify(patch)})`);
  await page.screenshot({ path: shotPath("F15", "A10-editado", 768), fullPage: true });
  await ctx.close();
  const rsvps = await until("edited rsvp", async () => { const r = await must("GET", `/guests/celebrations/${ID}/rsvps?limit=50`, { token: hostToken }); const i = r.items.find((x) => x.guestId === marta.id); return i?.requestedCompanions === 2 ? i : null; });
  return `PATCH ${patch.status}; host sees requestedCompanions=${rsvps.requestedCompanions}`;
});

await check("F15", "REQ-F15-04 token inválido", "an unknown token shows the same screen with no celebration data at 360/768/1280 (axe clean)", () =>
  capture("F15", "A12-token-invalido", `/c/${slug}/rsvp/${"x".repeat(43)}`, async (p) => {
    await p.getByRole("heading", { name: "Este enlace no está disponible" }).waitFor({ timeout: 15000 });
    if ((await p.content()).includes("Ana y Luis")) throw new Error("celebration title leaked on the invalid screen");
  }));

await check("F15", "REQ-F15-01 enlace legado", "/rsvp/{token} (sin ?c=) llama POST /rsvp/resolve y termina en /c/{slug}/rsvp/{token}", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${SITE}/rsvp/${marta.token}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(new RegExp(`/c/${slug}/rsvp/`), { timeout: 15000 });
  await page.getByRole("heading", { name: "Tu asistencia está confirmada" }).waitFor({ timeout: 15000 });
  const call = seen.filter((s) => s.path === "/rsvp/resolve").at(-1);
  if (!call || call.status !== 200) throw new Error(`resolve call: ${JSON.stringify(call)}`);
  await page.screenshot({ path: shotPath("F15", "legado-resuelto", 360), fullPage: true });
  await ctx.close();
  return `POST /rsvp/resolve ${call.status}`;
});

await check("F15", "REQ-F15-04 legado inválido", "/rsvp/{token desconocido} muestra el enlace no disponible (401 de resolve)", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${SITE}/rsvp/${"z".repeat(43)}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Este enlace no está disponible" }).waitFor({ timeout: 15000 });
  await ctx.close();
});

await check("F15", "REQ-F15-02 acompañantes", "asking for more companions than allowed leaves a PENDING_REVIEW request for the host", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${SITE}${personal(beto)}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "¿Podrás acompañarnos?" }).waitFor({ timeout: 15000 });
  await page.getByLabel("Sí, asistiré").check();
  await page.getByLabel("Acompañantes").fill("3").catch(() => undefined);
  await page.getByRole("button", { name: "Enviar respuesta" }).click();
  await page.getByRole("heading", { name: "Tu asistencia está confirmada" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: shotPath("F15", "A10-pendiente-aprobacion", 360), fullPage: true });
  await ctx.close();
  const requests = await until("companion request", async () => { const r = await must("GET", `/guests/celebrations/${ID}/companion-requests?limit=50`, { token: hostToken }); return r.items.find((i) => i.guestId === beto.id) ? r : null; });
  return `request status=${requests.items.find((i) => i.guestId === beto.id).status}`;
});

await check("F15", "REQ-F15-05 no registrado", "AUTO_ACCEPT: public-settings first, the form registers a guest and shows the personal link once", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${SITE}/c/${slug}/rsvp`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Confirma tu asistencia" }).waitFor({ timeout: 15000 });
  const settings = seen.filter((s) => s.path.endsWith("/public-settings")).at(-1);
  if (settings?.status !== 200) throw new Error(`public-settings not called/200: ${JSON.stringify(settings)}`);
  await page.screenshot({ path: shotPath("F15", "A13-no-registrado", 360), fullPage: true });
  await axe("F15", page, "A13-no-registrado");
  await page.getByLabel("Tu nombre").fill("Pedro Sin Enlace");
  await page.getByLabel(/correo/i).first().fill(`pedro.${stamp}@example.com`);
  await page.getByLabel(/Doy mi consentimiento/).check();
  await page.getByRole("button", { name: "Confirmar mi asistencia" }).click();
  await page.getByRole("heading", { name: "Listo: confirmamos tu asistencia" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: shotPath("F15", "A13-alta-ok", 360), fullPage: true });
  const link = await page.getByLabel("Tu enlace personal").inputValue();
  await ctx.close();
  if (!new RegExp(`/c/${slug}/rsvp/[A-Za-z0-9_-]{20,}$`).test(link)) throw new Error(`unexpected link ${link.slice(0, 40)}`);
  const list = await until("registered guest in the host list", async () => { const r = await must("GET", `/guests/celebrations/${ID}/guest-list?search=Pedro`, { token: hostToken }); return r.items?.some((g) => g.name.includes("Pedro")) ? r : null; });
  return `public-settings ${settings.status}; guest visible to the host with status ${list.items[0].status}`;
});

await check("F15", "REQ-F15-05 restringido", "RESTRICTED: public-settings says so, the form never appears and hostContact is shown", async () => {
  await setSettings({ unregisteredRsvpMode: "RESTRICTED" });
  const { page, ctx } = await newPage(360);
  await until("restricted settings visible to Guest", async () => {
    await page.goto(`${SITE}/c/${slug}/rsvp`, { waitUntil: "domcontentloaded" });
    return page.getByRole("heading", { name: "Esta celebración solo admite invitados con enlace personal" }).waitFor({ timeout: 4000 }).then(() => true, () => false);
  }, { timeout: 40000, every: 500 });
  if (await page.getByRole("button", { name: "Confirmar mi asistencia" }).count()) throw new Error("form is visible in RESTRICTED mode");
  const email = await page.getByTestId("host-contact-email").textContent();
  await page.screenshot({ path: shotPath("F15", "A13-restringido", 360), fullPage: true });
  await axe("F15", page, "A13-restringido");
  await ctx.close();
  await setSettings({ unregisteredRsvpMode: "AUTO_ACCEPT" });
  return `contact line: ${email}`;
});

// ================================================================== host UI (universal web, one context: refresh rotation)
console.log("\nHost UI · universal web (login through Identity)");
const host = await newPage(1280);
const hostPage = host.page;
const hostGo = async (path) => { await hostPage.goto(`${APP}${path}${path.includes("?") ? "&" : "?"}c=${ID}`, { waitUntil: "domcontentloaded" }); };
await check("F16", "login", "the host signs in through the UI against Identity (Kong) and lands in the workspace", async () => {
  await hostPage.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await hostPage.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(`f15host.${stamp}@example.com`);
  await hostPage.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(PASSWORD);
  await hostPage.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await hostPage.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 20000 });
});
const shotHost = async (lane, name, widths = [1280]) => { for (const width of widths) { await hostPage.setViewportSize({ width, height: width < 500 ? 800 : 900 }); await noOverflow(hostPage, `${name}-${width}`); await hostPage.screenshot({ path: shotPath(lane, name, width), fullPage: true }); } await hostPage.setViewportSize({ width: 1280, height: 900 }); };

await check("F17", "REQ-F17-01 resumen", "C6 shows the same numbers as GET /guests/.../guest-summary (read model, after the projection catches up)", async () => {
  await hostGo("/inicio");
  await hostPage.getByTestId("count-total").waitFor({ timeout: 20000 });
  const api = await until("projection", async () => { const s = await summaryOf(); return s.confirmed >= 2 ? s : null; }, { timeout: 40000 });
  await hostPage.reload({ waitUntil: "domcontentloaded" });
  await hostPage.getByTestId("count-total").waitFor({ timeout: 20000 });
  const ui = { total: await hostPage.getByTestId("count-total").getAttribute("aria-label"), confirmed: await hostPage.getByTestId("count-confirmed").getAttribute("aria-label") };
  await shotHost("F17", "C6-resumen", WIDTHS);
  await axe("F17", hostPage, "C6-resumen");
  if (ui.total !== `Invitados: ${api.total}` || ui.confirmed !== `Confirmados: ${api.confirmed}`) throw new Error(`UI ${JSON.stringify(ui)} vs API total=${api.total} confirmed=${api.confirmed}`);
  return `API total=${api.total} confirmed=${api.confirmed} pending=${api.pending} openCompanionRequests=${api.openCompanionRequests}; UI equal`;
});

await check("F16", "REQ-F16-01 lista", "C19 lists the real guests with server paging and search", async () => {
  await hostGo("/invitados");
  await hostPage.getByLabel("Abrir a Marta Invitada").waitFor({ timeout: 20000 });
  await hostPage.getByTestId("guest-search").fill("beto");
  await hostPage.getByLabel("Abrir a Marta Invitada").waitFor({ state: "detached", timeout: 15000 });
  await hostPage.getByLabel("Abrir a Beto Pedidor").waitFor();
  await hostPage.getByTestId("guest-search").fill("");
  await hostPage.getByLabel("Abrir a Marta Invitada").waitFor();
  await shotHost("F16", "C19-lista", WIDTHS);
  await axe("F16", hostPage, "C19-lista");
});

const syncCalls = () => seen.filter((s) => s.method === "PUT" && s.path === `/notifications/celebrations/${ID}/recipients`);
await check("F16", "REQ-F16-02 alta + sync", "registering one guest in the UI saves it and calls PUT /notifications/.../recipients exactly once", async () => {
  await hostGo("/invitados/nuevo");
  await hostPage.getByTestId("guest-name").waitFor({ timeout: 20000 });
  const before = syncCalls().length;
  await hostPage.getByTestId("guest-name").fill("Nueva Desde UI");
  await hostPage.getByTestId("guest-phone").fill("+591 7123-4567");
  await hostPage.getByTestId("save-guest").click();
  await hostPage.getByText("Invitado agregado.").waitFor({ timeout: 15000 });
  await until("sync call", () => syncCalls().length > before, { timeout: 10000, every: 250 });
  const made = syncCalls().slice(before);
  await shotHost("F16", "C20-guardado", [360]);
  const list = await must("GET", `/guests/celebrations/${ID}/guest-list?search=Nueva`, { token: hostToken });
  if (!list.items?.some((g) => g.name === "Nueva Desde UI")) throw new Error("guest not in the host list");
  if (made.length !== 1 || made[0].status !== 200) throw new Error(`recipient sync calls: ${JSON.stringify(made)}`);
  return `guest saved; PUT recipients x${made.length} -> ${made[0].status}`;
});

await check("F16", "REQ-F16-03 importación + sync", "CSV import reports per row and calls the bulk PUT once", async () => {
  await hostGo("/invitados/importar");
  await hostPage.getByTestId("csv-input").waitFor({ timeout: 20000 });
  const before = syncCalls().length;
  await hostPage.getByTestId("csv-input").fill(["name,email,phone,locale,allowedCompanions", `Ana Importada,ana.imp.${stamp}@example.com,,es-BO,1`, `Beto Importado,beto.imp.${stamp}@example.com,,es-BO,0`, ",sinnombre@example.com,,es-BO,0"].join("\n"));
  await hostPage.getByTestId("run-import").click();
  await hostPage.getByTestId("import-summary").waitFor({ timeout: 20000 });
  const summary = await hostPage.getByTestId("import-summary").textContent();
  await until("sync call", () => syncCalls().length > before, { timeout: 10000, every: 250 });
  await shotHost("F16", "C21-informe-por-fila", [1280, 360]);
  const made = syncCalls().slice(before);
  if (made.length !== 1) throw new Error(`expected one bulk PUT, saw ${made.length}`);
  return `${summary}; PUT recipients x${made.length} -> ${made[0].status}`;
});

await check("F16", "REQ-F16-05 enlace", "issuing a link shows it masked; the secret is not in the DOM", async () => {
  const fresh = await addGuest("Enlace Probado", 1);
  await hostGo(`/invitados/${fresh.id}`);
  await hostPage.getByTestId("issue-link").waitFor({ timeout: 20000 }).catch(() => undefined);
  const masked = hostPage.getByTestId("masked-link");
  if (!(await masked.count())) await hostPage.getByTestId("issue-link").click();
  await masked.waitFor({ timeout: 15000 });
  if ((await hostPage.content()).includes(fresh.token)) throw new Error("secret present in the DOM");
  await shotHost("F16", "C23-enlace-enmascarado", [1280, 360]);
  return await masked.textContent();
});

await check("F17", "REQ-F17-03 bandeja", "C26 lists Beto's request; approving it in the UI is POSTed and the API reads APPROVED", async () => {
  await hostGo("/bandeja/acompanantes");
  const request = await until("request visible", async () => { const r = await must("GET", `/guests/celebrations/${ID}/companion-requests?limit=50`, { token: hostToken }); return r.items.find((i) => i.guestId === beto.id && i.status === "PENDING_REVIEW"); });
  await hostPage.getByTestId(`request-${request.id}`).waitFor({ timeout: 20000 });
  await shotHost("F17", "C26-bandeja", WIDTHS);
  await axe("F17", hostPage, "C26-bandeja");
  await hostPage.getByTestId(`approve-${request.id}`).click();
  await hostPage.getByText("Solicitud aprobada.").waitFor({ timeout: 15000 });
  await shotHost("F17", "C26-aprobada", [1280]);
  // The inbox endpoint lists only open requests, so approval is read as: gone from the inbox and approvedCompanions raised on the guest.
  const after = await until("approved", async () => {
    const r = await must("GET", `/guests/celebrations/${ID}/companion-requests?limit=50`, { token: hostToken });
    if (r.items.some((x) => x.id === request.id)) return null;
    const list = await must("GET", `/guests/celebrations/${ID}/guest-list?search=Beto%20Pedidor`, { token: hostToken });
    const g = list.items.find((x) => x.guestId === beto.id);
    return g && g.approvedCompanions > 0 ? g : null;
  });
  return `request left the inbox; Beto approvedCompanions=${after.approvedCompanions} (requested ${request.requestedCompanions})`;
});

await check("F17", "REQ-F17-02 reporte", "C24 lists answers and the CSV downloads from the browser without the caterer file leaking contacts", async () => {
  await hostGo("/rsvp/reporte");
  await hostPage.getByTestId("export-csv").waitFor({ timeout: 20000 });
  await hostPage.getByText("Marta Invitada").first().waitFor({ timeout: 15000 });
  await shotHost("F17", "C24-reporte", WIDTHS);
  await axe("F17", hostPage, "C24-reporte");
  const [download] = await Promise.all([hostPage.waitForEvent("download"), hostPage.getByTestId("export-catering").click()]);
  const chunks = []; for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  if (/Marta|@example/.test(csv)) throw new Error("catering CSV contains personal data");
  writeFileSync(join(root, "lane-F17", "live-catering.csv"), csv);
  return `catering rows=${csv.trim().split("\n").length - 1}`;
});

await check("F17", "REQ-F17-04 resumen tras cambios", "after the approval and new guests the summary matches the API again", async () => {
  await until("projection", async () => { const s = await summaryOf(); return s.total >= 8 ? s : null; }, { timeout: 40000 });
  const api = await summaryOf();
  await hostGo("/inicio");
  await hostPage.getByTestId("count-total").waitFor({ timeout: 20000 });
  const total = await hostPage.getByTestId("count-total").getAttribute("aria-label");
  if (total !== `Invitados: ${api.total}`) throw new Error(`UI ${total} vs API ${api.total}`);
  return `total=${api.total} confirmed=${api.confirmed} openCompanionRequests=${api.openCompanionRequests}`;
});

// ---- F18
const hostInbox = async () => (await must("GET", `/notifications/celebrations/${ID}/notifications?limit=50`, { token: hostToken })).items;
await check("F18", "REQ-F18-01 bandeja del servidor", "the notices the service created for the host appear in C31 with the server's unread count; mark-all POSTs .../read and readAt comes back", async () => {
  let items = [];
  try { items = await until("host notifications", async () => { const list = await hostInbox(); return list.length ? list : null; }, { timeout: 45000, every: 2000 }); } catch { /* observed below */ }
  await hostGo("/notificaciones");
  if (!items.length) {
    await hostPage.getByText("Todavía no tienes avisos.").waitFor({ timeout: 20000 });
    await shotHost("F18", "C31-vacio", [360, 1280]);
    throw new Error("the backend produced no host notification within 45 s (companionRequested/celebrationPublished): UI shows the empty state, flow not observable");
  }
  await hostPage.getByTestId("unread-count").waitFor({ timeout: 20000 });
  const unread = items.filter((i) => !i.readAt).length;
  const text = await hostPage.getByTestId("unread-count").textContent();
  if (text !== `${unread} sin leer`) throw new Error(`UI "${text}" vs API unread=${unread}`);
  await shotHost("F18", "C31-notificaciones", WIDTHS);
  await axe("F18", hostPage, "C31-notificaciones");
  if (unread) {
    await hostPage.getByTestId("mark-all").click();
    await hostPage.getByText("0 sin leer").waitFor({ timeout: 15000 });
    const after = await until("readAt", async () => { const list = await hostInbox(); return list.every((i) => i.readAt) ? list : null; });
    await hostPage.reload({ waitUntil: "domcontentloaded" });
    await hostPage.getByText("0 sin leer").waitFor({ timeout: 15000 });
    await shotHost("F18", "C31-todo-leido", [360]);
    return `${items.length} notices, ${unread} unread -> all readAt set on the server (${after.length}); reload keeps 0 unread`;
  }
  return `${items.length} notices, all already read`;
});

await check("F18", "REQ-F18-03/04 canales", "toggling PUSH off in the UI is PATCHed and the API returns channels.PUSH=false", async () => {
  await hostGo("/preferencias");
  const toggle = hostPage.getByRole("switch", { name: "Notificaciones push" });
  await toggle.waitFor({ timeout: 20000 });
  const before = (await must("GET", `/notifications/celebrations/${ID}/preferences`, { token: hostToken })).channels.PUSH;
  await shotHost("F18", "preferencias", WIDTHS);
  await axe("F18", hostPage, "preferencias");
  await toggle.click();
  await hostPage.getByText("Preferencia guardada.").waitFor({ timeout: 15000 });
  const after = (await must("GET", `/notifications/celebrations/${ID}/preferences`, { token: hostToken })).channels.PUSH;
  if (after === before) throw new Error(`PUSH unchanged on the server (${before})`);
  return `PUSH ${before} -> ${after}`;
});

await check("F18", "REQ-F18-06 horario de silencio", "quiet hours 23→7 are validated, PATCHed and read back; reverting restores the service default", async () => {
  await hostGo("/preferencias");
  await hostPage.getByTestId("quiet-current").waitFor({ timeout: 20000 });
  const initial = await hostPage.getByTestId("quiet-current").textContent();
  await hostPage.getByTestId("quiet-start").fill("23");
  await hostPage.getByTestId("quiet-end").fill("30");
  await hostPage.getByTestId("quiet-save").click();
  await hostPage.getByText("Escribe horas enteras entre 0 y 23.").waitFor();
  await hostPage.getByTestId("quiet-end").fill("7");
  await hostPage.getByTestId("quiet-save").click();
  await hostPage.getByText(/Silencio de 23:00 a 7:00 · Horario tuyo/).waitFor({ timeout: 15000 });
  const api = (await must("GET", `/notifications/celebrations/${ID}/preferences`, { token: hostToken })).quietHours;
  if (api.start !== 23 || api.end !== 7 || api.source !== "RECIPIENT") throw new Error(`API quietHours ${JSON.stringify(api)}`);
  await shotHost("F18", "silencio-guardado", [1280, 360]);
  await hostPage.getByTestId("quiet-default").click();
  await hostPage.getByText(/Horario del servicio/).waitFor({ timeout: 15000 });
  const restored = (await must("GET", `/notifications/celebrations/${ID}/preferences`, { token: hostToken })).quietHours;
  if (restored.source !== "DEFAULT") throw new Error(`not restored: ${JSON.stringify(restored)}`);
  return `initial "${initial}"; saved ${JSON.stringify(api)}; restored ${JSON.stringify(restored)}`;
});

await check("F18", "REQ-F18-03 tipos de evento", "muting 'companionRequested' in the UI is stored in eventTypes", async () => {
  await hostGo("/preferencias");
  const toggle = hostPage.getByRole("switch", { name: "Un invitado pide más acompañantes" });
  await toggle.waitFor({ timeout: 20000 });
  await toggle.click();
  await hostPage.getByText("Preferencia guardada.").waitFor({ timeout: 15000 });
  const api = (await must("GET", `/notifications/celebrations/${ID}/preferences`, { token: hostToken })).eventTypes;
  if (api.companionRequested !== false) throw new Error(`eventTypes ${JSON.stringify(api)}`);
  await shotHost("F18", "eventos-silenciado", [1280]);
  await toggle.click();
  await hostPage.getByText("Preferencia guardada.").waitFor({ timeout: 15000 });
  return `eventTypes after: ${JSON.stringify(api)}`;
});

// ================================================================== F21 · guest in the Expo web app
console.log("\nF21 · RSVP del invitado en la app (Expo web, backend real)");
await check("F21", "REQ-F21-04 formulario", "the personal link renders in the app at 360/768/1280 (axe clean)", () =>
  capture("F21", "F1-rsvp-invitado", personal(carla), (p) => p.getByText("¿Podrás acompañarnos?").waitFor({ timeout: 20000 }), { base: APP, axeOn: 360 }));
await check("F21", "REQ-F21-04 enviar", "confirming in the app is stored by the real Guest service", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${APP}${personal(carla)}`, { waitUntil: "domcontentloaded" });
  await page.getByText("¿Podrás acompañarnos?").waitFor({ timeout: 20000 });
  await page.getByRole("radio", { name: "Sí, asistiré" }).click();
  await page.getByTestId("rsvp-submit").click();
  await page.getByText("Tu asistencia está confirmada").waitFor({ timeout: 15000 });
  await page.screenshot({ path: shotPath("F21", "F1-confirmado", 360), fullPage: true });
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  if (stored.includes(carla.token)) throw new Error("token stored");
  await ctx.close();
  const rsvps = await until("host rsvps", async () => { const r = await must("GET", `/guests/celebrations/${ID}/rsvps?limit=50`, { token: hostToken }); return r.items.find((i) => i.guestId === carla.id && i.status === "CONFIRMED") ? r : null; });
  return `host sees CONFIRMED for ${rsvps.items.find((i) => i.guestId === carla.id).guestId.slice(0, 8)}…`;
});
await check("F21", "REQ-F21-03 enlace legado", "/rsvp/{token} in the app resolves with POST /rsvp/resolve and moves to /c/{slug}/rsvp/{token}", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${APP}/rsvp/${carla.token}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(new RegExp(`/c/${slug}/rsvp/`), { timeout: 20000 });
  await page.getByText("Tu asistencia está confirmada").waitFor({ timeout: 20000 });
  await page.screenshot({ path: shotPath("F21", "legado-resuelto", 360), fullPage: true });
  await ctx.close();
});
await check("F21", "REQ-F21-04 token inválido", "an unknown credential is the generic screen in the app", async () => {
  const { page, ctx } = await newPage(360);
  await page.goto(`${APP}/c/${slug}/rsvp/${"y".repeat(43)}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Este enlace no está disponible").waitFor({ timeout: 20000 });
  await page.screenshot({ path: shotPath("F21", "F1-token-invalido", 360), fullPage: true });
  await ctx.close();
});

await host.ctx.close();
await browser.close();
const stripped = (list) => list.map((c) => ({ ...c }));
for (const lane of LANES) {
  const r = results[lane];
  writeFileSync(join(root, `lane-${lane}`, "live-result.json"), JSON.stringify({ date: new Date().toISOString(), surface: `Chrome real; web ${SITE}, app ${APP}, backend ${API} (Kong)`, celebration: { id: ID, slug }, checks: stripped(r.checks), axe: r.axe, consoleErrors: consoleErrors.slice(0, 20) }, null, 2));
}
const all = LANES.flatMap((lane) => results[lane].checks);
console.log(`\n${all.filter((c) => c.status === "PASS").length}/${all.length} checks PASS; console errors: ${consoleErrors.length}`);
process.exitCode = all.every((c) => c.status === "PASS") ? 0 : 1;
