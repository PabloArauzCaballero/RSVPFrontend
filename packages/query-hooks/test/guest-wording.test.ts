import { describe, expect, it } from "vitest";
import { ApiError } from "@rsvp/api-client";
// Test-only reach into the es-BO resources (query-hooks does not depend on @rsvp/i18n): the keys must exist there.
import { giftsEsBO } from "../../i18n/locales/es-BO/gifts";
import { rsvpEsBO } from "../../i18n/locales/es-BO/rsvp";
import {
  COMPANIONS_STEPPER_MAX, companionCount, giftListBlocker, nearCountdown, reserveFailureKind, reserveFailureMessage, rsvpFailureNotice, rsvpIssueKeys, rsvpSubmitKey, stepCompanions
} from "../src/index.js";

/**
 * M21 · one wording for the guest on the app and the public site: these helpers return i18n keys, and every key they can
 * return must exist in es-BO (a key that does not exist would print itself on both surfaces).
 */
const esBO = { rsvp: rsvpEsBO, gifts: giftsEsBO };
const has = (key: string): boolean => key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), esBO) !== undefined
  || hasPlural(key);
const hasPlural = (key: string): boolean => typeof key.split(".").reduce<unknown>((node, part, index, parts) => (node && typeof node === "object" ? (node as Record<string, unknown>)[index === parts.length - 1 ? `${part}_one` : part] : undefined), esBO) === "string";
const failure = (status: number, code?: string, retryAfter?: number): ApiError => Object.assign(new ApiError(status, "corr", code ? { type: "t", title: "x", status, code } : undefined), retryAfter ? { retryAfterSeconds: retryAfter } : {});

describe("guest RSVP wording", () => {
  it("the zod issues of @rsvp/forms read as the app's keys, one per field", () => {
    // The issue codes `@rsvp/forms` emits (its zod messages are codes, not words).
    const keys = rsvpIssueKeys([{ path: ["status"], message: "required" }, { path: ["requestedCompanions"], message: "companions" }, { path: ["message"], message: "tooLong" }, { path: ["message"], message: "required" }]);
    expect(keys.status).toBe("rsvp.invite.chooseOne");
    expect(keys.requestedCompanions).toBe("rsvp.invite.errors.companions");
    expect(keys.message).toBe("rsvp.invite.errors.tooLong");
    expect(rsvpIssueKeys([{ path: ["name"], message: "whatever" }]).name).toBe("rsvp.invite.errors.required");
    for (const key of Object.values(keys)) expect(has(key!)).toBe(true);
  });

  it("every failure has words and says whether the same tap can succeed; a long wait is told in minutes", () => {
    expect(rsvpFailureNotice({ kind: "offline" })).toEqual({ key: "rsvp.invite.errors.offline", retryable: true });
    expect(rsvpFailureNotice({ kind: "rate-limited", retryAfterSeconds: 17 })).toEqual({ key: "rsvp.invite.errors.rateLimited", params: { seconds: 17 }, retryable: true });
    expect(rsvpFailureNotice({ kind: "rate-limited", retryAfterSeconds: 3000 })).toEqual({ key: "rsvp.invite.errors.rateLimitedMinutes", params: { minutes: 50 }, retryable: true });
    expect(rsvpFailureNotice({ kind: "rate-limited" }).key).toBe("rsvp.invite.errors.rateLimitedNoWait");
    expect(rsvpFailureNotice({ kind: "validation" }).retryable).toBe(false);
    expect(rsvpFailureNotice({ kind: "exists" }).key).toBe("rsvp.invite.errors.conflict");
    for (const kind of ["invalid", "closed", "exists", "conflict", "validation", "restricted", "rate-limited", "offline", "unavailable", "unknown"] as const) expect(has(rsvpFailureNotice({ kind } as never).key)).toBe(true);
  });

  it("the send button names what it will do", () => {
    expect(rsvpSubmitKey({ busy: false, mode: "first", status: "" })).toBe("rsvp.invite.submitNone");
    expect(rsvpSubmitKey({ busy: false, mode: "first", status: "CONFIRMED" })).toBe("rsvp.invite.submitYes");
    expect(rsvpSubmitKey({ busy: false, mode: "first", status: "DECLINED" })).toBe("rsvp.invite.submitNo");
    expect(rsvpSubmitKey({ busy: false, mode: "edit", status: "CONFIRMED" })).toBe("rsvp.invite.save");
    expect(rsvpSubmitKey({ busy: true, mode: "edit", status: "CONFIRMED" })).toBe("rsvp.invite.submitting");
  });

  it("the countdown only shows in the last week, and the stepper stays within 0..20", () => {
    const now = Date.parse("2026-12-01T00:00:00Z");
    expect(nearCountdown("2026-12-07T23:00:00Z", now)?.days).toBe(6);
    expect(nearCountdown("2026-12-08T00:00:00Z", now)).toBeNull();
    expect(nearCountdown("2026-11-30T00:00:00Z", now)).toBeNull();
    expect(companionCount("abc")).toBe(0);
    expect(companionCount("1.5")).toBe(0);
    expect(stepCompanions("0", -1)).toBe("0");
    expect(stepCompanions("2", 1)).toBe("3");
    expect(stepCompanions(String(COMPANIONS_STEPPER_MAX), 1)).toBe(String(COMPANIONS_STEPPER_MAX));
  });
});

describe("guest gift wording", () => {
  it("why the list could not open, with the one thing to do", () => {
    expect(giftListBlocker(401, undefined, false)).toMatchObject({ illustration: "linkExpired", title: { key: "gifts.error.needLinkTitle" }, needsLink: true, retryable: false });
    expect(giftListBlocker(401, undefined, true)).toMatchObject({ title: { key: "gifts.guest.error.expiredTitle" }, needsLink: false, retryable: false });
    expect(giftListBlocker(404, undefined, true)).toMatchObject({ title: { key: "gifts.guest.error.otherTitle" }, retryable: false });
    expect(giftListBlocker(403, undefined, true)).toMatchObject({ illustration: "noAccess", retryable: false });
    expect(giftListBlocker(429, 600, true)).toMatchObject({ illustration: "offline", body: { key: "gifts.guest.error.busyMinutes", params: { minutes: 10 } }, retryable: true });
    expect(giftListBlocker(503, undefined, true)).toMatchObject({ title: { key: "gifts.guest.error.unavailableTitle" }, retryable: true });
    for (const status of [401, 403, 404, 429, 500]) for (const credential of [true, false]) {
      const blocker = giftListBlocker(status, 30, credential);
      expect(has(blocker.title.key) && has(blocker.body.key)).toBe(true);
    }
  });

  it("a failed reservation reads as one message key; a long wait is told in minutes", () => {
    expect(reserveFailureMessage(reserveFailureKind(failure(429)) as "busy", 17)).toEqual({ key: "gifts.guest.reserveError.busyWait", params: { seconds: 17 } });
    expect(reserveFailureMessage("busy", 3000)).toEqual({ key: "gifts.guest.reserveError.busyMinutes", params: { minutes: 50 } });
    expect(reserveFailureMessage("busy")).toEqual({ key: "gifts.guest.reserveError.busy" });
    expect(reserveFailureKind(failure(403, "GUEST_RSVP_REQUIRED"))).toBe("attendance");
    for (const kind of ["limit", "expired", "forbidden", "attendance", "notFound", "busy", "validation", "offline", "generic"] as const) expect(has(reserveFailureMessage(kind).key)).toBe(true);
  });
});
