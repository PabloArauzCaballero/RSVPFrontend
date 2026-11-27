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
/**
 * The two design documents whose gifts page is only the button (PL-139-R2-03): they fold into the block and keep no gifts section. The list is
 * fixed on purpose: recomputing it from the document would repeat the production predicate and let a drift in both pass unseen. A document that
 * joins or leaves this list is a deliberate edit of this line.
 */
const FOLDED_V2 = ["minimalista", "corporativo-grafito"] as const;
/** The v1 layouts whose sections carry a drawing keep their gifts section (a drawing and the text, no button). */
const KEEPS_V1 = ["classic", "festive", "corporate"] as const;
const keepsGiftsSection = (template: TemplateDocument): boolean =>
  template.version === 2 ? !(FOLDED_V2 as readonly string[]).includes(template.id) : (KEEPS_V1 as readonly string[]).includes(template.layout);
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
    it.each(CASES)("%s: both buttons share one container, the gifts section keeps only what is its own, and the link is /regalos", (_label, extra) => {
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
      // The gifts button exists ONCE in the page body (the block's). The gifts section stays, without the button, exactly when it has something of its own (PL-139-01).
      expect(document.querySelectorAll('main a[data-action="gifts"]')).toHaveLength(1);
      const apart = document.querySelector('main section[data-section="gifts"]');
      expect(apart !== null).toBe(keepsGiftsSection(template));
      expect(apart ? apart.querySelector("a") : null).toBeNull();
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

  describe.each(["OPEN", "EMPTY", "CLOSED"] as const)("gift list %s", (status) => {
    it.each([...V1, ...V2])(`%s: the block carries the gifts button once, to /regalos, with the status on it`, (_name, template) => {
      const gifts = draw(template, { giftsStatus: status, rsvpHelpHref: `${BASE}/rsvp` }).querySelectorAll('main a[data-action="gifts"]');
      expect(gifts).toHaveLength(1);
      expect(gifts[0]?.getAttribute("data-gifts-status")).toBe(status);
      expect(gifts[0]?.getAttribute("href")).toBe(`${BASE}/regalos`);
      expect(gifts[0]?.closest("[data-actions-block]")).toBeTruthy();
    });
  });

  describe.each(V2)("%s (v2): own content and no destination", (_name, template) => {
    it("without any reply destination (a still preview) the block keeps the gifts button alone, never an empty block", () => {
      const block = draw(template).querySelector("main [data-actions-block]");
      expect(block?.querySelectorAll("a")).toHaveLength(1);
      expect(block?.querySelector('a[data-action="gifts"]')).toBeTruthy();
      expect(block?.querySelector('a[data-action^="rsvp"]')).toBeNull();
    });

    it("a page left with nothing to draw leaves no empty canvas, and a gifts page with content keeps it (illustration, no button)", () => {
      const document = draw(template, { rsvpHelpHref: `${BASE}/rsvp` });
      for (const canvas of document.querySelectorAll(".cdesign-canvas")) expect(canvas.children.length).toBeGreaterThan(0);
      const apart = document.querySelector('main section[data-section="gifts"]');
      if (keepsGiftsSection(template)) {
        expect(apart?.querySelector('.cdesign-el[data-block="illustration"]')).toBeTruthy();
        expect(apart?.querySelector('.cdesign-el[data-block="giftsCta"]')).toBeNull();
      }
      // The reply page never repeats its own illustration's neighbours as buttons: the buttons are the block's only.
      expect(document.querySelectorAll('main .cdesign-el[data-block="giftsCta"], main .cdesign-el[data-block="rsvpCta"]')).toHaveLength(0);
    });

    it("the block has its own accessible name, distinct from the dock's", () => {
      const document = draw(template, { rsvpHelpHref: `${BASE}/rsvp` });
      const block = document.querySelector("main [data-actions-block]");
      const dock = document.querySelector("[data-dock]");
      expect(block?.getAttribute("aria-label")).toBe("celebration.actions.label");
      expect(dock?.getAttribute("aria-label")).toBe("celebration.dock.label");
      expect(block?.getAttribute("data-actions")).toBeNull();
    });
  });

  it("negative: a gifts page that is only the button folds into the block (no empty page), and its own page still has the button", () => {
    const bare = V2.filter(([key]) => (FOLDED_V2 as readonly string[]).includes(key));
    expect(bare.map(([key]) => key).sort()).toEqual([...FOLDED_V2].sort());
    for (const [, template] of bare) {
      expect(draw(template, { rsvpHelpHref: `${BASE}/rsvp` }).querySelector('main section[data-section="gifts"]')).toBeNull();
      expect(draw(template, { only: "gifts" }).querySelector('main section[data-section="gifts"] a[data-action="gifts"]')).toBeTruthy();
    }
  });

  describe("PL-139-R2-04: an author's reply button on the gifts page is the same action as the block's", () => {
    /** The document with a visible reply button added to its gifts page, on both canvases. */
    const withReplyOnGifts = (key: string): TemplateDocument => {
      const [, template] = V2.find(([name]) => name === key) as (typeof V2)[number];
      const theme = JSON.parse(JSON.stringify(template.theme)) as { blocks: { id: string; type: string; config: object }[]; pages: { section?: string; canvases: Record<string, { elements: { id: string; block: string }[] } | undefined> }[] };
      theme.blocks.push({ id: "own-reply", type: "rsvpCta", config: {} });
      const page = theme.pages.find((item) => item.section === "gifts") as (typeof theme.pages)[number];
      for (const canvas of Object.values(page.canvases)) {
        const model = canvas?.elements[0];
        if (model) canvas.elements.push({ ...model, id: "own-reply-element", block: "own-reply" });
      }
      return { ...template, theme } as unknown as TemplateDocument;
    };

    it.each(["clasico-marfil", ...FOLDED_V2])("%s: the reply stays once in the page body, in the block", (key) => {
      const document = draw(withReplyOnGifts(key), { rsvpHelpHref: `${BASE}/rsvp` });
      expect(document.querySelectorAll('main a[data-action^="rsvp"]')).toHaveLength(1);
      expect(document.querySelector('main a[data-action^="rsvp"]')?.closest("[data-actions-block]")).toBeTruthy();
      expect(document.querySelectorAll('main a[data-action="gifts"]')).toHaveLength(1);
      // A gifts page that was only buttons still folds; one with a drawing stays.
      expect(document.querySelector('main section[data-section="gifts"]') !== null).toBe(!(FOLDED_V2 as readonly string[]).includes(key));
    });

    it("negative: on the gifts section's own page (no block there) the document keeps both of its buttons", () => {
      const document = draw(withReplyOnGifts("clasico-marfil"), { only: "gifts", rsvpHelpHref: `${BASE}/rsvp` });
      expect(document.querySelector('main section[data-section="gifts"] a[data-action="gifts"]')).toBeTruthy();
      expect(document.querySelector('main section[data-section="gifts"] a[data-action^="rsvp"]')).toBeTruthy();
    });
  });

  it("the protected layer keeps its stacking defence: position relative and z-index 1000, under the dock (FE #131, PL-139-02)", () => {
    const css = readFileSync(join(__dirname, "../styles.css"), "utf8");
    expect(css).toMatch(/\.celebration \.celebration-actions\.rsvp-protected \{ position: relative; z-index: 1000; \}/);
    expect(css).toMatch(/\.celebration \.cdesign-dock \{ z-index: 2000 !important; \}/);
  });

  it("the stylesheet puts the two side by side from 768 px, stacked below, and gives both the same size", () => {
    const css = readFileSync(join(__dirname, "../styles.css"), "utf8");
    expect(css).toMatch(/\.celebration \.celebration-actions \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(min-width: 48rem\) \{ \.celebration \.celebration-actions \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.celebration \.celebration-actions \.celebration-cta \{[^}]*width: 100%[^}]*min-height: 3rem/);
    // The dock gives the reply no quieter outline any more: the two are of the same weight there too.
    expect(css).not.toMatch(/\.cdesign-dock \.celebration-cta\[data-action="rsvp"\][^{]*\{[^}]*background: transparent/);
  });

  it("PL-139-R2-V1: no rule makes the gifts button quieter in EMPTY or CLOSED; the status changes the words, not the weight", () => {
    const css = readFileSync(join(__dirname, "../styles.css"), "utf8");
    expect(css).not.toMatch(/data-gifts-status="(EMPTY|CLOSED)"/);
    expect(css).not.toMatch(/data-action="gifts"\][^{]*\{[^}]*(background: (transparent|var\(--celebration-surface\))|border: [^;]*(dashed|var\(--cd-line\)))/);
  });

  it("PL-139-R2-V2/V3/V4: the v2 block has air under it, sits on the title's axis, and is wide enough for «Busca tu enlace personal» on one line", () => {
    const css = readFileSync(join(__dirname, "../styles.css"), "utf8");
    expect(css).toMatch(/\.celebration-design \.cdesign-actions \{[^}]*padding: \.5rem var\(--celebration-space\) calc\(var\(--celebration-gap, 3rem\) \/ 2\)/);
    expect(css).toMatch(/\.celebration-design \.cdesign-actions \.celebration-actions \{ margin-inline: 0; \}/);
    expect(css).toMatch(/\.celebration \.celebration-actions \{[^}]*max-width: 44rem/);
  });
});
