// Reproduce la evidencia de F2 (regalos y confirmar) desde la raíz del repositorio:
//   SEEDS=../RSVPBackend/seeds/templates/data node docs/progress/evidence/plantillas-f2/generar.mjs
// Renderiza con el renderer web real las 16 plantillas semilla del backend, en claro y oscuro, y las mide en Chromium a 360, 768 y 1280 px.
import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const seeds = resolve(process.env.SEEDS ?? join(root, "../RSVPBackend/seeds/templates/data"));
const out = join(here, "capturas");
const work = join(here, ".work");
mkdirSync(out, { recursive: true });
mkdirSync(work, { recursive: true });

const entry = join(work, "entry.tsx");
writeFileSync(entry, `
import { renderToStaticMarkup } from "react-dom/server";
import { CelebrationRenderer, themeFromTemplate } from ${JSON.stringify(join(root, "packages/celebration-theme/src/index.tsx"))};
import { createTranslator } from "@rsvp/i18n/server";
import { GALLERY, NOW, VIEW, WEDDING_SECTIONS } from ${JSON.stringify(join(root, "packages/celebration-theme/test/fixtures.ts"))};
const t = createTranslator("es-BO");
// Peor caso: el tipo de evento NO habilita regalos (y varias plantillas tampoco lo colocan): el botón debe salir igual.
const enabled = WEDDING_SECTIONS.filter((section) => section !== "gifts");
export function render(template, colorScheme) {
  const view = { ...VIEW, enabledSections: enabled };
  return renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(template, enabled)} view={view} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" rsvpHelpHref="/c/ana-y-luis/rsvp" colorScheme={colorScheme} />);
}
`);
const bundle = join(work, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: bundle, jsx: "automatic", logLevel: "error", external: ["react", "react-dom"], nodePaths: [join(root, "node_modules")] });
const { render } = await import(pathToFileURL(bundle).href);

const css = readFileSync(join(root, "packages/celebration-theme/styles.css"), "utf8");
const templates = readdirSync(seeds).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(seeds, f), "utf8")));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: process.env.CHROMIUM_PATH ? ["--no-sandbox"] : [] });
const results = [];
for (const template of templates) {
  const doc = { id: template.key, name: template.name, ...template };
  for (const scheme of ["light", "dark"]) {
    const html = `<!doctype html><html lang="es-BO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>*,*::before,*::after{box-sizing:border-box}img{max-width:100%}body{margin:0;background:${scheme === "dark" ? "#141218" : "#fff"}}</style></head><body>${render(doc, scheme)}</body></html>`;
    for (const width of [360, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1, colorScheme: scheme });
      await page.setContent(html);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const measured = await page.evaluate(() => {
        const box = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width), right: Math.round(r.right) }; };
        const gifts = document.querySelector('a[data-action="gifts"]');
        const help = document.querySelector('a[data-action="rsvp-help"]');
        const nav = [...document.querySelectorAll(".celebration-nav a")].find((a) => a.getAttribute("href").endsWith("/regalos"));
        const font = (el) => parseFloat(getComputedStyle(el).fontSize);
        return {
          gifts: gifts ? { ...box(gifts), font: font(gifts), label: gifts.textContent, icon: Boolean(gifts.querySelector("svg")), ground: getComputedStyle(gifts).backgroundColor, ink: getComputedStyle(gifts).color } : null,
          help: help ? { ...box(help), font: font(help), label: help.textContent, icon: Boolean(help.querySelector("svg")) } : null,
          nav: nav ? { ...box(nav), font: font(nav) } : null,
          overflowX: document.documentElement.scrollWidth > innerWidth
        };
      });
      await page.screenshot({ path: join(out, `${template.key}-${scheme}-${width}.jpg`), type: "jpeg", quality: 78, fullPage: true });
      results.push({ template: template.key, layout: template.layout, scheme, width, ...measured });
      await page.close();
    }
  }
}
await browser.close();
writeFileSync(join(here, "mediciones.json"), JSON.stringify(results, null, 1) + "\n");
const lum = (c) => { const [R, G, B] = c.match(/\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
for (const r of results) if (r.gifts) r.gifts.contrast = Number(ratio(r.gifts.ground, r.gifts.ink).toFixed(2));
writeFileSync(join(here, "mediciones.json"), JSON.stringify(results, null, 1) + "\n");
const bad = results.filter((r) => !r.gifts || !r.nav || r.gifts.height < 44 || r.nav.height < 44 || r.gifts.font < 13 || r.gifts.contrast < 4.5 || !r.gifts.icon || !r.help || r.help.height < 44 || r.overflowX);
console.log(`${results.length} combinaciones; con incumplimientos: ${bad.length}`);
for (const r of bad) console.log("  ✗", r.template, r.scheme, r.width, JSON.stringify({ gifts: r.gifts, nav: r.nav, help: r.help && r.help.height, overflowX: r.overflowX }));
process.exit(bad.length ? 1 : 0);
