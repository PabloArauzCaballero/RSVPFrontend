import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { CelebrationRenderer, COMPONENT_CONTRAST, contrastRatio, paletteFor, TEXT_CONTRAST, readContent, themeFromTemplate, daysUntil, sectionForPath, partnerHref, mapUrl, giftsPath, type GiftsStatus, type TemplateDocument } from "./index.js";
import seeded from "../test/seeded-palettes.json";
import { GALLERY, NOW, t, TEMPLATES, VIEW, WEDDING_SECTIONS } from "../test/fixtures.js";

const renderWith = (template: TemplateDocument | null, extra: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}): string =>
  renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(template, VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" {...extra} />);

afterEach(cleanup);

describe("CelebrationRenderer", () => {
  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("REQ-F09-01/03 · %s layout, light and dark", (_layout, template) => {
    expect(renderWith(template)).toMatchSnapshot("light");
    expect(renderWith(template, { colorScheme: "dark" })).toMatchSnapshot("dark");
  });

  it("an SVG cover, which has no raster variants, is still painted on the cover", () => {
    const drawing = { id: "s", width: null, height: null, isCover: true, variants: { svg: "https://media.test/d.svg" } };
    render(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} gallery={[drawing]} t={t} now={NOW} />);
    expect(document.querySelector("img.celebration-hero-image")?.getAttribute("src")).toBe("https://media.test/d.svg");
    expect(document.querySelector(".celebration-hero")?.getAttribute("data-has-image")).toBe("true");
  });

  it("REQ-F09-05 · a brand-new template row changes the site without touching code", () => {
    const before = renderWith(TEMPLATES[0]);
    const inserted: TemplateDocument = { ...TEMPLATES[0], id: "t-new", name: "Nuevo", layout: "festive", theme: { palette: { canvas: "#000000", surface: "#111111", text: "#FAFAFA", accent: "#FFD700", muted: "#AAAAAA" }, typography: { heading: "Georgia, serif", body: "Arial, sans-serif" }, sectionStyle: "cards" }, sectionOrder: ["faq", "story"] };
    const after = renderWith(inserted);
    expect(after).not.toBe(before);
    expect(after).toContain('data-layout="festive"');
    expect(after).toContain("--celebration-accent:#FFD700");
    expect(after.indexOf('data-section="faq"')).toBeLessThan(after.indexOf('data-section="story"'));
    expect(after).not.toContain('data-section="schedule"');
  });

  it("sections in the template's order, and empty ones leave no hole", () => {
    const html = renderWith(TEMPLATES[1]);
    const order = [...html.matchAll(/data-section="(\w+)"/g)].map((match) => match[1]);
    expect(order).toEqual(["schedule", "venues", "story", "gallery", "faq", "gifts", "rsvp"]);
    const noDressCode = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={{ ...VIEW, content: { ...VIEW.content, dressCode: "", faq: [] } }} t={t} now={NOW} />);
    expect(noDressCode).not.toContain('data-section="dressCode"');
    expect(noDressCode).not.toContain('data-section="faq"');
    expect(noDressCode).not.toContain('data-section="gallery"', );
  });

  it("REQ-F10-06 · every partner link goes through the redirector", () => {
    render(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const partners = document.querySelectorAll('a[data-link-kind="partner"]');
    expect(partners).toHaveLength(1);
    expect(partners[0]?.getAttribute("href")).toBe("/r/listing-42");
    expect(partners[0]?.getAttribute("rel")).toContain("sponsored");
    const external = [...document.querySelectorAll("a")].filter((anchor) => /^https?:/.test(anchor.getAttribute("href") ?? ""));
    expect(external.every((anchor) => ["navigation", "image"].includes(anchor.getAttribute("data-link-kind") ?? ""))).toBe(true);
  });

  it("REQ-F10-05 · times show in the celebration zone whatever the device zone", () => {
    render(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} t={t} now={NOW} />);
    const times = [...document.querySelectorAll(".celebration-schedule time")].map((node) => node.textContent);
    // 19:00 and 23:30 in La Paz, written the way es-BO writes hours.
    expect(times).toEqual(["7:00 p. m.", "11:30 p. m."]);
    expect(screen.getByText(/sábado, 19 de diciembre de 2026/)).toBeTruthy();
    cleanup();
    render(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={{ ...VIEW, locale: "en-US" }} t={t} now={NOW} />);
    expect([...document.querySelectorAll(".celebration-schedule time")].map((node) => node.textContent)).toEqual(["7:00 PM", "11:30 PM"]);
    expect(screen.getByText("Saturday, December 19, 2026")).toBeTruthy();
  });

  it("a single-section page shows only that section, with the hero replaced by a header", () => {
    const html = renderWith(TEMPLATES[0], { only: "faq" });
    expect([...html.matchAll(/data-section="(\w+)"/g)].map((match) => match[1])).toEqual(["faq"]);
    expect(html).toContain("celebration.sections.faq");
    expect(html).toContain('aria-current="page"');
  });

  it("countdown says today on the day, and days before", () => {
    expect(renderWith(TEMPLATES[0])).toContain("celebration.hero.countdown {&quot;count&quot;:64}");
    expect(renderWith(TEMPLATES[0], { now: new Date("2026-12-20T00:00:00.000Z") })).toContain("celebration.hero.today");
  });
});

const BASE = "/c/ana-y-luis";
const withoutGifts = <TSection extends string>(order: readonly TSection[]): TSection[] => order.filter((section) => section !== "gifts");
const parse = (html: string): Document => new DOMParser().parseFromString(html, "text/html");

describe("P22 · PL-A10 · the gifts button on every invitation", () => {
  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("%s · shown even when the template's sectionOrder omits gifts and the event type does not enable it", (_layout, template) => {
    const omitted: TemplateDocument = { ...template, sectionOrder: withoutGifts(template.sectionOrder) };
    const view = { ...VIEW, enabledSections: withoutGifts(WEDDING_SECTIONS) };
    for (const colorScheme of ["light", "dark"] as const) {
      const document = parse(renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(omitted, view.enabledSections)} view={view} gallery={GALLERY} t={t} now={NOW} basePath={BASE} colorScheme={colorScheme} />));
      const section = document.querySelector('section[data-section="gifts"]');
      expect(section?.querySelector("h2")?.textContent).toBe("celebration.sections.gifts");
      const button = section?.querySelector<HTMLAnchorElement>('a[data-action="gifts"]');
      expect(button?.getAttribute("href")).toBe(`${BASE}/regalos`);
      expect(button?.className).toBe("celebration-cta");
      expect(button?.textContent).toBe("celebration.gifts.cta");
      // DESIGN.md: icon + text; the icon is decorative, the label names the action.
      expect(button?.querySelector('svg[data-icon="gifts"]')?.getAttribute("aria-hidden")).toBe("true");
      const nav = [...document.querySelectorAll(".celebration-nav a")];
      expect(nav.find((link) => link.getAttribute("href") === `${BASE}/regalos`)?.textContent).toBe("celebration.sections.gifts");
    }
  });

  it("goes where the template places it, otherwise right before the reply", () => {
    const placed = parse(renderWith(TEMPLATES[0]));
    expect([...placed.querySelectorAll("[data-section]")].map((node) => node.getAttribute("data-section"))).toEqual(["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]);
    const corporate = parse(renderWith(TEMPLATES[4]));
    expect([...corporate.querySelectorAll("[data-section]")].map((node) => node.getAttribute("data-section"))).toEqual(["schedule", "venues", "faq", "recommendations", "gifts", "rsvp"]);
  });

  it("never carries the guest's personal link, even when the page knows it", () => {
    const html = renderWith(TEMPLATES[1], { rsvpHref: `${BASE}/rsvp/secret-token-123456` });
    const gifts = parse(html).querySelector('a[data-action="gifts"]');
    expect(gifts?.getAttribute("href")).toBe(giftsPath(VIEW.slug));
    expect(gifts?.getAttribute("href")).not.toContain("secret-token");
    expect(giftsPath("ana y luis")).toBe("/c/ana%20y%20luis/regalos");
  });

  it.each([["OPEN", "celebration.gifts.cta"], ["EMPTY", "celebration.gifts.ctaEmpty"], ["CLOSED", "celebration.gifts.ctaClosed"]] as const)("giftsStatus %s keeps the button on /regalos and says its own label", (status: GiftsStatus, label: string) => {
    const gifts = parse(renderWith(TEMPLATES[2], { giftsStatus: status })).querySelector('a[data-action="gifts"]');
    expect(gifts?.textContent).toBe(label);
    expect(gifts?.getAttribute("href")).toBe(giftsPath(VIEW.slug));
    expect(gifts?.getAttribute("data-gifts-status")).toBe(status);
  });

  it("is always in view (the dock), also on a section's own page, which keeps it in the navigation too", () => {
    const faqPage = parse(renderWith(TEMPLATES[0], { only: "faq" }));
    expect(faqPage.querySelector('.cdesign-dock a[data-action="gifts"]')?.getAttribute("href")).toBe(`${BASE}/regalos`);
    expect(faqPage.querySelector('section a[data-action="gifts"]')).toBeNull();
    expect(faqPage.querySelector(`.celebration-nav a[href="${BASE}/regalos"]`)).toBeTruthy();
  });
});

describe("M4 (revisión de F4 a) · el texto blanco sobre la foto de portada editorial", () => {
  it("llega a 4.5:1 con la foto más clara posible (blanco puro)", () => {
    const css = readFileSync(join(__dirname, "../styles.css"), "utf8");
    const brightness = Number(/data-hero="overlay"\] \.celebration-hero-image \{[^}]*brightness\(([\d.]+)\)/.exec(css)?.[1]);
    expect(brightness).toBeGreaterThan(0);
    const level = Math.round(255 * brightness);
    const hex = `#${level.toString(16).padStart(2, "0").repeat(3)}`;
    expect(contrastRatio("#FFFFFF", hex)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });
  it("B2 · los titulares van en tinta y el acento queda para filetes, iconos y botones", () => {
    const css = readFileSync(join(__dirname, "../styles.css"), "utf8");
    expect(css).toMatch(/\.celebration h2 \{[^}]*color: var\(--celebration-text\)/);
    expect(css).not.toMatch(/border-bottom: [4-9]px solid var\(--celebration-accent\)|border-left: [4-9]px solid var\(--celebration-accent\)/);
  });
});

describe("PL-A11 · the reply always leads somewhere", () => {
  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("%s · without a personal link: the help to find it; with it: «Confirmar asistencia»", (_layout, template) => {
    const help = parse(renderWith(template, { rsvpHelpHref: `${BASE}/rsvp` })).querySelector('section[data-section="rsvp"]');
    const helpLink = help?.querySelector('a[data-action="rsvp-help"]');
    expect(help?.textContent).toContain("celebration.rsvp.body");
    expect(helpLink?.getAttribute("href")).toBe(`${BASE}/rsvp`);
    expect(helpLink?.textContent).toBe("celebration.rsvp.findLink");
    expect(helpLink?.querySelector('svg[data-icon="invitation"]')).toBeTruthy();
    expect(help?.querySelector('a[data-action="rsvp"]')).toBeNull();

    const own = parse(renderWith(template, { rsvpHref: `${BASE}/rsvp/token-abcdefghijklmnop`, rsvpHelpHref: `${BASE}/rsvp` })).querySelector('section[data-section="rsvp"]');
    expect(own?.querySelector('a[data-action="rsvp"]')?.textContent).toBe("celebration.rsvp.cta");
    expect(own?.querySelector('a[data-action="rsvp"] svg[data-icon="check"]')).toBeTruthy();
    expect(own?.querySelector('a[data-action="rsvp-help"]')).toBeNull();
  });

  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("%s · adaptive: both faces in one button to the same destination, the help face exposed first, no token", (_layout, template) => {
    const button = parse(renderWith(template, { rsvpHelpHref: `${BASE}/rsvp`, rsvpAdaptive: true })).querySelector('section[data-section="rsvp"] a[data-action="rsvp-help"]');
    expect(button?.getAttribute("href")).toBe(`${BASE}/rsvp`);
    expect(button?.getAttribute("data-credential")).toBe("absent");
    expect(button?.querySelector('[data-face="find"]')?.textContent).toBe("celebration.rsvp.findLink");
    expect(button?.querySelector('[data-face="find"] svg[data-icon="invitation"]')).toBeTruthy();
    expect(button?.querySelector('[data-face="confirm"]')?.textContent).toBe("celebration.rsvp.cta");
    expect(button?.querySelector('[data-face="confirm"] svg[data-icon="check"]')).toBeTruthy();
    expect(button?.querySelector('[data-face="confirm"]')?.getAttribute("aria-hidden")).toBe("true");
    expect(button?.outerHTML).not.toMatch(/token|#t=/);
  });

  it("negative: adaptive does nothing when the visitor's own link is known (the link wins) or there is no destination", () => {
    const own = parse(renderWith(TEMPLATES[0], { rsvpHref: `${BASE}/rsvp/token-abcdefghijklmnop`, rsvpHelpHref: `${BASE}/rsvp`, rsvpAdaptive: true })).querySelector('section[data-section="rsvp"]');
    expect(own?.querySelector("[data-face]")).toBeNull();
    expect(own?.querySelector('a[data-action="rsvp"]')?.textContent).toBe("celebration.rsvp.cta");
    expect(parse(renderWith(TEMPLATES[0], { rsvpAdaptive: true })).querySelector('section[data-section="rsvp"] a')).toBeNull();
  });

  it("negative: with no destination at all (a still preview) the section stays text, no dead link", () => {
    const section = parse(renderWith(TEMPLATES[0])).querySelector('section[data-section="rsvp"]');
    expect(section?.querySelector("a")).toBeNull();
  });
});

describe("business model · every provider link goes through the redirector (/r/{listingId})", () => {
  // A hostile content row: the host (or a buggy editor) put the provider's own address in the recommendation.
  const direct = "https://hotel-directo.example/reservar";
  const view = {
    ...VIEW,
    content: {
      ...VIEW.content,
      recommendations: [
        { kind: "lodging", name: "Hotel Partner", listingId: "listing-42", url: direct, href: direct, website: direct },
        { kind: "transport", name: "Traslados", listingId: "listing 7/x", url: direct },
        { kind: "other", name: "Sin ficha", url: direct }
      ]
    }
  };
  const galleryUrls = new Set(GALLERY.flatMap((image) => Object.values(image.variants)));

  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("%s · no rendered link reaches a provider directly", (_layout, template) => {
    for (const colorScheme of ["light", "dark"] as const) {
      const html = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(template, view.enabledSections)} view={view} gallery={GALLERY} t={t} now={NOW} basePath={BASE} rsvpHelpHref={`${BASE}/rsvp`} colorScheme={colorScheme} />);
      expect(html).not.toContain("hotel-directo.example");
      const anchors = [...parse(html).querySelectorAll("a")];
      const partners = anchors.filter((anchor) => anchor.dataset["linkKind"] === "partner");
      if (template.sectionOrder.includes("recommendations")) expect(partners.map((anchor) => anchor.getAttribute("href"))).toEqual(["/r/listing-42", "/r/listing%207%2Fx"]);
      for (const anchor of anchors) {
        const href = anchor.getAttribute("href") ?? "";
        // Allowed: the redirector, the invitation's own pages, maps for "how to get there" and the full-size photos.
        const allowed = /^\/r\/[^/?#]+$/.test(href) || href === BASE || href.startsWith(`${BASE}/`) || Boolean(mapUrl(href)) || galleryUrls.has(href);
        expect(allowed, `${anchor.dataset["linkKind"] ?? "?"} → ${href}`).toBe(true);
        if (anchor.dataset["linkKind"] === "partner") expect(anchor.getAttribute("rel")).toContain("sponsored");
      }
    }
  });
});

describe("content helpers", () => {
  it("reads hosts in the event type's role order with their labels", () => {
    expect(readContent(VIEW).hosts).toEqual([{ role: "BRIDE", label: "Novia", name: "Ana" }, { role: "GROOM", label: "Novio", name: "Luis" }]);
  });
  it("the cover names the hosts only when the title does not; a layout without a photo still marks its cover", () => {
    const named = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} t={t} now={NOW} />);
    expect(named).not.toContain("celebration-hosts");
    expect(named).toContain('data-has-image="false"');
    const other = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={{ ...VIEW, content: { ...VIEW.content, title: "Nuestra boda" } }} gallery={GALLERY} t={t} now={NOW} />);
    expect(new DOMParser().parseFromString(other, "text/html").querySelector(".celebration-hosts")?.textContent).toBe("Ana & Luis");
  });

  it("ignores malformed content instead of failing", () => {
    const content = readContent({ ...VIEW, content: { schedule: [{ title: "x" }, "bad", { title: "ok", startsAt: "2026-01-01T00:00:00Z" }], faq: [{ question: "q" }], venues: [{ kind: "spaceship", name: "Somewhere" }], recommendations: [{ kind: "weird", name: "r" }] } });
    expect(content.schedule).toHaveLength(1);
    expect(content.faq).toEqual([]);
    expect(content.venues[0]?.kind).toBe("other");
    expect(content.recommendations[0]?.kind).toBe("other");
    expect(content.title).toBe("");
  });
  it("schedule labels translate items without touching their instants", () => {
    const content = readContent({ ...VIEW, content: { ...VIEW.content, scheduleLabels: { s1: { title: "Ceremony" } } } });
    expect(content.schedule[0]).toMatchObject({ title: "Ceremony", startsAt: "2026-12-19T23:00:00.000Z" });
  });
  it("paths, links and day counts", () => {
    expect(sectionForPath("itinerario")).toBe("schedule");
    expect(sectionForPath("admin")).toBeUndefined();
    expect(partnerHref("a b")).toBe("/r/a%20b");
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("not a date", NOW)).toBeNull();
    expect(daysUntil("2026-10-01T00:00:00Z", NOW)).toBe(0);
  });
});

describe("PL-114-V4 · the gifts button and the reply button read in the 16 seeded palettes, light and dark (same fill as phase 0's)", () => {
  const cases = seeded.templates.flatMap((template) => (["light", "dark"] as const).map((scheme) => [`${template.key} · ${scheme}`, template.palette, scheme] as const));

  it.each(cases)("%s", (_name, palette, scheme) => {
    const theme = { ...themeFromTemplate(TEMPLATES[0], VIEW.enabledSections), palette };
    const html = renderToStaticMarkup(<CelebrationRenderer theme={theme} view={VIEW} gallery={GALLERY} t={t} now={NOW} basePath={BASE} rsvpHelpHref={`${BASE}/rsvp`} colorScheme={scheme} />);
    const root = parse(html);
    const style = root.querySelector("article")?.getAttribute("style") ?? "";
    const fill = /--celebration-accent-fill:(#[0-9A-Fa-f]{6})/.exec(style)?.[1];
    const ink = /--celebration-on-accent:(#[0-9A-Fa-f]{6})/.exec(style)?.[1];
    expect(fill && ink).toBeTruthy();
    // Both buttons are the one `.celebration-cta`, and the stylesheet paints that class with the fill measured here.
    expect(readFileSync(join(process.cwd(), "styles.css"), "utf8")).toMatch(/\n\.celebration-cta \{[^}]*background: var\(--celebration-accent-fill\); color: var\(--celebration-on-accent\)/);
    for (const action of ["gifts", "rsvp-help"]) expect(root.querySelector(`a[data-action="${action}"]`)?.classList.contains("celebration-cta")).toBe(true);
    const surfaces = paletteFor(theme, scheme);
    expect(contrastRatio(ink!, fill!)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    for (const background of [surfaces.canvas, surfaces.surface]) expect(contrastRatio(fill!, background)).toBeGreaterThanOrEqual(COMPONENT_CONTRAST);
  });
});
