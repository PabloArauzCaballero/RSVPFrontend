import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { IdentityClient, classifyAuthError, fieldErrorsOf, loginSchema, recoverySchema, registerSchema, validate } from "../src/index.js";
import { tokens } from "./helpers.js";

const json = (status: number, body: unknown, type = "application/json"): Response => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": type } });
function clientWith(fetchFn: typeof fetch): IdentityClient {
  return new IdentityClient(createApiClient({ baseUrl: "http://gw", tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }, refreshSession: { refresh: async () => { throw new Error("unused"); } }, fetchFn }));
}

describe("IdentityClient (contract identity.openapi.json, fake transport)", () => {
  it("login posts credentials and builds the session from the access-token claims", async () => {
    const fetchFn = vi.fn(async () => json(200, { ...tokens({ roles: ["PLANNER"], organizationIds: ["o1"] }), tokenType: "Bearer" })) as unknown as typeof fetch;
    const session = await clientWith(fetchFn).login({ email: "a@b.co", password: "pw" });
    expect(session).toMatchObject({ userId: "user-1", roles: ["PLANNER"], organizationIds: ["o1"] });
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://gw/identity/auth/login");
    expect(JSON.parse(String(init.body))).toEqual({ email: "a@b.co", password: "pw" });
    expect(new Headers(init.headers).get("authorization")).toBeNull();
  });
  it("register 201 returns a session; 409 is emailTaken; 422 carries field errors", async () => {
    expect((await clientWith((async () => json(201, { id: "i", email: "a@b.co", roles: ["HOST"], ...tokens(), tokenType: "Bearer" })) as unknown as typeof fetch).register({ email: "a@b.co", password: "x".repeat(12), role: "HOST" })).roles).toEqual(["HOST"]);
    const conflict = await clientWith((async () => json(409, { title: "Conflict", status: 409 }, "application/problem+json")) as unknown as typeof fetch).register({ email: "a@b.co", password: "x".repeat(12), role: "HOST" }).catch((e: unknown) => e);
    expect(classifyAuthError(conflict)).toBe("emailTaken");
    const invalid = await clientWith((async () => json(422, { title: "Invalid", status: 422, errors: [{ field: "password", message: "too short" }] }, "application/problem+json")) as unknown as typeof fetch).register({ email: "a@b.co", password: "x", role: "HOST" }).catch((e: unknown) => e);
    expect(classifyAuthError(invalid)).toBe("validation");
    expect(fieldErrorsOf(invalid)).toEqual({ password: "too short" });
  });
  it("login 401 is invalidCredentials; a dead network is offline; 503 is unavailable", async () => {
    const failing = (fn: () => Promise<Response>): Promise<unknown> => clientWith(fn as unknown as typeof fetch).login({ email: "a@b.co", password: "pw" }).catch((e: unknown) => e);
    expect(classifyAuthError(await failing(async () => json(401, { title: "Authentication failed", status: 401 }, "application/problem+json")))).toBe("invalidCredentials");
    expect(classifyAuthError(await failing(async () => { throw new TypeError("Failed to fetch"); }))).toBe("offline");
    expect(classifyAuthError(await failing(async () => json(503, { title: "x", status: 503 }, "application/problem+json")))).toBe("unavailable");
    expect(classifyAuthError(new Error("boom"))).toBe("unknown");
  });
  it("refresh, recovery (202) and logout (204) use the frozen endpoints", async () => {
    const fetchFn = vi.fn(async (url: string) => (url.endsWith("/refresh") ? json(200, tokens()) : json(url.endsWith("/logout") ? 204 : 202, null))) as unknown as typeof fetch;
    const identity = clientWith(fetchFn);
    await identity.refresh("r".repeat(40), "corr-1"); await identity.requestPasswordRecovery({ email: "a@b.co" }); await identity.logout("r".repeat(40));
    const calls = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string, RequestInit]>;
    expect(calls.map(([u]) => u)).toEqual(["http://gw/identity/auth/refresh", "http://gw/identity/auth/password-recovery", "http://gw/identity/auth/logout"]);
    expect(new Headers(calls[0]?.[1].headers).get("x-correlation-id")).toBe("corr-1");
  });
});

describe("schemas", () => {
  it("login requires both fields and a plausible e-mail", () => {
    expect(validate(loginSchema, { email: "", password: "" })).toEqual({ ok: false, errors: { email: "required", password: "required" } });
    expect(validate(loginSchema, { email: "nope", password: "x" })).toEqual({ ok: false, errors: { email: "invalidEmail" } });
    expect(validate(loginSchema, { email: " a@b.co ", password: "x" })).toMatchObject({ ok: true, value: { email: "a@b.co" } });
  });
  it("register enforces the 12-character and 72-byte password policy and excludes ADMIN", () => {
    expect(validate(registerSchema, { email: "", password: "", role: "HOST" })).toEqual({ ok: false, errors: { email: "required", password: "required" } });
    expect(validate(registerSchema, { email: "a@b.co", password: "short", role: "HOST" })).toEqual({ ok: false, errors: { password: "passwordShort" } });
    expect(validate(registerSchema, { email: "a@b.co", password: "ñ".repeat(40), role: "HOST" })).toEqual({ ok: false, errors: { password: "passwordBytes" } });
    expect(validate(registerSchema, { email: "a@b.co", password: "correct-horse-battery", role: "ADMIN" }).ok).toBe(false);
    expect(validate(registerSchema, { email: "a@b.co", password: "correct-horse-battery", role: "PROVIDER" }).ok).toBe(true);
  });
  it("recovery only needs an e-mail", () => { expect(validate(recoverySchema, { email: "a@b.co" }).ok).toBe(true); });

  describe("cookie transport (web)", () => {
    const cookieClient = (fetchFn: typeof fetch): IdentityClient => new IdentityClient(createApiClient({ baseUrl: "http://gw", tokenStore: { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }, refreshSession: { refresh: async () => { throw new Error("unused"); } }, fetchFn }), "cookie");
    const callOf = (fetchFn: unknown, index = 0): [string, RequestInit] => (fetchFn as ReturnType<typeof vi.fn>).mock.calls[index] as [string, RequestInit];
    it("login sends the transport header with credentials and builds a session without a refresh token", async () => {
      const fetchFn = vi.fn(async () => json(200, { accessToken: tokens().accessToken, tokenType: "Bearer", expiresIn: 900 })) as unknown as typeof fetch;
      const session = await cookieClient(fetchFn).login({ email: "a@b.co", password: "pw" });
      expect(session.refreshToken).toBe("");
      const [, init] = callOf(fetchFn);
      expect(new Headers(init.headers).get("x-session-transport")).toBe("cookie");
      expect(init.credentials).toBe("include");
    });
    it("refresh sends no body and ignores any token passed in", async () => {
      const fetchFn = vi.fn(async () => json(200, { accessToken: tokens().accessToken, tokenType: "Bearer", expiresIn: 900 })) as unknown as typeof fetch;
      await cookieClient(fetchFn).refresh("", "corr-1");
      const [url, init] = callOf(fetchFn);
      expect(url).toBe("http://gw/identity/auth/refresh");
      expect(init.body).toBeUndefined();
      expect(new Headers(init.headers).get("x-session-transport")).toBe("cookie");
    });
    it("logout posts with the header and no body; the body transport sends the token and no header", async () => {
      const fetchFn = vi.fn(async () => json(204, null)) as unknown as typeof fetch;
      await cookieClient(fetchFn).logout("");
      expect(callOf(fetchFn)[1].body).toBeUndefined();
      const nativeFetch = vi.fn(async () => json(204, null)) as unknown as typeof fetch;
      await clientWith(nativeFetch).logout("r".repeat(40));
      const [, init] = callOf(nativeFetch);
      expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "r".repeat(40) });
      expect(new Headers(init.headers).get("x-session-transport")).toBeNull();
    });
  });
});
