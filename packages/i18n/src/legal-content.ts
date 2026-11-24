/**
 * B6 · The legal documents shown by the public site (apps/seo-web, /privacidad and /terminos) and by the app (apps/universal, same
 * routes). The copy lives in the `legal` namespace; here only the order of the sections and how a body is split into blocks.
 */
export const LEGAL_DOCUMENTS = {
  privacy: { path: "/privacidad", sections: ["controller", "data", "purposes", "basis", "sharing", "retention", "rights", "security", "changes"] },
  terms: { path: "/terminos", sections: ["service", "account", "guests", "content", "acceptableUse", "providers", "liability", "termination", "changes"] }
} as const;
export type LegalDocument = keyof typeof LEGAL_DOCUMENTS;

/** Translation key of the version of the texts a person accepts; the value is sent to Identity when the account is created. */
export const LEGAL_VERSION_KEY = "legal.version";

export type LegalBlock = { readonly kind: "paragraph"; readonly text: string } | { readonly kind: "list"; readonly items: readonly string[] };

/** Paragraphs are separated by a blank line; consecutive lines starting with "- " form a list. */
export function legalBlocks(body: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  for (const chunk of body.split(/\n{2,}/)) {
    let paragraph: string[] = []; let items: string[] = [];
    const flush = (): void => {
      if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      if (items.length) blocks.push({ kind: "list", items });
      paragraph = []; items = [];
    };
    for (const line of chunk.split("\n").map((value) => value.trim()).filter(Boolean)) {
      if (line.startsWith("- ")) { if (paragraph.length) { blocks.push({ kind: "paragraph", text: paragraph.join(" ") }); paragraph = []; } items.push(line.slice(2)); }
      else { if (items.length) { blocks.push({ kind: "list", items }); items = []; } paragraph.push(line); }
    }
    flush();
  }
  return blocks;
}
