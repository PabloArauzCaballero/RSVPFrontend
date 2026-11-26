// Imprime los `--filter` de la segunda fase de pruebas de CI: los workspaces con script `test` y SIN `test:coverage`.
// La lista sale de los package.json, no de una enumeración manual: un paquete nuevo con `test` queda cubierto por
// `turbo run test:coverage` (si tiene ese script) o por esta fase (si no lo tiene); no hay una tercera posibilidad.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Patrones de workspaces soportados: `dir/*` (los que usa el package.json raíz: `apps/*` y `packages/*`) y rutas literales
// (`tools/x`). Cualquier otro patrón (`a/**`, `*/x`, `{a,b}`) lanza un error: ignorarlo dejaría paquetes sin probar.
function workspaceDirs(root, pattern) {
  if (/^[^*?{}[\]!]+\/\*$/.test(pattern)) {
    const base = pattern.slice(0, -2);
    if (!existsSync(join(root, base))) return [];
    return readdirSync(join(root, base), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(base, d.name));
  }
  if (/[*?{}[\]!]/.test(pattern)) throw new Error(`Patrón de workspaces no soportado: "${pattern}". Usa "dir/*" o una ruta literal.`);
  return [pattern];
}

export function packagesWithoutCoverage(root) {
  const workspaces = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).workspaces;
  if (!Array.isArray(workspaces)) throw new Error('El package.json raíz no declara "workspaces" como lista.');
  const names = [];
  for (const pattern of workspaces) {
    for (const dir of workspaceDirs(root, pattern)) {
      const file = join(root, dir, 'package.json');
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, 'utf8'));
      if (!pkg.scripts?.test || pkg.scripts['test:coverage']) continue;
      if (typeof pkg.name !== 'string' || pkg.name === '') throw new Error(`${join(dir, 'package.json')} tiene script "test" pero no "name".`);
      names.push(pkg.name);
    }
  }
  return names.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(packagesWithoutCoverage(process.cwd()).map((name) => `--filter=${name}`).join(' '));
}
