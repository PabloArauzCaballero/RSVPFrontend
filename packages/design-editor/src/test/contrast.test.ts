import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../ui/editor.css"), "utf8");

/** Tokens of one theme: the base block, or the last dark block (the `data-theme="dark"` one). */
const tokens = (selector: RegExp): Record<string, string> => {
  const block = css.split("\n").filter((line) => selector.test(line)).join(" ");
  return Object.fromEntries([...block.matchAll(/--de-([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1] as string, (m[2] as string).toUpperCase()]));
};
const light = tokens(/^\s*(--de-|\.de-shell \{)/);
const dark = tokens(/^:root\[data-theme="dark"\] \.de-shell/);

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe("contraste de los bordes de control (WCAG 1.4.11, mínimo 3:1)", () => {
  for (const name of ["claro", "oscuro"] as const) {
    const t = name === "claro" ? light : { ...light, ...dark };
    for (const surface of ["surface", "canvas", "surface-muted", "danger-bg"] as const) {
      it(`${name}: --de-field sobre --de-${surface} >= 3:1`, () => {
        expect(t["field"], "field").toMatch(/^#/);
        expect(ratio(t["field"] as string, t[surface] as string)).toBeGreaterThanOrEqual(3);
      });
    }
    it(`${name}: texto de peligro sobre su fondo pastel >= 4.5:1`, () => {
      expect(ratio(t["danger"] as string, t["danger-bg"] as string)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it("en oscuro la mesa del lienzo es más clara que el canvas (elevación de DESIGN.md)", () => {
    const t = { ...light, ...dark };
    expect(luminance(t["surface-muted"] as string)).toBeGreaterThan(luminance(t["canvas"] as string));
  });
});
