import despedidaDisco from "./despedida-disco.json" with { type: "json" };
import despedidaEsmoquin from "./despedida-esmoquin.json" with { type: "json" };
import otrosMesa from "./otros-mesa.json" with { type: "json" };
import otrosRumbo from "./otros-rumbo.json" with { type: "json" };
import pedidaRosa from "./pedida-rosa.json" with { type: "json" };
import pedidaSolitario from "./pedida-solitario.json" with { type: "json" };
import type { DesignDocumentV2 } from "../types.js";
import type { TemplateDocument } from "../../types.js";

/**
 * Decision 6 of Pablo (2026-11-25) · two more templates each for Otros (OTHER), Despedida (BACHELOR_PARTY) and Pedida (ENGAGEMENT), as design
 * documents v2. They are the files the backend seeds (`seeds/templates/design-v2/`), byte for byte, and `scripts/design-documents/extra.py`
 * builds them. Each one has a v1 seed (031 to 036) whose deterministic id is `uuid5(namespace, key)`; the migration of P20 only moves the rows
 * nobody edited. The personality sheet of each one is `docs/design/plantillas-extra/FICHAS-EXTRA.md`.
 */
export const EXTRA_TEMPLATES = {
  "otros-rumbo": otrosRumbo, "otros-mesa": otrosMesa, "despedida-disco": despedidaDisco, "despedida-esmoquin": despedidaEsmoquin, "pedida-solitario": pedidaSolitario, "pedida-rosa": pedidaRosa
} as const;

export type ExtraName = keyof typeof EXTRA_TEMPLATES;

export const EXTRA_TEMPLATE_IDS: Readonly<Record<ExtraName, string>> = {
  "otros-rumbo": "0f2e158b-0faa-5132-993c-a4ea99322775",
  "otros-mesa": "2c2ff3d9-90a2-5fb3-a785-fb02b683e647",
  "despedida-disco": "222aca44-32fa-55c3-af78-2787ceee0130",
  "despedida-esmoquin": "9b901c0b-4178-534c-8166-de476e77527d",
  "pedida-solitario": "577d5708-976d-53e0-897b-5c299f4b79bf",
  "pedida-rosa": "d76ce414-6e7d-5f66-b34e-1165c3df4f94"
};

/** The row `GET /media/templates/{id}` would return for one of them. */
export function extraTemplate(name: ExtraName): TemplateDocument {
  const entry = EXTRA_TEMPLATES[name];
  return { id: EXTRA_TEMPLATE_IDS[name], name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout as TemplateDocument["layout"],
    theme: entry.theme as unknown as DesignDocumentV2, sectionOrder: entry.sectionOrder as TemplateDocument["sectionOrder"], version: 2 };
}
