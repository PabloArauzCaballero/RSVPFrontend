import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const out = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const k of process.argv.slice(2).length ? process.argv.slice(2) : ['marfil', 'pinata', 'gala']) {
  const mod = await import(`./${k}.mjs`);
  writeFileSync(join(out, `${k}.html`), mod.default);
  console.log('built', k, (mod.default.length / 1024).toFixed(0) + ' KB');
}
