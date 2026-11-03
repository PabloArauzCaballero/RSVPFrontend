import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colors } from './colors';

const root = join(__dirname, '..');
const require = createRequire(import.meta.url);
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('REQ-F02-01/05: one source for every consumer', () => {
  it('generated files are in sync with src/*.ts', () => {
    expect(() => execFileSync('node', ['scripts/generate.mjs', '--check'], { cwd: root, stdio: 'pipe' })).not.toThrow();
  });

  it('the preset resolves every semantic colour from the generated variables, light and dark', () => {
    const { createPreset } = require('../create-preset.cjs');
    const preset = createPreset();
    for (const key of Object.keys(colors.light)) expect(preset.theme.extend.colors[kebab(key)]).toBe(`var(--${kebab(key)})`);
    const base: Record<string, Record<string, string>> = {};
    preset.plugins[0]({ addBase: (rules: typeof base) => Object.assign(base, rules) });
    expect(base[':root']['--primary']).toBe(colors.light.primary);
    expect(base['[data-theme="dark"]']['--primary']).toBe(colors.dark.primary);
    expect(base['@media (prefers-color-scheme: dark)']).toBeUndefined();
    const native: typeof base = {};
    createPreset({ systemDark: true }).plugins[0]({ addBase: (rules: typeof base) => Object.assign(native, rules) });
    expect(Object.keys(native)).toContain('@media (prefers-color-scheme: dark)');
  });

  it('seo-web and universal presets share the same origin and seo-web CSS holds no palette hex', () => {
    expect(require('../tailwind-preset.cjs').theme.extend.colors).toEqual(require('../tailwind-preset-native.cjs').theme.extend.colors);
    const css = readFileSync(join(root, '../../apps/seo-web/app/globals.css'), 'utf8');
    const palette = new Set(Object.values({ ...colors.light, ...colors.dark }).map((v) => v.toLowerCase()));
    const copies = [...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]).filter((hex) => palette.has(hex.toLowerCase()));
    expect(copies).toEqual([]);
  });

  it('REQ-F02-02 (pipeline): changing one token in the source reaches the preset, the CSS and the JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tokens-'));
    cpSync(join(root, 'src'), join(dir, 'src'), { recursive: true });
    cpSync(join(root, 'scripts'), join(dir, 'scripts'), { recursive: true });
    const file = join(dir, 'src/colors.ts');
    writeFileSync(file, readFileSync(file, 'utf8').replace("primary: '#8C1D5A'", "primary: '#123456'"));
    execFileSync('node', ['scripts/generate.mjs'], { cwd: dir, stdio: 'pipe' });
    expect(readFileSync(join(dir, 'generated/tokens.css'), 'utf8')).toContain('--primary: #123456;');
    expect(JSON.parse(readFileSync(join(dir, 'generated/tokens.json'), 'utf8')).light['--primary']).toBe('#123456');
    // Negative: the repo copy is untouched and now reports drift against the mutated source.
    expect(readFileSync(join(root, 'generated/tokens.css'), 'utf8')).toContain('--primary: #8C1D5A;');
    expect(() => execFileSync('node', ['scripts/generate.mjs', '--check'], { cwd: dir, stdio: 'pipe' })).not.toThrow();
    writeFileSync(join(dir, 'generated/tokens.css'), '/* tampered */');
    expect(() => execFileSync('node', ['scripts/generate.mjs', '--check'], { cwd: dir, stdio: 'pipe' })).toThrow();
  });
});
