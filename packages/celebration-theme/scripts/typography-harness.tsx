// PLA-02 evidence harness: renders real design documents with the real renderer and stylesheet into static HTML so a browser can measure
// the cover title at 360, 768 and 1280 px. Usage: yarn vite-node scripts/typography-harness.tsx <output-dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { GALLERY, NOW, t, VIEW } from "../test/fixtures.js";
import { CelebrationRenderer, fontStylesheet, themeFromTemplate } from "../src/index.js";
import { designTemplate } from "../src/design/documents/index.js";

const out = process.argv[2] ?? "typography-harness";
mkdirSync(out, { recursive: true });
const css = readFileSync(join(import.meta.dirname, "..", "styles.css"), "utf8");
const view = { ...VIEW, enabledSections: [...VIEW.enabledSections] };
for (const name of ["pinata", "marfil", "gala"] as const) {
  const theme = themeFromTemplate(designTemplate(name), view.enabledSections);
  const body = renderToStaticMarkup(<CelebrationRenderer theme={theme} view={view} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" />);
  const fonts = theme.design ? "" : fontStylesheet(theme);
  writeFileSync(join(out, `${name}.html`), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}${css}</style></head><body>${body}</body></html>`);
}
