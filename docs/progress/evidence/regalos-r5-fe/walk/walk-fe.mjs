// R5 FE · browser walk: Chrome for Testing against the public site (Next, production build) in front of the REAL gift-list-service and provider-catalog-service
// (built from RSVPBackend 609462f3) and PostgreSQL 17.6. Celebration and Guest are the small stub of stub.mjs; the gateway is the path router of gw.mjs, NOT Kong.
// Outbound partner hosts (wa.me, partner.example) are not reachable from here: the walk asks the REAL /r of the site for the 302 without following it (maxRedirects 0), records its Location and answers the page with a stand-in.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const SITE = 'http://127.0.0.1:3120';
const F = JSON.parse(readFileSync('fixture.json', 'utf8'));
const SHOTS = 'shots'; mkdirSync(SHOTS, { recursive: true });
const out = [];
let failed = 0;
const check = (ok, label, detail = '') => { out.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n      ${detail}` : ''}`); if (!ok) failed += 1; };
const API = async (path, { token, method = 'GET', body, headers = {} } = {}) => {
  const r = await fetch(`${SITE}${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  return { status: r.status, json: text ? JSON.parse(text) : undefined };
};
const rowOf = async (items, id) => (await items).json.items.find((i) => i.id === id);
const list = (guest) => API(`/gifts/celebrations/${F.cid}/items`, { token: F.guests[guest] });

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const partnerHits = [];
async function guestContext(guest, { viewport = { width: 390, height: 844 }, locale = 'es-BO', colorScheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport, locale, colorScheme, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
  await context.route(/\/r\/[0-9a-f-]{36}\?/, async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const location = response.headers()['location'] ?? '';
    partnerHits.push({ guest, status: response.status(), url: location });
    await route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><title>partner</title><p>Partner stand-in: ${location.replace(/[<>&]/g, '')}</p>` });
  });
  const page = await context.newPage();
  return { context, page };
}
const open = async (page, guest, lang = 'es-BO') => {
  await page.goto(`${SITE}/c/ana-y-luis/regalos?lang=${lang}#t=${F.guests[guest]}`);
  await page.waitForSelector('[data-gift-id]');
};
const reopen = async (page, lang = 'es-BO') => { await page.goto(`${SITE}/c/ana-y-luis/regalos?lang=${lang}`); await page.waitForSelector('[data-gift-id]'); };
const row = (page, id) => page.locator(`[data-gift-id="${id}"]`);

// ---------------------------------------------------------------- 1. units, WhatsApp through /r, «¿Compraste?»
out.push('--- 1. Ana: «Faltan 12 de 12», 3 unidades, «Pedir por WhatsApp» por /r, vuelve y «Sí» reserva');
{
  const { context, page } = await guestContext('ana');
  await open(page, 'ana');
  const plain = row(page, F.plainId);
  check((await plain.getByTestId(`gift-units-${F.plainId}`).textContent()) === 'Faltan 12 de 12', 'la tarjeta dice «Faltan 12 de 12»');
  check((await plain.getByTestId(`gift-price-${F.plainId}`).textContent()).includes('450'), 'precio vigente Bs 450 en la tarjeta');
  await plain.getByTestId(`units-${F.plainId}-more`).click(); await plain.getByTestId(`units-${F.plainId}-more`).click();
  check((await plain.getByTestId(`units-${F.plainId}-value`).textContent()) === '3', 'el selector de unidades marca 3');
  const store = plain.getByRole('link', { name: 'Ver en la tienda' }); const wa = plain.getByRole('link', { name: 'Pedir por WhatsApp' });
  check((await store.count()) === 1 && (await wa.count()) === 1, 'dos botones: «Ver en la tienda» y «Pedir por WhatsApp»');
  const hrefs = await Promise.all([store, wa].map((l) => l.getAttribute('href')));
  check(hrefs.every((h) => h.startsWith('/r/') && !/^https?:/.test(h)), 'ningún enlace sale directo al proveedor: los dos van por /r/{listingId}', hrefs.join(' | '));
  await page.screenshot({ path: `${SHOTS}/01-lista-390-claro-es.png`, fullPage: true });
  const before = partnerHits.length;
  await Promise.all([page.waitForURL(/\/r\/[0-9a-f-]{36}\?/), wa.click()]);
  const hit = partnerHits.slice(before).find((h) => h.url.startsWith('https://wa.me/'));
  const url = new URL(hit.url);
  const text = url.searchParams.get('text') ?? '';
  out.push(`      wa.me URL: ${url.origin}${url.pathname}?${[...url.searchParams.keys()].join('&')}`);
  out.push(`      texto: ${text}`);
  check(hit.status === 302 && url.pathname === '/59170000000' && [...url.searchParams.keys()].join() === 'text', 'wa.me con solo el parámetro text (sin utm_* ni correlationId)');
  check(/^Hola Tortas Walk \d+, vengo de DOne\. Quiero regalar Vajilla Walk R5 × 3, precio Bs 450, para Boda de Ana y Luis el 12 de diciembre de 2026\.$/.test(text), 'el texto exacto: proveedor, producto × 3, precio vigente, celebración y fecha en su zona');
  check(!/Ana|ana|wg[A-Za-z0-9]{10}/.test(text.replace('Boda de Ana y Luis', '')), 'PF-1: el mensaje no lleva datos del invitado (ni nombre ni credencial)');
  const stored = await page.evaluate(() => localStorage.getItem('rsvp.gift.purchase.v1'));
  check(stored !== null && Object.keys(JSON.parse(stored)[F.plainId] ?? {}).sort().join() === 'at,destination,giftItemId,phase,units', 'el intento se guardó en este navegador (id, botón, unidades, hora) y nada más');
  await page.goBack();
  await page.waitForSelector(`[data-testid="gift-prompt-${F.plainId}"]`);
  const heading = await page.getByTestId(`gift-prompt-${F.plainId}`).getByRole('heading').textContent();
  check(heading === '¿Compraste 3 × Vajilla Walk R5?', 'al volver aparece «¿Compraste 3 × Vajilla Walk R5?»', heading);
  await page.screenshot({ path: `${SHOTS}/02-compraste-390-claro-es.png`, fullPage: true });
  await page.getByTestId(`prompt-yes-${F.plainId}`).click();
  check((await page.getByTestId(`units-${F.plainId}-value`).textContent()) === '3', '«Sí» abre la reserva con las 3 unidades');
  await page.getByTestId('reserve-confirm').click();
  await page.waitForSelector('[data-testid="gift-reserved"]');
  const afterAna = await rowOf(list('beto'), F.plainId);
  check(afterAna.unitsReserved === 3 && afterAna.unitsLeft === 9 && afterAna.status === 'AVAILABLE', 'Gift: 3 reservadas, quedan 9 y el regalo sigue disponible', JSON.stringify({ unitsReserved: afterAna.unitsReserved, unitsLeft: afterAna.unitsLeft, status: afterAna.status }));
  await context.close();
}

// ---------------------------------------------------------------- 2. «2 de 12»: la reserva del criterio de aceptación
out.push('--- 2. Beto: reserva 2 de 12 y ve «Faltan 7 de 12»');
{
  const { context, page } = await guestContext('beto');
  await open(page, 'beto');
  const plain = row(page, F.plainId);
  check((await plain.getByTestId(`gift-units-${F.plainId}`).textContent()) === 'Faltan 9 de 12', 'Beto ve «Faltan 9 de 12» (las 3 de Ana)');
  await plain.getByTestId(`units-${F.plainId}-more`).click();
  await plain.getByTestId(`reserve-${F.plainId}`).click();
  await page.getByLabel('Tu nombre (opcional)').fill('Beto');
  await page.getByTestId('reserve-show-name').check();
  await page.getByTestId('reserve-confirm').click();
  await page.waitForSelector('[data-testid="gift-reserved"]');
  const r = await rowOf(list('carla'), F.plainId);
  check(r.unitsReserved === 5 && r.unitsLeft === 7, 'Gift: 5 reservadas entre Ana y Beto, quedan 7', JSON.stringify({ unitsReserved: r.unitsReserved, unitsLeft: r.unitsLeft }));
  check(!JSON.stringify(r).includes(F.guests.ana) && !('guestId' in r) && !('phone' in r) && !('email' in r), 'PF-1: lo que ve otro invitado no lleva ids, teléfonos ni correos de los demás');
  await context.close();
}

// ---------------------------------------------------------------- 3. Todavía no: un solo recordatorio
out.push('--- 3. Carla: «Ver en la tienda», vuelve, «Todavía no», un recordatorio y luego nada');
{
  const { context, page } = await guestContext('carla');
  await open(page, 'carla');
  const plain = row(page, F.plainId);
  await Promise.all([page.waitForURL(/\/r\/[0-9a-f-]{36}\?/), plain.getByRole('link', { name: 'Ver en la tienda' }).click()]);
  check(partnerHits.some((h) => h.guest === 'carla' && h.url.startsWith('https://partner.example/vajilla') && h.url.includes('utm_') && h.url.includes('correlationId')), '«Ver en la tienda» llega a la tienda del proveedor con utm_* y correlationId (solo WhatsApp va limpio)');
  await page.goBack();
  await page.waitForSelector(`[data-testid="prompt-later-${F.plainId}"]`);
  await page.getByTestId(`prompt-later-${F.plainId}`).click();
  check((await page.getByTestId(`gift-prompt-note-${F.plainId}`).textContent()).includes('una vez'), '«Todavía no» confirma el recordatorio único');
  await reopen(page);
  check(await page.getByTestId(`gift-prompt-${F.plainId}`).isVisible(), 'al abrir la lista otra vez aparece el recordatorio');
  check((await page.getByTestId(`gift-prompt-${F.plainId}`).textContent()).includes('una sola vez'), 'el recordatorio lo dice');
  await page.getByTestId(`prompt-later-${F.plainId}`).click();
  await reopen(page);
  check(!(await page.getByTestId(`gift-prompt-${F.plainId}`).isVisible()), 'la tercera vez ya no pregunta');
  await context.close();
}

// ---------------------------------------------------------------- 4. aporte coordinado
out.push('--- 4. Aporte coordinado: Carla coordina, Beto se suma, Ana solo ve conteos');
{
  const carla = await guestContext('carla'); await open(carla.page, 'carla');
  const g = row(carla.page, F.groupId);
  check((await g.getByRole('link', { name: 'Pedir por WhatsApp' }).count()) === 0, 'antes de que alguien coordine, nadie tiene botones del proveedor');
  await g.getByTestId(`reserve-${F.groupId}`).click();
  await carla.page.getByLabel('Tu nombre (opcional)').fill('Carla'); await carla.page.getByTestId('reserve-show-name').check();
  await carla.page.getByTestId('reserve-confirm').click(); await carla.page.waitForSelector('[data-testid="gift-reserved"]');
  await reopen(carla.page);
  check((await row(carla.page, F.groupId).getByRole('link', { name: 'Pedir por WhatsApp' }).count()) === 1, 'el coordinador (Carla) ve los botones del proveedor');
  await carla.page.screenshot({ path: `${SHOTS}/03-coordinadora-390-claro-es.png`, fullPage: true });

  const beto = await guestContext('beto'); await open(beto.page, 'beto');
  const gb = row(beto.page, F.groupId);
  check((await gb.getByTestId(`gift-coordinator-${F.groupId}`).textContent()) === 'Carla lo comprará', 'Beto ve «Carla lo comprará» (ella eligió mostrar su nombre)');
  check((await gb.getByRole('link', { name: 'Pedir por WhatsApp' }).count()) === 0, 'Beto, que aún no se suma, no tiene botones del proveedor');
  await gb.getByTestId(`reserve-${F.groupId}`).click();
  await beto.page.getByLabel('Tu nombre (opcional)').fill('Beto'); await beto.page.getByTestId('reserve-show-name').check();
  await beto.page.getByTestId('reserve-confirm').click(); await beto.page.waitForSelector('[data-testid="gift-reserved"]');
  await reopen(beto.page);
  const gb2 = row(beto.page, F.groupId);
  check((await gb2.getByText('Te sumaste a este regalo').count()) === 1 && (await gb2.getByRole('link', { name: 'Pedir por WhatsApp' }).count()) === 0, 'Beto es aportante: sin botones del proveedor y con «Salirme del regalo»');

  const ana = await guestContext('ana'); await open(ana.page, 'ana');
  const ga = row(ana.page, F.groupId);
  check((await ga.getByTestId(`gift-group-${F.groupId}`).textContent()) === '1 persona aporta', 'Ana ve «1 persona aporta»');
  check((await ga.getByText('Beto').count()) === 0, 'PF-1: Ana no ve el nombre del aportante');
  const apiAna = await rowOf(list('ana'), F.groupId); const apiCarla = await rowOf(list('carla'), F.groupId);
  check(!(apiAna.contributorNames ?? []).length && (apiCarla.contributorNames ?? []).join() === 'Beto', 'API: los nombres de aportantes solo llegan al coordinador', JSON.stringify({ ana: apiAna.contributorNames, carla: apiCarla.contributorNames }));
  await reopen(carla.page);
  check((await row(carla.page, F.groupId).getByTestId(`gift-names-${F.groupId}`).textContent()) === 'Se sumaron: Beto', 'Carla (coordinadora) ve «Se sumaron: Beto», solo el nombre que Beto quiso mostrar');
  await Promise.all([ana.context.close(), beto.context.close(), carla.context.close()]);
}

// ---------------------------------------------------------------- 6. matriz visual + axe real (con contraste)
out.push('--- 5. Matriz 360/768/1280 × claro/oscuro × es-BO/en-US con axe (incluye contraste) sobre la lista con tarjeta, selector y aporte');
const seeded = JSON.stringify({ [F.plainId]: { giftItemId: F.plainId, destination: 'WHATSAPP', units: 2, at: Date.now(), phase: 'away' } });
for (const width of [360, 768, 1280]) for (const colorScheme of ['light', 'dark']) for (const locale of ['es-BO', 'en-US']) {
  const { context, page } = await guestContext('ana', { viewport: { width, height: 900 }, locale, colorScheme });
  await context.addInitScript((value) => { try { if (!localStorage.getItem('rsvp.gift.purchase.v1')) localStorage.setItem('rsvp.gift.purchase.v1', value); } catch {} }, seeded);
  await open(page, 'carla', locale);
  await page.waitForSelector(`[data-testid="gift-prompt-${F.plainId}"], [data-testid="gift-participation-${F.groupId}"]`);
  await page.waitForTimeout(700);
  const horizontal = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const res = await new AxeBuilder({ page }).analyze();
  const serious = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  check(!horizontal && serious.length === 0, `${width}px ${colorScheme} ${locale}: sin scroll horizontal y axe sin violaciones serias o críticas (${res.violations.length} menores)`, serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`).join('; ') + (res.violations.length ? ` · todas: ${res.violations.map((v) => `${v.id}/${v.impact}`).join(',')}` : ''));
  await page.screenshot({ path: `${SHOTS}/m-${width}-${colorScheme}-${locale}.png`, fullPage: true });
  await context.close();
}

// ---------------------------------------------------------------- 5. negativos
out.push('--- 6. Casos negativos contra Gift real');
{
  const r422 = await API(`/gifts/celebrations/${F.cid}/items/${F.plainId}/reservations`, { token: F.guests.ana, method: 'POST', body: { units: 0 }, headers: { 'idempotency-key': crypto.randomUUID() } });
  check(r422.status === 422 && r422.json.code === 'INVALID_UNITS', 'units 0 -> 422 INVALID_UNITS', JSON.stringify(r422.json?.code));
  const none = await API(`/gifts/celebrations/${F.cid}/items/${F.plainId}/reservations`, { method: 'POST', body: { units: 1 } });
  check(none.status === 401, 'reservar sin credencial -> 401', String(none.status));
  const same = await API(`/gifts/celebrations/${F.cid}/items/${F.plainId}/reservations`, { token: F.guests.ana, method: 'POST', body: { units: 1 }, headers: { 'idempotency-key': crypto.randomUUID() } });
  check(same.status === 409 && same.json.code === 'ALREADY_RESERVED', 'Ana ya tiene reserva de este regalo -> 409 ALREADY_RESERVED', JSON.stringify(same.json?.code));
  // the UI path of INSUFFICIENT_UNITS: Carla opens the form for 5 of 7 left; meanwhile somebody takes 6; confirming says only 1 is left (singular).
  const { context, page } = await guestContext('carla');
  await open(page, 'carla');
  const plain = row(page, F.plainId);
  for (let n = 0; n < 4; n += 1) await plain.getByTestId(`units-${F.plainId}-more`).click();
  await plain.getByTestId(`reserve-${F.plainId}`).click();
  const third = 'wg' + Buffer.from('dario'.padEnd(32, 'x')).toString('base64url').slice(0, 41).padEnd(41, 'A');
  const take = await API(`/gifts/celebrations/${F.cid}/items/${F.plainId}/reservations`, { token: third, method: 'POST', body: { units: 6 }, headers: { 'idempotency-key': crypto.randomUUID() } });
  check(take.status === 201, 'otro invitado toma 6 mientras Carla llena el formulario', String(take.status));
  await page.getByLabel('Tu nombre (opcional)').fill('Carla');
  await page.getByTestId('reserve-confirm').click();
  await page.waitForSelector('[data-testid="reserve-error"]');
  const msg = await page.getByTestId('reserve-error').textContent();
  check(msg === 'Ya solo queda 1 unidad. Elige 1 y vuelve a intentarlo.', '409 INSUFFICIENT_UNITS: el formulario dice cuántas quedan y conserva lo escrito', msg);
  check((await page.getByLabel('Tu nombre (opcional)').inputValue()) === 'Carla', 'el nombre escrito sigue ahí');
  await page.screenshot({ path: `${SHOTS}/04-error-unidades-390-claro-es.png`, fullPage: true });
  await context.close();
}

await browser.close();
out.push(failed === 0 ? '\nTODO PASS' : `\n${failed} FALLOS`);
console.log(out.join('\n'));
writeFileSync('salida.txt', out.join('\n') + '\n');
process.exit(failed === 0 ? 0 : 1);
