import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const out = '/evidence/linux-results';
mkdirSync(out, { recursive: true });
const commands = [
  ['harness', ['harness:validate']],
  ['lint-code', ['lint:code']],
  ['contracts', ['workspace', '@rsvp/contracts', 'check:generated']],
  ['build-lint-typecheck', ['turbo', 'run', 'build', 'lint', 'typecheck', '--concurrency=1', '--output-logs=errors-only']]
];
for (const parent of ['packages', 'apps']) for (const entry of readdirSync(parent, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const manifest = JSON.parse(readFileSync(join(parent, entry.name, 'package.json'), 'utf8'));
  if (manifest.scripts?.test) commands.push([`test-${entry.name}`, ['workspace', manifest.name, 'test', ...(manifest.scripts.test.includes('vitest') ? ['--maxWorkers=1', '--no-file-parallelism'] : [])]]);
}
commands.push(['coverage', ['turbo', 'run', 'test:coverage', '--concurrency=1', '--output-logs=errors-only', '--', '--maxWorkers=1', '--no-file-parallelism']]);
const results = [];
for (const [name, args] of commands) {
  const started = Date.now();
  const run = spawnSync('yarn', args, { cwd: '/workspace', encoding: 'utf8', maxBuffer: 32_000_000 });
  writeFileSync(join(out, `${name}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`);
  results.push({ name, command: `yarn ${args.join(' ')}`, exitCode: run.status, signal: run.signal, seconds: Math.round((Date.now() - started) / 1000) });
  writeFileSync(join(out, 'results.json'), JSON.stringify({ date: new Date().toISOString(), node: process.version, platform: process.platform, sourceCommit: '52af3eb9e918766b0c77ddcfceee59dd264ca694', complete: results.length === commands.length, status: results.every((item) => item.exitCode === 0) ? 'PASS' : 'FAIL', results }, null, 2));
  console.log(`${run.status === 0 ? 'PASS' : 'FAIL'} ${name}: exit ${run.status}`);
}
process.exitCode = results.every((item) => item.exitCode === 0) ? 0 : 1;
