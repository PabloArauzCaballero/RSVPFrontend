import { describe, expect, it } from "vitest";
import { ApiError } from "@rsvp/api-client";
import { alreadyListed, isHttpUrl, MAX_MINOR, parseMinor, TITLE_MAX } from "../src/host/gifts/money";
import { isRetryable, MESSAGE_MAX, NAME_MAX, reserveFailureKind, reserveFieldErrors } from "../src/guest/reserve-rules";

const failure = (status: number, code?: string): ApiError => new ApiError(status, "corr", code ? { type: "t", title: "x", status, code } : undefined);

describe("host money and external gift limits", () => {
  it("parses decimals and rejects negatives, floats with 3 decimals and text", () => {
    expect(parseMinor("0,01")).toBe(1);
    expect(parseMinor("150.5")).toBe(15050);
    for (const bad of ["", "-5", "1.234", "abc", "1e3"]) expect(parseMinor(bad)).toBeNull();
  });
  it("accepts the maximum and rejects one unit above it", () => {
    expect(parseMinor("99999999.99")).toBe(MAX_MINOR);
    expect(parseMinor("100000000")).toBeNull();
    expect(parseMinor("9007199254740993")).toBeNull();
  });
  it("keeps the contract title and url limits", () => {
    expect(TITLE_MAX).toBe(200);
    expect(isHttpUrl("https://a.example/x")).toBe(true);
    expect(isHttpUrl("ftp://a.example")).toBe(false);
    expect(isHttpUrl(`https://a.example/${"x".repeat(2048)}`)).toBe(false);
  });
  it("detects a listing already on the list unless that gift was rejected", () => {
    const items = [{ productListingId: "a", status: "AVAILABLE" }, { productListingId: "b", status: "REJECTED" }, { productListingId: null, status: "AVAILABLE" }];
    expect(alreadyListed(items, "a")).toBe(true);
    expect(alreadyListed(items, "b")).toBe(false);
    expect(alreadyListed(items, "c")).toBe(false);
  });
});

describe("guest reservation rules", () => {
  it("flags only values over 120 / 500 characters (trimmed)", () => {
    expect(NAME_MAX).toBe(120); expect(MESSAGE_MAX).toBe(500);
    expect(reserveFieldErrors({ name: "", message: "" })).toEqual({});
    expect(reserveFieldErrors({ name: "n".repeat(120), message: "m".repeat(500) })).toEqual({});
    expect(reserveFieldErrors({ name: ` ${"n".repeat(120)} `, message: "" })).toEqual({});
    expect(reserveFieldErrors({ name: "n".repeat(121), message: "m".repeat(501) })).toEqual({ name: "tooLong", message: "tooLong" });
  });
  it("maps every failure to one actionable kind", () => {
    expect(reserveFailureKind(failure(409, "GIFT_NOT_AVAILABLE"))).toBe("taken");
    expect(reserveFailureKind(failure(422, "RESERVATION_LIMIT_REACHED"))).toBe("limit");
    expect(reserveFailureKind(failure(422, "VALIDATION"))).toBe("validation");
    expect(reserveFailureKind(failure(401))).toBe("expired");
    expect(reserveFailureKind(failure(403))).toBe("forbidden");
    expect(reserveFailureKind(failure(404))).toBe("notFound");
    expect(reserveFailureKind(failure(429))).toBe("busy");
    expect(reserveFailureKind(failure(503))).toBe("generic");
    expect(reserveFailureKind(new TypeError("Failed to fetch"))).toBe("offline");
  });
  it("offers a retry only where the same tap can succeed", () => {
    expect(["busy", "offline", "generic"].every((kind) => isRetryable(kind as never))).toBe(true);
    expect(["taken", "limit", "expired", "forbidden", "notFound", "validation"].some((kind) => isRetryable(kind as never))).toBe(false);
  });
});
