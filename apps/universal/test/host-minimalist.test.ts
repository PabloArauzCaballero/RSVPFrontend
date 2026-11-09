import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Source-level guard of the minimalist identity (docs/design/minimalista-brief.md) for the host and push screens. */
const ROOTS = ["src/host", "src/push"];
const sources = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? sources(path) : /\.(tsx?|ts)$/.test(name) ? [path] : [];
});
const files = ROOTS.flatMap(sources);

describe("host and push screens follow the minimalist brief", () => {
  it("find the screens to check", () => expect(files.length).toBeGreaterThan(40));
  it.each([
    ["the old brand font", /Plus Jakarta|Avenir Next/],
    ["weight 800", /fontWeight:\s*["']800["']/],
    ["tokens of the old identity", /\b(brand|onNight)\b\s*[.,}]|\bnight\b\s*:/],
    ["removed decorative primitives", /BrandBand|WeavePattern|HeroArt|MomentBackdrop/],
    ["gradients", /linear-gradient|radial-gradient|LinearGradient/],
    ["raw hex colours", /["']#[0-9a-fA-F]{6}["']/]
  ])("has no %s", (_label, pattern) => {
    const offenders = files.filter((file) => pattern.test(readFileSync(file, "utf8").replace(/^\s*(\/\/|\/?\*).*$/gm, "")));
    expect(offenders).toEqual([]);
  });
});
