import editorial from "./editorial.json" with { type: "json" };
import editorialGranate from "./editorial-granate.json" with { type: "json" };
import editorialOliva from "./editorial-oliva.json" with { type: "json" };
import jardinBotanico from "./jardin-botanico.json" with { type: "json" };
import pedidaDeMano from "./pedida-de-mano.json" with { type: "json" };
import rosaAntiguo from "./rosa-antiguo.json" with { type: "json" };
import bodasDeOro from "./bodas-de-oro.json" with { type: "json" };
import bodasDePlata from "./bodas-de-plata.json" with { type: "json" };
import type { DesignDocumentV2 } from "../types.js";
import type { TemplateDocument } from "../../types.js";

/**
 * F4 c1 · the wedding group as design documents v2: Jardín botánico, Rosa antiguo, Editorial, Editorial granate, Editorial oliva,
 * Bodas de oro, Bodas de plata and Pedida de mano. They are the files the backend seeds (`seeds/templates/design-v2/`), byte for
 * byte, and `scripts/design-documents/bodas.py` builds them. Each keeps the `key` and the deterministic id of its v1 seed (P20).
 * The personality sheet of each one is `docs/design/plantillas-f4c1/FICHAS-BODAS.md`.
 */
export const BODAS_TEMPLATES = {
  "jardin-botanico": jardinBotanico, "rosa-antiguo": rosaAntiguo, editorial, "editorial-granate": editorialGranate, "editorial-oliva": editorialOliva,
  "bodas-de-oro": bodasDeOro, "bodas-de-plata": bodasDePlata, "pedida-de-mano": pedidaDeMano
} as const;

export type BodasName = keyof typeof BODAS_TEMPLATES;

export const BODAS_TEMPLATE_IDS: Readonly<Record<BodasName, string>> = {
  "jardin-botanico": "1437aaef-2fdf-5aff-ba78-10139d8c8e24",
  "rosa-antiguo": "984f5f85-66e1-5226-9f58-af6ca5fd4963",
  editorial: "eee0b5bb-a4aa-5091-93b0-696da7b7bab5",
  "editorial-granate": "637c1fe4-e88a-5e6c-802c-c4832d881519",
  "editorial-oliva": "7a69536f-1bb7-5cb5-b905-4b42e1626032",
  "bodas-de-oro": "2430166f-d9cd-52d8-b999-ef1c9ed7040c",
  "bodas-de-plata": "a3d91e73-703b-5f8e-ae78-a9da05402bed",
  "pedida-de-mano": "2b64a4fb-e239-5855-9816-6f73a2f7d8d7"
};

/** The row `GET /media/templates/{id}` would return for one of them. */
export function bodasTemplate(name: BodasName): TemplateDocument {
  const entry = BODAS_TEMPLATES[name];
  return { id: BODAS_TEMPLATE_IDS[name], name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout as TemplateDocument["layout"],
    theme: entry.theme as unknown as DesignDocumentV2, sectionOrder: entry.sectionOrder as TemplateDocument["sectionOrder"], version: 2 };
}
