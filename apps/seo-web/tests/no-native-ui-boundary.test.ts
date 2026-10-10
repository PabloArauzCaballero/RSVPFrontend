import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const collect = (directory: string): string[] => readdirSync(directory).flatMap((entry) => { const path = join(directory, entry); return statSync(path).isDirectory() ? collect(path) : [path]; });
describe('seo architectural boundary', () => { it('never imports React Native package @rsvp/ui', () => { const sourceFiles = collect(join(process.cwd(), 'app')).filter((path) => /\\.[jt]sx?$/.test(path)); for (const file of sourceFiles) expect(readFileSync(file, 'utf8')).not.toMatch(/from ['\"]@rsvp\/ui['\"]/); }); });
