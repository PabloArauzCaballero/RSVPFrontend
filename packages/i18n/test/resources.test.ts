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

describe("R8a · gifts button on the invitation", () => {
  it("publishes one label per gifts summary status in both languages", () => {
    const es = createTranslator("es-BO");
    const en = createTranslator("en-US");
    expect([es("gifts.guest.cta.open"), es("gifts.guest.cta.empty"), es("gifts.guest.cta.closed")]).toEqual(["Ver regalos", "Lista de regalos (pronto)", "Ver regalos"]);
    expect([en("gifts.guest.cta.open"), en("gifts.guest.cta.empty"), en("gifts.guest.cta.closed")]).toEqual(["View gifts", "Gift list (coming soon)", "View gifts"]);
  });
});

describe("B6 · legal texts", () => {
  it("every section of both documents has a heading and a body in both languages, and both carry the same version", async () => {
    const { LEGAL_DOCUMENTS, legalBlocks } = await import("../src/index.js");
    for (const locale of ["es-BO", "en-US"] as const) {
      const t = createTranslator(locale);
      for (const [document, { sections }] of Object.entries(LEGAL_DOCUMENTS)) {
        for (const section of sections) {
          expect(t(`legal.${document}.sections.${section}.heading`)).not.toContain("legal.");
          expect(legalBlocks(t(`legal.${document}.sections.${section}.body`)).length).toBeGreaterThan(0);
        }
      }
    }
    expect(createTranslator("en-US")("legal.version")).toBe(createTranslator("es-BO")("legal.version"));
  });

  it("the retention section states the D-5 periods: cascade deletion, 12 months after the event, backups 90 days", () => {
    const es = createTranslator("es-BO")("legal.privacy.sections.retention.body");
    expect(es).toMatch(/12 meses después de la fecha del evento/);
    expect(es).toMatch(/90 días/);
    expect(es).toMatch(/en cascada/);
    expect(createTranslator("en-US")("legal.privacy.sections.retention.body")).toMatch(/12 months after the event date[\s\S]*90 days/);
  });

  it("splits a body into paragraphs and lists", async () => {
    const { legalBlocks } = await import("../src/index.js");
    expect(legalBlocks("Intro:\n- uno\n- dos\n\nCierre.")).toEqual([{ kind: "paragraph", text: "Intro:" }, { kind: "list", items: ["uno", "dos"] }, { kind: "paragraph", text: "Cierre." }]);
  });
});
