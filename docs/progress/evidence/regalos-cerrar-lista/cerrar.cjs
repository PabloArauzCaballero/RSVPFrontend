// Playwright (Chromium preinstalado) contra el backend de Gift REAL (ver harness.mjs). Cerrar y reabrir la lista de regalos.
const { chromium } = require('playwright');
const fs = require('node:fs');
const S = require('./state.json');
const OUT = process.env.OUT;
const AXE = '<worktree>/node_modules/axe-core/axe.min.js';
const EXPO = 'http://localhost:8310';
const NEXT = 'http://localhost:3100';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); };
const api = (method, path, token, body) => fetch(`${S.gateway}/gifts${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
const items = async (token) => (await (await api('GET', `/celebrations/${S.celebrationId}/items`, token)).json());
async function axe(page, selector, name) {
  await page.addScriptTag({ path: AXE });
  const violations = await page.evaluate(async (sel) => (await window.axe.run(document.querySelector(sel) ?? document, { rules: { 'color-contrast': { enabled: false } } })).violations.map((v) => `${v.id}:${v.impact}`), selector);
  check(`axe sin violaciones · ${name}`, violations.length === 0, violations.join(','));
}
const text = async (page, id) => (await page.locator(`[data-testid="${id}"]`).innerText()).replace(/\n/g, ' / ');

(async () => {
  const browser = await chromium.launch();
  const t = S.torta;
  // Estado inicial en el backend real: abierta; el invitado puede reservar.
  await api('PUT', `/celebrations/${S.celebrationId}/gift-list/closure`, S.hostToken, { closed: false });
  const approve = await fetch(`${S.gateway}/gifts/celebrations/${S.celebrationId}/reservations/${S.reservationId}/approve`, { method: 'POST', headers: { authorization: `Bearer ${S.hostToken}` } });
  console.log('approve ->', approve.status);

  // ---- Negativos directos contra el backend real ----
  const noToken = await api('PUT', `/celebrations/${S.celebrationId}/gift-list/closure`, null, { closed: true });
  check('backend: sin token -> 401', noToken.status === 401, String(noToken.status));
  const asGuest = await api('PUT', `/celebrations/${S.celebrationId}/gift-list/closure`, S.visitorSecret, { closed: true });
  const asGuestBody = await asGuest.json();
  check('backend: un invitado (credencial de enlace) -> 403 HOST_REQUIRED', asGuest.status === 403 && asGuestBody.code === 'HOST_REQUIRED', `${asGuest.status} ${asGuestBody.code}`);
  check('backend: la lista sigue abierta tras los intentos rechazados', (await items(S.hostToken)).closed === false);

  for (const width of [360, 1280]) {
    const tag = `${width}`;
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-BO' });
    const page = await ctx.newPage();
    await api('PUT', `/celebrations/${S.celebrationId}/gift-list/closure`, S.hostToken, { closed: false });

    await page.goto(`${EXPO}/regalos?c=${S.celebrationId}`, { waitUntil: 'networkidle', timeout: 180000 });
    await page.waitForSelector('[data-testid="gift-closure"]', { timeout: 120000 });
    check(`anfitrión: lista «Abierta» y botón «Cerrar la lista» · ${tag}`, (await text(page, 'gift-closure-status')).toLowerCase().includes('abierta') && (await page.locator('[data-testid="gift-closure-close"]').count()) === 1);
    await page.locator('[data-testid="gift-closure"]').scrollIntoViewIfNeeded();
    await shot(page, `host-abierta-${tag}`);

    // confirmación antes de cerrar: «Mantenerla abierta» no envía nada
    await page.click('[data-testid="gift-closure-close"]');
    await page.waitForSelector('[data-testid="gift-closure-confirm"]');
    check(`confirmación visible antes de cerrar · ${tag}`, (await page.getByText('¿Cerrar la lista de regalos?').count()) === 1);
    await shot(page, `host-confirmar-${tag}`);
    await page.click('[data-testid="gift-closure-keep"]');
    check(`«Mantenerla abierta» no cierra (backend sigue abierto) · ${tag}`, (await items(S.hostToken)).closed === false);

    // 403 HOST_REQUIRED y 409 simulados en la red (el backend real ya se probó arriba): la interfaz los dice y no cambia el estado
    for (const [status, code, expected] of [[403, 'HOST_REQUIRED', /Solo los anfitriones u organizadores/], [409, 'CONFLICT', /Alguien guardó cambios/]]) {
      await page.route('**/gift-list/closure', (route) => route.fulfill({ status, contentType: 'application/problem+json', headers: { 'access-control-allow-origin': 'http://localhost:8310', 'access-control-allow-credentials': 'true' }, body: JSON.stringify({ title: 'x', status, code }) }), { times: 1 });
      await page.click('[data-testid="gift-closure-close"]');
      await page.click('[data-testid="gift-closure-confirm"]');
      await page.waitForFunction((re) => new RegExp(re).test(document.body.innerText), expected.source, { timeout: 30000 });
      check(`${status} ${code} (interceptado en la red): mensaje claro, sigue «Abierta» · ${tag}`, (await text(page, 'gift-closure-status')).toLowerCase().includes('abierta') && (await page.locator('[data-testid="gift-closure-done"]').count()) === 0);
      await shot(page, `host-error-${status}-${tag}`);
      if (await page.locator('[data-testid="gift-closure-keep"]').count()) await page.click('[data-testid="gift-closure-keep"]');
    }

    // cerrar de verdad
    await page.click('[data-testid="gift-closure-close"]');
    await page.click('[data-testid="gift-closure-confirm"]');
    await page.waitForSelector('[data-testid="gift-closure-done"]', { timeout: 30000 });
    check(`cerrar: aviso de éxito · ${tag}`, (await text(page, 'gift-closure-done')).includes('Cerraste la lista'));
    await page.waitForFunction(() => /cerrada/i.test(document.querySelector('[data-testid="gift-closure-status"]')?.textContent ?? ''), null, { timeout: 30000 });
    check(`cerrar: estado «Cerrada» visible y «Reabrir la lista» · ${tag}`, (await page.locator('[data-testid="gift-closure-reopen"]').count()) === 1 && (await page.locator('[data-testid="gift-closure-close"]').count()) === 0);
    const closed = await items(S.hostToken);
    check(`backend: closed=true y la reserva existente intacta · ${tag}`, closed.closed === true && closed.items.find((i) => i.id === S.dorada.id).status === 'COMMITTED');
    await page.locator('[data-testid="gift-closure"]').scrollIntoViewIfNeeded();
    await shot(page, `host-cerrada-${tag}`);
    check(`sin scroll horizontal · anfitrión ${tag}`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await axe(page, '[data-testid="gift-closure"]', `panel cerrada ${tag}`);

    // el invitado, en el backend real: no puede reservar (409 LIST_CLOSED) y ve la lista cerrada en app y web
    const blocked = await api('POST', `/celebrations/${S.celebrationId}/items/${t.id}/reservations`, S.visitorSecret, { guestDisplayName: 'Visita' });
    const blockedBody = await blocked.json();
    check(`backend: reservar con la lista cerrada -> 409 LIST_CLOSED · ${tag}`, blocked.status === 409 && blockedBody.code === 'LIST_CLOSED', `${blocked.status} ${blockedBody.code}`);
    await page.goto(`${EXPO}/c/ana-y-luis/regalos/${S.visitorSecret}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="gift-list-closed"]', { timeout: 60000 });
    check(`invitado (app): ve «La lista de regalos está cerrada» y no puede reservar · ${tag}`, (await page.locator(`[data-testid="reserve-${t.id}"]`).count()) === 0);
    await shot(page, `invitado-app-cerrada-${tag}`);
    await page.goto(`${NEXT}/c/ana-y-luis/regalos#t=${S.visitorSecret}`, { waitUntil: 'networkidle', timeout: 180000 });
    await page.getByText('La lista de regalos está cerrada').first().waitFor({ timeout: 90000 });
    check(`invitado (web): lista cerrada, sin botón «Reservar» · ${tag}`, (await page.locator(`[data-gift-id="${t.id}"]`).getByRole('button', { name: /^Reservar/ }).count()) === 0);
    await shot(page, `invitado-web-cerrada-${tag}`);

    // reabrir
    await page.goto(`${EXPO}/regalos?c=${S.celebrationId}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="gift-closure-reopen"]', { timeout: 60000 });
    check(`recargar: el estado «Cerrada» persiste · ${tag}`, (await text(page, 'gift-closure-status')).toLowerCase().includes('cerrada'));
    await page.click('[data-testid="gift-closure-reopen"]');
    await page.waitForSelector('[data-testid="gift-closure-done"]', { timeout: 30000 });
    check(`reabrir: aviso y «Abierta» · ${tag}`, (await text(page, 'gift-closure-done')).includes('Reabriste la lista'));
    await page.waitForFunction(() => /abierta/i.test(document.querySelector('[data-testid="gift-closure-status"]')?.textContent ?? ''), null, { timeout: 30000 });
    check(`backend: closed=false tras reabrir · ${tag}`, (await items(S.hostToken)).closed === false);
    await shot(page, `host-reabierta-${tag}`);
    const again = await api('PUT', `/celebrations/${S.celebrationId}/gift-list/closure`, S.hostToken, { closed: false });
    check(`backend: PUT idempotente (repetir reabrir = 200) · ${tag}`, again.status === 200);
    if (width === 1280) {
      const en = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en-US' });
      const p2 = await en.newPage();
      await p2.goto(`${EXPO}/regalos?c=${S.celebrationId}`, { waitUntil: 'networkidle' });
      await p2.waitForSelector('[data-testid="gift-closure"]', { timeout: 60000 });
      check('anfitrión en-US: textos en inglés', /Gift list/.test(await p2.locator('[data-testid="gift-closure"]').innerText()) && /Close the list/.test(await p2.locator('[data-testid="gift-closure-close"]').innerText()));
      await en.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${OUT ?? '.'}/resultados.json`, JSON.stringify(results, null, 1));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} pasan`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(2); });
