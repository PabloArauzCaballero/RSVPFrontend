import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createContractMock, seedDemo } from "@rsvp/testing/contract-mock";
import { ALLOWED_HEADERS } from "@rsvp/testing/contract-server";
import { withVisualFixtures } from "../scripts/visual-fixtures";

// Catalog L13: the visual gate showed "We couldn't restore your session" on login and sign-up because the mock did not
// behave like the gateway, and the provider agenda showed a raw i18n key because a fixture broke the contract.
/** Tests run from apps/universal. */
const REPO = resolve(process.cwd(), "../..");

describe("visual mock behaves like the gateway the app talks to", () => {
  const mock = withVisualFixtures(createContractMock({ now: () => new Date("2026-11-04T15:00:00.000Z") }));
  seedDemo(mock);

  it("lets through every header the identity client sends (Kong's cors list includes X-Session-Transport)", () => {
    const client = readFileSync(resolve(REPO, "packages/auth/src/identity/client.ts"), "utf8");
    const header = /TRANSPORT_HEADER = "([^"]+)"/.exec(client)?.[1];
    expect(header).toBeTruthy();
    expect(ALLOWED_HEADERS.split(",")).toContain(header!.toLowerCase());
  });

  it("answers a cookie refresh without a session with 401, which the app reads as anonymous", () => {
    const reply = mock.handle({ method: "POST", path: "/identity/auth/refresh", headers: { "x-session-transport": "cookie" }, body: undefined });
    expect(reply.status).toBe(401);
  });

  it("serves bookings with a status from the published contract", () => {
    const reply = mock.handle({ method: "GET", path: "/providers/p-1/bookings", headers: {}, body: undefined }) as { status: number; body: { items: { status: string }[] } };
    const contract = readFileSync(resolve(REPO, "packages/contracts/src/generated/provider-catalog.ts"), "utf8");
    const statuses = /BookingStatus: ([^;]+);/.exec(contract)?.[1]?.match(/"([A-Z_]+)"/g)?.map((value) => value.replaceAll('"', "")) ?? [];
    expect(statuses.length).toBeGreaterThan(0);
    for (const item of reply.body.items) expect(statuses).toContain(item.status);
  });
});
