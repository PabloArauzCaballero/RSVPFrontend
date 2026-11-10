// Button x {error, limit, valid} matrix for the host guests area, in Chrome against the REAL backend (gateway :28000).
//   [ANCHO=360|768|1280] WORLD=world.json APP=http://localhost:3000 CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/live/guests-buttons.mjs [section ...]
// Sections: form list detail groups import report requests notifications preferences push settings summary
import { APP, C, G, N, API, assert, button, go, host, http, isCall, launch, makeGuest, Matrix, noBlank, noOverflow, problem, sleep, text, tid, track, waitGuests, WIDTHS, world } from "./lib.mjs";

// ANCHO (px) sets the viewport of the main session: 360, 768 or 1280 (default). Explicit widths (layout checks) win.
const ANCHO = Number(process.env.ANCHO ?? 1280);
/** Own sign-in (same flow as lib.mjs) that accepts the current login labels: "Correo"/"Correo electrónico" and "Entrar"/"Iniciar sesión". */
async function session(browser_, email, width = ANCHO) {
  const context = await browser_.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO", acceptDownloads: true });
  context.setDefaultTimeout(15000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP }).catch(() => undefined);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource|net::ERR|status of (4|5)\d\d/.test(message.text())) errors.push(message.text()); });
  await page.goto(`${APP}/login`);
  await page.getByLabel(/^Correo( electrónico)?$/).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: /^(Entrar|Iniciar sesión)$/ }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  return { page, context, errors };
}
const only = process.argv.slice(2);
const wanted = (name) => only.length === 0 || only.includes(name);
const matrix = new Matrix();
const stamp = Date.now().toString(36);
const browser = await launch();
const { page, context, errors } = await session(browser, world.host.email);
const GUEST_POST = /\/guests\/celebrations\/[^/]+\/guests$/;
const listGuests = (search, count = 1) => waitGuests(search, count);
const type = async (page_, id, value) => { await tid(page_, id).fill(value); };
const ADDED = /ya está en tu lista/; // "<nombre> ya está en tu lista."
/** "Más opciones" (progressive disclosure): open the disclosure with this testID before reaching what it hides. */
const openMore = async (page_, id) => { const toggle = tid(page_, id); if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click(); };
/** An item of a "⋯" overflow menu (role=menuitem): open the menu with `openMore` first. */
const menuItem = (page_, name) => page_.getByRole("menuitem", { name, exact: true }).filter({ visible: true }).first();
/** A filter select (native <select>): choose by value (REPLY/status code or group id). */
const pick = async (page_, id, value) => { await tid(page_, id).selectOption(value); };
const unrouteAll = () => page.unrouteAll({ behavior: "ignoreErrors" });

const newRequest = async (tag) => {
  const guest = await makeGuest(tag, { allowedCompanions: 1 }); const issued = await host("POST", `${G}/guests/${guest.id}/access-token`, {}); assert.equal(issued.status, 201);
  const made = await http("POST", `/rsvp/celebrations/${C}/rsvp`, { token: issued.json.token, body: { status: "CONFIRMED", requestedCompanions: 2 }, headers: { "idempotency-key": crypto.randomUUID() } });
  assert.ok([200, 201].includes(made.status), `rsvp ${made.status} ${made.text}`); await sleep(2500);
  const pending = (await host("GET", `${G}/companion-requests?limit=100`)).json.items.find((r) => r.guestId === guest.id); assert.ok(pending, "request visible in read model"); return { guest, request: pending };
};

/* ------------------------------------------------------------------ form */
async function form() {
  const S = "Agregar invitado";
  const open = async () => { await go(page, "/invitados/nuevo"); await tid(page, "save-guest").waitFor(); };
  const fill = async (name, email, phone = "", companions) => {
    await type(page, "guest-name", name); await type(page, "guest-email", email); await type(page, "guest-phone", phone);
    if (companions !== undefined) await page.getByLabel("Acompañantes permitidos").filter({ visible: true }).first().fill(companions);
  };
  await matrix.check(S, "save-guest", "LIMITE vacio: valida, no envia nada", async () => {
    await open(); const posts = track(page, isCall("POST", GUEST_POST));
    await tid(page, "save-guest").click(); await sleep(500);
    assert.equal(posts.count(), 0); await text(page, /Este campo es obligatorio|Escribe un correo o un teléfono/).waitFor(); posts.stop();
  });
  await matrix.check(S, "save-guest", "LIMITE nombre 201 caracteres rechazado en cliente; 200 aceptado y persistido", async () => {
    await open(); let posts = track(page, isCall("POST", GUEST_POST));
    await fill("n".repeat(201), `lim201.${stamp}@example.com`); await tid(page, "save-guest").click(); await sleep(500);
    assert.equal(posts.count(), 0); await text(page, "El texto es demasiado largo.").waitFor(); posts.stop();
    const name = "m".repeat(200); await fill(name, `lim200.${stamp}@example.com`); await tid(page, "save-guest").click();
    await text(page, ADDED).waitFor();
    const found = (await listGuests(`lim200.${stamp}@example.com`))[0]; assert.equal(found.name.length, 200); return `GET guest-list: name.length=200`;
  });
  await matrix.check(S, "save-guest", "LIMITE acompanantes -1 / abc / 2147483648 invalidos; 2147483647 valido", async () => {
    for (const bad of ["-1", "abc", "2147483648", "1.5"]) {
      await open(); const posts = track(page, isCall("POST", GUEST_POST));
      await fill("Borde Acomp", `bad.${stamp}@example.com`, "", bad); await tid(page, "save-guest").click(); await sleep(400);
      assert.equal(posts.count(), 0, `sent for ${bad}`); await text(page, "Escribe un número entero, de 0 en adelante.").waitFor(); posts.stop();
    }
    await open(); await fill("Borde Max", `max.${stamp}@example.com`, "", "2147483647"); await tid(page, "save-guest").click(); await text(page, ADDED).waitFor();
    const found = (await listGuests(`max.${stamp}@example.com`))[0]; assert.equal(found.allowedCompanions, 2147483647); return "GET: allowedCompanions=2147483647";
  });
  await matrix.check(S, "save-guest", "LIMITE correo y telefono invalidos; solo telefono E.164 valido", async () => {
    await open(); let posts = track(page, isCall("POST", GUEST_POST));
    await fill("Contacto Malo", "no-es-correo"); await tid(page, "save-guest").click(); await text(page, /Escribe un correo válido/).waitFor();
    await fill("Contacto Malo", "", "123"); await tid(page, "save-guest").click(); await text(page, /código de país/).waitFor();
    assert.equal(posts.count(), 0); posts.stop();
    const phone = `+5917${String(Date.now()).slice(-7)}`;
    await fill("Solo Telefono", "", phone); await tid(page, "save-guest").click(); await text(page, ADDED).waitFor();
    const found = (await listGuests("Solo Telefono")).find((g) => g.phone === phone); assert.ok(found, "persisted by phone"); return `GET guest-list: phone=${phone}`;
  });
  await matrix.check(S, "save-guest", "LIMITE doble clic con la peticion en vuelo: una sola creacion", async () => {
    await open(); await page.route(GUEST_POST, async (route) => { await sleep(1500); await route.continue(); });
    const posts = track(page, isCall("POST", GUEST_POST)); const email = `dbl.${stamp}@example.com`;
    await fill("Doble Clic", email); await tid(page, "save-guest").dblclick(); await text(page, ADDED).waitFor();
    await unrouteAll(); posts.stop(); assert.equal(posts.count(), 1, `POSTs=${posts.count()}`);
    const n = (await listGuests(`dbl.${stamp}@example.com`)).length; assert.equal(n, 1); return "1 POST, GET guest-list: 1 registro";
  });
  await matrix.check(S, "save-guest", "LIMITE contacto duplicado: pide confirmacion; cancelar no crea; confirmar crea", async () => {
    await open(); const email = `dup.${stamp}@example.com`; await fill("Duplicado Uno", email); await tid(page, "save-guest").click(); await text(page, ADDED).waitFor(); await listGuests(`dup.${stamp}@example.com`, 1);
    const posts = track(page, isCall("POST", GUEST_POST));
    await fill("Duplicado Dos", email); await tid(page, "save-guest").click(); await text(page, "¿Agregar de todos modos?").waitFor();
    await button(page, "Cancelar").click(); await sleep(400); assert.equal(posts.count(), 0); assert.equal((await listGuests(`dup.${stamp}@example.com`, 1)).length, 1);
    await tid(page, "save-guest").click(); await text(page, "¿Agregar de todos modos?").waitFor(); await button(page, "Agregar de todos modos").click(); await text(page, ADDED).waitFor();
    posts.stop(); assert.equal(posts.count(), 1); assert.equal((await listGuests(`dup.${stamp}@example.com`, 2)).length, 2); return "cancelar=0 POST; confirmar=1 POST; GET: 2 fichas";
  });
  await matrix.check(S, "save-guest", "ERROR red caida: mensaje claro, datos intactos, reintento exitoso", async () => {
    await open(); const email = `net.${stamp}@example.com`; await fill("Red Caida", email);
    await page.route(GUEST_POST, (route) => route.abort("failed")); await tid(page, "save-guest").click();
    await text(page, /No hay conexión con el servidor/).waitFor(); assert.equal(await tid(page, "guest-name").inputValue(), "Red Caida");
    await unrouteAll(); await button(page, "Reintentar").click(); await text(page, ADDED).waitFor();
    assert.equal((await listGuests(`net.${stamp}@example.com`)).length, 1); return "TypeError->offline; reintento 201; GET: 1 registro";
  });
  for (const [status, expected] of [[429, /demasiadas solicitudes seguidas\. Vuelve a intentarlo en 7 s/], [503, /servicio no está disponible/], [403, /solo los anfitriones/], [422, /Revisa este dato/], [409, /Alguien guardó cambios|cambió/]]) {
    await matrix.check(S, "save-guest", `ERROR ${status}`, async () => {
      await open(); await fill("Error Servidor", `err${status}.${stamp}@example.com`);
      await page.route(GUEST_POST, (route) => route.fulfill(problem(status, "Injected", status === 429 ? { "retry-after": "7" } : {})));
      await tid(page, "save-guest").click(); await text(page, expected).waitFor(); await noBlank(page, `save ${status}`);
      await unrouteAll(); assert.equal((await listGuests(`err${status}.${stamp}@example.com`, 0)).length, 0); return `${status} mostrado, GET: nada persistido`;
    });
  }
  await matrix.check(S, "save-guest", "ERROR 401 con refresh rechazado: aviso y salida a iniciar sesion", async () => {
    await open(); await fill("Sesion", `s401.${stamp}@example.com`);
    await page.route(GUEST_POST, (route) => route.fulfill(problem(401, "expired"))); await page.route(/\/identity\/auth\/refresh/, (route) => route.fulfill(problem(401, "expired")));
    await tid(page, "save-guest").click(); await sleep(1500); await noBlank(page, "401");
    const onLogin = new URL(page.url()).pathname.startsWith("/login"); const notice = await text(page, /Tu sesión expiró/).isVisible().catch(() => false);
    await unrouteAll(); assert.ok(onLogin || notice, "401 must end at login or show the session notice");
    const again = await session(browser, world.host.email); await again.context.close(); return onLogin ? "redirigido a /login" : "aviso de sesion";
  });
  await matrix.check(S, "save-guest", "VALIDO con grupo: persistido", async () => {
    const group = (await host("POST", `${G}/groups`, { name: `Fam ${stamp}` })).json;
    await open(); await fill("Valido Completo", `ok.${stamp}@example.com`, "+59171234567", "2");
    await pick(page, "guest-group", group.id);
    await tid(page, "save-guest").click(); await text(page, ADDED).waitFor();
    const found = (await listGuests(`ok.${stamp}@example.com`))[0]; const detail = (await host("GET", `${G}/guests/${found.guestId}`)).json;
    assert.equal(detail.allowedCompanions, 2); assert.equal(detail.groupId, group.id); assert.equal(detail.phone, "+59171234567"); return `GET /guests/${found.guestId}: companions=2 groupId ok phone ok`;
  });
  await matrix.check(S, "volver", "VALIDO vuelve a la lista", async () => { await open(); await button(page, "Volver a la lista").click(); await page.waitForURL(/\/invitados\?/); });
  await matrix.check(S, "guest-defaults", "VALIDO el valor por defecto prellena acompanantes", async () => {
    assert.equal((await host("PUT", `${G}/guest-settings`, { defaultAllowedCompanions: 3 })).status, 200);
    await open(); await page.waitForFunction(() => [...document.querySelectorAll("input")].some((i) => i.value === "3")); await host("PUT", `${G}/guest-settings`, { defaultAllowedCompanions: 0 });
  });
}

/* ------------------------------------------------------------------ list */
async function list() {
  const S = "Invitados (lista)";
  await makeGuest(`semilla${stamp}`); // the list shows its empty state (without search or filters) when nobody is on it
  const open = async () => { await go(page, "/invitados"); await tid(page, "add-guest").waitFor(); await tid(page, "guest-search").waitFor(); };
  await matrix.check(S, "add-guest / Más opciones: Importar CSV, Grupos, Ajustes", "VALIDO navegan a su pantalla; lo secundario esta tras 'Más opciones'", async () => {
    await open(); assert.equal(await menuItem(page, "Importar CSV").count(), 0, "Importar CSV must stay hidden until the 'Más opciones' menu opens");
    for (const [click, path] of [[() => tid(page, "add-guest").click(), "/invitados/nuevo"], [async () => { await openMore(page, "guests-more"); await menuItem(page, "Importar CSV").click(); }, "/invitados/importar"], [async () => { await openMore(page, "guests-more"); await menuItem(page, "Grupos").click(); }, "/invitados/grupos"], [async () => { await openMore(page, "guests-more"); await tid(page, "guest-settings").click(); }, "/invitados/ajustes"]]) {
      await open(); await click(); await page.waitForURL((u) => u.pathname === path); await noBlank(page, path);
    }
  });
  await matrix.check(S, "guest-search", "VALIDO busca; LIMITE sin resultados y 200+ caracteres", async () => {
    await makeGuest(`buscar${stamp}`); await open(); await tid(page, "guest-search").fill(`Live buscar${stamp}`);
    await text(page, `Live buscar${stamp}`).waitFor();
    await tid(page, "guest-search").fill(`zzz-${stamp}`); await text(page, /No encontramos a nadie con esa búsqueda/).waitFor();
    await tid(page, "guest-search").fill("x".repeat(400)); assert.ok((await tid(page, "guest-search").inputValue()).length <= 200); await sleep(600); await noBlank(page, "long search");
  });
  await matrix.check(S, "filtros de respuesta", "VALIDO filtra por estado y vacio filtrado", async () => {
    await open(); await pick(page, "status-filter", "CONFIRMED"); await sleep(800);
    const confirmed = (await host("GET", `${G}/guest-list?status=CONFIRMED&limit=1`)).json.total;
    if (confirmed === 0) await text(page, /No encontramos a nadie con esa búsqueda/).waitFor(); else await text(page, /Mostrando|Confirmó/).waitFor();
    return `GET status=CONFIRMED total=${confirmed}`;
  });
  await matrix.check(S, "lista", "ERROR red caida / 429 / 503 con reintento", async () => {
    for (const [mode, expected] of [["abort", /No hay conexión/], [429, /demasiadas solicitudes.*5 s/], [503, /no está disponible/]]) {
      await page.route(/\/guest-list/, (route) => (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode, "x", mode === 429 ? { "retry-after": "5" } : {}))));
      await go(page, "/invitados"); await text(page, expected).waitFor({ timeout: 20000 }); await unrouteAll(); await button(page, "Reintentar").click(); await text(page, /Live|Mostrando|Aquí verás quién viene/).waitFor();
    }
  });
  await matrix.check(S, "paginacion Anterior/Siguiente", "LIMITE bordes: ultima pagina con 1 fila, deshabilitados en extremos, pagina que desaparece retrocede", async () => {
    const readTotal = async () => (await host("GET", `${G}/guest-list?limit=1`)).json.total;
    const total = await readTotal(); const missing = (51 - (total % 50)) % 50; // make total % 50 === 1 so the last page holds exactly one guest
    if (missing > 0) { const rows = ["name,email,locale,allowedCompanions"]; for (let i = 0; i < missing; i += 1) rows.push(`Pag ${stamp} ${i},pag${stamp}${i}@example.com,es-BO,0`); assert.equal((await host("POST", `${G}/guests/import`, { csv: rows.join("\n") })).status, 200); }
    const target = total + missing; for (let waited = 0; (await readTotal()) < target && waited < 20; waited += 1) await sleep(500);
    const pages = Math.floor((target - 1) / 50);
    await open(); await tid(page, "page-range").waitFor(); assert.equal(await button(page, "Anterior").isDisabled(), true);
    for (let i = 0; i < pages; i += 1) { await button(page, "Siguiente").click(); await page.waitForFunction((n) => document.querySelector('[data-testid="page-range"]')?.textContent?.startsWith(`Mostrando ${n}`), pages === i + 1 ? target : (i + 1) * 50 + 1); }
    assert.match(await tid(page, "page-range").innerText(), new RegExp(`${target}.${target} de ${target}`)); assert.equal(await button(page, "Siguiente").isDisabled(), true);
    const last = (await host("GET", `${G}/guest-list?limit=1&offset=${target - 1}`)).json.items[0];
    assert.equal((await host("DELETE", `${G}/guests/${last.guestId}/erasure`)).status, 202);
    for (let waited = 0; (await readTotal()) > target - 1 && waited < 30; waited += 1) await sleep(500);
    // The emptied last page disappears: the screen steps back to the last page that still exists (page 1 only when the world is small) instead of an empty list without a pager.
    const remaining = target - 1; const lastStart = Math.floor((remaining - 1) / 50) * 50 + 1;
    await button(page, "Actualizar").click();
    await page.waitForFunction(({ start, end }) => new RegExp(`^Mostrando ${start}.${end} de `).test(document.querySelector('[data-testid="page-range"]')?.textContent ?? ""), { start: lastStart, end: remaining }, { timeout: 15000 }).catch(async () => { throw new Error(`no retrocedio: ${await page.evaluate(() => document.querySelector('[data-testid="page-range"]')?.textContent ?? document.body.innerText.slice(0, 200))}`); });
    await button(page, "Actualizar").click();
    if (remaining <= 50) await page.waitForFunction(() => !document.querySelector('[data-testid="page-range"]') && document.querySelectorAll('[role="listitem"]').length >= 50, null, { timeout: 15000 }).catch(async () => { throw new Error(`total no actualizado: ${await page.evaluate(() => document.querySelector('[data-testid="page-range"]')?.textContent ?? "sin paginador")} (API ${await readTotal()})`); });
    else await page.waitForFunction(({ start, end }) => new RegExp(`^Mostrando ${start}.${end} de ${end}$`).test(document.querySelector('[data-testid="page-range"]')?.textContent ?? ""), { start: lastStart, end: remaining }, { timeout: 15000 }).catch(async () => { throw new Error(`total no actualizado: ${await page.evaluate(() => document.querySelector('[data-testid="page-range"]')?.textContent)} (API ${await readTotal()})`); });
    return `total ${target}: ultima pagina con 1 fila -> borrado por API -> retrocede a ${lastStart}-${remaining} y el total se actualiza (${remaining <= 50 ? "sin paginador" : "paginador conserva el total real"})`;
  });
  await matrix.check(S, "Actualizar (frescura)", "VALIDO relanza la lectura", async () => {
    await open(); const reads = track(page, isCall("GET", /\/guest-list/)); await button(page, "Actualizar").click(); await sleep(800); assert.ok(reads.count() >= 1); reads.stop();
  });
  await matrix.check(S, "fila de invitado", "VALIDO abre la ficha", async () => {
    await open(); await tid(page, "guest-search").fill(`Live buscar${stamp}`); await page.getByRole("button", { name: new RegExp(`Abrir a Live buscar${stamp}`) }).first().click(); await page.waitForURL(/\/invitados\/[0-9a-f-]{36}/);
  });
  await matrix.check(S, "usuario ajeno", "ERROR 403/404: otro usuario no ve la lista y no hay pantalla en blanco", async () => {
    const other = await session(browser, world.viewer.email); await go(other.page, "/invitados"); await sleep(1500); await noBlank(other.page, "foreign user");
    const visibleAdd = await tid(other.page, "add-guest").isVisible().catch(() => false); await other.context.close(); assert.equal(visibleAdd, false, "foreign user must not get the manage UI");
  });
  for (const width of WIDTHS) await matrix.check(S, "layout", `LIMITE ancho ${width}: sin scroll horizontal`, async () => {
    const narrow = await session(browser, world.host.email, width); await go(narrow.page, "/invitados"); await tid(narrow.page, "add-guest").waitFor(); await noOverflow(narrow.page, `list ${width}`); await narrow.context.close();
  });
}

/* ---------------------------------------------------------------- detail */
async function detail() {
  const S = "Ficha de invitado";
  const open = async (guest) => { await go(page, `/invitados/${guest.id ?? guest.guestId}`); await text(page, guest.name).waitFor(); };
  const TOKEN_POST = /\/guests\/celebrations\/[^/]+\/guests\/[^/]+\/access-token$/;
  const guestResource = async (url) => { const token = url.split("/").pop(); return http("GET", `/rsvp/celebrations/${C}/guest`, { token }); };
  await matrix.check(S, "issue-link", "VALIDO emite, enmascara, copia: el enlace copiado abre el RSVP (GET)", async () => {
    const guest = await makeGuest("link"); await open(guest); await tid(page, "issue-link").click(); await tid(page, "masked-link").waitFor();
    assert.match(await tid(page, "masked-link").innerText(), /…/);
    const auto = await page.evaluate(() => navigator.clipboard.readText()); assert.match(auto, /\/rsvp\//, "one tap: the link is already on the clipboard after generating it"); await tid(page, "copy-link").click(); await text(page, "Enlace copiado.").waitFor();
    const copied = await page.evaluate(() => navigator.clipboard.readText()); const res = await guestResource(copied); assert.equal(res.status, 200, `guest resource ${res.status}`); return "GET /rsvp/.../guest con el token copiado: 200";
  });
  await matrix.check(S, "issue-link", "LIMITE doble clic: una sola emision", async () => {
    const guest = await makeGuest("dblink"); await open(guest); await page.route(TOKEN_POST, async (route) => { await sleep(1200); await route.continue(); });
    const posts = track(page, isCall("POST", TOKEN_POST)); await tid(page, "issue-link").dblclick(); await tid(page, "masked-link").waitFor(); await unrouteAll(); posts.stop(); assert.equal(posts.count(), 1);
  });
  await matrix.check(S, "issue-link", "ERROR red / 403 / 404 / 429 y reintento", async () => {
    const guest = await makeGuest("errlink"); await open(guest);
    for (const [mode, expected] of [["abort", /No hay conexión/], [403, /solo los anfitriones/], [404, /No encontramos/], [429, /demasiadas solicitudes/]]) {
      await page.route(TOKEN_POST, (route) => (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode)))); await tid(page, "issue-link").click(); await text(page, expected).waitFor(); await unrouteAll();
    }
    await tid(page, "issue-link").click(); await tid(page, "masked-link").waitFor();
  });
  await matrix.check(S, "revoke-link", "VALIDO confirma y revoca: el token ya no abre el RSVP (GET); cancelar no llama", async () => {
    const guest = await makeGuest("revoke"); await open(guest); await tid(page, "issue-link").click(); await tid(page, "masked-link").waitFor(); await tid(page, "copy-link").click();
    const copied = await page.evaluate(() => navigator.clipboard.readText()); assert.equal((await guestResource(copied)).status, 200);
    const deletes = track(page, isCall("DELETE", TOKEN_POST)); await openMore(page, "guest-more"); await tid(page, "revoke-link").click(); await text(page, "¿Revocar este enlace?").waitFor(); await button(page, "Cancelar").click(); await sleep(400); assert.equal(deletes.count(), 0);
    await openMore(page, "guest-more"); await tid(page, "revoke-link").click(); await page.getByRole("alert").getByRole("button", { name: "Revocar enlace" }).click(); await text(page, "Enlace revocado.").waitFor(); deletes.stop();
    const after = await guestResource(copied); assert.ok([401, 404].includes(after.status), `after revoke ${after.status}`); return `DELETE 1; token despues: ${after.status}`;
  });
  await matrix.check(S, "revoke-link", "ERROR red y 404 (sin enlace emitido)", async () => {
    const guest = await makeGuest("revoke404"); await open(guest);
    await openMore(page, "guest-more"); await tid(page, "revoke-link").click(); await page.getByRole("alert").getByRole("button", { name: "Revocar enlace" }).click(); await text(page, /No encontramos|Enlace revocado/).waitFor();
    await page.route(TOKEN_POST, (route) => route.abort("failed")); await openMore(page, "guest-more"); await tid(page, "revoke-link").click(); await page.getByRole("alert").getByRole("button", { name: "Revocar enlace" }).click(); await text(page, /No hay conexión/).waitFor(); await unrouteAll();
  });
  await matrix.check(S, "Reemitir enlace", "VALIDO invalida el anterior y emite otro", async () => {
    const guest = await makeGuest("reissue"); await open(guest); await tid(page, "issue-link").click(); await tid(page, "masked-link").waitFor(); await tid(page, "copy-link").click();
    const first = await page.evaluate(() => navigator.clipboard.readText()); await openMore(page, "guest-more"); await menuItem(page, "Reemitir enlace").click(); await page.getByRole("alert").getByRole("button", { name: "Reemitir enlace" }).click();
    await sleep(1200); await tid(page, "copy-link").click(); const second = await page.evaluate(() => navigator.clipboard.readText());
    assert.notEqual(first, second); assert.equal((await guestResource(second)).status, 200); const old = await guestResource(first); assert.ok([401, 404].includes(old.status)); return `anterior=${old.status}, nuevo=200`;
  });
  await matrix.check(S, "grupo (selector)", "VALIDO cambia y quita grupo (GET); ERROR red revierte", async () => {
    const group = (await host("POST", `${G}/groups`, { name: `Mover ${stamp}` })).json; const guest = await makeGuest("move"); await open(guest);
    await pick(page, "guest-group", group.id); await text(page, "Grupo actualizado.").waitFor();
    assert.equal((await host("GET", `${G}/guests/${guest.id}`)).json.groupId, group.id);
    await pick(page, "guest-group", ""); await page.waitForFunction(() => document.body.innerText.includes("Grupo actualizado."));
    await sleep(500); assert.equal((await host("GET", `${G}/guests/${guest.id}`)).json.groupId, null);
    await page.route(new RegExp(`/guests/${guest.id}$`), (route) => (route.request().method() === "PATCH" ? route.abort("failed") : route.continue()));
    await pick(page, "guest-group", group.id); await text(page, /No hay conexión/).waitFor(); await unrouteAll();
    assert.equal((await host("GET", `${G}/guests/${guest.id}`)).json.groupId, null);
  });
  await matrix.check(S, "erase-guest", "VALIDO: cancelar no llama; confirmar borra (DELETE 202) y GET da 404", async () => {
    const guest = await makeGuest("erase"); await open(guest); const dels = track(page, isCall("DELETE", /\/erasure$/));
    await openMore(page, "guest-more"); await tid(page, "erase-guest").click(); await text(page, new RegExp(`¿Eliminar a ${guest.name}`)).waitFor(); await button(page, "Cancelar").click(); await sleep(400); assert.equal(dels.count(), 0);
    await openMore(page, "guest-more"); await tid(page, "erase-guest").click(); await button(page, "Eliminar para siempre").dblclick(); await page.waitForURL(/\/invitados\?/); dels.stop(); assert.equal(dels.count(), 1);
    assert.equal((await host("GET", `${G}/guests/${guest.id}`)).status, 404); return "DELETE 1 (doble clic), GET guest: 404";
  });
  await matrix.check(S, "erase-guest", "ERROR red / 403 / 429: el invitado sigue existiendo y se puede reintentar", async () => {
    const guest = await makeGuest("eraseerr"); await open(guest);
    for (const [mode, expected] of [["abort", /No hay conexión/], [403, /solo los anfitriones/], [429, /demasiadas solicitudes/]]) {
      await page.route(/\/erasure$/, (route) => (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode)))); await openMore(page, "guest-more"); await tid(page, "erase-guest").click(); await button(page, "Eliminar para siempre").click(); await text(page, expected).waitFor(); await unrouteAll();
      assert.equal((await host("GET", `${G}/guests/${guest.id}`)).status, 200);
    }
  });
  await matrix.check(S, "ficha inexistente", "ERROR 404: mensaje de invitado y salida", async () => {
    await go(page, "/invitados/00000000-0000-4000-8000-00000000ffff"); await text(page, "No encontramos a este invitado.").waitFor(); await button(page, "Volver a la lista").click(); await page.waitForURL(/\/invitados\?/);
  });
  await matrix.check(S, "ficha: lectura", "ERROR red/503 con reintento", async () => {
    const guest = await makeGuest("readerr"); await page.route(new RegExp(`/guests/${guest.id}$`), (route) => route.fulfill(problem(503))); await go(page, `/invitados/${guest.id}`);
    await text(page, /no está disponible/).waitFor(); await unrouteAll(); await button(page, "Reintentar").first().click(); await text(page, guest.name).waitFor();
  });
  matrix.gap(S, "Editar invitado", "CRUD", "Backend sin PATCH de nombre/correo/telefono/acompanantes: el unico PATCH /guests/{id} es changeGuestGroup (solo groupId). No hay boton.");
  matrix.gap(S, "Reenviar invitacion", "CRUD", "Backend sin endpoint de reenvio de invitacion; no existe boton.");
}

/* ---------------------------------------------------------------- groups */
async function groups() {
  const S = "Grupos";
  const GROUP_POST = /\/guests\/celebrations\/[^/]+\/groups$/;
  const open = async () => { await go(page, "/invitados/grupos"); await tid(page, "create-group").waitFor(); };
  await matrix.check(S, "create-group", "LIMITE vacio y 201 caracteres no envian; 200 se crea (GET)", async () => {
    await open(); const posts = track(page, isCall("POST", GROUP_POST)); await tid(page, "create-group").click(); await text(page, "Este campo es obligatorio.").waitFor();
    await tid(page, "group-name").fill("g".repeat(201)); await tid(page, "create-group").click(); await text(page, "El texto es demasiado largo.").waitFor(); assert.equal(posts.count(), 0);
    const name = `${stamp}`.padEnd(200, "z"); await tid(page, "group-name").fill(name); await tid(page, "create-group").click(); await text(page, /creado\./).waitFor(); posts.stop(); assert.equal(posts.count(), 1);
    assert.ok((await host("GET", `${G}/groups?limit=1000`)).json.items.some((g) => g.name === name)); return "GET groups: nombre de 200 persistido";
  });
  await matrix.check(S, "create-group", "VALIDO + LIMITE doble clic: un grupo; lista y conteo", async () => {
    await open(); await page.route(GROUP_POST, async (route) => { await sleep(1200); await route.continue(); });
    const posts = track(page, isCall("POST", GROUP_POST)); const name = `Dbl ${stamp}`; await tid(page, "group-name").fill(name); await tid(page, "create-group").dblclick(); await text(page, `Grupo «${name}» creado.`).waitFor();
    await unrouteAll(); posts.stop(); assert.equal(posts.count(), 1); assert.equal((await host("GET", `${G}/groups?limit=1000`)).json.items.filter((g) => g.name === name).length, 1);
    await text(page, name).waitFor(); return "1 POST, GET: 1 grupo";
  });
  await matrix.check(S, "create-group", "LIMITE nombre duplicado: el backend decide, la UI informa o crea sin romper", async () => {
    await open(); const name = `Dup ${stamp}`; await tid(page, "group-name").fill(name); await tid(page, "create-group").click(); await text(page, /creado\./).waitFor();
    await tid(page, "group-name").fill(name); await tid(page, "create-group").click(); await sleep(1200); await noBlank(page, "dup group");
    const n = (await host("GET", `${G}/groups?limit=1000`)).json.items.filter((g) => g.name === name).length; return `backend acepta duplicados: ${n} grupos con el mismo nombre (GET)`;
  });
  await matrix.check(S, "create-group", "ERROR red / 403 / 422 / 429", async () => {
    await open();
    for (const [mode, expected] of [["abort", /No hay conexión/], [403, /solo los anfitriones/], [422, /Revisa este dato/], [429, /demasiadas solicitudes.*9 s/]]) {
      await page.route(GROUP_POST, (route) => (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode, "x", mode === 429 ? { "retry-after": "9" } : {})))); await tid(page, "group-name").fill(`E ${stamp}`); await tid(page, "create-group").click(); await text(page, expected).waitFor(); await unrouteAll();
    }
  });
  await matrix.check(S, "lista de grupos", "ERROR lectura 503 con reintento; VACIO texto", async () => {
    await page.route(/\/groups\?/, (route) => route.fulfill(problem(503))); await go(page, "/invitados/grupos"); await text(page, /no está disponible/).waitFor(); await unrouteAll(); await button(page, "Reintentar").first().click(); await text(page, /integrantes/).first().waitFor();
  });
  await matrix.check(S, "Volver a la lista", "VALIDO navega", async () => { await open(); await button(page, "Volver a la lista").click(); await page.waitForURL((u) => u.pathname === "/invitados"); });
  matrix.gap(S, "Editar / Borrar grupo", "CRUD", "Backend solo expone POST/GET /groups y GET /groups/{id}; sin PUT/PATCH/DELETE de grupo. No hay botones (la nota 'Para mover a un invitado abre su ficha' explica el unico cambio posible).");
}

/* ---------------------------------------------------------------- import */
async function importSection() {
  const S = "Importar CSV";
  const IMPORT = /\/guests\/celebrations\/[^/]+\/guests\/import$/;
  const open = async () => { await go(page, "/invitados/importar"); await tid(page, "run-import").waitFor(); };
  const header = "name,email,phone,locale,allowedCompanions,groupId";
  await matrix.check(S, "run-import", "LIMITE vacio no envia", async () => { await open(); const posts = track(page, isCall("POST", IMPORT)); await tid(page, "run-import").click(); await text(page, "Pega o elige un CSV primero.").waitFor(); assert.equal(posts.count(), 0); });
  await matrix.check(S, "run-import", "LIMITE solo encabezado y encabezado invalido: error del backend legible", async () => {
    await open(); await tid(page, "csv-input").fill(header); await tid(page, "run-import").click(); await sleep(1500); await noBlank(page, "header only");
    const first = await page.evaluate(() => document.body.innerText); await button(page, "Importar otro archivo").click(); await tid(page, "csv-input").fill("foo,bar\n1,2"); await tid(page, "run-import").click(); await sleep(1500); await noBlank(page, "bad header");
    return /Revisa este dato|importados/.test(first) ? "mensaje mostrado" : "sin importados";
  });
  await matrix.check(S, "run-import", "VALIDO parcial: 2 filas buenas, 1 mala con linea y motivo; GET confirma 2", async () => {
    await open(); const csv = [header, `Imp Uno ${stamp},imp1.${stamp}@example.com,,es-BO,1,`, `Imp Mal ${stamp},no-correo,,es-BO,1,`, `Imp Tres ${stamp},imp3.${stamp}@example.com,,es-BO,0,`].join("\n");
    await tid(page, "csv-input").fill(csv); await tid(page, "run-import").click(); await tid(page, "import-summary").waitFor();
    assert.match(await tid(page, "import-summary").innerText(), /2 importados, 1 con error, de 3 filas/); await tid(page, "import-error-3").waitFor();
    assert.equal((await listGuests(`imp1.${stamp}@example.com`)).length, 1); assert.equal((await listGuests(`imp3.${stamp}@example.com`)).length, 1); assert.equal((await listGuests(`Imp Mal ${stamp}`, 0)).length, 0);
    return "resumen 2/1/3, error en linea 3; GET: 2 persistidos, 0 de la mala";
  });
  await matrix.check(S, "run-import", "LIMITE 1001 filas: bloqueado en cliente; 1000 filas aceptadas", async () => {
    await open(); const rows = (n) => [header, ...Array.from({ length: n }, (_, i) => `B${stamp} ${i},b${stamp}${i}@example.com,,es-BO,0,`)].join("\n");
    const posts = track(page, isCall("POST", IMPORT)); await tid(page, "csv-input").fill(rows(1001)); await tid(page, "run-import").click(); await text(page, /más de 1000 filas/).waitFor(); assert.equal(posts.count(), 0);
    await tid(page, "csv-input").fill(rows(1000)); await tid(page, "run-import").click(); await tid(page, "import-summary").waitFor({ timeout: 30000 }); posts.stop(); assert.equal(posts.count(), 1);
    return (await tid(page, "import-summary").innerText());
  });
  await matrix.check(S, "run-import", "LIMITE mas de 1 MiB: bloqueado en cliente", async () => {
    await open(); const posts = track(page, isCall("POST", IMPORT)); await tid(page, "csv-input").fill(`${header}\n${"x".repeat(1024 * 1024 + 10)}`); await tid(page, "run-import").click(); await text(page, "El archivo supera 1 MB.").waitFor(); assert.equal(posts.count(), 0);
  });
  await matrix.check(S, "run-import", "LIMITE doble clic: una sola importacion", async () => {
    await open(); await page.route(IMPORT, async (route) => { await sleep(1200); await route.continue(); }); const posts = track(page, isCall("POST", IMPORT));
    await tid(page, "csv-input").fill(`${header}\nDbl ${stamp},dblimp.${stamp}@example.com,,es-BO,0,`); await tid(page, "run-import").dblclick(); await tid(page, "import-summary").waitFor(); await unrouteAll(); posts.stop(); assert.equal(posts.count(), 1); assert.equal((await listGuests(`dblimp.${stamp}@example.com`)).length, 1);
  });
  await matrix.check(S, "run-import", "ERROR red / 403 / 413 / 429 / 503", async () => {
    await open(); await tid(page, "csv-input").fill(`${header}\nErr ${stamp},err.${stamp}@example.com,,es-BO,0,`);
    for (const [mode, expected] of [["abort", /No hay conexión/], [403, /solo los anfitriones/], [413, /Revisa este dato|No se pudo completar|Algo no salió como esperábamos/], [429, /demasiadas solicitudes/], [503, /no está disponible/]]) {
      await page.route(IMPORT, (route) => (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode)))); await tid(page, "run-import").click(); await text(page, expected).waitFor(); await unrouteAll();
    }
    assert.equal((await listGuests(`err.${stamp}@example.com`, 0)).length, 0); await tid(page, "run-import").click(); await tid(page, "import-summary").waitFor(); assert.equal((await listGuests(`err.${stamp}@example.com`)).length, 1);
  });
  await matrix.check(S, "Elegir archivo CSV", "VALIDO carga el archivo; LIMITE >1 MB bloqueado", async () => {
    await open(); const [chooser] = await Promise.all([page.waitForEvent("filechooser"), button(page, "Elegir archivo CSV").click()]);
    await chooser.setFiles({ name: "inv.csv", mimeType: "text/csv", buffer: Buffer.from(`${header}\nArch ${stamp},arch.${stamp}@example.com,,es-BO,0,`) });
    await page.waitForFunction(() => [...document.querySelectorAll("textarea")].some((t) => t.value.includes("arch.")));
    const [big] = await Promise.all([page.waitForEvent("filechooser"), button(page, "Elegir archivo CSV").click()]);
    await big.setFiles({ name: "big.csv", mimeType: "text/csv", buffer: Buffer.alloc(1024 * 1024 + 5, "a") }); await text(page, "El archivo supera 1 MB.").waitFor();
  });
  await matrix.check(S, "Importar otro / Ver invitados", "VALIDO", async () => {
    await open(); await tid(page, "csv-input").fill(`${header}\nOtro ${stamp},otro.${stamp}@example.com,,es-BO,0,`); await tid(page, "run-import").click(); await tid(page, "import-summary").waitFor();
    await button(page, "Importar otro archivo").click(); await tid(page, "run-import").waitFor(); assert.equal(await tid(page, "csv-input").inputValue(), "");
    await tid(page, "csv-input").fill(`${header}\nOtro2 ${stamp},otro2.${stamp}@example.com,,es-BO,0,`); await tid(page, "run-import").click(); await tid(page, "import-summary").waitFor(); await button(page, "Ver invitados").click(); await page.waitForURL(/\/invitados\?/);
  });
}

/* ---------------------------------------------------------------- report */
async function report() {
  const S = "Reporte RSVP";
  const open = async () => { await go(page, "/rsvp/reporte"); await tid(page, "export-csv").waitFor(); };
  const download = async (id) => { if (id === "export-catering") await openMore(page, "report-more"); /* a menu closes once an item is chosen */ const [file] = await Promise.all([page.waitForEvent("download"), tid(page, id).click()]); const path = await file.path(); const { readFileSync } = await import("node:fs"); return { name: file.suggestedFilename(), body: readFileSync(path, "utf8") }; };
  await matrix.check(S, "export-csv", "VALIDO descarga CSV con todas las filas del backend; formulas neutralizadas", async () => {
    await host("POST", `${G}/guests`, { name: `=1+1 ${stamp}`, email: `formula.${stamp}@example.com`, allowedCompanions: 0 });
    await open(); const { name, body } = await download("export-csv"); const total = (await host("GET", `${G}/guest-list?limit=1`)).json.total;
    const lines = body.replace(/^﻿/, "").trim().split("\r\n"); assert.equal(lines.length - 1, total, `rows ${lines.length - 1} vs total ${total}`); assert.ok(body.includes(`'=1+1 ${stamp}`), "formula prefixed"); assert.ok(!body.includes(`\n=1+1`));
    return `${name}: ${lines.length - 1} filas = GET total ${total}`;
  });
  await matrix.check(S, "export-catering", "VALIDO descarga sin nombres ni correos", async () => {
    await open(); await openMore(page, "report-more"); const { name, body } = await download("export-catering"); assert.ok(!/@example\.com/.test(body), "no emails"); assert.match(name, /^catering-/); return `${name}: ${body.trim().split("\r\n").length - 1} filas`;
  });
  await matrix.check(S, "export-csv / export-catering", "ERROR red/503 en la lectura: mensaje y reintento posible", async () => {
    await open(); await page.route(/\/guest-list/, (route) => route.abort("failed")); await tid(page, "export-csv").click(); await text(page, "No pudimos preparar el archivo. Inténtalo de nuevo.").waitFor(); await unrouteAll();
    await page.route(/\/catering-report/, (route) => route.fulfill(problem(503))); await openMore(page, "report-more"); await tid(page, "export-catering").click(); await text(page, "No pudimos preparar el archivo. Inténtalo de nuevo.").waitFor(); await unrouteAll();
    await download("export-catering");
  });
  await matrix.check(S, "export-csv", "LIMITE doble clic: un solo recorrido de exportacion", async () => {
    await open(); await page.route(/\/guest-list/, async (route) => { await sleep(600); await route.continue(); }); const reads = track(page, isCall("GET", /\/guest-list.*limit=100/));
    const downloads = []; page.on("download", (d) => downloads.push(d)); await tid(page, "export-csv").dblclick(); await page.waitForEvent("download", { timeout: 60000 }); await sleep(2500); await unrouteAll(); reads.stop(); assert.equal(downloads.length, 1, `downloads=${downloads.length}`);
  });
  await matrix.check(S, "filtros", "VALIDO + LIMITE: vacio por filtro, mensaje 'Todavía no hay respuestas'", async () => {
    await open(); await pick(page, "status-filter", "DECLINED"); await sleep(900);
    const declined = (await host("GET", `${G}/guest-list?status=DECLINED&limit=1`)).json.total; if (declined === 0) await text(page, /Nadie ha dado esa respuesta todavía/).waitFor(); return `GET DECLINED total=${declined}`;
  });
  await matrix.check(S, "lista del reporte", "ERROR 429 / 503 con reintento", async () => {
    for (const [mode, expected] of [[429, /demasiadas solicitudes/], [503, /no está disponible/]]) { await page.route(/\/guest-list/, (route) => route.fulfill(problem(mode))); await go(page, "/rsvp/reporte"); await text(page, expected).waitFor(); await unrouteAll(); await button(page, "Reintentar").first().click(); await page.getByRole("button", { name: /^Abrir a / }).first().or(text(page, /Aquí aparecerán las respuestas/)).waitFor(); }
  });
  await matrix.check(S, "ficha desde fila", "VALIDO", async () => { await open(); await page.getByRole("button", { name: /^Abrir a / }).first().click(); await page.waitForURL(/\/invitados\/[0-9a-f-]{36}/); });
}

/* -------------------------------------------------------------- requests */
async function requests() {
  const S = "Solicitudes de acompanantes";
  const DECISION = /\/companion-requests\/[^/]+\/decision$/;
  const open = async () => { await go(page, "/bandeja/acompanantes"); await sleep(800); };
  await matrix.check(S, "approve-<id>", "VALIDO aprueba (GET: ya no esta pendiente) con doble clic = 1 POST", async () => {
    const { request } = await newRequest("apr"); await open(); await page.route(DECISION, async (route) => { await sleep(900); await route.continue(); }); const posts = track(page, isCall("POST", DECISION));
    await tid(page, `approve-${request.id}`).dblclick(); await text(page, "Solicitud aprobada.").waitFor(); await unrouteAll(); posts.stop(); assert.equal(posts.count(), 1);
    const after = (await host("GET", `${G}/companion-requests?limit=100`)).json.items.find((r) => r.id === request.id); assert.ok(!after || after.status !== "PENDING_REVIEW"); return `GET: status=${after?.status ?? "fuera de pendientes"}`;
  });
  await matrix.check(S, "reject-<id>", "VALIDO rechaza", async () => {
    const { request } = await newRequest("rej"); await open(); await tid(page, `reject-${request.id}`).click(); await text(page, "Solicitud rechazada.").waitFor();
    const after = (await host("GET", `${G}/companion-requests?limit=100`)).json.items.find((r) => r.id === request.id); assert.ok(!after || after.status !== "PENDING_REVIEW"); return `GET: status=${after?.status ?? "fuera de pendientes"}`;
  });
  await matrix.check(S, "approve-<id>", "ERROR 409 ya resuelta por otro: aviso y lista actualizada", async () => {
    const { request } = await newRequest("stale"); await open(); await tid(page, `approve-${request.id}`).waitFor();
    assert.equal((await host("POST", `${G}/companion-requests/${request.id}/decision`, { decision: "REJECTED" })).status, 200);
    await tid(page, `approve-${request.id}`).click(); await text(page, "Esta solicitud ya estaba resuelta o cambió. Actualizamos la lista.").waitFor(); await page.waitForFunction((id) => !document.querySelector(`[data-testid="approve-${id}"]`), request.id);
  });
  await matrix.check(S, "approve-<id> / reject-<id>", "ERROR red / 403 / 404 / 429: mensaje y la solicitud sigue pendiente", async () => {
    const { request } = await newRequest("err"); await open();
    for (const [mode, expected] of [["abort", /No hay conexión/], [403, /solo los anfitriones/], [404, /No encontramos/], [429, /demasiadas solicitudes/]]) {
      await page.route(DECISION, (route) => (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode)))); await tid(page, `approve-${request.id}`).click(); await text(page, expected).waitFor(); await unrouteAll();
    }
    const still = (await host("GET", `${G}/companion-requests?limit=100`)).json.items.find((r) => r.id === request.id); assert.equal(still.status, "PENDING_REVIEW");
  });
  await matrix.check(S, "Abrir invitado", "VALIDO", async () => { const { request } = await newRequest("open"); await open(); await page.locator(`[data-testid="request-${request.id}"]`).getByRole("button", { name: "Abrir invitado" }).click(); await page.waitForURL(/\/invitados\/[0-9a-f-]{36}/); });
  await matrix.check(S, "lista", "VACIO y ERROR lectura 503 con reintento", async () => {
    await page.route(/\/companion-requests/, (route) => route.fulfill(problem(503))); await open(); await text(page, /no está disponible/).waitFor(); await unrouteAll(); await button(page, "Reintentar").first().click(); await sleep(800); await noBlank(page, "requests retry");
    await page.route(/\/companion-requests/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], total: 0, limit: 100, offset: 0 }) })); await open(); await text(page, "Todo al día").waitFor(); await unrouteAll();
  });
}

/* --------------------------------------------------------- notifications */
async function notifications() {
  const S = "Avisos";
  const READ = /\/notifications\/celebrations\/[^/]+\/notifications\/[^/]+\/read$/;
  const open = async () => { await go(page, "/notificaciones"); await sleep(1000); };
  const inbox = async () => (await host("GET", `${N}/notifications?limit=50`)).json.items;
  const seedUnread = async (min) => { // a companion request makes the backend notify the host: real unread items for the scenarios below
    for (let i = 0; i < min; i += 1) await newRequest(`notif${i}`);
    for (let waited = 0; (await inbox()).filter((n) => !n.readAt).length < min && waited < 30; waited += 1) await sleep(1000);
  };
  await seedUnread(3);
  await matrix.check(S, "read-<id>", "VALIDO marca leido (GET readAt) y 'Marcar' desaparece", async () => {
    await open(); const unread = (await inbox()).find((n) => !n.readAt); if (!unread) throw new Error("no unread notification in the world");
    await tid(page, `read-${unread.id}`).click(); await page.waitForFunction((id) => !document.querySelector(`[data-testid="read-${id}"]`), unread.id);
    await sleep(800); const after = (await inbox()).find((n) => n.id === unread.id); assert.ok(after.readAt); return `GET readAt=${after.readAt}`;
  });
  await matrix.check(S, "read-<id>", "ERROR red: vuelve al estado anterior con aviso", async () => {
    await open(); const unread = (await inbox()).find((n) => !n.readAt); if (!unread) throw new Error("no more unread notifications");
    await page.route(READ, (route) => route.abort("failed")); await tid(page, `read-${unread.id}`).click(); await text(page, /No hay conexión|No se pudo marcar/).waitFor(); await unrouteAll();
    await tid(page, `read-${unread.id}`).waitFor(); assert.ok(!(await inbox()).find((n) => n.id === unread.id).readAt);
  });
  await seedUnread(2);
  await matrix.check(S, "mark-all", "VALIDO doble clic: marca todo una vez; despues deshabilitado", async () => {
    await open(); const before = (await inbox()).filter((n) => !n.readAt).length; const posts = track(page, isCall("POST", READ));
    if (before === 0) throw new Error("nothing unread to mark"); await tid(page, "mark-all").dblclick(); await page.waitForFunction(() => /^0 sin leer/.test(document.querySelector('[data-testid="unread-count"]')?.textContent ?? ""), null, { timeout: 15000 });
    for (let waited = 0; (await inbox()).some((n) => !n.readAt) && waited < 40; waited += 1) await sleep(500); // the cache flips at once; the server answers one by one
    posts.stop(); assert.equal(posts.count(), before, `POSTs ${posts.count()} vs unread ${before}`); await sleep(800); assert.equal((await inbox()).filter((n) => !n.readAt).length, 0); assert.equal(await tid(page, "mark-all").isDisabled(), true); return `${before} avisos, ${posts.count()} POST, GET: 0 sin leer`;
  });
  await matrix.check(S, "mark-all", "ERROR 429 / 503: revierte y avisa", async () => {
    await host("POST", `${G}/guests`, { name: `Aviso ${stamp}`, email: `aviso.${stamp}@example.com`, allowedCompanions: 0 }); await sleep(500);
    await http("POST", `/rsvp/celebrations/${C}/unregistered`, { body: { name: "Anon", email: `anon.${stamp}@example.com`, requestedCompanions: 0, consent: true }, headers: { "idempotency-key": crypto.randomUUID() } });
    await sleep(3000); await open(); const unread = (await inbox()).filter((n) => !n.readAt); if (unread.length === 0) return "sin avisos nuevos en el mundo: escenario marcado sin ejecutar";
    for (const [status, expected] of [[429, /demasiadas solicitudes/], [503, /no está disponible/]]) { await page.route(READ, (route) => route.fulfill(problem(status))); await tid(page, "mark-all").click(); await text(page, expected).waitFor(); await unrouteAll(); }
  });
  await matrix.check(S, "open-<id>", "VALIDO abre destino y marca leido", async () => {
    await open(); const target = await page.locator('[data-testid^="open-"]').first(); if ((await target.count()) === 0) return "ningun aviso con destino (solo plantillas companionRequested/RSVP los tienen); sin ejecutar"; await target.click(); await sleep(1200); await noBlank(page, "open notification");
  });
  await matrix.check(S, "Actualizar", "VALIDO relee; ERROR 503 -> reintento", async () => {
    await open(); const reads = track(page, isCall("GET", /\/notifications\?/)); await openMore(page, "notifications-more"); await menuItem(page, "Actualizar").click(); await sleep(800); assert.ok(reads.count() >= 1); reads.stop();
    await page.route(/\/notifications\/celebrations\/[^/]+\/notifications\?/, (route) => route.fulfill(problem(503))); await go(page, "/notificaciones"); await text(page, /no está disponible/).waitFor(); await unrouteAll(); await button(page, "Reintentar").first().click(); await text(page, /sin leer/).waitFor();
  });
  matrix.gap(S, "Marcar todos (endpoint)", "CRUD", "Backend marca de a una (POST .../{id}/read); 'Marcar todos' hace N llamadas secuenciales. Sin endpoint masivo ni paginacion/cursor de bandeja (solo limit).");
}

/* ----------------------------------------------------------- preferences */
async function preferences() {
  const S = "Preferencias de avisos";
  const PATCH = /\/notifications\/celebrations\/[^/]+\/preferences$/;
  const open = async () => { await go(page, "/preferencias"); await tid(page, "prefs-more").waitFor(); await openMore(page, "prefs-more"); await tid(page, "quiet-save").waitFor(); };
  const prefs = async () => (await host("GET", `${N}/preferences`)).json;
  await matrix.check(S, "pref-EMAIL/SMS/WHATSAPP/PUSH", "VALIDO conmutan y persisten (GET channels)", async () => {
    await open(); for (const channel of ["EMAIL", "WHATSAPP"]) { const was = (await prefs()).channels?.[channel] === true; await tid(page, `pref-${channel}`).click(); await text(page, "Preferencia guardada.").waitFor(); await sleep(400); assert.equal((await prefs()).channels[channel], !was); await page.reload(); await tid(page, "prefs-more").waitFor(); await openMore(page, "prefs-more"); await tid(page, "quiet-save").waitFor(); }
  });
  await matrix.check(S, "pref-EMAIL", "ERROR red/503/429: el interruptor vuelve atras y avisa", async () => {
    await open(); const was = (await prefs()).channels?.EMAIL === true;
    for (const mode of ["abort", 503, 429]) { await page.route(PATCH, (route) => (route.request().method() === "PATCH" ? (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode))) : route.continue())); await tid(page, "pref-EMAIL").click(); await text(page, /No se pudo guardar|No hay conexión|no está disponible|demasiadas/).waitFor(); await unrouteAll(); await sleep(400); assert.equal((await prefs()).channels?.EMAIL === true, was); }
  });
  await matrix.check(S, "pref-EMAIL", "LIMITE clics repetidos: el interruptor se bloquea mientras guarda (1 PATCH)", async () => {
    await open(); await page.route(PATCH, async (route) => { if (route.request().method() === "PATCH") await sleep(1000); await route.continue(); }); const patches = track(page, isCall("PATCH", PATCH));
    await tid(page, "pref-SMS").click(); await tid(page, "pref-SMS").click({ force: true, noWaitAfter: true }).catch(() => undefined); await sleep(2500); await unrouteAll(); patches.stop(); assert.equal(patches.count(), 1, `PATCHs=${patches.count()}`);
  });
  await matrix.check(S, "event-<tipo>", "VALIDO silencia y reactiva un tipo (GET eventTypes)", async () => {
    await open(); await tid(page, "event-giftRequested").click(); await text(page, "Preferencia guardada.").waitFor(); await sleep(400); assert.equal((await prefs()).eventTypes.giftRequested, false);
    await tid(page, "event-giftRequested").click(); await sleep(1200); assert.equal((await prefs()).eventTypes.giftRequested, true);
  });
  await matrix.check(S, "quiet-save", "LIMITE horas invalidas (24, -1, abc, vacio) no envian", async () => {
    await open(); const patches = track(page, isCall("PATCH", PATCH));
    for (const [a, b] of [["24", "8"], ["-1", "8"], ["abc", "8"], ["", "8"], ["22", "24"], ["1.5", "3"]]) { await tid(page, "quiet-start").fill(a); await tid(page, "quiet-end").fill(b); await tid(page, "quiet-save").click(); await text(page, "Escribe horas enteras entre 0 y 23.").waitFor(); }
    assert.equal(patches.count(), 0); patches.stop();
  });
  await matrix.check(S, "quiet-save / quiet-default", "VALIDO 20-7 persiste; 0-23 limites; igual = sin silencio; volver al servicio", async () => {
    await open(); for (const [a, b] of [["20", "7"], ["0", "23"], ["5", "5"]]) { await tid(page, "quiet-start").fill(a); await tid(page, "quiet-end").fill(b); await tid(page, "quiet-save").click(); await text(page, "Preferencia guardada.").waitFor(); await sleep(400); const q = (await prefs()).quietHours; assert.deepEqual([q.start, q.end, q.source], [Number(a), Number(b), "RECIPIENT"]); }
    await tid(page, "quiet-default").click(); await sleep(1200); assert.equal((await prefs()).quietHours.source, "DEFAULT");
  });
  await matrix.check(S, "quiet-save", "ERROR red: aviso y valor anterior", async () => {
    await open(); await tid(page, "quiet-start").fill("3"); await tid(page, "quiet-end").fill("9"); await page.route(PATCH, (route) => (route.request().method() === "PATCH" ? route.abort("failed") : route.continue()));
    await tid(page, "quiet-save").click(); await text(page, "No se pudo guardar; volvimos al valor anterior.").waitFor(); await unrouteAll(); assert.equal((await prefs()).quietHours.source, "DEFAULT");
  });
  await matrix.check(S, "lectura", "ERROR 503 con reintento", async () => {
    await page.route(PATCH, (route) => route.fulfill(problem(503))); await go(page, "/preferencias"); await text(page, /no está disponible/).waitFor(); await unrouteAll(); await button(page, "Reintentar").first().click(); await tid(page, "prefs-more").waitFor(); await openMore(page, "prefs-more"); await tid(page, "quiet-save").waitFor();
  });
  await matrix.check(S, "Configurar avisos en este dispositivo", "VALIDO navega", async () => { await go(page, "/preferencias"); await tid(page, "pref-PUSH").waitFor(); await openMore(page, "preferences-more"); await menuItem(page, "Configurar avisos en este dispositivo").click(); await page.waitForURL(/\/permisos-push/); });
}

/* ------------------------------------------------------------------ push */
async function push() {
  const S = "Permisos push";
  const open = async () => { await go(page, "/permisos-push"); await sleep(1500); };
  const openAdvanced = async () => { await open(); await openMore(page, "push-more"); };
  const devices = await host("GET", `${N}/devices`);
  await matrix.check(S, "enable-push", "LIMITE navegador web: sin telefono, el boton no existe y se explica por que", async () => {
    await open(); await text(page, /necesitan un teléfono real/).waitFor(); assert.equal(await tid(page, "enable-push").count(), 0);
  });
  await matrix.check(S, "dispositivos / envios", `ERROR backend ${devices.status}: aviso claro (no en blanco) y Reintentar`, async () => {
    await openAdvanced(); await noBlank(page, "push"); if (devices.status === 503) { await text(page, /no está disponible/).first().waitFor(); await button(page, "Reintentar").first().click(); await sleep(800); await noBlank(page, "push retry"); return "503 'Push registration is not configured' -> aviso de servicio no disponible + Reintentar"; }
    return `dispositivos ${devices.status}`;
  });
  await matrix.check(S, "dispositivos (con datos simulados)", "VALIDO/LIMITE lista, probar, quitar con confirmacion, envios", async () => {
    const id = "11111111-2222-4333-8444-555555555555"; const device = { id, installationId: id, projectId: id, platform: "ios", version: 1, status: "ACTIVE", createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z" };
    let state = [device]; const calls = [];
    await page.route(/\/notifications\/celebrations\/[^/]+\/devices(\/.*)?$/, async (route) => { const request = route.request(); calls.push(`${request.method()} ${new URL(request.url()).pathname.split("/").slice(-2).join("/")}`);
      if (request.method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: state }) });
      if (request.method() === "DELETE") { state = []; return route.fulfill({ status: 204 }); }
      if (/test$/.test(request.url())) { await sleep(800); return route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ notificationId: id, deviceId: id, status: "PENDING" }) }); } return route.continue(); });
    await page.route(/push-deliveries/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{ id, notificationId: id, deviceId: id, deviceVersion: 1, status: "RETRY", attempts: 2, receiptChecks: 0, availableAt: "2026-11-02T10:00:00Z", lastError: "timeout" }] }) }));
    await openAdvanced(); await tid(page, `device-${id}`).waitFor(); await text(page, "Reintentando").waitFor(); await text(page, /Detalle: timeout/).waitFor();
    const tests = track(page, isCall("POST", /\/test$/)); await tid(page, `test-${id}`).dblclick(); await text(page, "Aviso de prueba en camino.").waitFor(); tests.stop(); assert.equal(tests.count(), 1);
    await tid(page, `remove-${id}`).click(); await text(page, "¿Quitar este dispositivo?").waitFor(); await button(page, "Cancelar").click(); await sleep(300); assert.ok(!calls.some((c) => c.startsWith("DELETE")));
    await tid(page, `remove-${id}`).click(); await page.getByRole("alert").getByRole("button", { name: "Quitar este dispositivo" }).click(); await text(page, "Todavía no hay dispositivos registrados para recibir avisos push.").waitFor(); await unrouteAll();
    return "simulado en el navegador: el backend de este entorno no tiene push configurado (503); no hay prueba contra servicio real";
  });
  await matrix.check(S, "Preferencias de avisos", "VALIDO navega", async () => { await open(); await openMore(page, "push-menu"); await menuItem(page, "Preferencias de avisos").click(); await page.waitForURL(/\/preferencias/); });
}

/* -------------------------------------------------------------- settings */
async function settings() {
  const S = "Ajustes de invitados";
  const PUT = (name) => new RegExp(`/${name}$`);
  const open = async () => { await go(page, "/invitados/ajustes"); await tid(page, "save-defaults").waitFor(); await tid(page, "settings-more").waitFor(); assert.equal(await tid(page, "save-retention").count(), 0, "retention stays behind Más opciones"); await openMore(page, "settings-more"); await tid(page, "save-retention").waitFor(); };
  await matrix.check(S, "save-defaults", "LIMITE -1 / abc / 2147483648 / vacio invalidos sin llamada; 0 y 2147483647 validos", async () => {
    await open(); const puts = track(page, isCall("PUT", PUT("guest-settings")));
    for (const bad of ["-1", "abc", "2147483648", ""]) { await tid(page, "default-companions").fill(bad); assert.equal(await tid(page, "save-defaults").isDisabled(), true, `enabled for ${bad}`); }
    assert.equal(puts.count(), 0); puts.stop();
    for (const ok of ["2147483647", "0"]) { await tid(page, "default-companions").fill(ok); await tid(page, "save-defaults").click(); await text(page, /Guardado:/).waitFor(); assert.equal((await host("GET", `${G}/guest-settings`)).json.defaultAllowedCompanions, Number(ok)); await page.reload(); await tid(page, "save-defaults").waitFor(); }
  });
  await matrix.check(S, "save-defaults", "VALIDO + doble clic: 1 PUT, GET confirma", async () => {
    await open(); await page.route(PUT("guest-settings"), async (route) => { if (route.request().method() === "PUT") await sleep(1000); await route.continue(); }); const puts = track(page, isCall("PUT", PUT("guest-settings")));
    await tid(page, "default-companions").fill("4"); await tid(page, "save-defaults").dblclick(); await text(page, "Guardado: 4 acompañantes por defecto.").waitFor(); await unrouteAll(); puts.stop(); assert.equal(puts.count(), 1);
    assert.equal((await host("GET", `${G}/guest-settings`)).json.defaultAllowedCompanions, 4); await host("PUT", `${G}/guest-settings`, { defaultAllowedCompanions: 0 });
  });
  await matrix.check(S, "save-defaults", "ERROR red / 403 / 422 / 429 y lectura 503", async () => {
    await open(); await tid(page, "default-companions").fill("5");
    for (const [mode, expected] of [["abort", /No hay conexión/], [403, /solo los anfitriones/], [422, /Revisa este dato/], [429, /demasiadas solicitudes/]]) { await page.route(PUT("guest-settings"), (route) => (route.request().method() !== "PUT" ? route.continue() : mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode)))); await tid(page, "save-defaults").click(); await text(page, expected).waitFor(); await unrouteAll(); }
    assert.equal((await host("GET", `${G}/guest-settings`)).json.defaultAllowedCompanions, 0);
    await page.route(PUT("guest-settings"), (route) => route.fulfill(problem(503))); await go(page, "/invitados/ajustes"); await text(page, /no está disponible/).first().waitFor(); await unrouteAll();
  });
  await matrix.check(S, "save-retention", "LIMITE 0 / 36501 / abc / 1.5 invalidos; 1 y 36500 validos tras confirmar; cancelar no llama", async () => {
    await open(); const puts = track(page, isCall("PUT", PUT("retention-settings")));
    for (const bad of ["0", "36501", "abc", "1.5", "-3"]) { await tid(page, "retention-days").fill(bad); await text(page, "Escribe un número entero entre 1 y 36500.").waitFor(); assert.equal(await tid(page, "save-retention").isDisabled(), true); }
    await tid(page, "retention-days").fill("30"); await tid(page, "save-retention").click(); await text(page, "¿Guardar este plazo?").waitFor(); await button(page, "Cancelar").click(); await sleep(300); assert.equal(puts.count(), 0);
    for (const ok of ["1", "36500"]) { await tid(page, "retention-days").fill(ok); await tid(page, "save-retention").click(); await page.getByRole("alert").getByRole("button", { name: "Guardar", exact: true }).click(); await text(page, "Plazo de conservación guardado.").waitFor(); assert.equal((await host("GET", `${G}/retention-settings`)).json.retentionDays, Number(ok)); }
    puts.stop();
  });
  await matrix.check(S, "clear-retention", "VALIDO quita el plazo (GET null) y queda deshabilitado; ERROR red conserva", async () => {
    await open(); await page.route(PUT("retention-settings"), (route) => (route.request().method() === "PUT" ? route.abort("failed") : route.continue())); await tid(page, "clear-retention").click(); await page.getByRole("alert").getByRole("button", { name: "Quitar el plazo" }).click(); await text(page, /No hay conexión/).waitFor(); await unrouteAll();
    assert.equal((await host("GET", `${G}/retention-settings`)).json.retentionDays, 36500);
    await tid(page, "clear-retention").click(); await page.getByRole("alert").getByRole("button", { name: "Quitar el plazo" }).click(); await text(page, "Plazo de conservación guardado.").waitFor(); assert.equal((await host("GET", `${G}/retention-settings`)).json.retentionDays, null); assert.equal(await tid(page, "clear-retention").isDisabled(), true);
  });
  await matrix.check(S, "Volver a la lista", "VALIDO", async () => { await open(); await button(page, "Volver a la lista").click(); await page.waitForURL(/\/invitados\?/); });
}

/* --------------------------------------------------------------- summary */
async function summary() {
  const S = "Inicio (panel)";
  await makeGuest(`panel${stamp}`); // the panel hides the answer bar and legend while nobody is on the list
  const open = async () => { await go(page, "/inicio"); await sleep(1200); };
  const celebration = async () => (await host("GET", `/celebrations/${C}`)).json;
  /** Same celebration read, but as published: the panel's branches after publishing are driven by the real guests, requests and reservations. */
  const asPublished = async () => page.route(new RegExp(`/celebrations/${C}$`), async (route) => { if (route.request().method() !== "GET") return route.continue(); const real = await route.fetch(); const body = await real.json(); await route.fulfill({ response: real, json: { ...body, status: "PUBLISHED" } }); });
  await matrix.check(S, "contadores", "VALIDO coinciden con GET guest-summary", async () => {
    // The summary is a read model: compare the screen with the API once both settled (the guest made above takes a few seconds to count).
    const read = async (id) => Number((await tid(page, id).getAttribute("aria-label")).split(": ")[1]); let data;
    for (let attempt = 0; attempt < 8; attempt += 1) { await open(); data = (await host("GET", `${G}/guest-summary`)).json; if ((await read("count-total")) === data.total) break; await sleep(2000); }
    assert.equal(await read("count-total"), data.total); assert.equal(await read("count-confirmed"), data.confirmed); assert.equal(await read("count-pending"), data.pending); return `total=${data.total} confirmed=${data.confirmed}`;
  });
  await matrix.check(S, "siguiente paso", "VALIDO borrador: 'Publica tu invitación' (o 'Termina…' si falta algo) y lleva a Publicar", async () => {
    const draft = (await celebration()).status === "DRAFT"; if (!draft) return "el mundo ya esta publicado: rama cubierta por las pruebas de componente y por 'publicado' abajo";
    await open(); await tid(page, "next-step").waitFor(); assert.match(await tid(page, "next-step").innerText(), /Publica tu invitación|Termina tu invitación/);
    assert.match(await tid(page, "next-step").innerText(), /no pueden abrirla ni responder|para poder publicarla/); /* the draft state is now said by the next-step band itself (the old "step-published" row was a repeat) */ await tid(page, "next-step-action").click(); await page.waitForURL((u) => u.pathname === "/publicar");
  });
  await matrix.check(S, "siguiente paso", "VALIDO publicado con solicitudes abiertas: 'Revisa N solicitud(es)' lleva a Acompañantes", async () => {
    await newRequest("panel"); await asPublished(); await open(); await tid(page, "next-step").waitFor(); assert.match(await tid(page, "next-step").innerText(), /Revisa \d+ solicitud/);
    await tid(page, "next-step-action").click(); await page.waitForURL((u) => u.pathname === "/bandeja/acompanantes"); await unrouteAll();
  });
  await matrix.check(S, "Ver quién viene", "VALIDO enlace tranquilo a la lista; sin botones duplicados de Ver reporte / Ver invitados", async () => {
    await open(); assert.equal(await button(page, "Ver reporte").count(), 0)
    await button(page, "Ver quién viene").click(); await page.waitForURL((u) => u.pathname === "/invitados");
  });
  await matrix.check(S, "Actualizar", "ERROR red/429/503 con reintento; relee", async () => {
    for (const [mode, expected] of [["abort", /No hay conexión/], [429, /demasiadas solicitudes/], [503, /no está disponible/]]) { await page.route(/guest-summary/, (route) => (mode === "abort" ? route.abort("failed") : route.fulfill(problem(mode)))); await go(page, "/inicio"); await text(page, expected).waitFor({ timeout: 20000 }); await unrouteAll(); await button(page, "Reintentar").first().click(); await tid(page, "count-total").waitFor(); }
    await open(); const reads = track(page, isCall("GET", /guest-summary/)); await button(page, "Actualizar").click(); await sleep(700); assert.ok(reads.count() >= 1); reads.stop();
  });
}

const sections = { form, list, detail, groups, import: importSection, report, requests, notifications, preferences, push, settings, summary };
for (const [name, run] of Object.entries(sections)) { if (!wanted(name)) continue; console.log(`\n== ${name}`); try { await run(); } catch (error) { console.log(`  SECTION ERROR ${name}: ${error.message}`); matrix.rows.push({ screen: name, button: "*", scenario: "section", status: "FAIL", evidence: error.message.slice(0, 200) }); } await unrouteAll().catch(() => undefined); }
if (errors.length) { console.log("\nconsole/page errors:"); for (const e of [...new Set(errors)].slice(0, 10)) console.log("  ", e.slice(0, 200)); }
const failed = matrix.finish(process.env.OUT);
await browser.close();
process.exit(failed === 0 && errors.filter((e) => e.startsWith("pageerror")).length === 0 ? 0 : 1);
