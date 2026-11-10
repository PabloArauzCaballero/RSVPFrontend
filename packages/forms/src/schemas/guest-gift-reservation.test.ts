import { describe, expect, it } from "vitest";
import { guestGiftReservationSchema } from "./guest-gift-reservation.js";

describe("F21 · Gift List 1.3.0 reservation input", () => {
  it("trims optional fields and accepts empty input", () => {
    expect(guestGiftReservationSchema.parse({ guestDisplayName: "  María  ", message: " Felicidades " })).toEqual({ guestDisplayName: "María", message: "Felicidades" });
    expect(guestGiftReservationSchema.safeParse({ guestDisplayName: "", message: "" }).success).toBe(true);
  });
  it("counts Unicode characters at the contract boundary", () => {
    expect(guestGiftReservationSchema.safeParse({ guestDisplayName: "🎁".repeat(120), message: "é".repeat(500) }).success).toBe(true);
    expect(guestGiftReservationSchema.safeParse({ guestDisplayName: "a".repeat(121), message: "" }).success).toBe(false);
    expect(guestGiftReservationSchema.safeParse({ guestDisplayName: "", message: "🎁".repeat(501) }).success).toBe(false);
  });
});
