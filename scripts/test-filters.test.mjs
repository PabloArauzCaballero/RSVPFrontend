import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { packagesWithoutCoverage } from './test-filters.mjs';

const make = (root, dir, pkg) => {
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, 'package.json'), JSON.stringify(pkg));
};

test('un paquete ficticio con test y sin test:coverage entra en la fase sin cobertura', () => {
  const root = mkdtempSync(join(tmpdir(), 'filters-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ workspaces: ['apps/*', 'packages/*'] }));
  make(root, 'packages/con-cobertura', { name: '@x/con-cobertura', scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' } });
  make(root, 'packages/ficticio', { name: '@x/ficticio', scripts: { test: 'vitest run' } });
  make(root, 'apps/sin-pruebas', { name: '@x/sin-pruebas', scripts: { build: 'x' } });
  assert.deepEqual(packagesWithoutCoverage(root), ['@x/ficticio']);
});

const cli = fileURLToPath(new URL('./test-filters.mjs', import.meta.url));
const monorepo = (workspaces = ['packages/*']) => {
  const root = mkdtempSync(join(tmpdir(), 'filters-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ workspaces }));
  return root;
};

test('cero paquetes sin cobertura da una lista vacía', () => {
  const root = monorepo();
  make(root, 'packages/a', { name: '@x/a', scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' } });
  assert.deepEqual(packagesWithoutCoverage(root), []);
  const run = spawnSync('node', [cli], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.equal(run.stdout.trim(), '');
});

test('el CLI imprime los --filter separados por espacio', () => {
  const root = monorepo();
  make(root, 'packages/b', { name: '@x/b', scripts: { test: 'x' } });
  make(root, 'packages/ficticio', { name: '@x/ficticio', scripts: { test: 'x' } });
  const run = spawnSync('node', [cli], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.equal(run.stdout.trim(), '--filter=@x/b --filter=@x/ficticio');
});

test('un paquete con test pero sin name falla con un mensaje claro', () => {
  const root = monorepo();
  make(root, 'packages/sin-nombre', { scripts: { test: 'x' } });
  assert.throws(() => packagesWithoutCoverage(root), /sin-nombre.*no "name"/);
  assert.notEqual(spawnSync('node', [cli], { cwd: root, encoding: 'utf8' }).status, 0);
});

test('un patrón de workspaces no soportado falla; una ruta literal se admite', () => {
  assert.throws(() => packagesWithoutCoverage(monorepo(['a/**'])), /no soportado/);
  const root = monorepo(['tools/x']);
  make(root, 'tools/x', { name: '@x/tools', scripts: { test: 'x' } });
  assert.deepEqual(packagesWithoutCoverage(root), ['@x/tools']);
});
