// PLA-02 evidence harness: renders all 36 design documents v2 with the real renderer and stylesheet into static HTML so a browser can measure
// and photograph the cover at 360, 900 and 1280 px. Usage: npx vite-node scripts/typography-harness.tsx <output-dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { GALLERY, NOW, t, VIEW } from "../test/fixtures.js";
import { CelebrationRenderer, themeFromTemplate, type TemplateDocument } from "../src/index.js";
import type { DesignDocumentV2 } from "../src/design/types.js";
import { DESIGN_TEMPLATES } from "../src/design/documents/index.js";
import { BODAS_TEMPLATES } from "../src/design/documents/bodas.js";
import { FIESTAS_TEMPLATES } from "../src/design/documents/fiestas.js";
import { INFANTIL_RITOS_TEMPLATES } from "../src/design/documents/infantil-ritos.js";
import { SOBRIO_TEMPLATES } from "../src/design/documents/sobrio.js";
import { EXTRA_TEMPLATES } from "../src/design/documents/extra.js";

interface Entry { readonly key?: string; readonly name: string; readonly description: string; readonly eventTypeTags: readonly string[]; readonly layout: string; readonly theme: unknown; readonly sectionOrder: readonly string[] }
const groups: readonly Record<string, Entry>[] = [DESIGN_TEMPLATES, BODAS_TEMPLATES, FIESTAS_TEMPLATES, INFANTIL_RITOS_TEMPLATES, SOBRIO_TEMPLATES, EXTRA_TEMPLATES] as unknown as readonly Record<string, Entry>[];
const out = process.argv[2] ?? "typography-harness";
mkdirSync(out, { recursive: true });
const css = readFileSync(join(import.meta.dirname, "..", "styles.css"), "utf8");
const view = { ...VIEW, enabledSections: [...VIEW.enabledSections] };
const names: string[] = [];
for (const group of groups) {
  for (const [key, entry] of Object.entries(group)) {
    const template: TemplateDocument = { id: key, name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout as TemplateDocument["layout"], theme: entry.theme as DesignDocumentV2, sectionOrder: entry.sectionOrder as TemplateDocument["sectionOrder"], version: 2 };
    const theme = themeFromTemplate(template, view.enabledSections);
    const body = renderToStaticMarkup(<CelebrationRenderer theme={theme} view={view} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" />);
    writeFileSync(join(out, `${key}.html`), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${body}</body></html>`);
    names.push(key);
  }
}
writeFileSync(join(out, "index.json"), JSON.stringify(names));
console.log(`${names.length} templates`);
