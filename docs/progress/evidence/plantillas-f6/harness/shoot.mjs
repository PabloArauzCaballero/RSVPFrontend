// Linux screenshots of the F6 components. Usage: node shoot.mjs <outDir>  (bundle.js, bg.webp and bg.avif next to it come from the build step in the PR body)
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const work = process.env.HARNESS_DIR ?? "/tmp/claude-0/h";
const out = resolve(process.argv[2] ?? ".");
const css = readFileSync(new URL("../../../../../packages/celebration-theme/styles.css", import.meta.url), "utf8");
const palettes = {
  light: { canvas: "#FBF7F0", surface: "#FFFFFF", text: "#2B2622", accent: "#7A5230", muted: "#665C52" },
  dark: { canvas: "#141218", surface: "#1E1C22", text: "#ECE6EE", accent: "#C9A27E", muted: "#B9B1BF" }
};
const page = (scheme) => `<!doctype html><html lang="es-BO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
:root{--celebration-canvas:${palettes[scheme].canvas};--celebration-surface:${palettes[scheme].surface};--celebration-text:${palettes[scheme].text};--celebration-accent:${palettes[scheme].accent};--celebration-muted:${palettes[scheme].muted};--celebration-max-width:40rem;--celebration-heading-font:Georgia,serif;--celebration-body-font:Arial,sans-serif;--celebration-heading-scale:1;--celebration-radius:8px}
body{margin:0}</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const scheme of ["light", "dark"]) {
  writeFileSync(`${work}/index-${scheme}.html`, page(scheme));
  for (const [name, width, height] of [["360", 360, 900], ["1280", 1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: scheme });
    const tab = await context.newPage();
    const requests = [];
    tab.on("request", (request) => requests.push(request.url()));
    await tab.goto(`file://${work}/index-${scheme}.html`);
    await tab.waitForSelector(".celebration-embed");
    await tab.screenshot({ path: `${out}/medios-facades-${name}-${scheme}.png`, fullPage: true });
    const external = requests.filter((url) => /^https?:/.test(url));
    console.log(`${scheme} ${name}: ${requests.length} requests, ${external.length} to the network before any tap`, external);
    await context.close();
  }
}
await browser.close();
