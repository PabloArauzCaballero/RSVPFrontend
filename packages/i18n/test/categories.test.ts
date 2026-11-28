import { describe, expect, it } from "vitest";
import { resources, supportedLocales } from "../src/index.js";

/**
 * Every category code provider-catalog-service creates (RSVPBackend, apps/provider-catalog-service/prisma/migrations:
 * 20261105000100_provider_marketplace, 20261114000100_provider_listing_categories, 20261124000100_gift_product_categories;
 * prisma/seed/categories.ts adds no other code). A migration that adds a category must add its code here: this test then
 * fails until both languages name it. Categories an admin creates at runtime are named by the API (see `categoryLabel`).
 */
const BACKEND_CATEGORY_CODES = [
  "VENUE", "CATERING", "PHOTOGRAPHY", "MUSIC", "DECORATION", "MAKEUP", "TRANSPORT", "INVITATIONS", "WEDDING_PLANNER", "ACCOMMODATION", "HONEYMOON",
  "PASTRY", "KITCHENWARE", "CLOTHING",
  "TABLEWARE", "SMALL_APPLIANCES", "HOME_DECOR", "BED_BATH", "FURNITURE", "FLOWERS", "GIFT_BASKETS", "WINES_GOURMET", "JEWELRY", "BEAUTY", "BABY",
  "TOYS", "RELIGIOUS", "ELECTRONICS", "BOOKS_STATIONERY", "SPORTS_OUTDOOR", "PERSONALIZED", "GIFT_CARDS"
];

describe("provider categories of the backend", () => {
  it.each(supportedLocales)("%s names every category code", (locale) => {
    const named: Readonly<Record<string, string | undefined>> = resources[locale].directory.category;
    expect(BACKEND_CATEGORY_CODES.filter((code) => !named[code]?.trim())).toEqual([]);
  });
});
