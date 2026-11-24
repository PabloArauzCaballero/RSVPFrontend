#!/usr/bin/env node
/**
 * Catalogue of the invitation art (F3): every drawing and ornament on four seeded palettes (Clásico marfil, Piñata, Gala dorada,
 * Editorial granate), light and dark, rendered by Chromium. One sheet per palette and scheme, written to the evidence folder.
 *
 *   yarn workspace @rsvp/celebration-theme art:catalogue [--out <dir>] [--ids a,b,c] [--only <palette-key>] [--scale 1]
 *
 * It bundles the real module (`src/art`) with esbuild and renders it with react-dom/server, so the screenshots show exactly the
 * data the tests pin; nothing is drawn by hand here.
 */
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1] ?? "true"]] : pairs), []));
const out = resolve(args.out ?? join(root, "../../docs/progress/evidence/plantillas-f3"));
const ids = args.ids ? new Set(String(args.ids).split(",")) : null;
const scale = Number(args.scale ?? 1);
const KEYS = ["clasico-marfil", "pinata", "gala-dorada", "editorial-granate"].filter((key) => !args.only || key === args.only);

const artCss = await readFile(join(root, "src/art/art.css"), "utf8");
const work = join(tmpdir(), `art-catalogue-${process.pid}`);
await mkdir(work, { recursive: true });
const entry = join(work, "entry.tsx");
const bundle = join(work, "bundle.mjs");
await writeFile(entry, `
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DRAWINGS, ORNAMENT_SETS, InvitationArt, OrnamentSeparator, OrnamentFrame, ART_EVENTS } from ${JSON.stringify(join(root, "src/art/index.tsx"))};
import { SEED_TEMPLATES } from ${JSON.stringify(join(root, "test/seed-palettes.ts"))};
import { darkPaletteOf } from ${JSON.stringify(join(root, "test/dark-palette.ts"))};
export { DRAWINGS, ORNAMENT_SETS, SEED_TEMPLATES, darkPaletteOf, ART_EVENTS };
export const markup = (node) => renderToStaticMarkup(node);
export { createElement, InvitationArt, OrnamentSeparator, OrnamentFrame };
`);
await build({ entryPoints: [entry], bundle: true, outfile: bundle, format: "esm", platform: "node", jsx: "automatic", logLevel: "error", banner: { js: "import { createRequire as __cr } from \"node:module\"; const require = __cr(import.meta.url);" }, nodePaths: [join(root, "node_modules"), join(root, "../../node_modules")] });
const lib = await import(pathToFileURL(bundle).href);
const { DRAWINGS, ORNAMENT_SETS, SEED_TEMPLATES, darkPaletteOf, markup, createElement, InvitationArt, OrnamentSeparator, OrnamentFrame, ART_EVENTS } = lib;

const EVENT_NAMES = { common: "Comunes", boda: "Boda", aniversario: "Aniversario", quinceanos: "Quinceaños", bautizo: "Bautizo", "cumpleanos-infantil": "Cumpleaños infantil", "cumpleanos-adulto": "Cumpleaños adulto", corporativo: "Corporativo", graduacion: "Graduación", "baby-shower": "Baby shower y revelación", comunion: "Comunión y confirmación", "despedida-reunion": "Despedidas y reuniones", patronal: "Fiesta patronal", inauguracion: "Inauguración", pedida: "Pedida y compromiso", "despedida-soltero": "Despedida de soltero/a", "bodas-oro-plata": "Bodas de oro y plata", reencuentro: "Reencuentro", tematica: "Fiesta temática y fin de año" };

function sheet(template, scheme) {
  const palette = scheme === "dark" ? darkPaletteOf(template.palette) : template.palette;
  const own = (event) => DRAWINGS.filter((item) => item.events[0] === event && (!ids || ids.has(item.id)));
  const groups = ART_EVENTS.map((event) => ({ event, items: own(event) })).filter((group) => group.items.length);
  const tiles = (items) => items.map((item) => `<figure>${markup(createElement(InvitationArt, { drawing: item, palette, style: { "--celebration-art-size": "132px" } }))}<figcaption>${item.id}</figcaption></figure>`).join("");
  const sections = groups.map((group) => `<h2>${EVENT_NAMES[group.event]}</h2><div class="grid">${tiles(group.items)}</div>`).join("");
  const ornaments = ids ? "" : `<h2>Ornamentos</h2><div class="orn">${ORNAMENT_SETS.map((set) => `<div class="row"><b>${set.id}</b>${markup(createElement(OrnamentSeparator, { set, palette, style: { "--celebration-art-size": "280px" } }))}${markup(createElement(OrnamentFrame, { set, palette, width: 240, height: 150, style: { "--celebration-art-size": "240px" } }))}</div>`).join("")}</div>`;
  const SAMPLE = ["sobre", "anillos", "pinata", "cifra-25", "tijera-cinta", "cartel", "mascara-morenada", "paloma", "ramo", "laurel", "uvas", "rosario"];
  const sample = DRAWINGS.filter((item) => SAMPLE.includes(item.id));
  const small = ids ? "" : `<h2>A 48 px, para comprobar que se leen</h2><div class="grid">${sample.map((item) => `<figure style="width:64px">${markup(createElement(InvitationArt, { drawing: item, palette, style: { "--celebration-art-size": "48px" } }))}</figure>`).join("")}</div>`;
  const onAccent = ids ? "" : `<h2>Sobre un bloque de acento (suelo «accent»: el disco es un halo del color del lienzo)</h2><div class="accentblock"><div class="grid">${sample.map((item) => `<figure style="width:96px">${markup(createElement(InvitationArt, { drawing: item, palette, ground: "accent", style: { "--celebration-art-size": "84px" } }))}</figure>`).join("")}</div></div>`;
  return `<!doctype html><meta charset="utf-8"><style>${artCss}
    body{margin:0;padding:24px 28px 40px;background:${palette.canvas};color:${palette.text};font:13px/1.3 system-ui,sans-serif;width:1240px}
    h1{font:600 20px system-ui;margin:0 0 4px} h2{font:600 15px system-ui;margin:26px 0 8px;padding-top:8px;border-top:1px solid ${palette.text}22}
    .grid{display:flex;flex-wrap:wrap;gap:10px 8px} figure{margin:0;width:150px;text-align:center} figcaption{font-size:11px;opacity:.7}
    .celebration-art{margin:0 auto} .accentblock{background:${palette.accent};padding:18px 12px;border-radius:12px} .orn .row{display:flex;gap:28px;align-items:center;margin:10px 0} .orn b{width:110px;font-size:12px}
  </style><h1>${template.name} · ${scheme === "dark" ? "oscuro" : "claro"}</h1>${sections}${small}${onAccent}${ornaments}`;
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
try {
  for (const key of KEYS) {
    const template = SEED_TEMPLATES.find((item) => item.key === key);
    for (const scheme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width: 1300, height: 800 }, deviceScaleFactor: scale });
      await page.setContent(sheet(template, scheme));
      const file = join(out, `${key}-${scheme === "dark" ? "oscuro" : "claro"}.png`);
      if (args.crop) { const [y0, y1] = String(args.crop).split(",").map(Number); await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: y0, width: 1300, height: y1 - y0 } }); }
      else await page.screenshot({ path: file, fullPage: true });
      await page.close();
      console.log(file);
    }
  }
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
