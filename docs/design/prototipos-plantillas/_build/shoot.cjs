// Capturas (evidencia Linux/Chromium; no son líneas base): base 390/1280, anchos intermedios, barra a 320/360, estados y filmstrip.
// Salida: docs/progress/evidence/plantillas-prototipos/
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.resolve(__dirname, '..'); const out = path.resolve(dir, '../../progress/evidence/plantillas-prototipos'); fs.mkdirSync(out, { recursive: true });
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
  const names = { marfil: 'marfil', pinata: 'pinata', gala: 'gala' };
  // anchos intermedios (primer pliegue, claro, con foto)
  for (const t of Object.keys(names)) for (const w of [320, 360, 768, 900, 1024]) {
    const c = await b.newContext({ viewport: { width: w, height: w < 800 ? 700 : 800 }, reducedMotion: 'reduce', colorScheme: 'light' }); const p = await c.newPage();
    await p.goto(`file://${dir}/${t}.html?bare=1&photo=1&theme=light`); await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(out, `ancho-${t}-${w}-claro-foto.png`) }); await c.close();
  }
  // barra inferior a 320 y 360: normal y con las etiquetas más largas (regalos vacío + sin enlace)
  for (const t of Object.keys(names)) for (const w of [320, 360]) for (const [tag, q] of [['normal', ''], ['etiquetas-largas', '&gifts=empty&link=none']]) {
    const c = await b.newContext({ viewport: { width: w, height: 640 }, reducedMotion: 'reduce', colorScheme: 'light' }); const p = await c.newPage();
    await p.goto(`file://${dir}/${t}.html?bare=1&photo=0&theme=light${q}`); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(out, `barra-${t}-${w}-${tag}.png`), clip: { x: 0, y: 440, width: w, height: 200 } }); await c.close();
  }
  // estados (390, claro): regalos vacío/cerrado, sin enlace personal, plazo vencido, error de foto
  const ST = [['regalos-vacio', 'gifts=empty', '#regalos'], ['regalos-cerrado', 'gifts=closed', '#regalos'], ['sin-enlace', 'link=none', '#confirmar'], ['plazo-vencido', 'deadline=past', '#confirmar']];
  for (const t of Object.keys(names)) {
    for (const [n, q, sec] of ST) {
      const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'light' }); const p = await c.newPage();
      await p.goto(`file://${dir}/${t}.html?bare=1&photo=0&theme=light&${q}`); await p.waitForTimeout(700);
      await p.locator(sec).screenshot({ path: path.join(out, `estado-${n}-${t}-390.png`) }); await c.close();
    }
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'light' }); const p = await c.newPage();
    await p.goto(`file://${dir}/${t}.html?bare=1&theme=light&photoerr=1`); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(out, `estado-foto-error-${t}-390.png`) });
    if (t !== 'gala') await p.locator('#galeria').screenshot({ path: path.join(out, `estado-galeria-error-${t}-390.png`) });
    await c.close();
    const c3 = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', colorScheme: 'dark' }); const p3 = await c3.newPage();
    await p3.goto(`file://${dir}/${t}.html?bare=1&theme=dark&gifts=empty&link=none&deadline=past&photoerr=1`); await p3.waitForTimeout(700);
    await p3.screenshot({ path: path.join(out, `estado-todos-${t}-1280-oscuro.png`) }); await c3.close();
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
  // hoja de contacto de los dibujos
  const tmp = path.join(require('os').tmpdir(), 'rsvp-dibujitos.html'); require('child_process').execFileSync('node', [path.join(__dirname, 'sheet.mjs'), tmp]);
  const cs = await b.newContext({ viewport: { width: 1100, height: 700 } }); const ps = await cs.newPage(); await ps.goto('file://' + tmp); await ps.screenshot({ path: path.join(out, 'dibujitos.png'), fullPage: true }); await cs.close();
  await b.close();
})();
