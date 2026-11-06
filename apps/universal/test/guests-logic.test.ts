import { describe, expect, it } from "vitest";
import { ApiError } from "@rsvp/api-client";
import { classifyFailure } from "../src/host/guests/failure";
import { createSingleFlight } from "../src/platform/single-flight";
import { countCsvRecords, csvLimitProblem, MAX_CSV_ROWS } from "../src/host/guests/csv-limits";
import { lastPageOffset } from "../src/host/guests/paging";
import { parseCompanions, parseRetentionDays } from "../src/host/guests/settings-input";

describe("classifyFailure", () => {
  it("429 carries Retry-After when the browser could read it, and still classifies without it", () => {
    const withWait = new ApiError(429, "c"); withWait.retryAfterSeconds = 7.2;
    expect(classifyFailure(withWait)).toEqual({ kind: "rateLimited", waitSeconds: 8 });
    expect(classifyFailure(new ApiError(429, "c"))).toEqual({ kind: "rateLimited", waitSeconds: null });
  });
  it("5xx is unavailable, a fetch TypeError is offline, 4xx stays with the system notice", () => {
    expect(classifyFailure(new ApiError(503, "c"))).toEqual({ kind: "unavailable" });
    expect(classifyFailure(new TypeError("Failed to fetch"))).toEqual({ kind: "offline" });
    for (const status of [401, 403, 404, 409, 422]) expect(classifyFailure(new ApiError(status, "c"))).toEqual({ kind: "api" });
    expect(classifyFailure(new Error("boom"))).toEqual({ kind: "api" });
  });
});

describe("createSingleFlight", () => {
  it("ignores a second begin until end, then allows again", () => {
    const flight = createSingleFlight();
    expect(flight.begin()).toBe(true); expect(flight.begin()).toBe(false); flight.end(); expect(flight.begin()).toBe(true);
  });
});

describe("csv limits", () => {
  const header = "name,email,locale,allowedCompanions";
  it("counts records, honouring quotes and blank lines", () => {
    expect(countCsvRecords("")).toBe(0);
    expect(countCsvRecords(`${header}\n`)).toBe(1);
    expect(countCsvRecords(`${header}\r\na,b,c,d\r\n\r\n`)).toBe(2);
    expect(countCsvRecords(`${header}\n"multi\nline",b,c,d`)).toBe(2);
  });
  it("1000 data rows pass, 1001 do not; over 1 MiB is too big", () => {
    const rows = (n: number) => [header, ...Array.from({ length: n }, (_, i) => `n${i},e${i}@x.com,es-BO,0`)].join("\n");
    expect(csvLimitProblem(rows(MAX_CSV_ROWS))).toBeNull();
    expect(csvLimitProblem(rows(MAX_CSV_ROWS + 1))).toBe("tooManyRows");
    expect(csvLimitProblem(`${header}\n${"x".repeat(1024 * 1024)}`)).toBe("fileTooBig");
  });
});

describe("paging", () => {
  it("last page offset", () => {
    expect(lastPageOffset(0, 50)).toBe(0); expect(lastPageOffset(50, 50)).toBe(0); expect(lastPageOffset(51, 50)).toBe(50); expect(lastPageOffset(100, 50)).toBe(50); expect(lastPageOffset(101, 50)).toBe(100);
  });
});

describe("settings input", () => {
  it("companions: whole numbers 0..2147483647 only", () => {
    expect(parseCompanions("0")).toBe(0); expect(parseCompanions(" 2147483647 ")).toBe(2147483647);
    for (const bad of ["", "-1", "1.5", "abc", "2147483648", "1e3"]) expect(parseCompanions(bad)).toBeNull();
  });
  it("retention: empty is no schedule, 1..36500 valid, rest invalid", () => {
    expect(parseRetentionDays("")).toBeNull(); expect(parseRetentionDays("1")).toBe(1); expect(parseRetentionDays("36500")).toBe(36500);
    for (const bad of ["0", "36501", "-3", "1.5", "abc"]) expect(parseRetentionDays(bad)).toBe("invalid");
  });
});
