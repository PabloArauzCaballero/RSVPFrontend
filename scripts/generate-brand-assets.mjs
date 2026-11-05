// Genera los assets de marca (iconos, splash, favicon, imágenes para compartir) desde el logo y los tokens.
// Fuente única: packages/design-tokens/src/{logo,colors}.ts. Uso: node scripts/generate-brand-assets.mjs [--check]
// Sin fuentes del sistema: todo es geometría vectorial (el logotipo ya son paths), el resultado es determinista.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const logoSrc = read('packages/design-tokens/src/logo.ts');
const colorSrc = read('packages/design-tokens/src/colors.ts');
const pick = (src, key) => {
  const m = src.match(new RegExp(`${key}:\\s*'([^']+)'`));
  if (!m) throw new Error(`Token ${key} no encontrado`);
  return m[1];
};
const logo = { viewBox: pick(logoSrc, 'viewBox'), mark: pick(logoSrc, 'mark'), word: pick(logoSrc, 'word'), symbol: pick(logoSrc, 'symbol') };
const c = { azul: pick(colorSrc, 'azul'), azulOsc: pick(colorSrc, 'azulOsc'), azulCl: pick(colorSrc, 'azulCl'), noche: pick(colorSrc, 'noche'), medianoche: pick(colorSrc, 'medianoche'), cielo: pick(colorSrc, 'cielo'), bruma: pick(colorSrc, 'bruma'), ambar: pick(colorSrc, 'ambar') };

const SYMBOL_W = 86, SYMBOL_H = 100;
/** Símbolo centrado en un lienzo cuadrado `size`, ocupando `ratio` del lado. */
const symbolAt = (size, ratio, fill) => {
  const scale = (size * ratio) / SYMBOL_H;
  const x = (size - SYMBOL_W * scale) / 2, y = (size - SYMBOL_H * scale) / 2;
  return `<path fill="${fill}" transform="translate(${x} ${y}) scale(${scale})" d="${logo.symbol}"/>`;
};
const svg = (w, h, body, defs = '') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`);
const gradient = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;

const [vx, vy, vw, vh] = logo.viewBox.split(/\s+/).map(Number);
/** Logotipo completo (marca + palabra) centrado en un lienzo w×h, ocupando `ratio` del ancho. */
const wordmark = (w, h, ratio, fill) => {
  const scale = (w * ratio) / vw;
  const x = (w - vw * scale) / 2 - vx * scale, y = (h - vh * scale) / 2 - vy * scale;
  return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${scale})"><path d="${logo.mark}"/><path d="${logo.word}"/></g>`;
};

const assets = [
  // --- App universal (Expo) ---
  { out: 'apps/universal/assets/icon.png', w: 1024, h: 1024, // iOS: sin transparencia ni esquinas redondeadas, las aplica el sistema
    build: () => svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#g)"/>${symbolAt(1024, 0.56, '#FFFFFF')}`, gradient('g', c.azulCl, c.azulOsc)) },
  { out: 'apps/universal/assets/adaptive-icon.png', w: 1024, h: 1024, // Android: primer plano con zona segura (66 %) sobre transparente
    build: () => svg(1024, 1024, symbolAt(1024, 0.44, '#FFFFFF')) },
  { out: 'apps/universal/assets/splash-icon.png', w: 1024, h: 1024,
    build: () => svg(1024, 1024, symbolAt(1024, 0.42, c.azul)) },
  { out: 'apps/universal/assets/favicon.png', w: 48, h: 48,
    build: () => svg(48, 48, `<rect width="48" height="48" rx="12" fill="${c.azul}"/>${symbolAt(48, 0.56, '#FFFFFF')}`) },
  { out: 'apps/universal/assets/notification-icon.png', w: 96, h: 96, // Android exige silueta blanca sobre transparente
    build: () => svg(96, 96, symbolAt(96, 0.7, '#FFFFFF')) },
  // --- Sitio público (Next metadata files) ---
  { out: 'apps/seo-web/app/apple-icon.png', w: 180, h: 180,
    build: () => svg(180, 180, `<rect width="180" height="180" fill="url(#g)"/>${symbolAt(180, 0.56, '#FFFFFF')}`, gradient('g', c.azulCl, c.azulOsc)) },
  { out: 'apps/seo-web/app/opengraph-image.png', w: 1200, h: 630,
    build: () => svg(1200, 630, `<rect width="1200" height="630" fill="url(#g)"/><circle cx="1080" cy="80" r="260" fill="${c.azul}" opacity=".35"/><circle cx="90" cy="600" r="210" fill="${c.cielo}" opacity=".12"/>${wordmark(1200, 630, 0.52, '#FFFFFF')}<rect x="520" y="470" width="160" height="6" rx="3" fill="${c.ambar}"/>`, gradient('g', c.noche, c.medianoche)) },
  { out: 'apps/seo-web/app/twitter-image.png', w: 1200, h: 600,
    build: () => svg(1200, 600, `<rect width="1200" height="600" fill="url(#g)"/><circle cx="1080" cy="70" r="250" fill="${c.azul}" opacity=".35"/>${wordmark(1200, 600, 0.52, '#FFFFFF')}<rect x="520" y="450" width="160" height="6" rx="3" fill="${c.ambar}"/>`, gradient('g', c.noche, c.medianoche)) },
];

let stale = 0;
for (const a of assets) {
  const png = await sharp(a.build(), { density: 144 }).resize(a.w, a.h).png({ compressionLevel: 9 }).toBuffer();
  const file = join(root, a.out);
  if (process.argv.includes('--check')) {
    if (!existsSync(file) || !readFileSync(file).equals(png)) { console.error(`Desactualizado: ${a.out}`); stale += 1; }
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, png);
    console.log(`${a.out} ${a.w}x${a.h} (${png.length} B)`);
  }
}
if (stale) process.exit(1);
