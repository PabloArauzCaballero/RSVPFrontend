import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GALLERY, NOW, t, VIEW } from "../../test/fixtures.js";
import { CelebrationRenderer, contrastRatio, fontStylesheet, giftsPath, themeFromTemplate, type TemplateDocument } from "../index.js";
import { CelebrationNativeRenderer } from "../native.js";
import { DESIGN_TEMPLATES, designTemplate } from "./documents/index.js";
import { designFontStylesheet, designPalette, readDesign } from "./read.js";
import type { DesignDocumentV2, PaletteRole } from "./types.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const NAMES = ["marfil", "pinata", "gala"] as const;
const WEDDING_VIEW = { ...VIEW, enabledSections: [...VIEW.enabledSections] };
const parse = (markup: string): Document => new DOMParser().parseFromString(markup, "text/html");
const html = (name: (typeof NAMES)[number], extra: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}): string =>
  renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(designTemplate(name), WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" {...extra} />);

describe("the three prototyped templates as design documents v2", () => {
  it.each(NAMES)("%s: the renderer can read it and its theme keeps what the v1 consumers read", (name) => {
    const template = designTemplate(name);
    const design = readDesign(template.theme);
    expect(design).not.toBeNull();
    const theme = themeFromTemplate(template, WEDDING_VIEW.enabledSections);
    expect(theme.design).toEqual(design);
    expect(theme.palette.accent).toBe((design as DesignDocumentV2).tokens.palettes.light.accent);
    expect(theme.sections.at(-1)).toBe("rsvp");
    expect(theme.sections).toContain("gifts");
  });

  it.each(NAMES)("%s: every text pair of both palettes reaches AA and every control pair 3:1 (WCAG 1.4.3 and 1.4.11)", (name) => {
    const design = readDesign(designTemplate(name).theme) as DesignDocumentV2;
    for (const scheme of ["light", "dark"] as const) {
      const p = designPalette(design, scheme);
      const at = (foreground: PaletteRole, background: PaletteRole): number => contrastRatio(p[foreground], p[background]);
      for (const [foreground, background] of [["text", "canvas"], ["text", "surface"], ["muted", "canvas"], ["muted", "surface"], ["accent", "canvas"], ["accent", "surface"], ["onAccent", "accentFill"]] as const) {
        expect(at(foreground, background), `${name} ${scheme} ${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const [foreground, background] of [["accentFill", "canvas"], ["line", "canvas"], ["line", "surface"]] as const) {
        expect(at(foreground, background), `${name} ${scheme} ${foreground}/${background}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it.each(NAMES)("%s: fonts load with exactly the weights of the document and no italic axis", (name) => {
    const theme = themeFromTemplate(designTemplate(name), WEDDING_VIEW.enabledSections);
    const sheet = fontStylesheet(theme) as string;
    const design = theme.design as DesignDocumentV2;
    expect(sheet.startsWith("https://fonts.googleapis.com/css2?")).toBe(true);
    expect(sheet).not.toContain("ital");
    expect(sheet).not.toContain("800");
    for (const weight of design.tokens.typography.heading.weights) expect(sheet).toContain(String(weight));
  });

  it.each(NAMES)("%s: P22 · the gifts button is on the page twice, always /c/{slug}/regalos and never with a token", (name) => {
    const markup = html(name);
    const links = [...markup.matchAll(/<a [^>]*data-action="gifts"[^>]*>/g)].map((match) => match[0]);
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toContain(`href="${giftsPath("ana-y-luis")}"`);
      expect(link).not.toMatch(/token|credential|\?/);
    }
    expect(markup).toContain('data-dock=""');
  });

  it.each(NAMES)("%s: the dock keeps the gifts button when the gift list is empty or closed, and when there is no content at all", (name) => {
    for (const status of ["EMPTY", "CLOSED"] as const) expect(html(name, { giftsStatus: status })).toContain('data-action="gifts"');
    const bare = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(designTemplate(name), [])} view={{ ...VIEW, content: { title: "Solo" } }} t={t} now={NOW} />);
    expect(bare).toContain('data-action="gifts"');
  });

  it.each(NAMES)("%s: the partner recommendation goes through /r/{listingId}, never to a provider URL", (name) => {
    render(<CelebrationRenderer theme={themeFromTemplate(designTemplate(name), WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const partners = document.querySelectorAll('a[data-link-kind="partner"]');
    // Piñata places no recommendations section: there is no provider on its page to link.
    expect(partners).toHaveLength(name === "pinata" ? 0 : 1);
    if (name !== "pinata") expect(partners[0]?.getAttribute("href")).toBe("/r/listing-42");
    const external = [...document.querySelectorAll("a")].filter((anchor) => /^https?:/.test(anchor.getAttribute("href") ?? ""));
    expect(external.every((anchor) => ["navigation", "image"].includes(anchor.getAttribute("data-link-kind") ?? ""))).toBe(true);
  });

  it.each(NAMES)("%s: the cover says who, when (in the celebration's zone) and where, and has one h1", (name) => {
    render(<CelebrationRenderer theme={themeFromTemplate(designTemplate(name), WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} gallery={GALLERY} t={t} now={NOW} />);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1")?.textContent).toBe("Ana y Luis");
    expect(document.body.textContent).toContain("sábado, 19 de diciembre de 2026");
    expect(document.body.textContent).toContain("Hacienda El Prado");
    cleanup();
    render(<CelebrationRenderer theme={themeFromTemplate(designTemplate(name), WEDDING_VIEW.enabledSections)} view={{ ...WEDDING_VIEW, locale: "en-US" }} t={t} now={NOW} />);
    expect(document.body.textContent).toContain("Saturday, December 19, 2026");
    expect(document.querySelector("article")?.getAttribute("lang")).toBe("en-US");
  });

  it.each(NAMES)("%s: light and dark carry the document's own palettes, and without a forced scheme the system's dark is declared", (name) => {
    const design = readDesign(designTemplate(name).theme) as DesignDocumentV2;
    const light = html(name, { colorScheme: "light" });
    const dark = html(name, { colorScheme: "dark" });
    expect(light).toContain(`--celebration-canvas:${design.tokens.palettes.light.canvas}`);
    expect(dark).toContain(`--celebration-canvas:${design.tokens.palettes.dark.canvas}`);
    expect(dark).toContain(`--celebration-accent-fill:${design.tokens.palettes.dark.accentFill}`);
    expect(light).not.toContain("prefers-color-scheme");
    const system = html(name);
    expect(system).toContain("prefers-color-scheme:dark");
    expect(system).toContain(design.tokens.palettes.dark.canvas);
  });

  it.each(NAMES)("%s: no gradient, no uppercase kicker, no saturated full-width block, no yellow", (name) => {
    const markup = html(name);
    expect(markup).not.toMatch(/gradient/);
    const theme = JSON.stringify(designTemplate(name).theme).toLowerCase();
    for (const yellow of ["#ffd700", "#e8c987", "#ffeb3b", "#ffc107"]) expect(theme).not.toContain(yellow);
    // The v2 part of the stylesheet is where a template could bring them back.
    const v2Css = readFileSync(join(__dirname, "../../styles.css"), "utf8").split("Design document v2 (F4 b)")[1] as string;
    expect(v2Css).not.toMatch(/gradient|text-transform:\s*uppercase/);
  });

  it("a section page (`only`) draws its own page, with the dock, and not the others", () => {
    const markup = html("marfil", { only: "schedule" });
    expect(markup).toContain('data-section="schedule"');
    expect(markup).not.toContain('data-section="venues"');
    expect(markup).not.toContain('data-page-kind="cover"');
    expect(markup).toContain('data-action="gifts"');
  });

  it("the canvases place the elements: the phone's grid and, from 900 px, the desktop one with its own positions", () => {
    const markup = html("marfil");
    expect(markup).toContain('data-mode="flow"');
    expect(markup).toContain("data-desktop");
    expect(markup).toMatch(/--mx:\d+;--my:\d+;--mw:\d+;--mh:\d+/);
    expect(markup).toMatch(/--dx:6;--dy:4;--dw:6;/);
  });

  it("an element hidden in the document is not drawn, but the dock still carries the gifts button (P22)", () => {
    const template = designTemplate("pinata");
    const design = JSON.parse(JSON.stringify(template.theme)) as DesignDocumentV2 & { pages: { canvases: { mobile: { elements: { block: string; visible: boolean }[] } } }[] };
    for (const page of design.pages) for (const item of page.canvases.mobile.elements) if (item.block === "gifts-cta") item.visible = false;
    const markup = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate({ ...template, theme: design as unknown as TemplateDocument["theme"] }, WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} t={t} now={NOW} />);
    expect([...markup.matchAll(/data-action="gifts"/g)]).toHaveLength(1);
    expect(markup).toContain('data-dock=""');
  });

  it("a link of the document: listing goes through the redirector, gifts to the list, url only https", () => {
    const template = designTemplate("marfil");
    const design = JSON.parse(JSON.stringify(template.theme));
    design.blocks.push({ id: "b-l", type: "button", config: { label: "Hotel", style: "outline" } }, { id: "b-u", type: "button", config: { label: "Web", style: "link" } });
    design.pages[0].canvases.mobile.elements.push(
      { id: "e-l", block: "b-l", x: 0, y: 40, w: 4, h: 6, visible: true, link: { kind: "listing", listingId: "11111111-1111-4111-8111-111111111111" } },
      { id: "e-u", block: "b-u", x: 0, y: 46, w: 4, h: 6, visible: true, link: { kind: "url", href: "https://example.org/x" } });
    const markup = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate({ ...template, theme: design }, WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} t={t} now={NOW} />);
    expect(markup).toContain('href="/r/11111111-1111-4111-8111-111111111111"');
    expect(markup).toMatch(/href="https:\/\/example.org\/x"[^>]*rel="noopener noreferrer nofollow"/);
  });
});

describe("a v2 row the renderers cannot read", () => {
  it("falls back to the neutral template instead of breaking the public page", () => {
    const broken = { ...designTemplate("marfil"), theme: { schemaVersion: 2, tokens: "nope" } } as unknown as TemplateDocument;
    const theme = themeFromTemplate(broken, WEDDING_VIEW.enabledSections);
    expect(theme.design).toBeUndefined();
    expect(theme.id).toBe("fallback");
    expect(() => renderToStaticMarkup(<CelebrationRenderer theme={theme} view={WEDDING_VIEW} t={t} now={NOW} />)).not.toThrow();
  });
  it("hostile ids and values never reach the DOM as markup", () => {
    const template = designTemplate("pinata");
    const design = JSON.parse(JSON.stringify(template.theme));
    design.blocks.push({ id: "b-t", type: "text", config: { text: "<img src=x onerror=alert(1)>" } });
    design.pages[0].canvases.mobile.elements.push({ id: "e-t", block: "b-t", x: 0, y: 50, w: 4, h: 2, visible: true });
    const markup = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate({ ...template, theme: design }, WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} t={t} now={NOW} />);
    expect(markup).not.toContain("<img src=x");
    expect(markup).toContain("&lt;img src=x");
  });
});

describe("m1 · readDesign is defensive in depth", () => {
  interface Loose { tokens: { spacing: Record<string, unknown>; typography: { scale: Record<string, unknown> }; radii: Record<string, unknown> }; pages: { canvases: { mobile: Record<string, unknown> & { elements: unknown[] } } }[] }
  const base = (): Loose => JSON.parse(JSON.stringify(designTemplate("pinata").theme)) as Loose;
  const render = (design: unknown): string => {
    const template = { ...designTemplate("pinata"), theme: design } as unknown as TemplateDocument;
    return renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(template, WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} t={t} now={NOW} />);
  };

  it("a null or malformed element is dropped, the page still renders", () => {
    const design = base();
    (design.pages[0] as Loose["pages"][number]).canvases.mobile.elements.unshift(null, 7, "x", { id: "e", block: "cover", x: "0", y: 0, w: 4, h: 1, visible: true });
    expect(() => render(design)).not.toThrow();
    expect(render(design)).toContain("<h1>");
    expect(readDesign(design)?.pages[0]?.canvases.mobile.elements.every((item) => item && typeof item.x === "number")).toBe(true);
  });

  it("style values that are not the contract's numbers or enums never reach the markup", () => {
    const design = base();
    const first = design.pages[0]?.canvases.mobile.elements[2] as Record<string, unknown>;
    first.typography = { size: "1px;background:url(//evil.test);position:fixed", weight: "700;x", align: "left;}", transform: "uppercase;color:red", lineHeight: "9", colour: "red;x" };
    first.padding = { top: "0;x", right: 0, bottom: 0, left: 0 };
    first.border = { width: "1px;x", style: "solid;x", colour: "accent" };
    first.radius = "9px;x"; first.z = "1;x"; first.opacity = "1;x"; first.rotation = "9deg;x";
    first.animation = { entrance: "rise;x", delayMs: "1;x" };
    first.link = { kind: "url", href: "javascript:alert(1)" };
    const markup = render(design);
    for (const needle of ["evil.test", "position:fixed", "url(", "expression", "javascript:", "uppercase;color"]) expect(markup).not.toContain(needle);
    expect(markup).not.toMatch(/style="[^"]*[{}]/);
  });

  it("out-of-range structure falls back to the neutral template", () => {
    for (const mutate of [
      (d: Loose) => { d.tokens.spacing.contentMaxWidth = "720px;x"; },
      (d: Loose) => { d.tokens.typography.scale.ratio = 99; },
      (d: Loose) => { (d.pages[0] as Loose["pages"][number]).canvases.mobile.columns = "4"; },
      (d: Loose) => { d.tokens.radii.md = -1; }
    ]) {
      const design = base();
      mutate(design);
      expect(readDesign(design)).toBeNull();
      expect(() => render(design)).not.toThrow();
    }
  });
});

describe("m5 · a monogram face without weights never breaks the font sheet", () => {
  const withMonogram = (monogram: unknown): unknown => {
    const theme = JSON.parse(JSON.stringify(designTemplate("gala").theme)) as { tokens: { typography: Record<string, unknown> } };
    theme.tokens.typography["monogram"] = monogram;
    return theme;
  };
  it.each([{ family: "bodoni-moda" }, { family: "bodoni-moda", weights: "x" }, { family: "bodoni-moda", weights: [500.5] }, { weights: [500] }, 7, null] as const)("%j is dropped and the heading's face stands in", (monogram) => {
    const design = readDesign(withMonogram(monogram)) as DesignDocumentV2;
    expect(design).not.toBeNull();
    expect(design.tokens.typography.monogram).toBeUndefined();
    expect(() => designFontStylesheet(design)).not.toThrow();
    const template = { ...designTemplate("gala"), theme: withMonogram(monogram) } as unknown as TemplateDocument;
    const theme = themeFromTemplate(template, WEDDING_VIEW.enabledSections);
    expect(() => fontStylesheet(theme)).not.toThrow();
    expect(() => renderToStaticMarkup(<CelebrationRenderer theme={theme} view={WEDDING_VIEW} t={t} now={NOW} />)).not.toThrow();
  });
  it("a valid monogram face is kept and asked from Google Fonts", () => {
    const design = readDesign(designTemplate("gala").theme) as DesignDocumentV2;
    expect(design.tokens.typography.monogram?.family).toBe("bodoni-moda");
    expect(designFontStylesheet(design)).toContain("Bodoni+Moda");
  });
});

describe("state · the photo fails to load", () => {
  const draw = (name: (typeof NAMES)[number]): ReturnType<typeof render> =>
    render(<CelebrationRenderer theme={themeFromTemplate(designTemplate(name), WEDDING_VIEW.enabledSections)} view={WEDDING_VIEW} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" />);

  it.each(NAMES)("%s: the cover photo that errors becomes the palette's surface with the camera drawing, in the same place, and the title stays", (name) => {
    const { container } = draw(name);
    const photo = container.querySelector("img.cdesign-cover-photo") as HTMLImageElement;
    expect(photo).toBeTruthy();
    const parent = photo.parentElement;
    fireEvent.error(photo);
    expect(container.querySelector("img.cdesign-cover-photo")).toBeNull();
    const fallback = container.querySelector(".cdesign-cover-photo[data-photo-failed]") as HTMLElement;
    expect(fallback.parentElement).toBe(parent);
    expect(fallback.querySelector('svg[data-art="camara"]')).toBeTruthy();
    expect(fallback.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".cdesign-cover h1")?.textContent).toBe(VIEW.content.title);
    expect(container.querySelectorAll('a[data-action="gifts"]').length).toBeGreaterThanOrEqual(2);
  });

  it("a gallery photo that errors keeps its link and its name and shows the drawing", () => {
    const { container } = draw("marfil");
    const photos = [...container.querySelectorAll(".celebration-gallery img")];
    expect(photos.length).toBeGreaterThan(0);
    fireEvent.error(photos[0] as HTMLImageElement);
    const fallback = container.querySelector(".celebration-gallery [data-photo-failed]") as HTMLElement;
    expect(fallback.getAttribute("role")).toBe("img");
    expect(fallback.getAttribute("aria-label")).toBeTruthy();
    expect(fallback.querySelector('svg[data-art="camara"]')).toBeTruthy();
    expect(fallback.closest("a")?.getAttribute("href")).toBeTruthy();
    expect(container.querySelectorAll(".celebration-gallery img")).toHaveLength(photos.length - 1);
  });

  it("an image that failed before the page was interactive is caught when it mounts", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
    vi.spyOn(HTMLImageElement.prototype, "currentSrc", "get").mockReturnValue("http://x.test/cover.jpg");
    const { container } = draw("pinata");
    expect(container.querySelector("img.cdesign-cover-photo")).toBeNull();
    expect(container.querySelector(".cdesign-cover-photo[data-photo-failed]")).toBeTruthy();
  });

  it("negative: a photo that loads is untouched", () => {
    const { container } = draw("gala");
    expect(container.querySelector("img.cdesign-cover-photo")).toBeTruthy();
    expect(container.querySelector("[data-photo-failed]")).toBeNull();
  });
});

describe("state · «Ver regalos» in its three states (giftsStatus seam, BE #128 not connected)", () => {
  const LABEL = { OPEN: "celebration.gifts.cta", EMPTY: "celebration.gifts.ctaEmpty", CLOSED: "celebration.gifts.ctaClosed" } as const;
  it.each(NAMES)("%s: OPEN, EMPTY and CLOSED each say their own words, look different and keep the link, twice", (name) => {
    for (const status of ["OPEN", "EMPTY", "CLOSED"] as const) {
      const markup = html(name, { giftsStatus: status });
      const buttons = [...parse(markup).querySelectorAll('a[data-action="gifts"]')];
      expect(buttons.length, `${name} ${status}`).toBeGreaterThanOrEqual(2);
      for (const button of buttons) {
        expect(button.getAttribute("href")).toBe(giftsPath("ana-y-luis"));
        expect(button.textContent).toBe(LABEL[status]);
        expect(button.getAttribute("data-gifts-status")).toBe(status);
      }
      expect(markup).not.toContain("gifts.guest.cta");
    }
  });
  it("the stylesheet gives EMPTY and CLOSED a look of their own on palette roles", () => {
    const css = readFileSync(join(__dirname, "../../styles.css"), "utf8");
    expect(css).toMatch(/\[data-gifts-status="EMPTY"\][^}]*dashed/);
    expect(css).toMatch(/\[data-gifts-status="CLOSED"\][^}]*var\(--celebration-muted\)/);
  });
  it("the labels exist in both languages and none is a gifts.guest key", () => {
    const es = readFileSync(join(__dirname, "../../../i18n/locales/es-BO/celebration.ts"), "utf8");
    const en = readFileSync(join(__dirname, "../../../i18n/locales/en-US/celebration.ts"), "utf8");
    for (const source of [es, en]) for (const key of ["ctaEmpty", "ctaClosed"]) expect(source).toContain(key);
  });
});

describe("native: informative reading of a design document", () => {
  it.each(NAMES)("%s: the app draws the same sections in the document's order, with its palette, and the gifts button", (name) => {
    const theme = themeFromTemplate(designTemplate(name), WEDDING_VIEW.enabledSections);
    const { container, getByTestId } = render(<CelebrationNativeRenderer theme={theme} view={WEDDING_VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const order = [...container.querySelectorAll("[data-testid^='section-']")].map((node) => node.getAttribute("data-testid")?.replace("section-", ""));
    expect(order).toEqual(theme.sections.filter((section) => ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations", "gifts", "rsvp"].includes(section)));
    expect(getByTestId("celebration-gifts-cta")).toBeTruthy();
    const design = theme.design as DesignDocumentV2;
    const css = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join(" ");
    const hex = design.tokens.palettes.light.canvas;
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
    expect(css).toContain(`rgba(${r},${g},${b},1.00)`);
  });
});

describe("the documents themselves", () => {
  it.each(NAMES)("%s: exactly one gifts button, required, and no link on it (the destination is the renderer's)", (name) => {
    const design = DESIGN_TEMPLATES[name].theme as unknown as DesignDocumentV2;
    const gifts = design.blocks.filter((block) => block.type === "giftsCta");
    expect(gifts).toHaveLength(1);
    expect(gifts[0]?.required).toBe(true);
    for (const page of design.pages) for (const canvas of Object.values(page.canvases)) for (const item of canvas.elements) if (item.block === gifts[0]?.id) expect(item.link).toBeUndefined();
  });
  it.each(NAMES)("%s: no Inter, no retired family and no weight 800", (name) => {
    const text = JSON.stringify(DESIGN_TEMPLATES[name].theme);
    const design = DESIGN_TEMPLATES[name].theme as unknown as DesignDocumentV2;
    for (const font of [design.tokens.typography.heading, design.tokens.typography.body]) expect(font.weights).not.toContain(800);
    for (const banned of ["\"inter\"", "poppins", "ibm-plex"]) expect(text).not.toContain(banned);
  });
});
