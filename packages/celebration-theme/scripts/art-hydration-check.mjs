#!/usr/bin/env node
/**
 * Real-browser check of the entrance animation with server-side rendering (N3): the page is rendered to a string, served as static
 * HTML, and its client bundle is loaded 600 ms late, as a slow hydration would. A drawing already on screen must never leave its final
 * state (no 1, 0, 1 flicker); one below the fold must be armed (hidden) and then play once when scrolled to.
 *
 *   yarn workspace @rsvp/celebration-theme art:hydration   (CHROMIUM_PATH if Playwright's Chromium is not the installed one)
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = join(tmpdir(), `art-hydration-${process.pid}`);
await mkdir(work, { recursive: true });
const page = (id, animate) => `createElement(InvitationArt, { drawing: DRAWINGS.find((d) => d.id === "${id}"), animate: ${animate}, palette: SEED_TEMPLATES[0].palette })`;
await writeFile(join(work, "app.tsx"), `
import { createElement } from "react";
import { DRAWINGS, InvitationArt } from ${JSON.stringify(join(root, "src/art/index.tsx"))};
import { SEED_TEMPLATES } from ${JSON.stringify(join(root, "test/seed-palettes.ts"))};
export const App = () => createElement("main", null,
  createElement("div", { id: "top" }, ${page("sobre", true)}),
  createElement("div", { style: { height: "2400px" } }),
  createElement("div", { id: "below" }, ${page("regalo", true)}));
`);
await writeFile(join(work, "client.tsx"), `import { hydrateRoot } from "react-dom/client"; import { createElement } from "react"; import { App } from "./app"; hydrateRoot(document.getElementById("root")!, createElement(App));`);
await writeFile(join(work, "server.tsx"), `import { renderToString } from "react-dom/server"; import { createElement } from "react"; import { App } from "./app"; export const html = () => renderToString(createElement(App));`);
const common = { bundle: true, format: "esm", jsx: "automatic", logLevel: "error", nodePaths: [join(root, "node_modules"), join(root, "../../node_modules")] };
await build({ ...common, entryPoints: [join(work, "client.tsx")], outfile: join(work, "client.js"), platform: "browser", define: { "process.env.NODE_ENV": '"production"' } });
await build({ ...common, entryPoints: [join(work, "server.tsx")], outfile: join(work, "server.mjs"), platform: "node", banner: { js: "import { createRequire as __cr } from \"node:module\"; const require = __cr(import.meta.url);" } });
const { html } = await import(pathToFileURL(join(work, "server.mjs")).href);
const css = await readFile(join(root, "src/art/art.css"), "utf8");
const doc = `<!doctype html><meta charset="utf-8"><style>${css} body{margin:0;background:#FBF7F0}</style><div id="root">${html()}</div><script>setTimeout(()=>{const s=document.createElement("script");s.type="module";s.src="client.js";document.body.append(s)},600)</script>`;
await writeFile(join(work, "index.html"), doc);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox", "--allow-file-access-from-files"] } : { args: ["--allow-file-access-from-files"] });
let failed = false;
try {
  const tab = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await tab.addInitScript(() => {
    window.__top = []; window.__below = [];
    const sample = () => {
      const op = (sel) => { const g = document.querySelector(`${sel} [data-step]`); return g ? Number(getComputedStyle(g).opacity) : null; };
      const t = performance.now();
      window.__top.push([Math.round(t), op("#top"), document.querySelector("#top svg")?.getAttribute("data-art-phase") ?? null]);
      window.__below.push([Math.round(t), op("#below"), document.querySelector("#below svg")?.getAttribute("data-art-phase") ?? null]);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await tab.goto(pathToFileURL(join(work, "index.html")).href);
  await tab.waitForTimeout(1600);
  const afterHydration = await tab.evaluate(() => ({ top: window.__top, below: window.__below }));
  const topMin = Math.min(...afterHydration.top.map((row) => row[1] ?? 1));
  const topPhases = [...new Set(afterHydration.top.map((row) => row[2]))];
  const belowArmed = afterHydration.below.some((row) => row[2] === "armed" && row[1] === 0);
  await tab.evaluate(() => document.querySelector("#below").scrollIntoView({ block: "center" }));
  await tab.waitForTimeout(1500);
  const final = await tab.evaluate(() => ({ phase: document.querySelector("#below svg").getAttribute("data-art-phase"), opacities: [...document.querySelectorAll("#below [data-step]")].map((g) => Number(getComputedStyle(g).opacity)) }));
  console.log(JSON.stringify({ topMinOpacityDuringHydration: topMin, topPhases, belowArmedAndHidden: belowArmed, belowAfterScroll: final }));
  if (topMin !== 1 || topPhases.some((phase) => phase !== null)) { failed = true; console.error("FAIL: the drawing on screen flickered or was armed"); }
  if (!belowArmed) { failed = true; console.error("FAIL: the drawing below the fold was not armed"); }
  if (final.phase !== "in" || final.opacities.some((o) => o !== 1)) { failed = true; console.error("FAIL: the drawing below the fold did not enter"); }
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
