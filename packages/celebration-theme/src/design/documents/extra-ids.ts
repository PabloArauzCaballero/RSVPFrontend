import type { ExtraName } from "./extra.js";

/** Ids of the six extra templates (uuid5 of the key, P20), apart from the documents so the renderer can name them without bundling the JSON. */
export const EXTRA_TEMPLATE_IDS: Readonly<Record<ExtraName, string>> = {
  "otros-rumbo": "0f2e158b-0faa-5132-993c-a4ea99322775",
  "otros-mesa": "2c2ff3d9-90a2-5fb3-a785-fb02b683e647",
  "despedida-disco": "222aca44-32fa-55c3-af78-2787ceee0130",
  "despedida-esmoquin": "9b901c0b-4178-534c-8166-de476e77527d",
  "pedida-solitario": "577d5708-976d-53e0-897b-5c299f4b79bf",
  "pedida-rosa": "d76ce414-6e7d-5f66-b34e-1165c3df4f94"
};
