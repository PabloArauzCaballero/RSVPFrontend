import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
