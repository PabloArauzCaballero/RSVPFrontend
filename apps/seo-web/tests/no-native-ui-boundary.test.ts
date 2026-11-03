import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** REQ-F02-06: seo-web must never reach the React Native UI package (or other native-only packages). */
const SOURCE_FILE = /\.[cm]?[jt]sx?$/;
const FORBIDDEN = /(?:from\s*|import\s*\(\s*|import\s+|require\s*\(\s*)['"](@rsvp\/ui(?:\/[^'"]*)?|react-native(?:\/[^'"]*)?|nativewind(?:\/[^'"]*)?|expo(?:-[a-z-]+)?(?:\/[^'"]*)?)['"]/g;
const SKIP_DIRS = new Set(['node_modules', '.next']);

const collect = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
  const path = join(directory, entry);
  if (statSync(path).isDirectory()) return SKIP_DIRS.has(entry) ? [] : collect(path);
  return SOURCE_FILE.test(entry) ? [path] : [];
});

export function findBoundaryViolations(appRoot: string, directories = ['app', 'components', 'lib', 'scripts']): string[] {
  const violations: string[] = [];
  for (const directory of directories) {
    let files: string[] = [];
    try { files = collect(join(appRoot, directory)); } catch { continue; }
    for (const file of files) for (const match of readFileSync(file, 'utf8').matchAll(FORBIDDEN)) violations.push(`${file}: ${match[1]}`);
  }
  const manifest = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const name of Object.keys(manifest[section] ?? {})) if (name === '@rsvp/ui' || name === 'react-native' || name === 'nativewind') violations.push(`package.json ${section}: ${name}`);
  }
  return violations;
}

describe('seo architectural boundary', () => {
  it('the real app has no native imports in app/, components/, lib/ or its manifest', () => {
    expect(findBoundaryViolations(process.cwd())).toEqual([]);
  });

  it('actually scans files: the real app exposes a non-trivial number of sources', () => {
    const scanned = ['app', 'components', 'lib'].flatMap((d) => collect(join(process.cwd(), d)));
    expect(scanned.length).toBeGreaterThan(10);
  });

  it('negative: detects @rsvp/ui in app/, components/ and lib/, in every import form, and in the manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seo-boundary-'));
    for (const d of ['app', 'components', 'lib']) mkdirSync(join(dir, d, 'deep'), { recursive: true });
    writeFileSync(join(dir, 'app/deep/page.tsx'), "import { Button } from '@rsvp/ui';\n");
    writeFileSync(join(dir, 'components/x.ts'), "export * from '@rsvp/ui/src/index';\n");
    writeFileSync(join(dir, 'lib/y.js'), "const ui = require('@rsvp/ui');\nconst lazy = import('react-native');\n");
    writeFileSync(join(dir, 'lib/ok.ts'), "import { Button } from '@rsvp/ui-web';\n");
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { '@rsvp/ui': 'workspace:*', '@rsvp/ui-web': 'workspace:*' } }));
    const found = findBoundaryViolations(dir);
    expect(found).toHaveLength(5);
    expect(found.join('\n')).not.toContain('ok.ts');
    expect(found.join('\n')).not.toMatch(/ui-web/);
  });
});
