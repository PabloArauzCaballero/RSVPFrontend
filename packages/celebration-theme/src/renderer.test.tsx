import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { CelebrationRenderer, readContent, themeFromTemplate, daysUntil, sectionForPath, partnerHref, navigationHref, type TemplateDocument } from "./index.js";
import { GALLERY, NOW, t, TEMPLATES, VIEW } from "../test/fixtures.js";

const renderWith = (template: TemplateDocument | null, extra: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}): string =>
  renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate(template, VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} basePath="/c/ana-y-luis" {...extra} />);

afterEach(cleanup);

describe("CelebrationRenderer", () => {
  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("REQ-F09-01/03 · %s layout, light and dark", (_layout, template) => {
    expect(renderWith(template)).toMatchSnapshot("light");
    expect(renderWith(template, { colorScheme: "dark" })).toMatchSnapshot("dark");
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
    expect(order).toEqual(["schedule", "venues", "story", "gallery", "faq", "rsvp"]);
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

describe("content helpers", () => {
  it("reads hosts in the event type's role order with their labels", () => {
    expect(readContent(VIEW).hosts).toEqual([{ role: "BRIDE", label: "Novia", name: "Ana" }, { role: "GROOM", label: "Novio", name: "Luis" }]);
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
    expect(navigationHref({ name: "Iglesia", address: "Plaza" })).toBe("https://www.google.com/maps/search/?api=1&query=Iglesia%2C%20Plaza");
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("not a date", NOW)).toBeNull();
    expect(daysUntil("2026-10-01T00:00:00Z", NOW)).toBe(0);
  });
});
