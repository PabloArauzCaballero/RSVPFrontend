// L16 evidence: before/after captures with real Chrome. Usage: node l16-capture.mjs <outDir> <label>
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, label] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const APP = 'http://localhost:8391';
const SITE = 'http://localhost:3191';
const pages = [
  ['app-login', APP, '/login'],
  ['app-404', APP, '/no-existe-l16'],
  ['app-vacio-directorio', APP, '/proveedores/buscar?precioMax=1'],
  ['site-404', SITE, '/no-existe-l16'],
  ['site-404-celebracion', SITE, '/c/no-existe-l16']
];
const browser = await chromium.launch({ timeout: 120_000, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const prior = join(outDir, `medidas-${label}.json`);
const results = existsSync(prior) ? JSON.parse(readFileSync(prior, 'utf8')) : [];
const only = process.env.ONLY;
for (const [name, base, path] of pages) {
  for (const scheme of ['light', 'dark']) {
    for (const width of [1280, 390]) {
      if (only && only !== name) continue;
      if (results.some((r) => r.name === name && r.scheme === scheme && r.width === width)) continue;
      const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: scheme, reducedMotion: 'reduce', locale: 'es-BO' });
      const page = await ctx.newPage();
      // The contract mock does not filter, so the empty directory is staged by emptying the list responses (same contract shape).
      if (name === 'app-vacio-directorio') await page.route(/localhost:28390\/.*(provider|listing)/i, async (route) => {
        const res = await route.fetch(); const body = await res.json().catch(() => null);
        if (body && Array.isArray(body.items)) return route.fulfill({ response: res, json: { ...body, items: [], ...(typeof body.total === 'number' ? { total: 0 } : {}), ...('nextCursor' in body ? { nextCursor: null } : {}) } });
        return route.fulfill({ response: res });
      });
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120_000 });
      const found = await page.waitForSelector('svg[data-illustration], svg.art', { timeout: 30_000 }).then(() => true, () => false);
      if (!found) { console.log(`${name} ${scheme} ${width}: sin ilustración (${page.url()})`); await page.screenshot({ path: join(outDir, `${name}-${scheme}-${width}-${label}.png`) }); results.push({ name, scheme, width, path, art: null }); writeFileSync(prior, JSON.stringify(results, null, 2) + '\n'); await ctx.close(); continue; }
      await page.evaluate(() => { document.querySelector('svg[data-illustration], svg.art').scrollIntoView({ block: 'center' }); return document.fonts.ready; });
      await page.waitForTimeout(400);
      const art = await page.evaluate(() => {
        const svg = document.querySelector('svg[data-illustration], svg.art');
        const r = svg.getBoundingClientRect();
        const fill = (sel, i) => { const el = svg.querySelectorAll(sel)[i]; return el ? getComputedStyle(el).fill : null; };
        let bg = 'rgba(0, 0, 0, 0)'; for (let el = svg.parentElement; el && bg === 'rgba(0, 0, 0, 0)'; el = el.parentElement) bg = getComputedStyle(el).backgroundColor;
        if (bg === 'rgba(0, 0, 0, 0)') bg = getComputedStyle(document.body).backgroundColor;
        return { x: r.x, y: r.y, w: r.width, h: r.height, disc: fill('path', 0), shadow: fill('path', 1), ground: bg, theme: document.documentElement.getAttribute('data-theme') };
      });
      const file = `${name}-${scheme}-${width}-${label}.png`;
      await page.screenshot({ path: join(outDir, file), timeout: 120_000 });
      const pad = 24;
      await page.screenshot({ path: join(outDir, `zoom-${name}-${scheme}-${width}-${label}.png`), clip: { x: Math.max(0, art.x - pad), y: Math.max(0, art.y - pad), width: art.w + 2 * pad, height: art.h + 2 * pad }, timeout: 120_000 });
      results.push({ name, scheme, width, path, ...art, file });
      writeFileSync(prior, JSON.stringify(results, null, 2) + '\n');
      await ctx.close();
    }
  }
}
await browser.close();
results.sort((a, b) => `${a.name}${a.scheme}${a.width}`.localeCompare(`${b.name}${b.scheme}${b.width}`));
writeFileSync(join(outDir, `medidas-${label}.json`), JSON.stringify(results, null, 2) + '\n');
for (const r of results) console.log(`${r.name} ${r.scheme} ${r.width}: fondo=${r.ground} disco=${r.disc} sombra=${r.shadow}`);
