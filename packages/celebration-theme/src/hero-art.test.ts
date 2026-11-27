import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import seeded from "../test/seeded-palettes.json";
import { drawingById, ornamentSetById } from "./art/index.js";
import { resolveArt, SECTION_ART, SEEDED_ART, TAG_ART } from "./hero-art.js";

/** uuid5 as Template/Media derives the id of a seeded template (seed_templates.py NAMESPACE). */
const NAMESPACE = "5f0c8a52-6f1e-4b8e-9d55-1d7d2b8a9e10";
function uuid5(name: string): string {
  const hash = createHash("sha1").update(Buffer.from(NAMESPACE.replaceAll("-", ""), "hex")).update(name).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

describe("F4 · the art each template wears", () => {
  it("every one of the 30 seeded templates has its cover drawing, keyed by the deterministic id of its seed key", () => {
    for (const template of seeded.templates) {
      const art = SEEDED_ART[uuid5(template.key)];
      expect(art, template.key).toBeDefined();
    }
    expect(Object.keys(SEEDED_ART)).toHaveLength(seeded.templates.length);
  });

  it("every referenced drawing and ornament set exists in the library, and every drawing keeps the Cuotea construction (one accent piece)", () => {
    const ids = [...Object.values(SEEDED_ART).map((art) => art.hero), ...Object.values(TAG_ART).flat(), ...Object.values(SECTION_ART)];
    for (const id of ids) {
      const drawing = drawingById(id!);
      expect(drawing, String(id)).toBeDefined();
      expect(drawing!.paths.filter((path) => path.role === "accent").length, `${id} has an accent piece`).toBeGreaterThanOrEqual(1);
    }
    for (const art of Object.values(SEEDED_ART)) if (art.ornament) expect(ornamentSetById(art.ornament), art.ornament).toBeDefined();
  });

  it("a template that is not seeded gets a drawing from its event-type tags, always the same one, and none without tags", () => {
    const first = resolveArt("custom-template-1", ["wedding"]);
    expect(first.hero).toBeDefined();
    expect(resolveArt("custom-template-1", ["wedding"]).hero?.id).toBe(first.hero?.id);
    expect(resolveArt("custom-template-1", []).hero).toBeUndefined();
    expect(resolveArt("custom-template-1", ["constructor"]).hero, "inherited keys are not tags").toBeUndefined();
  });

  it("the gifts drawing is always available for the section that carries the mandatory button (P22)", () => {
    expect(SECTION_ART.gifts).toBe("regalo");
  });
});
