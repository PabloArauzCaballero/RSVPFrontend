import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * "Ninguna cadena de texto escrita a mano" for lane B's public surfaces: JSX text nodes must
 * come from i18n. Lanes of other axes (RSVP pages, the component catalogue) are not scanned.
 */
const ROOT = process.cwd();
const SCANNED = ["app/c/[slug]/page.tsx", "app/c/[slug]/[section]/page.tsx", "app/c/[slug]/not-found.tsx", "app/page.tsx", "app/layout.tsx", "app/proveedores", "app/rsvp", "components/public-celebration.tsx", "components/provider-directory.tsx"];
const files = (path: string): string[] => (statSync(path).isDirectory() ? readdirSync(path).flatMap((entry) => files(join(path, entry))) : [path]);

// Letters between a closing ">" (not the one of "=>") and the next "<" or "{": a JSX text node.
// Matches ">Itinerario<"; rejects ">{t("x")}<", "> · <" and "=> x < y".
const JSX_TEXT = /(?<![=])>\s*([^<>{}\s·&|/,;:()[\]-][^<>{}]*?)\s*</g;

describe("no hand-written copy in lane B screens", () => {
  it("every JSX text node is a translation", () => {
    const offenders = SCANNED.flatMap((entry) => files(join(ROOT, entry))).filter((file) => file.endsWith(".tsx")).flatMap((file) => {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      return [...source.matchAll(JSX_TEXT)].map((match) => match[1] ?? "").filter((text) => /\p{L}/u.test(text) && !text.includes("=>")).map((text) => `${relative(ROOT, file)}: "${text}"`);
    });
    expect(offenders).toEqual([]);
  });
});
