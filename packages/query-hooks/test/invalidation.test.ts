import { describe, expect, it } from "vitest";
import { invalidation } from "../src/invalidation.js";

describe("query invalidation policy", () => {
  it("invalidates only the RSVP of that celebration and token fingerprint (never the token)", () => { expect(invalidation.rsvpChanged("celebration", "fp")).toEqual([["guests", "rsvp", "celebration", "fp"]]); });
  it("invalidates only the gift list of the changed celebration", () => { expect(invalidation.giftReservationChanged("celebration")).toEqual([["gifts", "celebration"]]); });
});
