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
/** `export const <name> = '<value>'` de colors.ts. */
const pickConst = (src, name) => {
  const m = src.match(new RegExp(`export const ${name} = '([^']+)'`));
  if (!m) throw new Error(`Token ${name} no encontrado`);
  return m[1];
};
/** `<key>` dentro del primer bloque `<scheme>: { ... }` de colors.ts (el de `colors`, antes que `tones` y `chips`). */
const pickIn = (src, scheme, key) => {
  const m = src.match(new RegExp(`${scheme}:\\s*\\{[^}]*?\\b${key}:\\s*'([^']+)'`));
  if (!m) throw new Error(`Token ${scheme}.${key} no encontrado`);
  return m[1];
};
// Paleta DOne vigente (rediseño #12): el icono y las imágenes para compartir van en tinta sobre hueso, monocromo,
// con el acento del esquema oscuro como único color. `ink`/`bone` son las anclas "fuera de esquema" de colors.ts.
const c = { ink: pickConst(colorSrc, 'ink'), bone: pickConst(colorSrc, 'bone'), accent: pickIn(colorSrc, 'dark', 'accent') };

const SYMBOL_W = 86, SYMBOL_H = 100;
/** Símbolo centrado en un lienzo cuadrado `size`, ocupando `ratio` del lado. */
const symbolAt = (size, ratio, fill) => {
  const scale = (size * ratio) / SYMBOL_H;
  const x = (size - SYMBOL_W * scale) / 2, y = (size - SYMBOL_H * scale) / 2;
  return `<path fill="${fill}" transform="translate(${x} ${y}) scale(${scale})" d="${logo.symbol}"/>`;
};
const svg = (w, h, body, defs = '') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`);

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
    build: () => svg(1024, 1024, `<rect width="1024" height="1024" fill="${c.ink}"/>${symbolAt(1024, 0.56, c.bone)}`) },
  { out: 'apps/universal/assets/adaptive-icon.png', w: 1024, h: 1024, // Android: primer plano con zona segura (66 %) sobre transparente
    build: () => svg(1024, 1024, symbolAt(1024, 0.44, c.bone)) },
  { out: 'apps/universal/assets/splash-icon.png', w: 1024, h: 1024,
    build: () => svg(1024, 1024, symbolAt(1024, 0.42, c.ink)) },
  { out: 'apps/universal/assets/favicon.png', w: 48, h: 48,
    build: () => svg(48, 48, `<rect width="48" height="48" rx="12" fill="${c.ink}"/>${symbolAt(48, 0.56, c.bone)}`) },
  { out: 'apps/universal/assets/notification-icon.png', w: 96, h: 96, // Android exige silueta blanca sobre transparente
    build: () => svg(96, 96, symbolAt(96, 0.7, '#FFFFFF')) },
  // --- Sitio público (Next metadata files) ---
  { out: 'apps/seo-web/app/apple-icon.png', w: 180, h: 180,
    build: () => svg(180, 180, `<rect width="180" height="180" fill="${c.ink}"/>${symbolAt(180, 0.56, c.bone)}`) },
  { out: 'apps/seo-web/app/opengraph-image.png', w: 1200, h: 630,
    build: () => svg(1200, 630, `<rect width="1200" height="630" fill="${c.ink}"/>${wordmark(1200, 630, 0.52, c.bone)}<rect x="520" y="470" width="160" height="6" rx="3" fill="${c.accent}"/>`) },
  { out: 'apps/seo-web/app/twitter-image.png', w: 1200, h: 600,
    build: () => svg(1200, 600, `<rect width="1200" height="600" fill="${c.ink}"/>${wordmark(1200, 600, 0.52, c.bone)}<rect x="520" y="450" width="160" height="6" rx="3" fill="${c.accent}"/>`) },
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
