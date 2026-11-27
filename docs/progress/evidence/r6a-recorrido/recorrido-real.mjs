// R6a · recorrido real: Chrome (Playwright) -> seo-web (next start) -> gateway Kong -> servicios reales (Docker, proyecto compose `walk6a`).
// Crea sus datos por la API (proveedor, servicios, anfitrión, celebración, lista de regalos). Únicos accesos directos a la base, declarados:
//   (1) provider_db: el PRODUCTO se marca COMPLETE/publicado porque exigir FOTO necesita MinIO (imagen no disponible en el sandbox);
//   (2) lectura de logs de los contenedores (`docker logs`).
// Uso: GATEWAY_URL=http://127.0.0.1:59000 SITE_URL=http://localhost:3100 PG_CONTAINER=walk6a-postgres-1 ADMIN_PASSWORD_FILE=... \
//      PLAYWRIGHT_MODULE=/ruta/node_modules/playwright/index.mjs node recorrido-real.mjs
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GW = process.env.GATEWAY_URL ?? 'http://127.0.0.1:59000';
const SITE = process.env.SITE_URL ?? 'http://localhost:3100';
const PG = process.env.PG_CONTAINER ?? 'walk6a-postgres-1';
const PROJECT = process.env.COMPOSE_PROJECT ?? 'walk6a';
const SITE_LOG = process.env.SITE_LOG_FILE ?? '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'walk-admin2@example.test';
const ADMIN_PASSWORD = readFileSync(process.env.ADMIN_PASSWORD_FILE ?? '/var/tmp/walk6a/admin.pw', 'utf8').trim();
const TTL_SECONDS = Number(process.env.GIFT_LEAD_CONTEXT_TTL_SECONDS ?? 60);
const SKEW_SECONDS = 60; // LEAD_CONTEXT_SKEW_SECONDS de platform-auth
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(here);
mkdirSync(SHOTS, { recursive: true });
// Chrome real; el UA por defecto de headless contiene "HeadlessChrome" y Provider lo clasifica `bot` (BOT_PATTERN), así que se fija el UA de un Chrome de escritorio.
const CHROME_UA = (version) => `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.split('.')[0]}.0.0.0 Safari/537.36`;

const results = [];
const record = (caso, nombre, ok, observado) => { results.push({ caso, nombre, ok, observado }); console.log(`${ok ? 'OK   ' : 'FALLA'} [${caso}] ${nombre} :: ${typeof observado === 'string' ? observado : JSON.stringify(observado)}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, opts = {}, attempt = 0) {
  const { token, body, headers = {}, ifMatch } = opts;
  const r = await fetch(GW + path, { method, redirect: 'manual', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(ifMatch !== undefined ? { 'if-match': `"${ifMatch}"` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 429 && attempt < 8 && path.startsWith('/identity')) { await sleep((Number(r.headers.get('retry-after')) || 5) * 1000 + 500); return call(method, path, opts, attempt + 1); }
  const t = await r.text(); let b; try { b = t ? JSON.parse(t) : undefined; } catch { b = t; }
  return { status: r.status, headers: r.headers, body: b };
}
async function register(role, label) {
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`; const password = `Aa1-${randomUUID()}`;
  const r = await call('POST', '/identity/auth/register', { body: { email, password, ...(role ? { role } : {}) } });
  assert.equal(r.status, 201, `register ${label}: ${r.status}`);
  return { token: r.body.accessToken, email, password };
}
const psql = (statement) => execFileSync('docker', ['exec', PG, 'psql', '-U', 'postgres', '-d', 'provider_db', '-tAc', statement], { encoding: 'utf8' }).trim();
const listingBody = (n, type) => ({ type, category: 'DECORATION', city: 'cochabamba', titles: { 'es-BO': `${type === 'PRODUCT' ? 'Producto' : 'Servicio'} de recorrido ${n}` }, destinations: { OFFICIAL_SITE: `https://tienda-recorrido.example/p${n}` }, fulfillment: { responsible: 'PROVIDER', coverageZones: ['Cochabamba'], leadTimeDays: 2, transportCostMinor: 0, conditions: { 'es-BO': 'Anticipo.' } }, priceFromMinor: 25000 });

// ---------- Datos de prueba por la API ----------
const SERVICES = 8;
const prov = await register('PROVIDER', 'prov');
const provider = await call('POST', '/providers', { token: prov.token, body: { name: 'Proveedor Recorrido' } });
assert.equal(provider.status, 201);
const providerId = provider.body.id;
const services = [];
for (let n = 1; n <= SERVICES; n += 1) {
  const l = await call('POST', `/providers/${providerId}/listings`, { token: prov.token, body: listingBody(n, 'SERVICE') });
  assert.equal(l.status, 201, JSON.stringify(l.body));
  const p = await call('POST', `/providers/${providerId}/listings/${l.body.id}/publish`, { token: prov.token });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  services.push(l.body.id);
}
const product = await call('POST', `/providers/${providerId}/listings`, { token: prov.token, body: listingBody(99, 'PRODUCT') });
assert.equal(product.status, 201);
const productId = product.body.id;
assert.equal((await call('POST', `/providers/${providerId}/submit`, { token: prov.token })).status, 200);
const admin = await call('POST', '/identity/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
assert.equal(admin.status, 200);
assert.ok((JSON.parse(Buffer.from(admin.body.accessToken.split('.')[1], 'base64url').toString()).roles ?? []).includes('ADMIN'), 'la cuenta bootstrap debe ser ADMIN');
const verified = await call('POST', `/providers/${providerId}/verify`, { token: admin.body.accessToken });
assert.equal(verified.status, 200, JSON.stringify(verified.body));
assert.equal(psql(`UPDATE listing SET published=true, published_at=now(), completeness='COMPLETE', missing='{}' WHERE id='${productId}' AND type='PRODUCT' RETURNING 1`).split('\n')[0], '1');

const host = await register(null, 'host');
const slug = `recorrido-${randomUUID().slice(0, 8)}`;
const celebration = await call('POST', '/celebrations', { token: host.token, body: { slug, eventTypeCode: 'WEDDING', supportedLocales: ['es-BO'], content: { title: 'Boda de recorrido', eventDate: new Date(Date.now() + 86_400_000 * 30).toISOString(), venueName: 'Hacienda', hosts: { BRIDE: 'Ana', GROOM: 'Luis' } } } });
assert.equal(celebration.status, 201, JSON.stringify(celebration.body));
const celebrationId = celebration.body.id;
const settings = await call('PUT', `/celebrations/${celebrationId}/settings`, { token: host.token, ifMatch: celebration.body.version, body: { giftReservationMode: 'RESTRICTED', externalGiftMode: 'RESTRICTED', partnerPriorityEnabled: false, rsvpDeadline: '2099-12-10T23:59:00-04:00' } });
assert.equal(settings.status, 200, JSON.stringify(settings.body));
assert.equal((await call('POST', `/celebrations/${celebrationId}/publish`, { token: host.token, ifMatch: settings.body.version })).status, 200);
const gifts = `/gifts/celebrations/${celebrationId}`;
assert.equal((await call('POST', `${gifts}/gift-list`, { token: host.token })).status, 201);
const item = await call('POST', `${gifts}/items`, { token: host.token, body: { source: 'CATALOGED', title: 'Producto de recorrido 99', price: { amountMinor: 25000, currency: 'BOB' }, productListingId: productId } });
assert.equal(item.status, 201, JSON.stringify(item.body));
console.log(`datos: proveedor ${providerId}, celebración ${celebrationId}, ${SERVICES} servicios + 1 producto`);

const memberList = async () => { const r = await call('GET', `${gifts}/items`, { token: host.token }); assert.equal(r.status, 200); assert.ok(r.body.leadContext, 'Gift debe emitir leadContext al miembro'); return r.body; };
const guestView = await call('GET', `${gifts}/items`);
const issued = [];
const issueCtx = async () => { const body = await memberList(); issued.push({ ctx: body.leadContext, at: Date.now() }); return body; };
const listA = await issueCtx(); const ctxA = listA.leadContext;
const ctxB = (await issueCtx()).leadContext;
const ctxC = (await issueCtx()).leadContext; const ctxCAt = Date.now();
const leads = async () => (await call('GET', `/providers/${providerId}/leads?limit=200`, { token: prov.token })).body.items;
const leadOf = async (correlationId) => (await leads()).find((l) => l.correlationId === correlationId);
const correlationOf = (location) => new URL(location).searchParams.get('correlationId');

// forjados: firma válida con OTRA clave (forma correcta), firma alterada de un token real, y vencido por HMAC con clave ajena
const forgedKey = randomBytes(32);
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const forge = (iat, exp) => { const payload = b64u(JSON.stringify({ rel: 'MEMBER', c: celebrationId, a: b64u(randomBytes(16)), iat, exp })); return `v1.${payload}.${b64u(createHmac('sha256', forgedKey).update('x').update(payload).digest())}`; };
const nowS = Math.floor(Date.now() / 1000);
const ctxForged = forge(nowS, nowS + 300);
const tamper = (ctx) => { const i = ctx.length - 5; return ctx.slice(0, i) + (ctx[i] === 'A' ? 'B' : 'A') + ctx.slice(i + 1); };
const ctxTampered = tamper(ctxB);

// ---------- Navegador ----------
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const version = browser.version();
const context = await browser.newContext({ locale: 'es-BO', userAgent: CHROME_UA(version), deviceScaleFactor: 2, viewport: { width: 1280, height: 900 } });
const partnerRequests = [];
context.on('request', (r) => { if (r.url().startsWith('https://tienda-recorrido.example/')) partnerRequests.push(r.url()); });
const page = await context.newPage();

/**
 * Navega como un clic. El primer salto (/r, 302) se lee de la respuesta del propio navegador. El destino del proveedor es un dominio ficticio y el
 * sandbox no tiene salida a internet, así que la carga final falla con ERR_TUNNEL_CONNECTION_FAILED: se registra, no se oculta.
 */
async function visit(url) {
  const hops = [];
  const onResponse = (r) => { if (r.url().startsWith(`${SITE}/r/`)) hops.push(r); };
  page.on('response', onResponse);
  let navigationError = null;
  try { await page.goto(url, { waitUntil: 'load' }); } catch (error) { navigationError = String(error.message).split('\n')[0].replace(/ at http.*/, ''); }
  page.off('response', onResponse);
  const first = hops[0];
  assert.ok(first, `sin respuesta de /r para ${url.replace(/ctx=.*/, 'ctx=…')}`);
  return { firstStatus: first.status(), location: first.headers()['location'], noStore: first.headers()['cache-control'], navigationError };
}
const rUrl = (listingId, extra = {}) => `${SITE}/r/${listingId}?${new URLSearchParams({ destination: 'OFFICIAL_SITE', surface: 'GIFT_LIST', celebrationId, ...extra })}`;
const leadSummary = (l) => l && ({ valid: l.valid, billable: l.billable, invalidReason: l.invalidReason ?? null, surface: l.context?.surface });

// ---------- Caso 5a/1a: clic real del anfitrión desde la página de regalos ----------
// La página pública lee la lista con la credencial del invitado (Gift devuelve leadContext null). Para ejercitar el clic de un MIEMBRO se responde
// a esa lectura con la lectura REAL del anfitrión (misma respuesta del servicio, ctx firmado por Gift); es el único dato interceptado.
await page.route('**/gifts/celebrations/*/items*', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': new URL(SITE).origin, 'access-control-allow-credentials': 'true' }, body: JSON.stringify(listA) }));
await page.goto(`${SITE}/c/${slug}/regalos`, { waitUntil: 'networkidle' });
const link = page.locator('a.gift-partner-link');
await link.first().waitFor({ state: 'visible' });
const domLinks = await page.locator('a[href^="/r/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
const html = await page.content();
const noCtxInDom = domLinks.length >= 1 && domLinks.every((h) => !/ctx=/.test(h)) && !html.includes(ctxA) && !html.includes('ctx=');
record(5, 'el href del DOM de la página de regalos no contiene ctx (el miembro tiene ctx en la lectura)', noCtxInDom, { enlaces: domLinks.map((h) => h.replace(celebrationId, '<celebracion>').replace(productId, '<producto>')), htmlContieneCtx: html.includes(ctxA) });
await link.first().scrollIntoViewIfNeeded();
await page.locator('li, article, section').filter({ has: link.first() }).last().screenshot({ path: join(SHOTS, '01-regalos-enlace-sin-ctx-1280.png') }).catch(async () => { await link.first().screenshot({ path: join(SHOTS, '01-regalos-enlace-sin-ctx-1280.png') }); });
const hrefBefore = await link.first().getAttribute('href');
const hrefChecks = [];
const [clickRequest] = await Promise.all([
  page.waitForRequest((r) => r.url().startsWith(`${SITE}/r/`)),
  link.first().click(),
  page.waitForEvent('requestfailed', { predicate: (r) => r.url().startsWith('https://tienda-recorrido.example/'), timeout: 15000 }).catch(() => undefined)
]);
let first = clickRequest; while (first.redirectedFrom()) first = first.redirectedFrom();
const clickResp = await first.response();
const clickLoc = clickResp.headers()['location'];
const clickLead = await leadOf(correlationOf(clickLoc));
record(1, 'clic real del anfitrión (con ctx) en /r/{productoId}: redirige 302 al destino y el lead queda inválido HOST_OR_PLANNER, no cobrable', clickResp.status() === 302 && clickLead?.valid === false && clickLead?.billable === false && clickLead?.invalidReason === 'HOST_OR_PLANNER', { status: clickResp.status(), ctxEnLaPeticionDelNavegador: new URL(clickRequest.url()).searchParams.has('ctx'), ctxEnLocation: /ctx/.test(clickLoc), navegoAlDestino: partnerRequests.map((u) => u.replace(/\?.*/, '')), lead: leadSummary(clickLead) });
record(5, 'la cabecera Location del 302 y la URL del destino no llevan ctx', !/ctx/.test(clickLoc) && !partnerRequests.some((u) => /ctx/.test(u)), { location: clickLoc.replace(/correlationId=[0-9a-f-]+/, 'correlationId=<id>') });
record('5-href', 'el href del enlace no cambió tras el clic (nunca llevó ctx)', hrefBefore === (await (async () => { await page.goBack(); await link.first().waitFor({ state: 'visible' }); return link.first().getAttribute('href'); })()), { href: hrefBefore.replace(celebrationId, '<celebracion>').replace(productId, '<producto>') });

// ---------- Caso 1b: navegación directa con ctx real fresco ----------
{
  const v = await visit(rUrl(services[0], { ctx: ctxB }));
  const l = await leadOf(correlationOf(v.location));
  record(1, 'ctx real de miembro en un servicio (navegación directa a /r): 302, lead HOST_OR_PLANNER', v.firstStatus === 302 && l?.invalidReason === 'HOST_OR_PLANNER' && l?.billable === false, { status: v.firstStatus, cacheControl: v.noStore, destinoNoAlcanzable: v.navigationError, lead: leadSummary(l) });
}
// ---------- Control: visitante sin ctx ----------
{
  const v = await visit(rUrl(services[1]));
  const l = await leadOf(correlationOf(v.location));
  record('control', 'sin ctx, superficie GIFT_LIST: 302 y lead válido y cobrable (línea base)', v.firstStatus === 302 && l?.valid === true && l?.billable === true, { status: v.firstStatus, lead: leadSummary(l) });
}
// ---------- Caso 2: ctx falso / alterado / vencido ----------
for (const [i, [nombre, ctx]] of [['falso (firmado con otra clave)', ctxForged], ['alterado (firma modificada)', ctxTampered]].entries()) {
  const v = await visit(rUrl(services[2 + i], { ctx }));
  const l = await leadOf(correlationOf(v.location));
  record(2, `ctx ${nombre}: redirige igual y el lead se evalúa como visitante normal (válido)`, v.firstStatus === 302 && l?.valid === true && l?.billable === true, { status: v.firstStatus, lead: leadSummary(l) });
}
// ---------- Caso 3: PREVIEW sin token ----------
{
  const v = await visit(rUrl(services[4], { surface: 'PREVIEW' }));
  const l = await leadOf(correlationOf(v.location));
  record(3, 'surface=PREVIEW sin token: redirige y se evalúa como un clic normal (válido, cobrable), como dicen los comentarios del FE (M-2)', v.firstStatus === 302 && l?.valid === true && l?.billable === true, { status: v.firstStatus, lead: leadSummary(l) });
}
// ---------- Caso 4: ctx de más de 512 caracteres ----------
{
  const big = ctxA + 'A'.repeat(520 - ctxA.length); // 520 caracteres, forma imprimible
  const direct = await call('GET', `/r/${services[5]}?surface=GIFT_LIST&celebrationId=${celebrationId}&ctx=${big}`, { headers: { 'user-agent': CHROME_UA(version) } });
  const v = await visit(rUrl(services[6], { ctx: big }));
  const l = await leadOf(correlationOf(v.location));
  record(4, `ctx de ${big.length} caracteres: el FE lo descarta y redirige; el lead se evalúa normal (válido)`, v.firstStatus === 302 && l?.valid === true && l?.billable === true && direct.status === 422, { fe: { status: v.firstStatus, lead: leadSummary(l) }, contraste: `la misma petición directa al backend (sin el filtro del FE) responde ${direct.status} ${direct.body?.code ?? ''}` });
  const edge = ctxA + 'A'.repeat(512 - ctxA.length);
  const v512 = await visit(rUrl(services[7], { ctx: edge }));
  const l512 = await leadOf(correlationOf(v512.location));
  record(4, 'ctx de exactamente 512 caracteres (frontera, no verificable): redirige y el lead es normal', v512.firstStatus === 302 && l512?.valid === true, { status: v512.firstStatus, lead: leadSummary(l512) });
}
// ---------- Caso 5b: páginas de error ----------
{
  const probes = [
    ['404 (listing inexistente)', `${SITE}/r/${randomUUID()}?surface=GIFT_LIST&celebrationId=${celebrationId}&ctx=${ctxC}`, 404, 'light'],
    ['400 (celebrationId inválido, backend 422)', `${SITE}/r/${services[0]}?surface=GIFT_LIST&celebrationId=no-es-uuid&ctx=${ctxC}`, 400, 'dark']
  ];
  for (const [nombre, url, status, scheme] of probes) {
    const small = await browser.newContext({ locale: 'es-BO', userAgent: CHROME_UA(version), deviceScaleFactor: 2, viewport: { width: 360, height: 640 }, colorScheme: scheme });
    const p = await small.newPage();
    const resp = await p.goto(url, { waitUntil: 'load' });
    await p.waitForFunction(() => !new URL(location.href).searchParams.has('ctx'), null, { timeout: 5000 }).catch(() => undefined);
    const shownUrl = p.url(); const body = await p.content();
    record(5, `página de error ${nombre}: estado ${status}, sin ctx en la URL visible ni en el HTML`, resp.status() === status && !/ctx=/.test(shownUrl) && !body.includes(ctxC) && (resp.headers()['x-robots-tag'] ?? '').includes('noindex'), { status: resp.status(), urlTrasCarga: shownUrl.replace(celebrationId, '<celebracion>').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<uuid>'), cacheControl: resp.headers()['cache-control'] });
    await p.screenshot({ path: join(SHOTS, `0${status === 404 ? 2 : 3}-error-${status}-sin-ctx-360-${scheme}.png`) });
    await small.close();
  }
}
// ---------- Caso 2c: ctx real vencido ----------
{
  const wait = ctxCAt + (TTL_SECONDS + SKEW_SECONDS + 5) * 1000 - Date.now();
  if (wait > 0) { console.log(`esperando ${Math.ceil(wait / 1000)} s a que venza el ctx real (TTL ${TTL_SECONDS} s + tolerancia ${SKEW_SECONDS} s)`); await sleep(wait); }
  const extra = await call('POST', `/providers/${providerId}/listings`, { token: prov.token, body: listingBody(100, 'SERVICE') });
  assert.equal((await call('POST', `/providers/${providerId}/listings/${extra.body.id}/publish`, { token: prov.token })).status, 200);
  const v = await visit(rUrl(extra.body.id, { ctx: ctxC }));
  const l = await leadOf(correlationOf(v.location));
  record(2, `ctx real vencido (emitido hace ${Math.round((Date.now() - ctxCAt) / 1000)} s, TTL ${TTL_SECONDS} s): redirige igual y el lead se evalúa normal (válido)`, v.firstStatus === 302 && l?.valid === true && l?.billable === true, { status: v.firstStatus, lead: leadSummary(l) });
}
await browser.close();

// ---------- Caso 6: logs ----------
{
  const names = execFileSync('docker', ['ps', '-a', '--filter', `name=${PROJECT}-`, '--format', '{{.Names}}'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const logs = Object.fromEntries(names.map((n) => [n, execFileSync('docker', ['logs', n], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })]));
  // docker logs separa stdout y stderr: execFileSync solo devuelve stdout; se vuelve a pedir uniendo stderr.
  for (const n of names) logs[n] += '\n' + execFileSync('sh', ['-c', `docker logs ${n} 2>&1 >/dev/null`], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (SITE_LOG) logs['seo-web (next start)'] = readFileSync(SITE_LOG, 'utf8');
  const tokens = [...new Set([...issued.map((i) => i.ctx), ctxForged, ctxTampered])];
  const pieces = tokens.flatMap((t) => t.split('.').slice(1)).filter((s) => s.length >= 20);
  const needles = { 'ctx completo': tokens, 'carga o firma del ctx': pieces, 'parámetro ctx=': ['ctx='], 'prefijo v1.eyJ': ['v1.eyJ'], 'correo de prueba (@example.test)': ['@example.test'], 'nombres de la celebración (Ana/Luis)': ['Ana', 'Luis'], 'contraseñas de prueba': [prov.password, host.password, ADMIN_PASSWORD], 'tokens de acceso': [prov.token, host.token, admin.body.accessToken] };
  // Los detalles de violación de unicidad de Postgres («Key (email)=(…) already exists») vienen de registrar dos veces la cuenta ADMIN de arranque al preparar el stack, no del flujo de /r: se cuentan aparte.
  const duplicateKey = /Key \(email\)=\([^)]*\) already exists/g;
  const table = {};
  const info = {};
  for (const [name, text] of Object.entries(logs)) {
    const scanned = text.replace(duplicateKey, '');
    info[name] = (text.match(duplicateKey) ?? []).length;
    table[name] = { lineas: text.split('\n').length, ...Object.fromEntries(Object.entries(needles).map(([k, list]) => [k, list.reduce((n, s) => n + (s ? scanned.split(s).length - 1 : 0), 0)])) };
  }
  const leaks = Object.entries(table).flatMap(([svc, row]) => ['ctx completo', 'carga o firma del ctx', 'parámetro ctx=', 'prefijo v1.eyJ', 'contraseñas de prueba', 'tokens de acceso'].filter((k) => row[k] > 0).map((k) => `${svc}: ${k}=${row[k]}`));
  record(6, 'los logs de los servicios (docker logs) y del sitio no muestran el ctx, contraseñas ni tokens de acceso', leaks.length === 0, leaks.length ? leaks : 'sin coincidencias');
  const pii = Object.entries(table).flatMap(([svc, row]) => ['correo de prueba (@example.test)', 'nombres de la celebración (Ana/Luis)'].filter((k) => row[k] > 0).map((k) => `${svc}: ${k}=${row[k]}`));
  record('6-pii', 'sin correos ni nombres de prueba en los logs durante el recorrido de /r (se excluyen los detalles de clave duplicada de Postgres, ver info)', pii.length === 0, pii.length ? pii : { coincidencias: 'ninguna', infoClaveDuplicadaPostgres: Object.fromEntries(Object.entries(info).filter(([, n]) => n > 0)) });
  writeFileSync(join(SHOTS, 'logs-conteo.json'), JSON.stringify(table, null, 2));
  record('6-fuentes', 'contenedores revisados', true, Object.keys(logs));
}

writeFileSync(join(SHOTS, 'resultados.json'), JSON.stringify({ fecha: new Date().toISOString(), navegador: `Chromium ${version}`, ttlCtxSegundos: TTL_SECONDS, vistaInvitado: { status: guestView.status }, resultados: results }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} OK`);
process.exit(failed.length ? 1 : 0);
