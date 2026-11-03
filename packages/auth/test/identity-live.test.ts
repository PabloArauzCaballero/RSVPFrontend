import { describe, expect, it } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { IdentityClient, SessionManager, createMemorySessionStore, classifyAuthError } from "../src/index.js";

/**
 * Runs only when IDENTITY_LIVE_URL points at a real Identity service. Behind the gateway the
 * service lives under `/identity`; when pointing straight at the service (no Kong), set
 * IDENTITY_LIVE_DIRECT=1 and the `/identity` prefix is stripped. Not part of the default run.
 *   IDENTITY_LIVE_URL=http://localhost:3200 IDENTITY_LIVE_DIRECT=1 yarn workspace @rsvp/auth test
 */
const base = process.env["IDENTITY_LIVE_URL"];

describe.skipIf(!base)("REQ-F05 against a real Identity service", () => {
  const noStore = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
  const identity = new IdentityClient(createApiClient({ baseUrl: base ?? "", tokenStore: noStore, refreshSession: { refresh: async () => { throw new Error("unused"); } }, fetchFn: (url, init) => fetch(process.env["IDENTITY_LIVE_DIRECT"] ? String(url).replace("/identity/", "/") : url, init) }));
  const email = `live-${Date.now()}@example.com`; const password = "correct-horse-battery";

  it("register, login, rotate refresh, replay is rejected, logout revokes", async () => {
    const registered = await identity.register({ email, password, role: "PLANNER" });
    expect(registered.roles).toEqual(["PLANNER"]);
    expect(registered.userId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(identity.register({ email, password, role: "HOST" })).rejects.toMatchObject({ status: 409 });
    await expect(identity.login({ email, password: "wrong-password-123" }).catch((e: unknown) => { throw e; })).rejects.toMatchObject({ status: 401 });

    const store = createMemorySessionStore(); const manager = new SessionManager(store, identity);
    const session = await manager.signIn({ email, password });
    expect(session.roles).toEqual(["PLANNER"]);
    const old = session.refreshToken;
    await manager.refresh();
    const rotated = await store.getRefreshToken();
    expect(rotated).not.toBe(old);
    // Single use: replaying the consumed token fails (and revokes the chain).
    const replay = await identity.refresh(old, "replay").catch((e: unknown) => e);
    expect(classifyAuthError(replay)).toBe("invalidCredentials");
    await manager.logout();
    expect(await store.getSession()).toBeNull();
  });
});
