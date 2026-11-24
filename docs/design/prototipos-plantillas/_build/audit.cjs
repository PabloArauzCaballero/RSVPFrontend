// Auditoría en Chromium real. uso: node audit.cjs  → escribe audit.json y resumen en consola
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const dir = path.resolve(__dirname, '..');
const T = ['marfil', 'pinata', 'gala'], W = [390, 768, 1280];
const probe = () => {
  const out = { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [], tap: [], contrast: { min: 99, worst: '' }, lines: { min: 999, max: 0, minEl: '', maxEl: '' } };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; } const c = s.match(/color\(srgb ([^)]+)\)/); if (c) { const p = c[1].split(/[ \/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] === undefined ? 1 : p[3]]; } return [0, 0, 0, 0]; };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat([1]);
  const bgOf = (el) => { let layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let base = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return base; };
  const lum = (c) => { const v = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rat = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01 && !el.closest('[aria-hidden="true"]') && !el.closest('.proto') && !el.closest('details:not([open]) > :not(summary)'); };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || seen.has(el) || !vis(el)) continue; if (el.closest('script,style,.ph-tag,svg')) continue; seen.add(el);
    const s = getComputedStyle(el); const fs = parseFloat(s.fontSize);
    if (fs < 12.99) out.small.push(el.tagName + ':' + n.textContent.trim().slice(0, 30) + ' ' + fs);
    let fg = parse(s.color); const bg = bgOf(el); fg = over(fg, bg); const r = rat(fg, bg);
    if (r < out.contrast.min) { out.contrast.min = r; out.contrast.worst = n.textContent.trim().slice(0, 40); }
  }
  document.querySelectorAll('a[href],button,summary').forEach((el) => { if (!vis(el) || el.classList.contains('skip')) return; const r = el.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) out.tap.push((el.textContent || el.className).trim().slice(0, 30) + ` ${Math.round(r.width)}x${Math.round(r.height)}`); });
  // largo de línea (caracteres por línea) en párrafos de lectura
  document.querySelectorAll('main p:not(.when):not(.where):not(.count):not(.alt), main .tl span, main details p, main .prog span, main .stops span, main .mile dd').forEach((p) => {
    if (!vis(p)) return; const tn = []; const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); while (w.nextNode()) tn.push(w.currentNode);
    const words = []; tn.forEach((t) => { const re = /\S+/g; let m; while ((m = re.exec(t.textContent))) { const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length); const b = r.getClientRects()[0]; if (b) words.push({ w: m[0], top: Math.round(b.top) }); } });
    const lines = []; words.forEach((x) => { const l = lines[lines.length - 1]; if (l && Math.abs(l.top - x.top) < 6) l.t += ' ' + x.w; else lines.push({ top: x.top, t: x.w }); });
    lines.slice(0, -1).forEach((l) => { const n = l.t.length; if (n < out.lines.min) { out.lines.min = n; out.lines.minEl = l.t.slice(0, 30); } if (n > out.lines.max) { out.lines.max = n; out.lines.maxEl = l.t.slice(0, 30); } });
  });
  return out;
};
(async () => {
  const b = await chromium.launch(); const res = {}; let bad = 0;
  for (const t of T) for (const w of W) for (const theme of ['light', 'dark']) for (const photo of [0, 1]) {
    const c = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 800 }, reducedMotion: 'reduce', colorScheme: theme });
    const p = await c.newPage(); await p.goto(`file://${dir}/${t}.html?bare=1&photo=${photo}&theme=${theme}`); await p.waitForTimeout(500);
    const r = await p.evaluate(probe); const k = `${t}|${w}|${theme}|${photo ? 'foto' : 'sin'}`; res[k] = r;
    const flags = [r.overflow > 0 ? `OVERFLOW ${r.overflow}` : '', r.small.length ? `PEQUEÑO ${r.small.length}` : '', r.tap.length ? `TAP ${r.tap.length}` : '', r.contrast.min < 4.5 ? `CONTRASTE ${r.contrast.min.toFixed(2)}` : ''].filter(Boolean);
    if (flags.length) bad++; console.log(k.padEnd(28), `contraste mín ${r.contrast.min.toFixed(2)} | líneas ${r.lines.min}-${r.lines.max} car.`, flags.join(' '));
    if (flags.length) console.log('   ', JSON.stringify({ small: r.small.slice(0, 4), tap: r.tap.slice(0, 6), worst: r.contrast.worst }));
    await c.close();
  }
  // foco, movimiento y regalos siempre visibles
  for (const t of T) for (const w of [390, 1280]) {
    const c = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 800 }, reducedMotion: 'no-preference' }); const p = await c.newPage();
    await p.goto(`file://${dir}/${t}.html?bare=1`); await p.waitForTimeout(3600);
    const gifts = []; for (const y of [0, 0.25, 0.5, 0.75, 1]) { await p.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), y); await p.waitForTimeout(250); gifts.push(await p.evaluate(() => [...document.querySelectorAll('a[href$="/regalos"]')].some((a) => { const r = a.getBoundingClientRect(); const s = getComputedStyle(a); return s.display !== 'none' && r.width > 40 && r.height > 40 && r.top >= 0 && r.bottom <= innerHeight; }))); }
    await p.waitForTimeout(1400);
    const hidden = await p.evaluate(() => [...document.querySelectorAll('.rv')].filter((e) => +getComputedStyle(e).opacity < 0.99).length);
    await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
    const focus = await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return `${e.tagName} outline=${s.outlineStyle} ${s.outlineWidth}`; });
    console.log(`${t}|${w}`.padEnd(14), 'regalos visible en 0/25/50/75/100%:', gifts.map((g) => (g ? 'sí' : 'NO')).join(' '), '| .rv sin revelar tras scroll:', hidden, '| foco:', focus);
    res[`anim|${t}|${w}`] = { gifts, hidden, focus }; await c.close();
    const c2 = await b.newContext({ viewport: { width: w, height: 800 }, reducedMotion: 'reduce' }); const p2 = await c2.newPage(); await p2.goto(`file://${dir}/${t}.html?bare=1`); await p2.waitForTimeout(600);
    const n = await p2.evaluate(() => document.getAnimations().length + (document.documentElement.classList.contains('anim') ? 1000 : 0)); console.log(`   reduce-motion ${t}|${w}: animaciones activas = ${n}`); await c2.close();
  }
  fs.writeFileSync(path.join(__dirname, 'audit.json'), JSON.stringify(res, null, 1)); console.log('combinaciones con avisos:', bad); await b.close();
})();
