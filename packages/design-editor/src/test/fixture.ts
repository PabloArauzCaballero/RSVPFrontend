import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { design } from "@rsvp/celebration-theme";

interface Golden { readonly key: string; readonly v2: design.DesignDocumentV2 }

const specPath = join(dirname(fileURLToPath(import.meta.url)), "../../../contracts/specs/template-media.openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8")) as { readonly components: { readonly schemas: { readonly DesignDocumentV2: Record<string, unknown> } } };

/** The 16 documents the backend converts from the seeded templates (vendored contract, never edited here). */
export const GOLDENS = spec.components.schemas.DesignDocumentV2["x-rsvp-v1-goldens"] as readonly Golden[];

export function fixture(key = "clasico-marfil"): design.DesignDocumentV2 {
  const golden = GOLDENS.find((candidate) => candidate.key === key);
  if (!golden) throw new Error(`No golden ${key}`);
  return structuredClone(golden.v2);
}
