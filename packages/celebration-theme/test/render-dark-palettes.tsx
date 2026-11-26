// Evidence tool (docs/progress/evidence/plantillas-fase0): renders the 16 seeded templates through CelebrationRenderer, dark scheme,
// into static HTML files next to styles.css. Usage: vite-node test/render-dark-palettes.tsx <seedsDir> <outDir> [dark|light] [es-BO|en-US]
// With a locale the copy comes from the real @rsvp/i18n catalogue; without it, keys are echoed.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { CelebrationRenderer, themeFromTemplate, themeVariables, type TemplateDocument } from "../src/index.js";
import { createTranslator } from "../../i18n/src/index.js";
import { NOW, t as echo, VIEW } from "./fixtures.js";

const [seedsDir, outDir, scheme = "dark", locale] = process.argv.slice(2);
if (!seedsDir || !outDir || (scheme !== "dark" && scheme !== "light") || (locale !== undefined && locale !== "es-BO" && locale !== "en-US")) throw new Error("usage: <seedsDir> <outDir> [dark|light] [es-BO|en-US]");
const t = locale ? createTranslator(locale) : echo;
mkdirSync(outDir, { recursive: true });
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
for (const file of readdirSync(seedsDir).filter((name) => name.endsWith(".json")).sort()) {
  const seed = JSON.parse(readFileSync(join(seedsDir, file), "utf8")) as Omit<TemplateDocument, "id">;
  const template: TemplateDocument = { ...seed, id: file.replace(/\.json$/, "") };
  const theme = themeFromTemplate(template, VIEW.enabledSections);
  const html = renderToStaticMarkup(<CelebrationRenderer theme={theme} view={VIEW} t={t} now={NOW} colorScheme={scheme} />);
  const page = `<!doctype html><html lang="${locale ?? "es-BO"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${template.name}</title><style>${css}</style></head><body style="margin:0;background:${themeVariables(theme, scheme)["--celebration-canvas"]}">${html}</body></html>`;
  writeFileSync(join(outDir, `${template.id}.html`), page);
}
process.stdout.write(`rendered ${readdirSync(outDir).length} files to ${outDir}\n`);
