// Capturas: plantilla × 390/1280 × claro/oscuro × con/sin foto (página completa) + primer pliegue + filmstrip de la firma + dibujos
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.resolve(__dirname, '..'); const out = path.join(dir, 'capturas'); fs.mkdirSync(out, { recursive: true });
const T = { marfil: 'marfil', pinata: 'pinata', gala: 'gala' };
(async () => {
  const b = await chromium.launch();
  for (const t of Object.keys(T)) for (const w of [390, 1280]) for (const theme of ['light', 'dark']) for (const photo of [0, 1]) {
    const h = w < 800 ? 844 : 800; const c = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', colorScheme: theme, deviceScaleFactor: 1 });
    const p = await c.newPage(); await p.goto(`file://${dir}/${t}.html?bare=1&photo=${photo}&theme=${theme}`); await p.waitForTimeout(1200);
    const n = `${t}-${w}-${theme === 'light' ? 'claro' : 'oscuro'}-${photo ? 'foto' : 'sinfoto'}`;
    await p.screenshot({ path: path.join(out, n + '.png'), fullPage: true });
    if (theme === 'light') await p.screenshot({ path: path.join(out, 'pliegue-' + n + '.png') });
    await c.close();
  }
  // filmstrip de la animación de entrada (movimiento permitido), 390 px
  for (const t of Object.keys(T)) {
    const c = await b.newContext({ viewport: { width: 390, height: 700 }, reducedMotion: 'no-preference', colorScheme: 'light' }); const p = await c.newPage();
    const frames = []; await p.goto(`file://${dir}/${t}.html?bare=1&photo=1`);
    let last = 0; for (const ms of [150, 700, 1300, 2000, 3400]) { await p.waitForTimeout(ms - last); last = ms; frames.push((await p.screenshot()).toString('base64')); }
    const c2 = await b.newContext({ viewport: { width: 5 * 390 + 40, height: 720 } }); const q = await c2.newPage();
    await q.setContent(`<body style="margin:0;background:#888;display:flex;gap:10px;padding:10px">${frames.map((f, i) => `<figure style="margin:0;font:14px system-ui;color:#fff"><img src="data:image/png;base64,${f}" width="390"><figcaption>${[150, 700, 1300, 2000, 3400][i]} ms</figcaption></figure>`).join('')}</body>`);
    await q.screenshot({ path: path.join(out, `animacion-${t}.png`) }); await c.close(); await c2.close();
  }
  await b.close();
})();
