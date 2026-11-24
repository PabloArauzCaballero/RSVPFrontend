import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "@rsvp/i18n/server";
import { describe, expect, it } from "vitest";
import { Landing } from "../components/landing";

describe("Portada · una escena por cada lado de la fiesta", () => {
  it("draws the host, guest and provider scenes once each, decorative, with the group pastel of the app", () => {
    const html = renderToStaticMarkup(<Landing t={createTranslator("es-BO")} locale="es-BO" />);
    const art = html.match(/<svg[^>]*roles__art[^>]*>/g) ?? [];
    expect(art).toHaveLength(3);
    for (const svg of art) expect(svg).toContain('aria-hidden="true"');
    expect(art.map((svg) => /art--(\w+)/.exec(svg)?.[1])).toEqual(["yellow", "blue", "green"]);
  });

  it("draws the promise, one scene per tap and the closing envelope, small, decorative and only with group pastels", () => {
    const html = renderToStaticMarkup(<Landing t={createTranslator("es-BO")} locale="es-BO" />);
    const pick = (cls: string) => html.match(new RegExp(`<svg[^>]*class="art art--\\w+ ${cls}"[^>]*>`, "g")) ?? [];
    expect(pick("hero__art").map((svg) => /art--(\w+)/.exec(svg)?.[1])).toEqual(["blue"]);
    expect(pick("steps__art").map((svg) => /art--(\w+)/.exec(svg)?.[1])).toEqual(["yellow", "blue", "yellow"]);
    const closing = /<span class="closing__art">(<svg[^>]*>)/.exec(html)?.[1] ?? "";
    expect(closing).toContain("art--yellow");
    for (const svg of [...pick("hero__art"), ...pick("steps__art"), closing]) expect(svg).toContain('aria-hidden="true"');
    // The drawing sits next to the product picture of each step, never in its place.
    expect(html.match(/class="stepart"/g)).toHaveLength(3);
    expect(html).toContain('role="img"');
  });
});
