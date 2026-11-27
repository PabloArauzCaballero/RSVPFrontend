// Recorrido R6b FE (ronda 3): vista previa real → seo-web /r → Kong → lead PREVIEW; clic con eventType por seo-web; viewports, claro/oscuro, en-US y axe.
// Arranque (ver docs/progress/R6b-FE-reportes.md): BE en Docker + Kong, Expo web en 8081 (proveedor) y 8100 (admin) con EXPO_PUBLIC_DEV_ACCESS_TOKEN de un login real, seo-web `next dev -p 3100`.
import { chromium } from '/home/user/RSVPFrontend/node_modules/playwright/index.mjs';
import AxeBuilder from '/home/user/RSVPFrontend/node_modules/@axe-core/playwright/dist/index.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const DIR = process.env.R6B_DIR ?? '/var/tmp/r6b';
const OUT = process.env.R6B_OUT ?? `${DIR}/shots2`;
const st = JSON.parse(readFileSync(`${DIR}/state.json`, 'utf8'));
mkdirSync(OUT, { recursive: true });
// Las sesiones de la siembra caducan a los 15 min: se piden de nuevo (login real de Identity).
const login = async (email) => (await (await fetch('http://localhost:8000/identity/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Correct-horse-9battery' }) })).json()).accessToken;
st.tokenA = await login('r6b-prov-a@example.test'); st.tokenAdmin = await login('e2e-admin@example.test');
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const ok = (m) => console.log('  ✔ ' + m);
const stub = async (ctx) => { await ctx.route(/https:\/\/(tienda\.example|wa\.me|catering\.example)\/.*/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>destino del proveedor</h1>' })); };
const results = { axe: [] };

// 1. Vista previa real → seo-web /r → Kong → lead PREVIEW
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1500 }, locale: 'es-BO', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' });
  await stub(ctx);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8081/portal/productos/${st.product}?paso=resumen`, { waitUntil: 'domcontentloaded' });
  const btn = page.getByTestId('preview-open-PRODUCT_PAGE');
  await btn.waitFor({ timeout: 90000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="preview-open-PRODUCT_PAGE"]')?.getAttribute('aria-disabled') !== 'true', null, { timeout: 30000 });
  await page.screenshot({ path: `${OUT}/preview-resumen.png`, fullPage: true });
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a')].map((a) => a.href).filter((h) => h.includes('/r/') || h.includes('ctx=')));
  assert.deepEqual(hrefs, [], 'el ctx nunca va en un href');
  assert.equal(await page.evaluate(() => document.documentElement.outerHTML.includes('ctx=')), false, 'ni en el DOM');
  const seen = [];
  ctx.on('response', (r) => { if (r.url().startsWith('http://localhost:3100/r/')) seen.push(`${r.status()} ${r.url().replace(/ctx=[^&]+/, 'ctx=<oculto>')}`); });
  const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), btn.click()]);
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await popup.waitForURL(/tienda\.example/, { timeout: 30000 });
  ok(`vista previa: «Ver en la tienda» abrió ${popup.url()} tras pasar por seo-web /r`);
  console.log('   respuestas de seo-web /r:', seen);
  assert.ok(seen.some((s) => s.startsWith('302 ') && s.includes('surface=PREVIEW') && s.includes('destination=PRODUCT_PAGE')));
  await popup.close();
  // El lead PREVIEW se ve en /portal/leads
  await page.goto('http://localhost:8081/portal/leads', { waitUntil: 'domcontentloaded' });
  await page.getByText('Producto: Juego de copas R6b').first().waitFor({ timeout: 90000 });
  const row = page.locator('[data-testid^="lead-"]', { hasText: /Vista previa/i }).filter({ hasText: 'Juego de copas R6b' }).first();
  const text = await row.innerText();
  console.log('   fila:', text.replace(/\n/g, ' | '));
  assert.match(text, /vista previa/i); assert.doesNotMatch(text, /facturable/i);
  ok('/portal/leads muestra el toque PREVIEW (no válido, no facturable) de la ficha');
  await page.screenshot({ path: `${OUT}/leads-preview.png`, fullPage: true });
  // Reporte: la vista previa cuenta como no válido PREVIEW y no cobrable
  const rep = await (await fetch(`http://localhost:8000/providers/${st.A.providerId}/leads/report?month=${new Date().toISOString().slice(0, 7)}&listingId=${st.product}`, { headers: { authorization: 'Bearer ' + st.tokenA } })).json();
  console.log('   reporte del producto:', JSON.stringify(rep.rows.map((r) => [r.destination, r.validLeads, r.invalidLeads, r.invalidByReason.PREVIEW, r.billableLeads])));
  assert.ok(rep.rows.some((r) => r.invalidByReason.PREVIEW >= 1 && r.destination === 'PRODUCT_PAGE' && r.validLeads === 0));
  ok('reporte del servicio: PRODUCT_PAGE con 0 válidos y PREVIEW ≥ 1');
  await ctx.close();
}
// 2. Clic con eventType por seo-web /r en Chrome (otro visitante)
{
  const ctx = await browser.newContext({ locale: 'es-BO', userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' });
  await stub(ctx);
  const page = await ctx.newPage();
  const seen = [];
  page.on('response', (r) => { if (r.url().startsWith('http://localhost:3100/r/')) seen.push(r.status()); });
  await page.goto(`http://localhost:3100/r/${st.product}?destination=WHATSAPP&surface=GIFT_LIST&eventType=BIRTHDAY&city=la-paz`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForURL(/wa\.me/, { timeout: 30000 });
  ok(`clic del invitado por seo-web /r (Chrome): ${seen.join(',')} → ${page.url()}`);
  await ctx.close();
  const l = await (await fetch(`http://localhost:8000/providers/${st.A.providerId}/leads?listingId=${st.product}&destination=WHATSAPP`, { headers: { authorization: 'Bearer ' + st.tokenA } })).json();
  const mine = l.items.filter((i) => i.eventType === 'BIRTHDAY' && i.city === 'la-paz' && i.valid);
  assert.ok(mine.length >= 1, JSON.stringify(l.items.map((i) => [i.valid, i.eventType, i.city])));
  ok(`el lead llegó con eventType=BIRTHDAY y city=la-paz, válido (${mine.length})`);
}
// 3. Viewports, claro/oscuro, en-US y axe
const viewports = [360, 768, 1280];
const pages = [
  ['portal-leads', 8081, '/portal/leads', /Producto:|Product:/],
  ['portal-metricas', 8081, '/portal/metricas', /Reporte mensual|Monthly request report/],
  ['portal-preview', 8081, `/portal/productos/${st.product}?paso=resumen`, /Vista previa|Preview/i],
  ['admin-metricas', 8100, '/admin/metricas', /Reporte de leads|Billable lead report/]
];
for (const scheme of ['light', 'dark']) for (const locale of ['es-BO', 'en-US']) for (const w of viewports) {
  if (locale === 'en-US' && !(w === 360 || w === 1280)) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: 2600 }, locale, colorScheme: scheme });
  for (const [name, port, path, marker] of pages) {
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}${path}`, { waitUntil: 'domcontentloaded' });
    await page.getByText(marker).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await page.evaluate(() => /(?:leadReport|portal\.|admin\.)[a-zA-Z]+\.[a-zA-Z]+/.test(document.body.innerText));
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const bad = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}(${v.nodes.length})`);
    results.axe.push({ name, w, scheme, locale, overflow, rawKeys: raw, serious: bad, all: axe.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`) });
    console.log(`${name.padEnd(16)} ${String(w).padEnd(5)} ${scheme.padEnd(5)} ${locale} overflow=${overflow} rawKey=${raw} axe serious/critical=${bad.join(',') || 'ninguna'}`);
    await page.screenshot({ path: `${OUT}/${name}-${w}-${scheme}-${locale}.png`, fullPage: true });
    await page.close();
  }
  await ctx.close();
}
writeFileSync(`${OUT}/axe-resultados.json`, JSON.stringify(results, null, 1));
await browser.close();
console.log('RECORRIDO 2 TERMINADO');
