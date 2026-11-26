import { drawingById, ornamentSetById, type InvitationDrawing, type OrnamentSet } from "./art/index.js";
import type { SectionId } from "./types.js";

/**
 * F4 · which drawing and which ornament each template wears (PL-A1, PL-M7). The v1 template schema has no field for them, so the 30
 * seeded templates are keyed by their deterministic id (uuid5 of the seed `key`, P20: it never changes), and any other template
 * (one an admin made) falls back to its event-type tags and a stable hash of its id. The art is decoration: a missing entry
 * only means a quieter cover, never a broken page.
 */
export interface TemplateArt { readonly hero: string; readonly ornament?: string }

export const SEEDED_ART: Readonly<Record<string, TemplateArt>> = {
  "73477f09-c9a6-544e-9477-948866a907c6": { hero: "anillos", ornament: "filete" }, // clasico-marfil
  "869eeeec-3666-5b8b-bde6-ee717e43568f": { hero: "copas", ornament: undefined }, // minimalista
  "eee0b5bb-a4aa-5091-93b0-696da7b7bab5": { hero: "camara", ornament: "filete" }, // editorial
  "1bfedee4-6e88-58df-ac37-dd678802ecca": { hero: "tiara", ornament: "banderin" }, // festivo
  "ba708189-7218-5d19-a15f-c0f13e11381e": { hero: "credencial", ornament: "filete" }, // corporativo
  "1437aaef-2fdf-5aff-ba78-10139d8c8e24": { hero: "ramo", ornament: "laurel" }, // jardin-botanico
  "984f5f85-66e1-5226-9f58-af6ca5fd4963": { hero: "sobre", ornament: "arcos" }, // rosa-antiguo
  "14924a38-0623-5076-880e-b1b2c631853f": { hero: "paloma", ornament: "onda" }, // cielo-bautizo
  "12cfb5c1-0072-5374-84ad-24ccbc4c8ff6": { hero: "tazas", ornament: "onda" }, // arena-terracota
  "637c1fe4-e88a-5e6c-802c-c4832d881519": { hero: "copas", ornament: "filete" }, // editorial-granate
  "7a69536f-1bb7-5cb5-b905-4b42e1626032": { hero: "mesa-larga", ornament: "filete" }, // editorial-oliva
  "c5c5c247-bfaf-52c2-b932-e0ce9f2cb8c7": { hero: "pinata", ornament: "banderin" }, // pinata
  "e829f1a7-3c06-5260-a8ab-b12f03db3b10": { hero: "vinilo", ornament: "onda" }, // fiesta-lila
  "4e35035d-2da1-517c-9ffa-1133d9836c63": { hero: "tren", ornament: "onda" }, // menta-infantil
  "31f50a64-17fe-5ddf-84e2-6a2d1812fb30": { hero: "libreta", ornament: "filete" }, // corporativo-grafito
  "e6a5911c-2e0b-5381-a2f8-9d9e0a9b24e8": { hero: "copas", ornament: "deco" }, // gala-dorada
  "7da50455-1248-51fb-a837-d5e1374eafe1": { hero: "copa-vino", ornament: undefined }, // cumpleanos-adulto
  "effedaf6-1f6c-5446-b263-dd9438e2feac": { hero: "banderines", ornament: "banderin" }, // fiesta-patronal
  "c075dcc9-346f-5238-b56c-22d6ae7c948c": { hero: "tijera-cinta", ornament: "filete" }, // inauguracion
  "2b64a4fb-e239-5855-9816-6f73a2f7d8d7": { hero: "caja-anillo", ornament: "arcos" }, // pedida-de-mano
  "e58c00b3-465f-5b5f-8062-28e56763f05b": { hero: "antifaz", ornament: "banderin" }, // despedida
  "2430166f-d9cd-52d8-b999-ef1c9ed7040c": { hero: "cifra-50", ornament: "laurel" }, // bodas-de-oro
  "a3d91e73-703b-5f8e-ae78-a9da05402bed": { hero: "cifra-25", ornament: "laurel" }, // bodas-de-plata
  "f970f429-662e-5f16-9111-47c6901da9d0": { hero: "anuario", ornament: "filete" }, // reencuentro
  "4093243c-3b63-5fad-99fd-43d516bd5e9f": { hero: "bola-disco", ornament: "onda" }, // fiesta-tematica
  "b3d69753-f079-5e99-84df-287f4d5ab290": { hero: "reloj", ornament: "deco" }, // fin-de-ano
  "e72b06cb-5175-5121-8e05-23854a78d1af": { hero: "regalo", ornament: undefined }, // otros-evento
  "82ffe36e-53f2-52d2-9e0d-42a6982fa983": { hero: "birrete", ornament: "laurel" }, // graduacion
  "e983a0c1-0fc2-5e1a-b26b-7ad27d06f673": { hero: "sonajero", ornament: "onda" }, // baby-shower
  "76bc1ae5-77da-53e9-a4bd-f85babf7fe8b": { hero: "caliz", ornament: "arcos" }, // primera-comunion
};

/** What an event-type tag draws when the template is not one of the seeded ones, most specific tags first. */
export const TAG_ART: Readonly<Record<string, readonly string[]>> = {
  "adult-birthday": ["copa-vino", "pastel-porcion", "botella"], "patronal-feast": ["banderines", "bombo", "matraca"], opening: ["tijera-cinta", "cartel", "llave"],
  engagement: ["caja-anillo", "solitario", "rosa"], "bachelor-party": ["antifaz", "coctel", "pajarita"], "golden-wedding": ["cifra-50", "medalla"], "silver-wedding": ["cifra-25", "laurel"],
  reunion: ["marco-foto", "anuario", "cassette"], "themed-party": ["bola-disco", "popper", "uvas"], "new-year": ["copas", "uvas", "reloj"], graduation: ["birrete", "diploma"],
  "baby-shower": ["sonajero", "cochecito"], "first-communion": ["caliz", "paloma"], baptism: ["paloma", "concha", "zapatito"], quinceanera: ["tiara", "zapatilla"],
  wedding: ["anillos", "ramo", "campanas"], anniversary: ["tazas", "album"], birthday: ["globos", "pinata", "pastel-velas"], corporate: ["microfono", "credencial"], other: ["regalo"]
};

/** The small drawing that heads a section where the layout asks for them (`sectionArt`). Story has none: the text is the content. */
export const SECTION_ART: Readonly<Partial<Record<SectionId, string>>> = {
  schedule: "reloj", venues: "mapa-pin", gallery: "camara", dressCode: "percha", faq: "pregunta", gifts: "regalo", rsvp: "sobre", recommendations: "auto"
};

const hash = (text: string): number => [...text].reduce((total, char) => Math.imul(total ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);

export interface ResolvedArt { readonly hero?: InvitationDrawing; readonly ornament?: OrnamentSet }

export function resolveArt(templateId: string, tags: readonly string[]): ResolvedArt {
  const seeded = Object.hasOwn(SEEDED_ART, templateId) ? SEEDED_ART[templateId] : undefined;
  if (seeded) return { hero: drawingById(seeded.hero), ornament: seeded.ornament ? ornamentSetById(seeded.ornament) : undefined };
  const options = tags.flatMap((tag) => (Object.hasOwn(TAG_ART, tag) ? TAG_ART[tag] ?? [] : []));
  const id = options.length ? options[hash(templateId) % options.length] : undefined;
  return { hero: id ? drawingById(id) : undefined };
}
