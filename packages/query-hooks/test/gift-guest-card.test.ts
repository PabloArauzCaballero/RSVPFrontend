import { describe, expect, it } from "vitest";
import { ApiError } from "@rsvp/api-client";
import { arrangeGifts, buttonQuantity, clampUnits, effectivePrice, guestGiftState, insufficientUnitsLeft, reserveFailureKind, reserveFailureMessage, type GiftItem } from "../src/index.js";

const item = (over: Partial<GiftItem> = {}): GiftItem => ({
  id: "g1", listId: "l", celebrationId: "c", title: "Vajilla", price: { amountMinor: 45000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 1, createdAt: "2026-11-01T00:00:00Z", ...over
});

describe("R5 · guestGiftState: what the guest's card says and offers", () => {
  it("a plain gift of 12 with 4 reserved by others: 8 left, the guest chooses units, both provider buttons are theirs", () => {
    const state = guestGiftState(item({ quantity: 12, unitsReserved: 4, unitsLeft: 8, participants: 2 }));
    expect(state).toMatchObject({ quantity: 12, unitsLeft: 8, showUnits: true, group: false, role: null, canReserve: true, chooseUnits: true, showProviderButtons: true, coordinator: null, contributors: 0 });
  });

  it("a gift of 1 has no stepper and no «faltan»; an older server without unit counts reads AVAILABLE as all units free", () => {
    expect(guestGiftState(item())).toMatchObject({ quantity: 1, unitsLeft: 1, showUnits: false, chooseUnits: false, canReserve: true, showProviderButtons: true });
  });

  it("a plain gift with nothing left (or already taken) offers neither reserve nor provider buttons", () => {
    expect(guestGiftState(item({ quantity: 3, unitsLeft: 0, status: "PENDING_REVIEW" }))).toMatchObject({ canReserve: false, showProviderButtons: false });
    expect(guestGiftState(item({ status: "COMMITTED" }))).toMatchObject({ unitsLeft: 0, canReserve: false, showProviderButtons: false });
  });

  it("a guest who already holds the gift (viewer SOLE) cannot reserve again and has no buttons", () => {
    const state = guestGiftState(item({ quantity: 12, unitsLeft: 10, viewer: { reservationId: "r", role: "SOLE", status: "PENDING_REVIEW", units: 2 } }));
    expect(state).toMatchObject({ role: "SOLE", canReserve: false, showProviderButtons: false });
  });

  it("group, nobody yet: the first to sign up coordinates (reserve = «Coordinar»), and no one has provider buttons yet", () => {
    const state = guestGiftState(item({ groupGiftEnabled: true, quantity: 1, participants: 0, contributors: 0 }));
    expect(state).toMatchObject({ group: true, hasCoordinator: false, canReserve: true, chooseUnits: false, showProviderButtons: false, coordinator: null });
  });

  it("group, someone coordinates: a non-member sees who buys it and how many chip in, no names they did not choose to show; can join but never touches the buttons", () => {
    const named = guestGiftState(item({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 4, contributors: 3, coordinatorName: " Marta " }));
    expect(named).toMatchObject({ group: true, hasCoordinator: true, canReserve: true, showProviderButtons: false, contributors: 3, coordinator: { name: "Marta" }, contributorNames: [] });
    expect(guestGiftState(item({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, contributors: 1, coordinatorName: null })).coordinator).toEqual({ name: null });
  });

  it("PF-1: contributor names reach only the coordinator, even if a server sent them to someone else", () => {
    const names = ["Ana", "Luis"];
    const base = { groupGiftEnabled: true, status: "PENDING_REVIEW" as const, participants: 3, contributors: 2, contributorNames: names };
    expect(guestGiftState(item({ ...base, viewer: { reservationId: "r", role: "COORDINATOR", status: "PENDING_REVIEW", units: 1 } })).contributorNames).toEqual(names);
    expect(guestGiftState(item({ ...base, viewer: { reservationId: "r", role: "CONTRIBUTOR", status: "PENDING_REVIEW", units: 0 } })).contributorNames).toEqual([]);
    expect(guestGiftState(item(base)).contributorNames).toEqual([]);
  });

  it("group, the viewer coordinates: provider buttons are theirs, who-buys-it is not shown to them; a contributor has none and can only leave", () => {
    const coordinator = guestGiftState(item({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, viewer: { reservationId: "r", role: "COORDINATOR", status: "PENDING_REVIEW", units: 1 } }));
    expect(coordinator).toMatchObject({ role: "COORDINATOR", showProviderButtons: true, canReserve: false, coordinator: null });
    const contributor = guestGiftState(item({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, coordinatorName: "Marta", viewer: { reservationId: "r", role: "CONTRIBUTOR", status: "PENDING_REVIEW", units: 0 } }));
    expect(contributor).toMatchObject({ role: "CONTRIBUTOR", showProviderButtons: false, canReserve: false, coordinator: { name: "Marta" } });
  });

  it("the guest's own reservation from my-reservations stands in for `viewer` on a server that does not send it", () => {
    expect(guestGiftState(item({ quantity: 12, unitsLeft: 10 }), { role: "SOLE" })).toMatchObject({ role: "SOLE", canReserve: false });
    expect(guestGiftState(item({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 1 }), {} as never)).toMatchObject({ role: "SOLE" });
  });
});

describe("R5 · price, units and the quantity the buttons carry", () => {
  it("shows the provider's current price when Gift could read it, otherwise the stored one", () => {
    expect(effectivePrice(item({ currentPrice: { amountMinor: 52000, currency: "BOB" } }))).toEqual({ amountMinor: 52000, currency: "BOB" });
    expect(effectivePrice(item({ currentPrice: null }))).toEqual({ amountMinor: 45000, currency: "BOB" });
    expect(effectivePrice(item({ currentPrice: { amountMinor: 0, currency: "BOB" } }))).toEqual({ amountMinor: 45000, currency: "BOB" });
    expect(effectivePrice(item())).toEqual({ amountMinor: 45000, currency: "BOB" });
  });

  it("the max-price filter compares with the current price", () => {
    const cheap = item({ id: "a", price: { amountMinor: 90000, currency: "BOB" }, currentPrice: { amountMinor: 10000, currency: "BOB" } });
    const dear = item({ id: "b", price: { amountMinor: 10000, currency: "BOB" }, currentPrice: { amountMinor: 90000, currency: "BOB" } });
    const { partner } = arrangeGifts([cheap, dear], { maxMinor: 20000, source: "all", onlyAvailable: false });
    expect(partner.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("clampUnits keeps 1..left and ignores junk", () => {
    expect(clampUnits(5, 3)).toBe(3);
    expect(clampUnits(0, 3)).toBe(1);
    expect(clampUnits(-2, 3)).toBe(1);
    expect(clampUnits(2.9, 8)).toBe(2);
    expect(clampUnits(Number.NaN, 8)).toBe(1);
    expect(clampUnits(4, 0)).toBe(1);
  });

  it("the buttons ask for the units the guest chose in a plain gift and for the whole quantity in a group", () => {
    expect(buttonQuantity({ group: false, quantity: 12, unitsLeft: 8 }, 2)).toBe(2);
    expect(buttonQuantity({ group: false, quantity: 12, unitsLeft: 3 }, 9)).toBe(3);
    expect(buttonQuantity({ group: true, quantity: 12, unitsLeft: 12 }, 2)).toBe(12);
  });
});

describe("R5 · reading the new 409s of reserveGift", () => {
  const conflict = (code: string, extra: Record<string, unknown> = {}) => new ApiError(409, "t", { title: "x", status: 409, code, ...extra });
  it("INSUFFICIENT_UNITS carries unitsLeft and gets its own message with the number", () => {
    const error = conflict("INSUFFICIENT_UNITS", { unitsLeft: 3 });
    expect(insufficientUnitsLeft(error)).toBe(3);
    expect(reserveFailureKind(error)).toBe("units");
    expect(reserveFailureMessage("units", undefined, 3)).toEqual({ key: "gifts.guest.reserveError.units", params: { count: 3 } });
    expect(reserveFailureMessage("units", undefined, 0).key).toBe("gifts.guest.reserveError.unitsNone");
  });
  it("a missing or odd unitsLeft counts as none left; another 409 is not that error", () => {
    expect(insufficientUnitsLeft(conflict("INSUFFICIENT_UNITS"))).toBe(0);
    expect(insufficientUnitsLeft(conflict("GIFT_NOT_AVAILABLE"))).toBeUndefined();
    expect(insufficientUnitsLeft(new ApiError(422, "t", { title: "x", status: 422, code: "INSUFFICIENT_UNITS" }))).toBeUndefined();
    expect(insufficientUnitsLeft(new Error("x"))).toBeUndefined();
  });
  it("ALREADY_RESERVED is its own failure; GIFT_NOT_AVAILABLE is still «taken»", () => {
    expect(reserveFailureKind(conflict("ALREADY_RESERVED"))).toBe("already");
    expect(reserveFailureKind(conflict("GIFT_NOT_AVAILABLE"))).toBe("taken");
  });
});
