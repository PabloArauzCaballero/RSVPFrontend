import { describe, expect, it } from "vitest";
import { invalidation } from "../src/invalidation.js";

describe("query invalidation policy", () => {
  it("invalidates only the RSVP token that was changed", () => { expect(invalidation.rsvpChanged("token")).toEqual([["guests", "rsvp", "token"]]); });
  it("invalidates only the gift list of the changed celebration", () => { expect(invalidation.giftReservationChanged("celebration")).toEqual([["gifts", "celebration"]]); });
});
