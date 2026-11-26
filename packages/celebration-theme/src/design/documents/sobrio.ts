import arenaTerracota from "./arena-terracota.json" with { type: "json" };
import corporativo from "./corporativo.json" with { type: "json" };
import corporativoGrafito from "./corporativo-grafito.json" with { type: "json" };
import fiestaPatronal from "./fiesta-patronal.json" with { type: "json" };
import inauguracion from "./inauguracion.json" with { type: "json" };
import minimalista from "./minimalista.json" with { type: "json" };
import otrosEvento from "./otros-evento.json" with { type: "json" };
import type { DesignDocumentV2 } from "../types.js";
import type { TemplateDocument } from "../../types.js";

/**
 * F4 c4 · the sober group as design documents v2: Minimalista, Arena y terracota, Corporativo, Corporativo grafito, Inauguración,
 * Fiesta patronal and Otros eventos. They are the files the backend seeds (`seeds/templates/design-v2/`), byte for byte, and
 * `scripts/design-documents/sobrio.py` builds them. Each keeps the `key` and the deterministic id of its v1 seed (P20).
 * The personality sheet of each one is `docs/design/plantillas-f4c4/FICHAS-SOBRIO.md`.
 */
export const SOBRIO_TEMPLATES = {
  minimalista, "arena-terracota": arenaTerracota, corporativo, "corporativo-grafito": corporativoGrafito, inauguracion, "fiesta-patronal": fiestaPatronal, "otros-evento": otrosEvento
} as const;

export type SobrioName = keyof typeof SOBRIO_TEMPLATES;

export const SOBRIO_TEMPLATE_IDS: Readonly<Record<SobrioName, string>> = {
  minimalista: "869eeeec-3666-5b8b-bde6-ee717e43568f",
  "arena-terracota": "12cfb5c1-0072-5374-84ad-24ccbc4c8ff6",
  corporativo: "ba708189-7218-5d19-a15f-c0f13e11381e",
  "corporativo-grafito": "31f50a64-17fe-5ddf-84e2-6a2d1812fb30",
  inauguracion: "c075dcc9-346f-5238-b56c-22d6ae7c948c",
  "fiesta-patronal": "effedaf6-1f6c-5446-b263-dd9438e2feac",
  "otros-evento": "e72b06cb-5175-5121-8e05-23854a78d1af"
};

/** The row `GET /media/templates/{id}` would return for one of them. */
export function sobrioTemplate(name: SobrioName): TemplateDocument {
  const entry = SOBRIO_TEMPLATES[name];
  return { id: SOBRIO_TEMPLATE_IDS[name], name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout as TemplateDocument["layout"],
    theme: entry.theme as unknown as DesignDocumentV2, sectionOrder: entry.sectionOrder as TemplateDocument["sectionOrder"], version: 2 };
}
