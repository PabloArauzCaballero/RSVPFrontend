// Imprime los `--filter` de la segunda fase de pruebas de CI: los workspaces con script `test` y SIN `test:coverage`.
// La lista sale de los package.json, no de una enumeración manual: un paquete nuevo con `test` queda cubierto por
// `turbo run test:coverage` (si tiene ese script) o por esta fase (si no lo tiene); no hay una tercera posibilidad.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function packagesWithoutCoverage(root) {
  const workspaces = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).workspaces ?? [];
  const names = [];
  for (const pattern of workspaces) {
    const base = pattern.replace(/\/\*$/, '');
    if (!existsSync(join(root, base))) continue;
    for (const dir of readdirSync(join(root, base), { withFileTypes: true })) {
      const file = join(root, base, dir.name, 'package.json');
      if (!dir.isDirectory() || !existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, 'utf8'));
      if (pkg.scripts?.test && !pkg.scripts['test:coverage']) names.push(pkg.name);
    }
  }
  return names.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(packagesWithoutCoverage(process.cwd()).map((name) => `--filter=${name}`).join(' '));
}
