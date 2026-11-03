import { describe, expect, it } from "vitest";
import { formatCelebrationDate, formatCelebrationTime, formatMoney, formatNumber, resolveLocale } from "../src/index.js";

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

describe("REQ-F06-04 · the celebration's zone, never the device's", () => {
  const instant = "2026-12-19T23:00:00.000Z"; // 19:00 in La Paz (UTC-4, no DST)
  it("the same instant renders the same wall time whatever the process zone (run under TZ=Europe/Madrid, Asia/Tokyo, America/Los_Angeles)", () => {
    expect(formatCelebrationTime(instant, { locale: "es-BO", timeZone: "America/La_Paz" })).toMatch(/^07:00\s[pP]\.\s?[mM]\.$/);
    expect(formatCelebrationTime(instant, { locale: "en-US", timeZone: "America/La_Paz" })).toMatch(/^07:00\sPM$/);
    expect(formatCelebrationDate(instant, { locale: "es-BO", timeZone: "America/La_Paz" }, { day: "numeric", month: "long", year: "numeric" })).toContain("19");
  });
  it("a different celebration zone changes the hour, proving the zone argument is what decides", () => {
    expect(formatCelebrationTime(instant, { locale: "es-BO", timeZone: "Europe/Madrid" })).toMatch(/^12:00\s[aA]\.\s?[mM]\.$/);
  });
  it("money: BOB and USD in both locales", () => {
    expect(formatMoney(1234.5, "es-BO", "BOB")).toMatch(/Bs\s?1\.234,50/);
    expect(formatMoney(1234.5, "en-US", "USD")).toBe("$1,234.50");
    expect(formatNumber(1234567.8, "es-BO")).toBe("1.234.567,8");
    expect(formatNumber(1234567.8, "en-US")).toBe("1,234,567.8");
  });
});
