import { describe, expect, it } from "vitest";
import { LEGAL_PATH, legalContext, legalDoc, type LegalKind } from "../lib/legal-content";

const KINDS: readonly LegalKind[] = ["privacy", "terms", "support"];
const LOCALES = ["es-BO", "en-US"] as const;

describe("legal pages", () => {
  it("exist in both languages with the same sections", () => {
    for (const kind of KINDS) {
      const [es, en] = LOCALES.map((locale) => legalDoc(kind, locale, { email: "hola@example.com", entity: "DOne" }));
      expect(es?.sections.length).toBe(en?.sections.length);
      expect(es?.sections.length).toBeGreaterThan(3);
    }
  });

  it("the privacy policy covers the baseline: rights, retention, deletion, children, no tracking", () => {
    for (const locale of LOCALES) {
      const ids = legalDoc("privacy", locale).sections.map((section) => section.id);
      expect(ids).toHaveLength(13);
      const text = JSON.stringify(legalDoc("privacy", locale));
      expect(text).toMatch(/GDPR/);
      expect(text).toMatch(/CCPA/);
      expect(text).toMatch(/30/);
    }
  });

  it("takes the contact and entity from the environment, never from the repo", () => {
    expect(legalContext({ CONTACT_EMAIL: " ayuda@dominio.com ", LEGAL_ENTITY: "Mi Empresa SRL" })).toEqual({ email: "ayuda@dominio.com", entity: "Mi Empresa SRL" });
    expect(legalContext({})).toEqual({ email: null, entity: "DOne" });
    expect(JSON.stringify(legalDoc("support", "es-BO", { email: "ayuda@dominio.com", entity: "X" }))).toContain("ayuda@dominio.com");
  });

  it("never prints the word undefined or an empty placeholder when no contact is set", () => {
    for (const kind of KINDS) for (const locale of LOCALES) expect(JSON.stringify(legalDoc(kind, locale, { email: null, entity: "DOne" }))).not.toMatch(/undefined|null|\{\{/);
  });

  it("each document has its own route", () => {
    expect(new Set(Object.values(LEGAL_PATH)).size).toBe(3);
  });
});
