import { describe, expect, it } from "vitest";
import { createTranslator, resources } from "../src/index.js";

type Tree = { readonly [key: string]: string | Tree };
const leaves = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([key, value]) => (typeof value === "string" ? [`${prefix}${key}`] : leaves(value, `${prefix}${key}.`)));

describe("translation resources", () => {
  it("es-BO and en-US have exactly the same keys, none empty", () => {
    const es = leaves(resources["es-BO"] as Tree).sort();
    const en = leaves(resources["en-US"] as Tree).sort();
    expect(en).toEqual(es);
    const empty = (tree: Tree): string[] => leaves(tree).filter((path) => !String(path.split(".").reduce<unknown>((node, key) => (node as Tree)[key], tree)).trim());
    expect(empty(resources["es-BO"] as Tree)).toEqual([]);
    expect(empty(resources["en-US"] as Tree)).toEqual([]);
  });

  it("the synchronous translator interpolates and pluralises", () => {
    const es = createTranslator("es-BO");
    expect(es("celebration.hero.countdown", { count: 1 })).toBe("Falta 1 día");
    expect(es("celebration.hero.countdown", { count: 64 })).toBe("Faltan 64 días");
    expect(createTranslator("en-US")("celebration.hero.countdown", { count: 64 })).toBe("64 days to go");
    expect(createTranslator("en-US")("celebration.sections.schedule")).toBe("Schedule");
  });
});
