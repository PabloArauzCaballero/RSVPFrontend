import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
// Test-only reach into the app's drawing data (the boundary test scans app/, components/ and lib/, never tests/): seo-web
// copies the paths because it cannot import `@rsvp/ui`, and this is what keeps the copy honest.
import { ILLUSTRATION_GROUPS, ILLUSTRATION_PASTEL, ILLUSTRATIONS, type IllustrationName, type Layer } from "../../../packages/ui/src/illustrations";
import { DeadlineClosedArt, EmptyArt, GiftReservedArt, LinkExpiredArt, LostArt, NoAccessArt, NoGiftsArt, OfflineArt, WelcomeGuestArt } from "../components/brand/illustrations";

/** The CSS class of each layer of the app's scene grammar (globals.css `.art__*`). */
const LAYER_CLASS: Partial<Record<Layer, string>> = { ground: "art__ground", shadow: "art__shadow", solid: "art__solid", stone: "art__stone", line: "art__ink", knock: "art__knock", knockFill: "art__knock-fill", soft: "art__pastel" };

const STATE_ART: Record<string, ReactElement> = {
  notFound: <LostArt />, offline: <OfflineArt />, emptySearch: <EmptyArt />,
  linkExpired: <LinkExpiredArt />, noAccess: <NoAccessArt />, deadlineClosed: <DeadlineClosedArt />,
  // M21 · the guest journey (declined, reserved, empty list) draws the same scenes as the app.
  welcomeGuest: <WelcomeGuestArt />, giftReserved: <GiftReservedArt />, noGifts: <NoGiftsArt />
};

const paths = (html: string) => [...html.matchAll(/<path class="([^"]+)"(?: stroke-width="([^"]+)")? d="([^"]+)"/g)].map(([, cls, width, d]) => ({ cls, width: width ? Number(width) : undefined, d }));

describe("Espejo web/móvil · los dibujos de estado de la web son los de la app", () => {
  for (const [name, element] of Object.entries(STATE_ART)) {
    it(`${name}: mismas piezas, en el mismo orden, con el pastel de su grupo`, () => {
      const html = renderToStaticMarkup(element);
      const art = name as IllustrationName;
      expect(html).toContain(`data-art="${name}"`);
      expect(html).toContain(`art--${ILLUSTRATION_PASTEL[ILLUSTRATION_GROUPS[art]]}`);
      expect(html).toContain('aria-hidden="true"');
      const expected = ILLUSTRATIONS[art].map((shape) => ({ cls: LAYER_CLASS[shape.layer], width: shape.layer === "line" || shape.layer === "knock" ? shape.w : undefined, d: shape.d }));
      expect(paths(html)).toEqual(expected);
    });
  }

  it("negative: a drawing with a moved piece no longer matches", () => {
    const html = renderToStaticMarkup(<LinkExpiredArt />).replace("M53 58a7 7", "M53 59a7 7");
    expect(paths(html)).not.toEqual(ILLUSTRATIONS.linkExpired.map((shape) => ({ cls: LAYER_CLASS[shape.layer], width: undefined, d: shape.d })));
  });
});
