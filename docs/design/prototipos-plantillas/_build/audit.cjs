// Auditoría en Chromium real. Uso: node audit.cjs
// Escribe audit.json y contraste-dom.json y sale con código 1 si hay algún aviso (desbordamiento, texto < 13 px,
// objetivo táctil < 44 px, contraste < AA, botón de la barra o de la cabecera fuera de pantalla).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const dir = path.resolve(__dirname, '..');
const T = ['marfil', 'pinata', 'gala'];
const W = [320, 360, 390, 768, 900, 960, 1024, 1280];
const WSTATE = [320, 360, 768, 1024, 1280];
const STATES = { regalos_vacio: 'gifts=empty', regalos_cerrado: 'gifts=closed', sin_enlace: 'link=none', plazo_vencido: 'deadline=past', foto_error: 'photoerr=1', todos: 'gifts=empty&link=none&deadline=past&photoerr=1' };
const STRESS = {
  marfil: { sel: '.cover h1', html: '<span>María Guadalupe de los Ángeles</span><span><i class="amp">&amp;</i> Juan Sebastián Fernández-Villaroel</span>' },
  pinata: { sel: '.cover h1', html: '<span>Maximiliano Alejandro</span><span>cumple <em>6</em></span>' },
  gala: { sel: '.title .y', html: 'años de Corporación Industrial Andina de Telecomunicaciones y Servicios S.A.' }
};

const probe = () => {
  document.querySelectorAll('details').forEach((d) => { d.open = true; });
  const vw = document.documentElement.clientWidth;
  const out = { overflow: document.documentElement.scrollWidth - vw, small: [], tap: [], offscreen: [], pairs: {}, contrast: { min: 99, worst: '' }, lines: { min: 999, max: 0 } };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; } const c = s.match(/color\(srgb ([^)]+)\)/); if (c) { const p = c[1].split(/[ \/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] === undefined ? 1 : p[3]]; } return [0, 0, 0, 0]; };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat([1]);
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let base = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return base; };
  const lum = (c) => { const v = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rat = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01 && !el.closest('[aria-hidden="true"]') && !el.closest('.proto'); };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || seen.has(el) || !vis(el)) continue; if (el.closest('script,style,svg')) continue; seen.add(el);
    const s = getComputedStyle(el); const fs = parseFloat(s.fontSize); const wt = +s.fontWeight;
    if (fs < 12.99) out.small.push(el.tagName + ':' + n.textContent.trim().slice(0, 30) + ' ' + fs);
    let fg = parse(s.color); const bg = bgOf(el); fg = over(fg, bg); const r = rat(fg, bg);
    const large = fs >= 24 || (fs >= 18.66 && wt >= 700); const need = large ? 3 : 4.5;
    if (r < out.contrast.min) { out.contrast.min = r; out.contrast.worst = n.textContent.trim().slice(0, 40); }
    const k = `${hex(fg)}|${hex(bg)}|${large ? 'G' : 'N'}`;
    if (!out.pairs[k]) out.pairs[k] = { fg: hex(fg), bg: hex(bg), large, need, ratio: r, sample: n.textContent.trim().slice(0, 28), n: 0 };
    out.pairs[k].n++;
  }
  document.querySelectorAll('a[href],button,summary,select').forEach((el) => { if (!vis(el) || el.classList.contains('skip')) return; const r = el.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) out.tap.push((el.textContent || el.className).trim().slice(0, 30) + ` ${Math.round(r.width)}x${Math.round(r.height)}`); });
  // la barra inferior (<900) y los botones de la cabecera (>=900) deben caber enteros en la pantalla
  document.querySelectorAll('.bar .btn, .top .cta .btn').forEach((el) => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.left < -0.5 || r.right > vw + 0.5) out.offscreen.push(`${el.textContent.trim().slice(0, 24)} ${Math.round(r.left)}-${Math.round(r.right)}/${vw}`); });
  document.querySelectorAll('main p:not(.when):not(.where):not(.count):not(.note), main .tl span, main details p, main .prog span, main .stops span, main .mile dd').forEach((p) => {
    if (!vis(p)) return; const tn = []; const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); while (w.nextNode()) tn.push(w.currentNode);
    const words = []; tn.forEach((t) => { const re = /\S+/g; let m; while ((m = re.exec(t.textContent))) { const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length); const b = r.getClientRects()[0]; if (b) words.push({ w: m[0], top: Math.round(b.top) }); } });
    const lines = []; words.forEach((x) => { const l = lines[lines.length - 1]; if (l && Math.abs(l.top - x.top) < 6) l.t += ' ' + x.w; else lines.push({ top: x.top, t: x.w }); });
    lines.slice(0, -1).forEach((l) => { const n = l.t.length; if (n < out.lines.min) out.lines.min = n; if (n > out.lines.max) out.lines.max = n; });
  });
  return out;
};
const flagsOf = (r) => [r.overflow > 0 ? `DESBORDA ${r.overflow}px` : '', r.small.length ? `PEQUEÑO ${r.small.length}` : '', r.tap.length ? `TAP ${r.tap.length}` : '', r.offscreen.length ? `FUERA ${r.offscreen.join(';')}` : '', r.contrast.min < 4.5 ? `CONTRASTE ${r.contrast.min.toFixed(2)}` : ''].filter(Boolean);

(async () => {
  const b = await chromium.launch(); const res = {}; const pairs = {}; let bad = 0; let runs = 0;
  const record = (k, r, t, theme) => {
    runs++; const f = flagsOf(r); if (f.length) { bad++; console.log(k.padEnd(40), f.join(' '), JSON.stringify({ small: r.small.slice(0, 3), tap: r.tap.slice(0, 4) })); }
    res[k] = { overflow: r.overflow, small: r.small.length, tap: r.tap.length, offscreen: r.offscreen, minContrast: +r.contrast.min.toFixed(2), worst: r.contrast.worst, lines: r.lines };
    const bag = (pairs[`${t}|${theme}`] = pairs[`${t}|${theme}`] || {});
    for (const [pk, v] of Object.entries(r.pairs)) { if (!bag[pk]) bag[pk] = { ...v, n: 0 }; bag[pk].n += v.n; }
  };
  // 1) base: ancho × claro/oscuro × sin/con foto
  for (const t of T) for (const theme of ['light', 'dark']) {
    const c = await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce', colorScheme: theme }); const p = await c.newPage();
    for (const w of W) for (const photo of [0, 1]) {
      await p.setViewportSize({ width: w, height: w < 800 ? 844 : 800 });
      await p.goto(`file://${dir}/${t}.html?bare=1&photo=${photo}&theme=${theme}`); await p.waitForTimeout(250);
      record(`base|${t}|${w}|${theme}|${photo ? 'foto' : 'sin'}`, await p.evaluate(probe), t, theme);
    }
    // 2) estados
    for (const [sn, q] of Object.entries(STATES)) for (const w of WSTATE) {
      await p.setViewportSize({ width: w, height: w < 800 ? 844 : 800 });
      await p.goto(`file://${dir}/${t}.html?bare=1&photo=${sn === 'foto_error' || sn === 'todos' ? 1 : 0}&theme=${theme}&${q}`); await p.waitForTimeout(250);
      record(`estado|${t}|${sn}|${w}|${theme}`, await p.evaluate(probe), t, theme);
    }
    // 3) nombres largos (estrés)
    for (const w of [320, 360, 1280]) {
      await p.setViewportSize({ width: w, height: w < 800 ? 844 : 800 });
      await p.goto(`file://${dir}/${t}.html?bare=1&photo=1&theme=${theme}`); await p.waitForTimeout(250);
      await p.evaluate(([sel, html]) => { document.querySelector(sel).innerHTML = html; }, [STRESS[t].sel, STRESS[t].html]);
      record(`estres|${t}|${w}|${theme}`, await p.evaluate(probe), t, theme);
    }
    await c.close();
  }
  // 4) regalos siempre visibles, foco y movimiento reducido
  for (const t of T) for (const w of [390, 1280]) {
    const c = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 800 }, reducedMotion: 'no-preference' }); const p = await c.newPage();
    await p.goto(`file://${dir}/${t}.html?bare=1`); await p.waitForTimeout(3600);
    const gifts = []; for (const y of [0, 0.25, 0.5, 0.75, 1]) { await p.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), y); await p.waitForTimeout(250); gifts.push(await p.evaluate(() => [...document.querySelectorAll('a[href$="/regalos"]')].some((a) => { const r = a.getBoundingClientRect(); const s = getComputedStyle(a); return s.display !== 'none' && r.width > 40 && r.height > 40 && r.top >= 0 && r.bottom <= innerHeight; }))); }
    await p.waitForTimeout(1400);
    const hidden = await p.evaluate(() => [...document.querySelectorAll('.rv')].filter((e) => +getComputedStyle(e).opacity < 0.99 && e.getBoundingClientRect().height > 0).length);
    await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
    const focus = await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return `${e.tagName} outline=${s.outlineStyle} ${s.outlineWidth}`; });
    console.log(`${t}|${w}`.padEnd(14), 'regalos visible en 0/25/50/75/100%:', gifts.map((g) => (g ? 'sí' : 'NO')).join(' '), '| .rv sin revelar:', hidden, '| foco:', focus);
    if (gifts.includes(false) || hidden) bad++;
    res[`anim|${t}|${w}`] = { gifts, hidden, focus }; await c.close();
    const c2 = await b.newContext({ viewport: { width: w, height: 800 }, reducedMotion: 'reduce' }); const p2 = await c2.newPage(); await p2.goto(`file://${dir}/${t}.html?bare=1`); await p2.waitForTimeout(600);
    const n = await p2.evaluate(() => document.getAnimations().length + (document.documentElement.classList.contains('anim') ? 1000 : 0)); console.log(`   reduce-motion ${t}|${w}: animaciones activas = ${n}`); if (n) bad++; await c2.close();
  }
  fs.writeFileSync(path.join(__dirname, 'audit.json'), JSON.stringify(res, null, 1));
  const outPairs = {}; for (const [k, bag] of Object.entries(pairs)) outPairs[k] = Object.values(bag).sort((x, y) => x.ratio - y.ratio);
  fs.writeFileSync(path.join(__dirname, 'contraste-dom.json'), JSON.stringify(outPairs, null, 1));
  const over = Object.values(res).filter((r) => r.overflow !== undefined);
  console.log(`\nejecuciones: ${runs} · con avisos: ${bad} · desbordamiento máx.: ${Math.max(...over.map((r) => r.overflow))} px · contraste mín.: ${Math.min(...over.map((r) => r.minContrast)).toFixed(2)}`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
