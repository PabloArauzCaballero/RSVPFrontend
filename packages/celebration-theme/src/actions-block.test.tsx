import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GALLERY, NOW, t, TEMPLATES, VIEW } from "../test/fixtures.js";
import { CelebrationRenderer, giftsPath, themeFromTemplate, type SectionId, type TemplateDocument } from "./index.js";

// FE #114 follow-up, decision 8: «Confirmar asistencia» and «Regalos» are ONE block, two primaries of the same weight, in the v1 layout
// engine and in every design document v2 on disk (the folder is read, so a template added later is covered without touching this file).
const BASE = "/c/ana-y-luis";
const DOCUMENTS = join(__dirname, "design/documents");
const V2: readonly (readonly [string, TemplateDocument])[] = readdirSync(DOCUMENTS).filter((file) => file.endsWith(".json")).sort().map((file) => {
  const entry = JSON.parse(readFileSync(join(DOCUMENTS, file), "utf8")) as { key: string; name: string; description: string; layout: string; eventTypeTags: string[]; sectionOrder: SectionId[]; theme: unknown };
  return [entry.key, { id: entry.key, name: entry.name, description: entry.description, status: "PUBLISHED", eventTypeTags: entry.eventTypeTags, layout: entry.layout, theme: entry.theme, sectionOrder: entry.sectionOrder, version: 2 } as unknown as TemplateDocument] as const;
});
const V1 = TEMPLATES.map((template) => [`v1 ${template.layout}`, template] as const);
const parse = (html: string): Document => new DOMParser().parseFromString(html, "text/html");
const draw = (template: TemplateDocument, extra: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}): Document =>
  parse(renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(template, VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} basePath={BASE} {...extra} />));
const TOKEN = `${BASE}/rsvp/token-abcdefghijklmnop`;
const CASES = [
  ["with the guest's credential", { rsvpHref: TOKEN, rsvpHelpHref: `${BASE}/rsvp` }],
  ["without credential (help)", { rsvpHelpHref: `${BASE}/rsvp` }],
  ["without credential, adaptive", { rsvpHelpHref: `${BASE}/rsvp`, rsvpAdaptive: true }]
] as const;

describe("the reply and the gifts button are one block", () => {
  it("covers the five v1 layouts and every design document on disk", () => {
    expect(V2.length).toBeGreaterThanOrEqual(30);
    expect(V1).toHaveLength(5);
  });

  describe.each([...V1, ...V2])("%s", (_name, template) => {
    it.each(CASES)("%s: both buttons share one container, gifts has no section of its own, and the link is /regalos", (_label, extra) => {
      const document = draw(template, extra);
      const blocks = document.querySelectorAll("main [data-actions-block]");
      expect(blocks).toHaveLength(1);
      const block = blocks[0] as Element;
      const reply = block.querySelector('a[data-action^="rsvp"]');
      const gifts = block.querySelector('a[data-action="gifts"]');
      expect(reply).toBeTruthy();
      expect(block.querySelectorAll("a")).toHaveLength(2);
      expect(gifts?.getAttribute("href")).toBe(giftsPath(VIEW.slug));
      expect(gifts?.getAttribute("href")).not.toContain("token");
      expect(reply?.compareDocumentPosition(gifts as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      // Same weight: neither carries a quieter variant, and the block sits in the reply's section.
      for (const button of [reply, gifts]) expect(button?.getAttribute("data-variant")).toBeNull();
      expect(block.closest("section")?.getAttribute("data-section")).toBe("rsvp");
      expect(document.querySelector('main section[data-section="gifts"]')).toBeNull();
      // The block is not inside an author container, so no document CSS reaches it; it is protected like the dock.
      expect(block.closest(".cdesign-author")).toBeNull();
      expect(block.classList.contains("rsvp-protected")).toBe(true);
      expect(block.getAttribute("role")).toBe("group");
      // The section list still links to the gift list and the dock still carries both.
      expect(document.querySelector(`.celebration-nav a[href="${BASE}/regalos"]`)).toBeTruthy();
      const dock = document.querySelector("[data-dock]")?.parentElement;
      expect(dock?.querySelector('a[data-action="gifts"]')?.getAttribute("href")).toBe(`${BASE}/regalos`);
      expect(dock?.querySelector('a[data-action^="rsvp"]')).toBeTruthy();
    });

    it("the credential decides the reply's face and nothing else: the block keeps the same two destinations", () => {
      const own = draw(template, CASES[0][1]).querySelector("main [data-actions-block]");
      expect(own?.querySelector('a[data-action="rsvp"]')?.getAttribute("href")).toBe(TOKEN);
      const help = draw(template, CASES[1][1]).querySelector("main [data-actions-block]");
      expect(help?.querySelector('a[data-action="rsvp-help"]')?.getAttribute("href")).toBe(`${BASE}/rsvp`);
      expect(help?.outerHTML).not.toMatch(/token/);
    });

    it("negative: a section's own page does not repeat the block of the full page, and the gifts page stays reachable", () => {
      const faq = draw(template, { only: "faq", rsvpHelpHref: `${BASE}/rsvp` });
      expect(faq.querySelector("main [data-actions-block]")).toBeNull();
      expect(faq.querySelector(`.celebration-nav a[href="${BASE}/regalos"]`)).toBeTruthy();
    });
  });

  it("the stylesheet puts the two side by side from 768 px, stacked below, and gives both the same size", () => {
    const css = readFileSync(join(__dirname, "../styles.css"), "utf8");
    expect(css).toMatch(/\.celebration \.celebration-actions \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(min-width: 48rem\) \{ \.celebration \.celebration-actions \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.celebration \.celebration-actions \.celebration-cta \{[^}]*width: 100%[^}]*min-height: 3rem/);
    // The dock gives the reply no quieter outline any more: the two are of the same weight there too.
    expect(css).not.toMatch(/\.cdesign-dock \.celebration-cta\[data-action="rsvp"\][^{]*\{[^}]*background: transparent/);
  });
});
