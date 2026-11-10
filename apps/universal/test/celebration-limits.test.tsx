import { describe, expect, it } from "vitest";
import { ApiError, ConflictError } from "@rsvp/api-client";
import { isCalendarDate, toWallClock } from "../src/host/content-draft";
import { deadlineClock } from "../src/host/settings-screen";
import { errorKind } from "../src/host/celebration-errors";
import { contentOverLimit, isUserId, LIMITS, overLimit, slugProblem } from "../src/host/limits";

const problem = (code: string) => ({ title: code, status: 409, code });

describe("slugProblem", () => {
  it("accepts the API's pattern and rejects the edges", () => {
    expect(slugProblem("ana-luis")).toBeNull();
    expect(slugProblem("abc")).toBeNull();
    expect(slugProblem("a".repeat(80))).toBeNull();
    expect(slugProblem("ab")).toBe("length");
    expect(slugProblem("a".repeat(81))).toBe("length");
    expect(slugProblem("Ana-Luis")).toBe("pattern");
    expect(slugProblem("ana--luis")).toBe("pattern");
    expect(slugProblem("-ana")).toBe("pattern");
    expect(slugProblem("ana luis")).toBe("pattern");
  });
});

describe("overLimit", () => {
  it("counts characters, not UTF-16 units", () => {
    expect(overLimit("a".repeat(120), 120)).toBeNull();
    expect(overLimit("a".repeat(125), 120)).toBe(5);
    expect(overLimit("😀".repeat(3), 3)).toBeNull();
  });
});

describe("contentOverLimit", () => {
  it("is zero for a normal draft and counts every field over its limit", () => {
    expect(contentOverLimit({ title: "Ana y Luis", hosts: { BRIDE: "Ana" }, venues: [{ name: "Iglesia", address: "Calle 1" }] })).toBe(0);
    const draft = { title: "x".repeat(LIMITS.title + 1), hosts: { BRIDE: "y".repeat(LIMITS.hostName + 1) }, faq: [{ question: "q", answer: "a".repeat(LIMITS.faqAnswer + 1) }], bautizo: "z".repeat(LIMITS.extraField + 1) };
    expect(contentOverLimit(draft, [{ title: "t".repeat(LIMITS.scheduleTitle + 1), description: "" }], ["bautizo"])).toBe(5);
  });
});

describe("isUserId", () => {
  it("accepts UUIDs and rejects anything else", () => {
    expect(isUserId("db69952a-a490-440e-8adf-e04d1788ec28")).toBe(true);
    expect(isUserId(" db69952a-a490-440e-8adf-e04d1788ec28 ")).toBe(true);
    expect(isUserId("db69952a")).toBe(false);
    expect(isUserId("")).toBe(false);
  });
});

describe("errorKind", () => {
  it("separates the 409 reasons the API distinguishes by code", () => {
    expect(errorKind(new ConflictError("c", problem("VERSION_CONFLICT")))).toBe("versionConflict");
    expect(errorKind(new ConflictError("c", problem("SLUG_TAKEN")))).toBe("slugTaken");
    expect(errorKind(new ConflictError("c", problem("SLUG_IMMUTABLE")))).toBe("slugImmutable");
    expect(errorKind(new ConflictError("c", problem("CELEBRATION_ARCHIVED")))).toBe("archived");
    expect(errorKind(new ConflictError("c", problem("INVALID_TRANSITION")))).toBe("invalidTransition");
  });
  it("classifies throttling, server and network failures", () => {
    expect(errorKind(new ApiError(429, "c"))).toBe("rateLimited");
    expect(errorKind(new ApiError(502, "c"))).toBe("server");
    expect(errorKind(new TypeError("Failed to fetch"))).toBe("network");
    expect(errorKind(new ApiError(404, "c"))).toBe("other");
    expect(errorKind(null)).toBe("other");
  });
});

describe("isCalendarDate", () => {
  it("rejects dates that look right but do not exist", () => {
    expect(isCalendarDate("2027-06-12")).toBe(true);
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2027-02-29")).toBe(false);
    expect(isCalendarDate("2027-13-45")).toBe(false);
    expect(isCalendarDate("2027-6-1")).toBe(false);
    expect(toWallClock({ date: "2027-13-45", time: "10:00" }).ok).toBe(false);
    expect(toWallClock({ date: "2027-06-12", time: "10:00" })).toEqual({ ok: true, value: "2027-06-12T10:00" });
  });
});

describe("deadlineClock", () => {
  const base = { localTimes: undefined, timeZone: "America/La_Paz" };
  it("reads the stored instant back in the celebration zone when the API gives no localTimes for settings", () => {
    expect(deadlineClock({ ...base, settings: { rsvpDeadline: "2027-05-02T00:00:00.000Z" } as never })).toEqual({ date: "2027-05-01", time: "20:00" });
    expect(deadlineClock({ ...base, timeZone: "Europe/Madrid", settings: { rsvpDeadline: "2027-05-02T00:00:00.000Z" } as never })).toEqual({ date: "2027-05-02", time: "02:00" });
  });
  it("is empty without a deadline and prefers localTimes when present", () => {
    expect(deadlineClock({ ...base, settings: { rsvpDeadline: null } as never })).toEqual({ date: "", time: "" });
    expect(deadlineClock({ ...base, localTimes: { rsvpDeadline: { date: "2027-06-01", time: "09:00", timeZone: "America/La_Paz", utcOffset: "-04:00" } }, settings: { rsvpDeadline: "x" } as never })).toEqual({ date: "2027-06-01", time: "09:00" });
  });
});
