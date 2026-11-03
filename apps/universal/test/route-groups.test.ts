import { mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** REQ-F01-06: the five role groups exist, each with its own layout and at least one screen. */
const REQUIRED_GROUPS = ["(auth)", "(host)", "(provider)", "(admin)", "(guest)"] as const;
const SCREEN = /\.(tsx|ts|jsx|js)$/;

function screensOf(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return screensOf(path);
    return SCREEN.test(entry) && !entry.startsWith("_layout") ? [path] : [];
  });
}

export function routeGroupProblems(appDir: string): string[] {
  const problems: string[] = [];
  const entries = readdirSync(appDir);
  for (const group of REQUIRED_GROUPS) {
    if (!entries.includes(group)) { problems.push(`missing group ${group}`); continue; }
    const files = readdirSync(join(appDir, group));
    if (!files.some((f) => f.startsWith("_layout."))) problems.push(`${group} has no _layout`);
    if (screensOf(join(appDir, group)).length === 0) problems.push(`${group} has no screen`);
  }
  // Screens must live in a group (or be the root index / layout), never loose at the top level.
  for (const entry of entries) {
    if (SCREEN.test(entry) && !entry.startsWith("_layout") && !entry.startsWith("index.") && !entry.startsWith("+")) problems.push(`loose top-level route ${entry}`);
  }
  return problems;
}

describe("REQ-F01-06 route groups", () => {
  it("the real app has all five groups, each with a layout and a screen", () => {
    expect(routeGroupProblems(join(process.cwd(), "app"))).toEqual([]);
  });

  it("negative: reports a missing group, a group without layout or screen, and a loose route", () => {
    const dir = mkdtempSync(join(tmpdir(), "routes-"));
    for (const group of ["(auth)", "(host)", "(provider)", "(admin)"]) mkdirSync(join(dir, group));
    writeFileSync(join(dir, "(auth)", "_layout.tsx"), "");
    writeFileSync(join(dir, "(auth)", "login.tsx"), "");
    writeFileSync(join(dir, "(host)", "inicio.tsx"), "");
    writeFileSync(join(dir, "(provider)", "_layout.tsx"), "");
    writeFileSync(join(dir, "(admin)", "_layout.tsx"), "");
    writeFileSync(join(dir, "suelta.tsx"), "");
    expect(routeGroupProblems(dir).sort()).toEqual(["(admin) has no screen", "(host) has no _layout", "(provider) has no screen", "loose top-level route suelta.tsx", "missing group (guest)"].sort());
  });
});
