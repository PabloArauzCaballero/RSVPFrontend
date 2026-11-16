import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * On iOS/Android Metro resolves `./x` from `x.native.tsx` back to `x.native.tsx` itself, never to the web `x.tsx`. A value
 * imported or re-exported that way reads itself and recurses ("Maximum call stack size exceeded") the moment the app starts,
 * while web and these jsdom tests keep passing because there `./x` is the web file. TestFlight build 8 closed on launch for this.
 * Shared values live in a platform-neutral module (`motion-tokens`, `logo-shared`, `notice-glyphs`, `check-geometry`).
 */
const SRC = dirname(fileURLToPath(import.meta.url));
const PLATFORM_FILE = /\.(native|ios|android)\.tsx?$/;
const FROM = /(?:import|export)\s+(type\s+)?(?:\{([^}]*)\}|\*(?:\s+as\s+\w+)?|\w+)\s+from\s+['"](\.\/[^'"]+)['"]/g;

function valueSelfImports(file: string): string[] {
  const base = `./${basename(file).replace(PLATFORM_FILE, '')}`;
  const found: string[] = [];
  for (const match of readFileSync(file, 'utf8').matchAll(FROM)) {
    const [statement, typeOnly, names, target] = match;
    if (target !== base || typeOnly) continue;
    const values = names === undefined ? [statement] : names.split(',').map((n) => n.trim()).filter((n) => n && !n.startsWith('type '));
    if (values.length > 0) found.push(statement);
  }
  return found;
}

describe('platform files', () => {
  const files = readdirSync(SRC).filter((name) => PLATFORM_FILE.test(name)).map((name) => join(SRC, name));

  it('exist (the guard is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [basename(file), file]))('%s imports no value from its own base name', (_name, file) => {
    expect(valueSelfImports(file)).toEqual([]);
  });

  it('detects the pattern that crashed build 8', () => {
    const FAKE = "export { MOTION } from './motion';";
    const match = [...FAKE.matchAll(FROM)][0];
    expect(match?.[3]).toBe('./motion');
    expect(match?.[1]).toBeUndefined();
  });
});
