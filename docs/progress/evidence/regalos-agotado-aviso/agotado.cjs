// Playwright (Chromium preinstalado) contra el backend de Gift REAL (ver harness.mjs). Producto agotado con reserva.
const { chromium } = require('playwright');
const fs = require('node:fs');
const S = require('./state.json');
const OUT = process.env.OUT;
const AXE = '<worktree>/node_modules/axe-core/axe.min.js';
const EXPO = 'http://localhost:8310';
const NEXT = 'http://localhost:3100';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); };
const ctl = async (path) => (await fetch(`${S.gateway}/__ctl/${path}`)).json();
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
async function axe(page, selector, name) {
  await page.addScriptTag({ path: AXE });
  const violations = await page.evaluate(async (sel) => (await window.axe.run(document.querySelector(sel) ?? document, { rules: { 'color-contrast': { enabled: false } } })).violations.map((v) => `${v.id}:${v.impact}`), selector);
  check(`axe sin violaciones · ${name}`, violations.length === 0, violations.join(','));
}
const noHorizontalScroll = async (page, name) => check(`sin scroll horizontal · ${name}`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

(async () => {
  const browser = await chromium.launch();
  const g = S.dorada, t = S.torta;
  // El anfitrión aprueba la reserva en el backend real: COMMITTED, como en el caso que reportó el dueño («Reservado»).
  const approved = await fetch(`${S.gateway}/gifts/celebrations/${S.celebrationId}/reservations/${S.reservationId}/approve`, { method: 'POST', headers: { authorization: `Bearer ${S.hostToken}` } });
  console.log('approve reservation ->', approved.status);
  for (const width of [360, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-BO' });
    const page = await ctx.newPage();
    const tag = `${width}`;
    await ctl('restock');

    // ---- Anfitrión (app/web Expo) ----
    await page.goto(`${EXPO}/regalos?c=${S.celebrationId}`, { waitUntil: 'networkidle', timeout: 180000 });
    await page.waitForSelector(`[data-testid="gift-${g.id}"]`, { timeout: 120000 });
    check(`anfitrión antes: sin aviso · ${tag}`, (await page.locator(`[data-testid="gift-soldout-${g.id}"]`).count()) === 0);
    check(`anfitrión antes: estado «Reservado» sin aviso · ${tag}`, /reservado/i.test(await page.locator(`[data-testid="gift-status-${g.id}"]`).innerText()));
    await shot(page, `host-antes-${tag}`);
    await ctl('soldout?reason=OUT_OF_STOCK');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector(`[data-testid="gift-soldout-${g.id}"]`, { timeout: 60000 });
    const hostNotice = await page.locator(`[data-testid="gift-soldout-${g.id}"]`).innerText();
    check(`anfitrión después: aviso «Producto agotado» + motivo + reserva se mantiene · ${tag}`, /Producto agotado/.test(hostNotice) && /Se agotó\./.test(hostNotice) && /La reserva se mantiene/.test(hostNotice), hostNotice.replace(/\n/g, ' / '));
    check(`anfitrión después: la reserva sigue («Reservado» y «Liberar regalo») · ${tag}`, /reservado/i.test(await page.locator(`[data-testid="gift-status-${g.id}"]`).innerText()) && (await page.locator(`[data-testid="release-${g.id}"]`).count()) === 1);
    check(`anfitrión después: no pasa a «No disponibles» · ${tag}`, (await page.locator('[data-testid="gift-unavailable-section"]').count()) === 0);
    await noHorizontalScroll(page, `anfitrión ${tag}`);
    await axe(page, `[data-testid="gift-${g.id}"]`, `anfitrión ${tag}`);
    await shot(page, `host-despues-${tag}`);

    // ---- Invitado que reservó (app/web Expo) ----
    await ctl('restock');
    await page.goto(`${EXPO}/c/ana-y-luis/regalos/${S.holderSecret}`, { waitUntil: 'networkidle' });
    await page.waitForSelector(`[data-testid="gift-${g.id}"]`, { timeout: 60000 });
    await page.waitForSelector(`[data-testid="whatsapp-${g.id}"]`, { timeout: 30000 });
    check(`invitado (app) antes: ve «Ver en la tienda» y «Pedir por WhatsApp» · ${tag}`, (await page.locator(`[data-testid="partner-${g.id}"]`).count()) === 1 && (await page.locator(`[data-testid="whatsapp-${g.id}"]`).count()) === 1);
    await shot(page, `invitado-app-antes-${tag}`);
    await ctl('soldout?reason=OUT_OF_STOCK');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector(`[data-testid="gift-soldout-${g.id}"]`, { timeout: 60000 });
    const guestNotice = await page.locator(`[data-testid="gift-soldout-${g.id}"]`).innerText();
    check(`invitado (app) después: aviso, sin motivo interno · ${tag}`, /Producto agotado/.test(guestNotice) && /tu reserva se mantiene/.test(guestNotice) && !/Se agotó|suspendido|DOne ocultó/.test(guestNotice), guestNotice.replace(/\n/g, ' / '));
    check(`invitado (app) después: sin botones de compra · ${tag}`, (await page.locator(`[data-testid="partner-${g.id}"], [data-testid="whatsapp-${g.id}"], [data-testid="store-${g.id}"], [data-testid="reserve-${g.id}"]`).count()) === 0);
    check(`invitado (app) después: conserva «Tu reserva» y «Cancelar mi reserva» · ${tag}`, (await page.locator(`[data-testid="gift-mine-${g.id}"]`).count()) === 1 && (await page.locator(`[data-testid="cancel-reservation-${g.id}"]`).count()) === 1);
    check(`invitado (app) después: otro regalo sin cambios (Torta conserva botones) · ${tag}`, (await page.locator(`[data-testid="whatsapp-${t.id}"]`).count()) === 1 && (await page.locator(`[data-testid="gift-soldout-${t.id}"]`).count()) === 0);
    await noHorizontalScroll(page, `invitado app ${tag}`);
    await axe(page, `[data-testid="gift-${g.id}"]`, `invitado app ${tag}`);
    await shot(page, `invitado-app-despues-${tag}`);
    // otro invitado (no reservó)
    await page.goto(`${EXPO}/c/ana-y-luis/regalos/${S.visitorSecret}`, { waitUntil: 'networkidle' });
    await page.waitForSelector(`[data-testid="gift-soldout-${g.id}"]`, { timeout: 60000 });
    check(`otro invitado (app): aviso y sin compra, sin «Tu reserva» · ${tag}`, (await page.locator(`[data-testid="gift-soldout-${g.id}"]`).innerText()).includes('ya no se puede comprar') && (await page.locator(`[data-testid="gift-mine-${g.id}"], [data-testid="whatsapp-${g.id}"]`).count()) === 0);

    // ---- Invitado en la web pública (Next) ----
    await ctl('restock');
    await page.goto(`${NEXT}/c/ana-y-luis/regalos#t=${S.holderSecret}`, { waitUntil: 'networkidle', timeout: 180000 });
    const row = page.locator(`[data-gift-id="${g.id}"]`);
    await row.waitFor({ timeout: 90000 });
    await row.getByRole('link', { name: 'Pedir por WhatsApp' }).waitFor({ timeout: 30000 });
    check(`invitado (web) antes: ve «Ver en la tienda» y «Pedir por WhatsApp» · ${tag}`, (await row.getByRole('link', { name: 'Ver en la tienda' }).count()) === 1 && (await row.getByRole('link', { name: 'Pedir por WhatsApp' }).count()) === 1);
    await shot(page, `invitado-web-antes-${tag}`);
    await ctl('soldout?reason=OUT_OF_STOCK');
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(`[data-testid="gift-soldout-${g.id}"]`).waitFor({ timeout: 60000 });
    const webNotice = await page.locator(`[data-testid="gift-soldout-${g.id}"]`).innerText();
    check(`invitado (web) después: aviso · ${tag}`, /Producto agotado/.test(webNotice) && /tu reserva se mantiene/.test(webNotice), webNotice.replace(/\n/g, ' / '));
    check(`invitado (web) después: sin enlaces de compra · ${tag}`, (await row.getByRole('link', { name: /Ver en la tienda|Pedir por WhatsApp/ }).count()) === 0);
    check(`invitado (web) después: conserva su reserva y cancelar · ${tag}`, (await row.getByTestId('my-reservation').count()) === 1 && (await row.getByRole('button', { name: /Cancelar mi reserva/ }).count()) === 1);
    check(`invitado (web) después: Torta conserva sus enlaces · ${tag}`, (await page.locator(`[data-gift-id="${t.id}"]`).getByRole('link', { name: 'Pedir por WhatsApp' }).count()) === 1);
    await noHorizontalScroll(page, `invitado web ${tag}`);
    await axe(page, `[data-gift-id="${g.id}"]`, `invitado web ${tag}`);
    await shot(page, `invitado-web-despues-${tag}`);

    // ---- en-US en la web pública ----
    if (width === 1280) {
      await page.goto(`${NEXT}/c/ana-y-luis/regalos?lang=en-US#t=${S.holderSecret}`, { waitUntil: 'networkidle' });
      await page.locator(`[data-testid="gift-soldout-${g.id}"]`).waitFor({ timeout: 60000 });
      check('invitado (web) en-US: aviso en inglés', /Product sold out/.test(await page.locator(`[data-testid="gift-soldout-${g.id}"]`).innerText()));
      await shot(page, 'invitado-web-despues-en-US-1280');
    }
    // ---- reserva intacta en el backend real ----
    const r = await fetch(`${S.gateway}/gifts/celebrations/${S.celebrationId}/my-reservations`, { headers: { authorization: `Bearer ${S.holderSecret}` } });
    const mine = (await r.json()).items.find((x) => x.itemId === g.id);
    check(`backend: la reserva sigue activa mientras el producto está agotado · ${tag}`, mine && mine.status === 'COMMITTED', mine && mine.status);
    await ctx.close();
  }
  await ctl('restock');
  await browser.close();
  fs.writeFileSync(`${OUT ?? '.'}/resultados.json`, JSON.stringify(results, null, 1));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} pasan`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(2); });
