import gala from "./gala.json" with { type: "json" };
import marfil from "./marfil.json" with { type: "json" };
import pinata from "./pinata.json" with { type: "json" };
import type { DesignDocumentV2 } from "../types.js";
import type { TemplateDocument } from "../../types.js";

/**
 * F4 b · the three templates the approved direction prototyped (FE #117), as design documents v2. They are the files the
 * backend seeds (`seeds/templates/design-v2/`), byte for byte: a test in each repository validates them. The deterministic id is
 * the v1 seed's (the template keeps its `key`, P20), so the migration of branch z only changes the stored theme.
 */
export const DESIGN_TEMPLATES = { marfil, pinata, gala } as const;

export const DESIGN_TEMPLATE_IDS = {
  marfil: "73477f09-c9a6-544e-9477-948866a907c6",
  pinata: "c5c5c247-bfaf-52c2-b932-e0ce9f2cb8c7",
  gala: "e6a5911c-2e0b-5381-a2f8-9d9e0a9b24e8"
} as const;

type Entry = (typeof DESIGN_TEMPLATES)[keyof typeof DESIGN_TEMPLATES];

/** The row `GET /media/templates/{id}` would return for one of them. */
export function designTemplate(name: keyof typeof DESIGN_TEMPLATES): TemplateDocument {
  const entry: Entry = DESIGN_TEMPLATES[name];
  return { id: DESIGN_TEMPLATE_IDS[name], name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout as TemplateDocument["layout"],
    theme: entry.theme as unknown as DesignDocumentV2, sectionOrder: entry.sectionOrder as TemplateDocument["sectionOrder"], version: 2 };
}
