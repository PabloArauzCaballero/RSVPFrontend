import { describe, expect, it } from "vitest";
import {
  celebrationCityHint, isMarketplaceThumb, marketplaceCategoriesPath, marketplacePath, marketplaceSearchPath, marketplaceThumbSrc, marketplaceThumbSrcSet,
  MARKETPLACE_ORIGIN_TTL_MS, MARKETPLACE_THUMBS, parseMarketplaceOrigin
} from "../src/index.js";

describe("guest marketplace (shared query building)", () => {
  it("searches one card per provider under the guest rules, with only well-formed filters", () => {
    expect(marketplaceSearchPath({})).toBe("/providers?view=marketplace&groupBy=provider&page=1&pageSize=12");
    expect(marketplaceSearchPath({ category: "SOUND_LIGHTING", city: "santa-cruz", eventType: "QUINCEANERA", page: 3 }))
      .toBe("/providers?view=marketplace&groupBy=provider&category=SOUND_LIGHTING&city=santa-cruz&eventType=QUINCEANERA&page=3&pageSize=12");
    expect(marketplaceSearchPath({ category: "sonido-e-iluminacion" })).toContain("category=sonido-e-iluminacion");
    // A malformed filter is dropped, never sent; the page never goes below 1.
    expect(marketplaceSearchPath({ category: "a b&x=1", city: "Santa Cruz", eventType: "quince", page: -4 })).toBe("/providers?view=marketplace&groupBy=provider&page=1&pageSize=12");
  });

  it("asks the categories of the tab in the language and for the event type and city", () => {
    expect(marketplaceCategoriesPath({})).toBe("/providers/categories?view=marketplace");
    expect(marketplaceCategoriesPath({ eventType: "WEDDING", city: "la-paz", locale: "en-US" })).toBe("/providers/categories?view=marketplace&eventType=WEDDING&city=la-paz&locale=en-US");
    expect(marketplaceCategoriesPath({ eventType: "x", city: "../etc", locale: "fr" })).toBe("/providers/categories?view=marketplace");
  });

  it("the tab lives at /c/{slug}/proveedores and carries nothing else", () => {
    expect(marketplacePath("ana-y-luis")).toBe("/c/ana-y-luis/proveedores");
    expect(marketplacePath("a b")).toBe("/c/a%20b/proveedores");
  });

  it("thumbnails: 20 known slugs, 88/176/264 px for 1x/2x/3x, light and dark", () => {
    expect(MARKETPLACE_THUMBS).toHaveLength(20);
    expect(new Set(MARKETPLACE_THUMBS).size).toBe(20);
    expect(isMarketplaceThumb("salones")).toBe(true);
    expect(isMarketplaceThumb("categoria-nueva-del-admin")).toBe(false);
    expect(marketplaceThumbSrc("salones", "dark", 176)).toBe("/marketplace/v1/salones-dark-176.webp");
    expect(marketplaceThumbSrcSet("catering", "light")).toBe("/marketplace/v1/catering-light-88.webp 1x, /marketplace/v1/catering-light-176.webp 2x, /marketplace/v1/catering-light-264.webp 3x");
  });

  it("the celebration city is only taken when its content names a city the catalogue serves", () => {
    const cities = [{ slug: "santa-cruz", name: "Santa Cruz de la Sierra" }, { slug: "la-paz", name: "La Paz" }, { slug: "potosi", name: "Potosí" }];
    expect(celebrationCityHint({ citySlug: "la-paz" }, cities)).toBe("la-paz");
    expect(celebrationCityHint({ city: "Santa Cruz de la Sierra" }, cities)).toBe("santa-cruz");
    expect(celebrationCityHint({ venueCity: " potosí " }, cities)).toBe("potosi");
    expect(celebrationCityHint({ city: "Atlantis" }, cities)).toBeUndefined();
    expect(celebrationCityHint({ city: 7, venueCity: "La Paz" }, cities)).toBe("la-paz");
    expect(celebrationCityHint(undefined, cities)).toBeUndefined();
  });

  it("the origin kept for the tab is a UUID, fresh, and never from the future", () => {
    const now = 1_800_000_000_000;
    const id = "0b7e7c3a-5d2f-4c1e-9a8b-2f6d4e1c3a90";
    expect(parseMarketplaceOrigin(JSON.stringify({ celebrationId: id, at: now - 1000 }), now)?.celebrationId).toBe(id);
    expect(parseMarketplaceOrigin(JSON.stringify({ celebrationId: id.toUpperCase(), at: now }), now)?.celebrationId).toBe(id);
    expect(parseMarketplaceOrigin(JSON.stringify({ celebrationId: id, at: now - MARKETPLACE_ORIGIN_TTL_MS - 1 }), now)).toBeUndefined();
    expect(parseMarketplaceOrigin(JSON.stringify({ celebrationId: id, at: now + 5000 }), now)).toBeUndefined();
    expect(parseMarketplaceOrigin(JSON.stringify({ celebrationId: "not-a-uuid", at: now }), now)).toBeUndefined();
    expect(parseMarketplaceOrigin("{broken", now)).toBeUndefined();
    expect(parseMarketplaceOrigin(null, now)).toBeUndefined();
  });
});
