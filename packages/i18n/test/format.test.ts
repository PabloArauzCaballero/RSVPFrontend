import { describe, expect, it } from "vitest";
import { formatCelebrationTime, formatMoney, resolveLocale } from "../src/index.js";

describe("i18n formatting", () => {
  it("formats dates in the celebration timezone, not the device timezone", () => {
    expect(formatCelebrationTime("2026-12-04T23:30:00.000Z", { locale: "es-BO", timeZone: "America/La_Paz" })).toMatch(/19:30|7:30/);
  });
  it("formats BOB and USD with Intl", () => {
    expect(formatMoney(1000, "es-BO", "BOB")).toContain("1");
    expect(formatMoney(1000, "en-US", "USD")).toContain("1");
  });
  it("gives an explicit locale priority over the system locale", () => { expect(resolveLocale("en-US", ["es-BO"])).toBe("en-US"); });
});
