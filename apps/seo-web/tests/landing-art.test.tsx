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
});
