import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "@rsvp/api-client";
import { SessionManager, createMemorySessionStore, createNativeSessionStore, isExpired, parseClaims, sessionFromTokens, type IdentityApi, type SecureKeyValueStore } from "../src/index.js";
import { fakeJwt, tokens } from "./helpers.js";

function identity(overrides: Partial<IdentityApi> = {}): IdentityApi & { [K in keyof IdentityApi]: ReturnType<typeof vi.fn> } {
  return {
    login: vi.fn(async () => sessionFromTokens(tokens())),
    register: vi.fn(async () => sessionFromTokens(tokens({ roles: ["PROVIDER"] }))),
    refresh: vi.fn(async () => tokens({ roles: ["HOST", "PLANNER"] }, "n".repeat(40))),
    logout: vi.fn(async () => undefined),
    ...overrides
  } as never;
}

describe("claims", () => {
  it("reads sub, roles, organizations and exp, and ignores unknown roles", () => {
    expect(parseClaims(fakeJwt({ sub: "u", roles: ["ADMIN", "ROOT"], organizationIds: ["o1"], exp: 10 }))).toEqual({ sub: "u", roles: ["ADMIN"], organizationIds: ["o1"], exp: 10 });
  });
  it("malformed tokens are anonymous and expired", () => {
    expect(parseClaims("nope").roles).toEqual([]);
    expect(isExpired("nope")).toBe(true);
    expect(isExpired(null)).toBe(true);
  });
  it("treats a token that expires within the skew as expired", () => {
    const now = Date.now();
    expect(isExpired(fakeJwt({ exp: Math.floor(now / 1000) + 10 }), now)).toBe(true);
    expect(isExpired(fakeJwt({ exp: Math.floor(now / 1000) + 600 }), now)).toBe(false);
  });
});

describe("SessionManager", () => {
  it("signIn persists the session and publishes authenticated roles", async () => {
    const store = createMemorySessionStore(); const manager = new SessionManager(store, identity());
    const seen: string[] = []; manager.subscribe((state) => seen.push(state.status));
    await manager.signIn({ email: "a@b.co", password: "x" });
    expect(seen).toEqual(["authenticated"]);
    expect((await store.getSession())?.roles).toEqual(["HOST"]);
  });
  it("restore: no stored session is anonymous", async () => {
    expect((await new SessionManager(createMemorySessionStore(), identity()).restore()).status).toBe("anonymous");
  });
  it("restore: a fresh stored session stays signed in without calling Identity", async () => {
    const api = identity(); const manager = new SessionManager(createMemorySessionStore(sessionFromTokens(tokens())), api);
    expect((await manager.restore()).status).toBe("authenticated");
    expect(api.refresh).not.toHaveBeenCalled();
  });
  it("restore: an expired session is renewed with rotation and new roles", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokens({ exp: 1 }, "old".padEnd(40, "o")))); const api = identity(); const manager = new SessionManager(store, api);
    const state = await manager.restore();
    expect(api.refresh).toHaveBeenCalledWith("old".padEnd(40, "o"), expect.any(String));
    expect(state.session?.roles).toEqual(["HOST", "PLANNER"]);
    expect(await store.getRefreshToken()).toBe("n".repeat(40));
  });
  it("restore: a rejected refresh token (401) signs out and wipes storage", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokens({ exp: 1 })));
    const manager = new SessionManager(store, identity({ refresh: vi.fn(async () => { throw new ApiError(401, "c", { title: "x", status: 401 }); }) }));
    expect((await manager.restore()).status).toBe("anonymous");
    expect(await store.getSession()).toBeNull();
  });
  it("restore: a network failure keeps the session so the next request can retry", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokens({ exp: 1 })));
    const manager = new SessionManager(store, identity({ refresh: vi.fn(async () => { throw new TypeError("Failed to fetch"); }) }));
    expect((await manager.restore()).status).toBe("authenticated");
    expect(await store.getSession()).not.toBeNull();
  });
  it("concurrent refreshes share one request (refresh tokens are single use)", async () => {
    const api = identity(); const manager = new SessionManager(createMemorySessionStore(sessionFromTokens(tokens())), api);
    await Promise.all([manager.refresh(), manager.refresh(), manager.refresh()]);
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });
  it("refresh without a refresh token is a 401", async () => {
    await expect(new SessionManager(createMemorySessionStore(), identity()).refresh()).rejects.toMatchObject({ status: 401 });
  });
  it("REQ-F05-06: logout revokes remotely and clears locally", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokens())); const api = identity(); const manager = new SessionManager(store, api);
    await manager.restore(); await manager.logout();
    expect(api.logout).toHaveBeenCalledWith("r".repeat(40));
    expect(await store.getSession()).toBeNull();
    expect(manager.getState().status).toBe("anonymous");
  });
  it("REQ-F05-06: logout still clears locally when the network call fails", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokens()));
    const manager = new SessionManager(store, identity({ logout: vi.fn(async () => { throw new TypeError("offline"); }) }));
    await expect(manager.logout()).rejects.toThrow("offline");
    expect(await store.getSession()).toBeNull();
    expect(manager.getState().status).toBe("anonymous");
  });
  it("api-client integration: a 401 triggers one refresh, retries with the new token and updates the roles", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokens({ exp: 9_999_999_999 }, "old".padEnd(40, "o")))); const api = identity(); const manager = new SessionManager(store, api);
    await manager.restore();
    const newAccess = tokens({ roles: ["HOST", "PLANNER"] }, "n".repeat(40));
    const seen: Array<string | null> = [];
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("authorization"); seen.push(auth);
      return auth === `Bearer ${newAccess.accessToken}` ? new Response("{}", { status: 200, headers: { "content-type": "application/json" } }) : new Response("{}", { status: 401, headers: { "content-type": "application/problem+json" } });
    }) as unknown as typeof fetch;
    (api.refresh as ReturnType<typeof vi.fn>).mockResolvedValue(newAccess);
    const client = createApiClient({ baseUrl: "http://x", tokenStore: manager.tokenStore, refreshSession: manager.refreshSession, fetchFn });
    await client.request("/celebrations");
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
    expect(manager.getState().session?.roles).toEqual(["HOST", "PLANNER"]);
  });
  it("api-client integration: a rejected refresh clears the session (back to login)", async () => {
    const store = createMemorySessionStore(sessionFromTokens(tokens({ exp: 9_999_999_999 }))); const manager = new SessionManager(store, identity({ refresh: vi.fn(async () => { throw new ApiError(401, "c", { title: "x", status: 401 }); }) }));
    await manager.restore();
    const fetchFn = vi.fn(async () => new Response("{}", { status: 401, headers: { "content-type": "application/problem+json" } })) as unknown as typeof fetch;
    const onUnauthorized = vi.fn();
    const client = createApiClient({ baseUrl: "http://x", tokenStore: manager.tokenStore, refreshSession: manager.refreshSession, fetchFn, onUnauthorized });
    await expect(client.request("/celebrations")).rejects.toMatchObject({ status: 401 });
    expect(manager.getState().status).toBe("anonymous");
    expect(onUnauthorized).toHaveBeenCalled();
  });
});

describe("REQ-F05-02 native store", () => {
  const memory = (): SecureKeyValueStore & { data: Map<string, string> } => { const data = new Map<string, string>(); return { data, getItemAsync: async (k) => data.get(k) ?? null, setItemAsync: async (k, v) => { data.set(k, v); }, deleteItemAsync: async (k) => { data.delete(k); } }; };
  it("survives an app restart: a second store over the same keychain reads the session", async () => {
    const keychain = memory(); await createNativeSessionStore(keychain).setSession(sessionFromTokens(tokens()));
    expect((await createNativeSessionStore(keychain).getSession())?.roles).toEqual(["HOST"]);
  });
  it("clear removes it", async () => { const keychain = memory(); const store = createNativeSessionStore(keychain); await store.setSession(sessionFromTokens(tokens())); await store.clear(); expect(keychain.data.size).toBe(0); });
  it("corrupt or foreign values read as signed out", async () => {
    const keychain = memory(); keychain.data.set("rsvp.session", "{not json"); expect(await createNativeSessionStore(keychain).getSession()).toBeNull();
    keychain.data.set("rsvp.session", JSON.stringify({ hello: 1 })); expect(await createNativeSessionStore(keychain).getSession()).toBeNull();
  });
  it("setTokens keeps the identity claims of the stored session", async () => {
    const store = createNativeSessionStore(memory()); await store.setSession(sessionFromTokens(tokens({ roles: ["ADMIN"] }))); await store.setTokens({ accessToken: "a", refreshToken: "b", expiresIn: 1 });
    expect(await store.getSession()).toMatchObject({ accessToken: "a", roles: ["ADMIN"] });
  });
});
