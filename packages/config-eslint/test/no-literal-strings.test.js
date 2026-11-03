import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import base from "../base.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const lintSource = async (source, filePath = "apps/universal/src/__fixture__/screen.tsx") => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: base });
  const [result] = await eslint.lintText(source, { filePath: join(root, filePath) });
  return result.messages.filter((message) => message.ruleId === "rsvp/no-literal-strings");
};

test("REQ-F06-06: a hand-written JSX text fails", async () => {
  const messages = await lintSource("export const A = () => <Text>Hola mundo</Text>;");
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /Hola mundo/);
});

test("a hand-written literal child, label, placeholder and accessibility label fail", async () => {
  const source = 'export const A = () => <View><Text>{"Guardar"}</Text><Field label="Nombre" placeholder="Escribe" accessibilityLabel="Cerrar" /></View>;';
  assert.equal((await lintSource(source)).length, 4);
});

test("translated text, dynamic values, punctuation, symbols and brand names pass", async () => {
  const source = 'export const A = ({ t, n }) => <View><Text>{t("auth.signIn")}</Text><Text>{n}</Text><Text> · </Text><Text>12:30</Text><Text>RSVP</Text><Field label={t("auth.email")} testID="login-email" /></View>;';
  assert.deepEqual(await lintSource(source), []);
});

test("catalogs and the declared legacy debt list are exempt, tests are not scanned", async () => {
  assert.deepEqual(await lintSource("export const A = () => <Text>Hola</Text>;", "packages/ui/src/index.tsx"), []);
  assert.deepEqual(await lintSource("export const A = () => <Text>Hola</Text>;", "apps/universal/test/x.test.tsx"), []);
});

test("the repository's own screens are clean (the gate is green on main code)", () => {
  const run = spawnSync("node", ["node_modules/eslint/bin/eslint.js", "--no-warn-ignored", "apps/universal/app", "apps/universal/src", "apps/seo-web/app", "apps/seo-web/components", "packages/celebration-theme/src", "packages/ui/src", "packages/ui-web/src"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test("the CLI exits non-zero when a screen contains a literal (what blocks the merge)", () => {
  const dir = join(root, "apps/universal/src/__lint_fixture__");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "bad.tsx");
  writeFileSync(file, "export const Bad = () => <Text>Texto escrito a mano</Text>;\n");
  try {
    const run = spawnSync("node", ["node_modules/eslint/bin/eslint.js", file], { cwd: root, encoding: "utf8" });
    assert.equal(run.status, 1, run.stdout + run.stderr);
    assert.match(run.stdout, /rsvp\/no-literal-strings/);
  } finally {
    spawnSync("rm", ["-rf", dir]);
  }
});
