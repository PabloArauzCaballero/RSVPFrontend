import babyShower from "./baby-shower.json" with { type: "json" };
import cieloBautizo from "./cielo-bautizo.json" with { type: "json" };
import graduacion from "./graduacion.json" with { type: "json" };
import mentaInfantil from "./menta-infantil.json" with { type: "json" };
import primeraComunion from "./primera-comunion.json" with { type: "json" };
import type { DesignDocumentV2 } from "../types.js";
import type { TemplateDocument } from "../../types.js";

/**
 * F4 c3 · the children and rites group as design documents v2: Cielo de bautizo, Menta infantil, Baby shower, Primera comunión and
 * Graduación. They are the files the backend seeds (`seeds/templates/design-v2/`), byte for byte, and
 * `scripts/design-documents/infantil-ritos.py` builds them. Each keeps the `key` and the deterministic id of its seed (`uuid5` of the key, P20).
 * The personality sheet of each one is `docs/design/plantillas-f4c3/FICHAS-INFANTIL-RITOS.md`.
 */
export const INFANTIL_RITOS_TEMPLATES = {
  "cielo-bautizo": cieloBautizo, "menta-infantil": mentaInfantil, "baby-shower": babyShower, "primera-comunion": primeraComunion, graduacion
} as const;

export type InfantilRitosName = keyof typeof INFANTIL_RITOS_TEMPLATES;

export const INFANTIL_RITOS_TEMPLATE_IDS: Readonly<Record<InfantilRitosName, string>> = {
  "cielo-bautizo": "14924a38-0623-5076-880e-b1b2c631853f",
  "menta-infantil": "4e35035d-2da1-517c-9ffa-1133d9836c63",
  "baby-shower": "e983a0c1-0fc2-5e1a-b26b-7ad27d06f673",
  "primera-comunion": "76bc1ae5-77da-53e9-a4bd-f85babf7fe8b",
  graduacion: "82ffe36e-53f2-52d2-9e0d-42a6982fa983"
};

/** The row `GET /media/templates/{id}` would return for one of them. */
export function infantilRitosTemplate(name: InfantilRitosName): TemplateDocument {
  const entry = INFANTIL_RITOS_TEMPLATES[name];
  return { id: INFANTIL_RITOS_TEMPLATE_IDS[name], name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout as TemplateDocument["layout"],
    theme: entry.theme as unknown as DesignDocumentV2, sectionOrder: entry.sectionOrder as TemplateDocument["sectionOrder"], version: 2 };
}
