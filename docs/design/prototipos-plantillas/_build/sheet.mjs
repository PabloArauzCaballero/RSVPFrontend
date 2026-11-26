import { TOKENS } from './tokens.mjs';
import { drawing, DRAWINGS, DRAWING_CSS } from './drawings.mjs';
const css = (t) => Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(';');
const rows = Object.entries(TOKENS).flatMap(([k, T]) => ['light', 'dark'].map((m) => {
  const t = T[m]; const vars = `${css(t)};--ink:${t.text};--knock:${t.canvas};--fill:${t.accentFill};--disc:${t.disc||t.stone}`;
  return `<section style="${vars};background:${t.canvas};color:${t.text};padding:16px;display:grid;grid-template-columns:repeat(8,1fr);gap:12px"><b style="grid-column:1/-1;font:600 14px sans-serif">${T.name} · ${m}</b>${DRAWINGS.map((d) => `<figure style="margin:0;font:13px sans-serif">${drawing(d)}<figcaption>${d}</figcaption></figure>`).join('')}</section>`;
})).join('');
import { writeFileSync } from 'node:fs';
writeFileSync(process.argv[2], `<!doctype html><meta charset=utf-8><style>body{margin:0}${DRAWING_CSS}</style>${rows}`);
