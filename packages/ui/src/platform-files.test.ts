// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Metro resolves './x' from `x.native.ts` to `x.native.ts` itself on iOS/Android (platform extensions win). A runtime import
 * of the own base name is therefore an import of itself: `motion.native.ts` re-exporting from './motion' overflowed the stack
 * at app startup, and `logo.native.tsx` / `notice-mark.native.tsx` read undefined values. Shared values belong in a file
 * without a platform variant. `import type` is erased at compile time and stays allowed.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SOURCES = ['packages', 'apps/universal/src', 'apps/universal/app'];
const PLATFORM_FILE = /^(.+)\.(native|ios|android|web)\.(tsx?|jsx?)$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** Runtime imports/re-exports of `./<base>` (not `import type` / `export type`), one entry per offending statement. */
function selfImports(source: string, base: string): string[] {
  const statement = new RegExp(String.raw`^\s*(import|export)\s+(type\s+)?[^;]*?from\s+['"]\./${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'gm');
  return [...source.matchAll(statement)].filter((match) => !match[2]).map((match) => match[0].trim());
}

describe('platform files never import their own base name at runtime', () => {
  it('recognises the faulty forms and lets type-only imports through', () => {
    expect(selfImports("export { MOTION } from './motion';", 'motion')).toHaveLength(1);
    expect(selfImports("import { LOGO_VIEWBOX, type LogoProps } from './logo';", 'logo')).toHaveLength(1);
    expect(selfImports("import type { LogoProps } from './logo';", 'logo')).toHaveLength(0);
    expect(selfImports("export type { LogoProps } from './logo';", 'logo')).toHaveLength(0);
    expect(selfImports("import { X } from './logo-shared';", 'logo')).toHaveLength(0);
  });

  it('holds in every package and in the app', () => {
    const offenders = SOURCES.flatMap((dir) => files(join(ROOT, dir)))
      .map((path) => ({ path, match: PLATFORM_FILE.exec(path.split('/').pop() ?? '') }))
      .filter((entry): entry is { path: string; match: RegExpExecArray } => entry.match !== null)
      .flatMap(({ path, match }) => selfImports(readFileSync(path, 'utf8'), match[1] ?? '').map((line) => `${relative(ROOT, path)}: ${line}`));
    expect(offenders).toEqual([]);
  });
});
