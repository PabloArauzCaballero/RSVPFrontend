import cumpleanosAdulto from "./cumpleanos-adulto.json" with { type: "json" };
import despedida from "./despedida.json" with { type: "json" };
import festivo from "./festivo.json" with { type: "json" };
import fiestaLila from "./fiesta-lila.json" with { type: "json" };
import fiestaTematica from "./fiesta-tematica.json" with { type: "json" };
import finDeAno from "./fin-de-ano.json" with { type: "json" };
import reencuentro from "./reencuentro.json" with { type: "json" };
import type { DesignDocumentV2 } from "../types.js";
import type { TemplateDocument } from "../../types.js";

/**
 * F4 c2 · the party group as design documents v2: Festivo, Fiesta lila, Cumpleaños adulto, Fiesta temática, Fin de año, Despedida and
 * Reencuentro. They are the files the backend seeds (`seeds/templates/design-v2/`), byte for byte, and
 * `scripts/design-documents/fiestas.py` builds them. Each keeps the `key` and the deterministic id of its v1 seed (P20).
 * The personality sheet of each one is `docs/design/plantillas-f4c2/FICHAS-FIESTAS.md`.
 */
export const FIESTAS_TEMPLATES = {
  festivo, "fiesta-lila": fiestaLila, "cumpleanos-adulto": cumpleanosAdulto, "fiesta-tematica": fiestaTematica, "fin-de-ano": finDeAno, despedida, reencuentro
} as const;

export type FiestasName = keyof typeof FIESTAS_TEMPLATES;

export const FIESTAS_TEMPLATE_IDS: Readonly<Record<FiestasName, string>> = {
  festivo: "1bfedee4-6e88-58df-ac37-dd678802ecca",
  "fiesta-lila": "e829f1a7-3c06-5260-a8ab-b12f03db3b10",
  "cumpleanos-adulto": "7da50455-1248-51fb-a837-d5e1374eafe1",
  "fiesta-tematica": "4093243c-3b63-5fad-99fd-43d516bd5e9f",
  "fin-de-ano": "b3d69753-f079-5e99-84df-287f4d5ab290",
  despedida: "e58c00b3-465f-5b5f-8062-28e56763f05b",
  reencuentro: "f970f429-662e-5f16-9111-47c6901da9d0"
};

/** The row `GET /media/templates/{id}` would return for one of them. */
export function fiestasTemplate(name: FiestasName): TemplateDocument {
  const entry = FIESTAS_TEMPLATES[name];
  return { id: FIESTAS_TEMPLATE_IDS[name], name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout as TemplateDocument["layout"],
    theme: entry.theme as unknown as DesignDocumentV2, sectionOrder: entry.sectionOrder as TemplateDocument["sectionOrder"], version: 2 };
}
