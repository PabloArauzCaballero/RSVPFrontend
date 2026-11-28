// Recorrido con Chrome real de «Proveedores para mi evento» y la cotización con origen y prueba de trabajo, contra el backend REAL
// (e2e/mercado/dev-stack.mjs del repositorio de backend) y seo-web de producción (`next start`). Sin mocks de red de la app.
//   MERCADO_WEB=http://127.0.0.1:3100 MERCADO_PROVIDER_SLUG=<slug> MERCADO_OUT=<carpeta> node apps/seo-web/e2e/mercado-recorrido.mjs
// Imprime una línea JSON por comprobación y termina con código distinto de 0 si alguna falla. Datos sintéticos; no escribe secretos.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const WEB = process.env.MERCADO_WEB ?? 'http://127.0.0.1:3100';
const SLUG = process.env.MERCADO_PROVIDER_SLUG;
const OUT = process.env.MERCADO_OUT ?? 'mercado-evidencia';
// Chrome headless se presenta como «HeadlessChrome», y el backend lo trata como tráfico automatizado (lead `bot`, la solicitud igual se entrega):
// el recorrido usa el user agent de un Chrome de escritorio para ejercer el camino cobrable.
const USER_AGENT = process.env.MERCADO_UA ?? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const CELEBRATION_ID = '9b1e6a52-7c1f-4d57-a7a1-3a8d3a0f6c10';
if (!SLUG) throw new Error('MERCADO_PROVIDER_SLUG is required');
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(JSON.stringify({ name, ok: Boolean(ok), detail })); };

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  for (const [label, viewport] of [['movil-360', { width: 360, height: 800 }], ['escritorio-1280', { width: 1280, height: 900 }]]) {
    const context = await browser.newContext({ viewport, locale: 'es-BO', userAgent: USER_AGENT });
    const page = await context.newPage();
    const requests = [];
    page.on('request', (request) => requests.push({ url: request.url(), method: request.method(), referer: request.headers()['referer'], body: request.postData() }));

    // 1. La pestaña: categorías en scroll horizontal, tarjetas, sin credenciales en la dirección.
    await page.goto(`${WEB}/c/ana-y-luis/proveedores`, { waitUntil: 'networkidle' });
    const rail = page.getByTestId('mkt-rail');
    check(`${label}: la fila de categorías existe y es una navegación con nombre`, await rail.getAttribute('aria-label'));
    check(`${label}: hay tarjetas de proveedores`, (await page.locator('.mkt-card').count()) >= 3, String(await page.locator('.mkt-card').count()));
    if (label === 'movil-360') {
      const scrolls = await rail.locator('ul').evaluate((ul) => ul.scrollWidth > ul.clientWidth);
      check(`${label}: la fila se desplaza en horizontal`, scrolls);
      const noPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      check(`${label}: la página no se desborda a lo ancho`, noPageOverflow);
    }
    check(`${label}: la dirección no lleva token ni guestId`, !/token|guest/i.test(page.url()), page.url());
    await page.screenshot({ path: `${OUT}/${label}-pestana.png`, fullPage: true });

    // 2. De la pestaña a la ficha: el origen queda solo en sessionStorage.
    const stored = await page.evaluate(() => window.sessionStorage.getItem('rsvp.marketplace.origin'));
    check(`${label}: el origen se recuerda en sessionStorage con la celebración y el tipo`, stored && JSON.parse(stored).celebrationId === CELEBRATION_ID && JSON.parse(stored).eventType === 'WEDDING', stored ?? '');
    await page.goto(`${WEB}/p/${SLUG}`, { waitUntil: 'networkidle' });
    // (ir con goto abre una navegación nueva; la pestaña y su sessionStorage siguen siendo la misma)
    const referrerOnProfile = requests.filter((request) => request.url.includes('/p/')).map((request) => request.referer);
    check(`${label}: ninguna petición a la ficha lleva el slug de la celebración en el referrer`, referrerOnProfile.every((value) => !value || !value.includes('ana-y-luis')), JSON.stringify(referrerOnProfile));
    const quoteLink = page.locator(`a[href="/p/${SLUG}/cotizar"]`).first();
    check(`${label}: la ficha ofrece pedir cotización`, (await quoteLink.count()) > 0);
    await quoteLink.click();
    await page.waitForURL(`**/p/${SLUG}/cotizar*`);
    check(`${label}: la dirección de /cotizar no lleva celebración, slug de celebración, guestId ni token`, !/ana-y-luis|9b1e6a52|guest|token/i.test(page.url()), page.url());

    // 3. El formulario: llenarlo y enviarlo con prueba de trabajo real.
    const quoteRequests = [];
    page.on('request', (request) => { if (request.method() === 'POST' && request.url().includes('/quotes')) quoteRequests.push(request); });
    await page.getByLabel('Fecha del evento').fill('2027-06-12');
    await page.getByLabel('Cantidad de invitados').fill('60');
    await page.getByLabel('Tu nombre').fill(`Visitante2 ${label}`);
    await page.getByLabel('Tu correo').fill(`visitante2.${label}@correo.example`);
    await page.locator('input[type=checkbox]').first().check();
    await page.screenshot({ path: `${OUT}/${label}-cotizar-lleno.png`, fullPage: true });
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await page.getByRole('heading', { name: 'Solicitud enviada' }).waitFor({ timeout: 30_000 });
    check(`${label}: la solicitud se envió y se confirmó`, true);
    const post = quoteRequests[0];
    const body = JSON.parse(post.postData() ?? '{}');
    check(`${label}: el cuerpo lleva origin {CELEBRATION_SITE, celebrationId, eventType}`, body.origin?.surface === 'CELEBRATION_SITE' && body.origin?.celebrationId === CELEBRATION_ID && body.origin?.eventType === 'WEDDING', JSON.stringify(body.origin));
    check(`${label}: el cuerpo lleva la prueba de trabajo resuelta`, typeof body.proof?.challenge === 'string' && typeof body.proof?.nonce === 'string');
    check(`${label}: el cuerpo no lleva guestId, token ni slug de celebración`, !/guestId|token|ana-y-luis/i.test(JSON.stringify(body)));
    check(`${label}: el referer de la petición no trae la celebración`, !/ana-y-luis|9b1e6a52/i.test(post.headers()['referer'] ?? ''), post.headers()['referer'] ?? '');
    await page.screenshot({ path: `${OUT}/${label}-cotizar-enviado.png`, fullPage: true });
    await context.close();
  }

  // 4. Sin pasar por la pestaña: sin origen en el cuerpo.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-BO', userAgent: USER_AGENT });
  const page = await context.newPage();
  await page.goto(`${WEB}/p/${SLUG}/cotizar`, { waitUntil: 'networkidle' });
  const posts = [];
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().includes('/quotes')) posts.push(request); });
  await page.getByLabel('Fecha del evento').fill('2027-06-12');
  await page.locator('input[type=checkbox]').first().check();
  await page.getByLabel('Cantidad de invitados').fill('20');
  await page.getByLabel('Tu nombre').fill('Visitante directo');
  await page.getByLabel('Tu correo').fill('directo2@correo.example');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  await page.getByRole('heading', { name: 'Solicitud enviada' }).waitFor({ timeout: 30_000 });
  check('directo: sin pasar por la pestaña no se envía origin', !('origin' in JSON.parse(posts[0].postData() ?? '{}')));
  await context.close();

  // 5. Interruptor apagado en seo-web: la ruta no existe (se prueba con el segundo servidor si se entregó MERCADO_WEB_OFF).
  if (process.env.MERCADO_WEB_OFF) {
    const off = await fetch(`${process.env.MERCADO_WEB_OFF}/c/ana-y-luis/proveedores`);
    check('interruptor apagado: la pestaña responde 404', off.status === 404, String(off.status));
  }
} finally { await browser.close(); }
const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ total: results.length, failed: failed.length }));
process.exit(failed.length ? 1 : 0);
