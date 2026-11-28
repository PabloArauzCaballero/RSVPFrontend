import { describe, expect, it } from "vitest";
import { guestGiftState, isProductGone, type GiftItem } from "../src/index.js";

const item = (over: Partial<GiftItem> = {}): GiftItem => ({
  id: "g1", listId: "l", celebrationId: "c", title: "Vajilla", price: { amountMinor: 45000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", availability: "AVAILABLE", version: 1, createdAt: "2026-11-01T00:00:00Z", ...over
});

describe("1.21.0 · producto agotado con reserva", () => {
  const sold = (over: Partial<GiftItem> = {}): GiftItem => item({ status: "COMMITTED", unitsLeft: 0, productUnavailable: true, ...over });

  it("the holder keeps the role and the reservation but loses both provider buttons and any new reservation", () => {
    const state = guestGiftState(sold({ viewer: { reservationId: "r", role: "SOLE", status: "COMMITTED", units: 1 } }));
    expect(state).toMatchObject({ productGone: true, role: "SOLE", heldUnits: 1, canReserve: false, showProviderButtons: false });
  });

  it("a coordinator loses the buttons; a group gift nobody coordinates cannot be joined or started", () => {
    expect(guestGiftState(sold({ groupGiftEnabled: true, viewer: { reservationId: "r", role: "COORDINATOR", status: "COMMITTED", units: 12 } }))).toMatchObject({ role: "COORDINATOR", showProviderButtons: false });
    expect(guestGiftState(item({ groupGiftEnabled: true, productUnavailable: true }))).toMatchObject({ productGone: true, canReserve: false, showProviderButtons: false });
  });

  it("a plain gift with units free whose product ran out offers nothing either", () => {
    expect(guestGiftState(item({ quantity: 12, unitsLeft: 8, productUnavailable: true }))).toMatchObject({ productGone: true, canReserve: false, chooseUnits: false, showProviderButtons: false });
  });

  it("the list closed and the product gone: still nothing to buy, the reservation untouched", () => {
    expect(guestGiftState(sold({ viewer: { reservationId: "r", role: "SOLE", status: "COMMITTED", units: 1 } }), undefined, { listClosed: true })).toMatchObject({ closed: true, productGone: true, role: "SOLE", showProviderButtons: false });
  });

  it("without the flag nothing changes (a server before 1.21.0), and `productUnavailable: false` is the same", () => {
    expect(guestGiftState(item())).toMatchObject({ productGone: false, canReserve: true, showProviderButtons: true });
    expect(guestGiftState(item({ productUnavailable: false }))).toMatchObject({ productGone: false, canReserve: true, showProviderButtons: true });
  });

  it("isProductGone reads the flag, and `availability` as a fallback", () => {
    expect(isProductGone({ productUnavailable: true })).toBe(true);
    expect(isProductGone({ availability: "UNAVAILABLE" })).toBe(true);
    expect(isProductGone({ availability: "AVAILABLE", productUnavailable: false })).toBe(false);
    expect(isProductGone({})).toBe(false);
  });
});
