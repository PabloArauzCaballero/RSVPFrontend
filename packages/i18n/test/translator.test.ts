import { describe, expect, it } from "vitest";
import { createI18n, createTranslator, defaultLocale, formatMinor, resolveLocale, supportedLocales } from "../src/index.js";

describe("locale resolution", () => {
  it("falls back from a regional or language-only candidate to the supported locale, then to the default", () => {
    expect(resolveLocale(undefined, ["en-GB"])).toBe("en-US");
    expect(resolveLocale("es", [])).toBe("es-BO");
    expect(resolveLocale("fr-FR", ["de"])).toBe(defaultLocale);
    expect(resolveLocale(null)).toBe(defaultLocale);
    expect(supportedLocales).toEqual(["es-BO", "en-US"]);
  });
});

describe("synchronous translator", () => {
  it("translates per locale, interpolates, caches the instance and falls back to the key text for unknown keys", () => {
    const es = createTranslator("es-BO");
    expect(createTranslator("es-BO")).toBe(es);
    expect(es("admin.dashboard.count", { label: "Ofertas", count: 3 })).toBe("Ofertas: 3");
    expect(createTranslator("en-US")("admin.dashboard.count", { label: "Offers", count: 3 })).toBe("Offers: 3");
    expect(es("no.such.key")).toBe("no.such.key");
  });
  it("the React instance starts in the requested locale and does not escape interpolated values", async () => {
    const instance = createI18n("en-US");
    await instance.loadLanguages("en-US");
    expect(instance.language).toBe("en-US");
    expect(instance.t("admin.dashboard.count", { label: "<b>", count: 1 })).toBe("<b>: 1");
    expect(createI18n().language).toBe("es-BO");
  });
});

describe("money in minor units", () => {
  it("divides by 100 without floats on the wire and localizes the currency", () => {
    expect(formatMinor(45000, "BOB", "en-US")).toMatch(/450\.00/);
    expect(formatMinor(5, "USD", "en-US")).toBe("$0.05");
  });
});
