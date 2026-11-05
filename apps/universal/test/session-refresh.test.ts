import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HttpResponse, http, setupServer } from "@rsvp/testing";
import { sessionFromTokens, type Role } from "@rsvp/auth";
import { createAppRuntime } from "../src/platform/providers";
import { resetSecureStore } from "./stubs/expo-secure-store";

// REQ-F04-02 / REQ-F05-06 wired in the real app runtime (createAppRuntime), over MSW instead of a fake client:
// expired access token -> 401 -> ONE refresh -> retry with the rotated token; a dead refresh token ends the session.
const BASE = "http://gateway.msw";
const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (tag: string, roles: Role[] = ["HOST"]): string => `${b64({ alg: "RS256" })}.${b64({ sub: tag, roles, organizationIds: [], exp: Math.floor(Date.now() / 1000) + 900 })}.sig`;
const OLD = jwt("old");
const NEW = jwt("new", ["HOST", "PLANNER"]);

let refreshCalls = 0;
let refreshStatus = 200;
const seen: string[] = [];
const server = setupServer(
  http.get(`${BASE}/celebration/celebrations`, ({ request }) => {
    const auth = request.headers.get("authorization") ?? "";
    seen.push(auth);
    return auth === `Bearer ${NEW}` ? HttpResponse.json({ items: [] }) : HttpResponse.json({ title: "Expired", status: 401 }, { status: 401, headers: { "content-type": "application/problem+json" } });
  }),
  http.post(`${BASE}/identity/auth/refresh`, async () => {
    refreshCalls += 1;
    return refreshStatus === 200
      ? HttpResponse.json({ accessToken: NEW, refreshToken: "r".repeat(40), tokenType: "Bearer", expiresIn: 900 })
      : HttpResponse.json({ title: "Invalid refresh token", status: 401 }, { status: 401, headers: { "content-type": "application/problem+json" } });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => { resetSecureStore(); refreshCalls = 0; refreshStatus = 200; seen.length = 0; });
afterEach(() => server.resetHandlers());

async function signedIn() {
  const runtime = createAppRuntime(BASE);
  await runtime.manager.establish(sessionFromTokens({ accessToken: OLD, refreshToken: "p".repeat(40), expiresIn: 900 }));
  return runtime;
}

describe("app runtime session refresh (REQ-F04-02, REQ-F05-06)", () => {
  it("401 -> a single refresh -> retry with the rotated token, and the UI claims follow the new roles", async () => {
    const { client, manager } = await signedIn();
    await expect(client.request("/celebration/celebrations")).resolves.toEqual({ items: [] });
    expect(refreshCalls).toBe(1);
    expect(seen).toEqual([`Bearer ${OLD}`, `Bearer ${NEW}`]);
    expect(manager.getState().session?.roles).toEqual(["HOST", "PLANNER"]);
  });

  it("concurrent 401s share one refresh (refresh tokens are single use)", async () => {
    const { client } = await signedIn();
    await Promise.all([client.request("/celebration/celebrations"), client.request("/celebration/celebrations"), client.request("/celebration/celebrations")]);
    expect(refreshCalls).toBe(1);
  });

  it("a rejected refresh token surfaces the 401 and does not loop", async () => {
    refreshStatus = 401;
    const { client } = await signedIn();
    await expect(client.request("/celebration/celebrations")).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls).toBe(1);
  });
});
