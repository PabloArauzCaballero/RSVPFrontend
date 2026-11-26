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

  // The publish screen showed «We could not check whether your invitation is visible yet» because the mock had no
  // GET /celebrations/{id}/public-page (contract 1.3.0, A18): a baseline regenerated then would freeze an error state.
  it("answers the public page status of the published demo celebration as LIVE, with the contract's fields", () => {
    const celebration = mock.handle({ method: "GET", path: "/celebrations", headers: {}, body: undefined }) as { body: { items: { id: string; status: string; version: number; searchIndexing: unknown }[] } };
    const demo = celebration.body.items[0]!;
    expect(demo.searchIndexing).toBe(false);
    const reply = mock.handle({ method: "GET", path: `/celebrations/${demo.id}/public-page`, headers: {}, body: undefined }) as { status: number; headers: Record<string, string>; body: Record<string, unknown> };
    expect(reply.status).toBe(200);
    expect(reply.headers["cache-control"]).toBe("no-store");
    const spec = JSON.parse(readFileSync(resolve(REPO, "packages/contracts/specs/celebration.openapi.json"), "utf8")) as { components: { schemas: Record<string, { required: string[]; properties: Record<string, unknown> }> } };
    const schema = spec.components.schemas["PublicPageStatus"]!;
    // Celebration 1.6.0: `moderation` is optional and only present while a moderator hides the page, so a LIVE page has the required
    // fields and nothing the contract does not declare.
    const optional = Object.keys(schema.properties).filter((field) => !schema.required.includes(field));
    expect(optional).toEqual(["moderation"]);
    expect(Object.keys(reply.body).sort()).toEqual(schema.required.slice().sort());
    for (const field of schema.required) expect(reply.body).toHaveProperty(field);
    expect(reply.body).toEqual({ celebrationId: demo.id, status: demo.status, state: "LIVE", version: demo.version, publicVersion: demo.version });
    // Every field the contract requires on a Celebration is present (searchIndexing is required since 1.4.0).
    for (const field of spec.components.schemas["Celebration"]!.required) expect(demo).toHaveProperty(field);
  });
});
