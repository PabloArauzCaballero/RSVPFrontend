import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient, type TokenPair } from "@rsvp/api-client";
import { SessionManager, browserCoordinator, createMemorySessionStore, inProcessCoordinator, sessionFromTokens, type IdentityApi } from "../src/index.js";
import { fakeJwt, tokens } from "./helpers.js";

/**
 * A stand-in for Identity with the web transport: one httpOnly cookie shared by every tab, single-use
 * rotation, and reuse detection that revokes the chain, exactly like RefreshTokenRotation.
 */
function cookieIdentity() {
  let cookie = "c0";
  let generation = 0;
  const used = new Set<string>();
  let revoked = false;
  const calls: string[] = [];
  const refresh = vi.fn(async (): Promise<TokenPair> => {
    const presented = cookie; // the browser sends the cookie as it is when the request leaves
    calls.push(presented);
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (revoked || used.has(presented)) { revoked = true; throw new ApiError(401, "c", { title: "reuse", status: 401 }); }
    used.add(presented);
    generation += 1;
    cookie = `c${generation}`;
    return { accessToken: fakeJwt({ sub: "user-1" }), expiresIn: 900 };
  });
  const api: IdentityApi = { transport: "cookie", login: vi.fn(), register: vi.fn(), refresh, logout: vi.fn(async () => undefined) } as never;
  return { api, refresh, calls, isRevoked: () => revoked };
}

/** Two "tabs" of one origin: a shared Web Lock and a shared BroadcastChannel, as the browser provides them. */
function sharedBrowser() {
  let tail: Promise<unknown> = Promise.resolve();
  const locks = { request<T>(_name: string, work: () => Promise<T>): Promise<T> { const run = tail.then(work, work); tail = run.catch(() => undefined); return run; } };
  const listeners = new Set<(event: { data: unknown }) => void>();
  const channelFor = () => {
    const own = new Set<(event: { data: unknown }) => void>();
    return {
      postMessage: (data: unknown) => { for (const listener of listeners) if (!own.has(listener)) listener({ data }); },
      addEventListener: (_type: "message", listener: (event: { data: unknown }) => void) => { own.add(listener); listeners.add(listener); },
      removeEventListener: (_type: "message", listener: (event: { data: unknown }) => void) => { own.delete(listener); listeners.delete(listener); }
    };
  };
  return { tab: () => browserCoordinator({ locks, channel: channelFor() }) };
}

describe("one refresh at a time, across tabs (A21 · IDENTIDAD-DEFECTO-001)", () => {
  it("the reuse the server detects is real: two uncoordinated tabs revoke the session", async () => {
    const identity = cookieIdentity();
    const tabA = new SessionManager(createMemorySessionStore(), identity.api, inProcessCoordinator());
    const tabB = new SessionManager(createMemorySessionStore(), identity.api, inProcessCoordinator());
    const results = await Promise.allSettled([tabA.refresh(), tabB.refresh()]);
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(identity.isRevoked()).toBe(true);
  });

  it("two tabs refreshing at once rotate once and both stay signed in", async () => {
    const identity = cookieIdentity();
    const browser = sharedBrowser();
    const tabA = new SessionManager(createMemorySessionStore(), identity.api, browser.tab());
    const tabB = new SessionManager(createMemorySessionStore(), identity.api, browser.tab());
    const [a, b] = await Promise.all([tabA.refresh(), tabB.refresh()]);
    expect(identity.refresh).toHaveBeenCalledTimes(1);
    expect(b.accessToken).toBe(a.accessToken);
    expect(identity.isRevoked()).toBe(false);
    expect(tabA.getState().status).toBe("authenticated");
    expect(tabB.getState().status).toBe("authenticated");
  });

  it("a later refresh in the other tab presents the rotated cookie, never the consumed one", async () => {
    const identity = cookieIdentity();
    const browser = sharedBrowser();
    const tabA = new SessionManager(createMemorySessionStore(), identity.api, browser.tab());
    const tabB = new SessionManager(createMemorySessionStore(), identity.api, browser.tab());
    await tabA.refresh();
    await new Promise((resolve) => setTimeout(resolve, 2));
    await tabB.refresh();
    expect(identity.calls).toEqual(["c0", "c1"]);
    expect(identity.isRevoked()).toBe(false);
  });

  it("the api-client 401 retry and restore() in the same tab share ONE rotation (single mechanism)", async () => {
    const identity = cookieIdentity();
    const manager = new SessionManager(createMemorySessionStore(), identity.api, inProcessCoordinator());
    let first = true;
    const fetchFn = vi.fn(async () => {
      if (first) { first = false; return new Response(null, { status: 401 }); }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const client = createApiClient({ baseUrl: "http://api.test", tokenStore: manager.tokenStore, refreshSession: manager.refreshSession, fetchFn: fetchFn as never });
    const [response] = await Promise.all([client.request<{ ok: boolean }>("/celebrations"), manager.restore()]);
    expect(response).toEqual({ ok: true });
    expect(identity.refresh).toHaveBeenCalledTimes(1);
    expect(identity.isRevoked()).toBe(false);
  });

  it("signing out in one tab signs out the others", async () => {
    const identity = cookieIdentity();
    const browser = sharedBrowser();
    const tabA = new SessionManager(createMemorySessionStore(sessionFromTokens(tokens())), identity.api, browser.tab());
    const tabB = new SessionManager(createMemorySessionStore(sessionFromTokens(tokens())), identity.api, browser.tab());
    await tabA.restore(); await tabB.restore();
    await tabA.logout();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tabB.getState().status).toBe("anonymous");
  });

  it("ignores foreign or malformed channel messages", async () => {
    const listeners: ((event: { data: unknown }) => void)[] = [];
    const coordinator = browserCoordinator({ channel: { postMessage: () => undefined, addEventListener: (_t, l) => { listeners.push(l); }, removeEventListener: () => undefined } });
    const manager = new SessionManager(createMemorySessionStore(sessionFromTokens(tokens())), cookieIdentity().api, coordinator);
    await manager.restore();
    for (const listener of listeners) { listener({ data: { kind: "refreshed", accessToken: 7 } }); listener({ data: "signed-out" }); listener({ data: null }); }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(manager.getState().status).toBe("authenticated");
  });
});
