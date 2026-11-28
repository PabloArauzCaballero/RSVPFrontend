import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { IdentityClient, classifyAuthError, fieldErrorsOf, isInvalidLink, loginSchema, passwordResetSchema, recoverySchema, registerSchema, registrationAccountSchema, registrationCodeSchema, registrationContactSchema, registrationEmailSchema, registrationPasswordSchema, validate, validateRegistration, validateRegistrationAccount } from "../src/index.js";
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
    const base = { role: "HOST", givenName: "Ana", familyName: "Rojas", phone: "+591 7123 4567", city: "La Paz" };
    expect(validate(registerSchema, { ...base, email: "", password: "" })).toEqual({ ok: false, errors: { email: "required", password: "required" } });
    expect(validate(registerSchema, { ...base, email: "a@b.co", password: "short" })).toEqual({ ok: false, errors: { password: "passwordShort" } });
    expect(validate(registerSchema, { ...base, email: "a@b.co", password: "ñ".repeat(40) })).toEqual({ ok: false, errors: { password: "passwordBytes" } });
    expect(validate(registerSchema, { ...base, email: "a@b.co", password: "correct-horse-battery", role: "ADMIN" }).ok).toBe(false);
    expect(validate(registerSchema, { ...base, email: "a@b.co", password: "correct-horse-battery", role: "PROVIDER" }).ok).toBe(true);
  });
  it("register requires the profile and normalises the phone to E.164", () => {
    const access = { email: "a@b.co", password: "correct-horse-battery" };
    const empty = validateRegistration({ role: "HOST", givenName: " ", familyName: "", phone: "+591 ", city: "", ...access });
    expect(empty).toEqual({ ok: false, errors: { givenName: "required", familyName: "required", phone: "required", city: "required" } });
    const ok = validateRegistration({ role: "HOST", givenName: " Ana ", familyName: "Rojas", phone: "+591 (7) 123-4567", city: "Sucre", ...access });
    expect(ok).toMatchObject({ ok: true, value: { givenName: "Ana", phone: "+59171234567", country: "BO", marketingOptIn: false, organizationName: "" } });
    expect(validateRegistration({ role: "HOST", givenName: "A", familyName: "R", phone: "71234567", city: "Sucre", ...access })).toEqual({ ok: false, errors: { phone: "invalidPhone" } });
    expect(validateRegistration({ role: "HOST", givenName: "x".repeat(81), familyName: "R", phone: "+59171234567", city: "Sucre", ...access })).toEqual({ ok: false, errors: { givenName: "tooLong" } });
  });
  it("register reports the cross-field rule together with field errors (a planner needs the company); there is one password and no confirmation", () => {
    const result = validateRegistration({ role: "PLANNER", organizationName: " ", givenName: "", familyName: "R", phone: "+59171234567", city: "Sucre", email: "a@b.co", password: "correct-horse-battery" });
    expect(result).toEqual({ ok: false, errors: { organizationName: "required", givenName: "required" } });
    const filled = { givenName: "A", familyName: "R", phone: "+59171234567", city: "Sucre", email: "a@b.co", password: "correct-horse-battery" };
    expect("passwordConfirmation" in registerSchema.shape).toBe(false);
    expect(validateRegistration({ role: "HOST", organizationName: "", ...filled }).ok).toBe(true);
    expect(validateRegistration({ role: "PROVIDER", organizationName: "", ...filled }).ok).toBe(true);
  });
  it("MV-D2: every sign-up step has its own schema, so a step is checked when the person leaves it", () => {
    expect(validate(registrationEmailSchema, { email: " ana@example.com " })).toMatchObject({ ok: true, value: { email: "ana@example.com" } });
    expect(validate(registrationEmailSchema, { email: "nope" })).toEqual({ ok: false, errors: { email: "invalidEmail" } });
    expect(validate(registrationCodeSchema, { code: "" })).toEqual({ ok: false, errors: { code: "required" } });
    expect(validate(registrationCodeSchema, { code: "12345" })).toEqual({ ok: false, errors: { code: "invalidCode" } });
    expect(validate(registrationCodeSchema, { code: "1234567" })).toEqual({ ok: false, errors: { code: "invalidCode" } });
    expect(validate(registrationCodeSchema, { code: "12a456" })).toEqual({ ok: false, errors: { code: "invalidCode" } });
    expect(validate(registrationCodeSchema, { code: "123 456" })).toMatchObject({ ok: true, value: { code: "123456" } });
    expect(validate(registrationAccountSchema, { role: "ADMIN", givenName: "A", familyName: "R" }).ok).toBe(false);
    expect(validate(registrationAccountSchema, { role: "PROVIDER", givenName: "A", familyName: "R" })).toMatchObject({ ok: true, value: { organizationName: "" } });
    expect(validateRegistrationAccount({ role: "PLANNER", organizationName: " ", givenName: "A", familyName: "R" })).toEqual({ ok: false, errors: { organizationName: "required" } });
    expect(validate(registrationContactSchema, { phone: "+591 ", city: "" })).toEqual({ ok: false, errors: { phone: "required", city: "required" } });
    expect(validate(registrationContactSchema, { phone: "+591 7123 4567", city: "Sucre" })).toMatchObject({ ok: true, value: { phone: "+59171234567", country: "BO" } });
    expect(validate(registrationPasswordSchema, { password: "short" })).toEqual({ ok: false, errors: { password: "passwordShort" } });
    expect(validate(registrationPasswordSchema, { password: "correct-horse-battery" })).toMatchObject({ ok: true, value: { marketingOptIn: false } });
  });
  it("2.3.0: asking for a code and checking it call the documented endpoints; the proof travels in the body of register and never in a URL", async () => {
    const fetchFn = vi.fn(async (url: string) => (url.endsWith("/verify") ? json(200, { proof: "p".repeat(43), expiresIn: 1800 }) : url.endsWith("/register") ? json(201, { id: "i", email: "a@b.co", roles: ["HOST"], ...tokens(), tokenType: "Bearer" }) : new Response(null, { status: 202 }))) as unknown as typeof fetch;
    const client = clientWith(fetchFn);
    await expect(client.requestRegistrationEmailCode("a@b.co", "es-BO")).resolves.toBeUndefined();
    await expect(client.verifyRegistrationEmailCode("a@b.co", "123456")).resolves.toEqual({ proof: "p".repeat(43), expiresIn: 1800 });
    await client.register({ email: "a@b.co", password: "correct-horse-battery", role: "HOST", registrationProof: "p".repeat(43) });
    const [ask, verify, register] = [0, 1, 2].map((index) => (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[index] as [string, RequestInit]);
    expect(ask[0]).toBe("http://gw/identity/auth/registration/email-code");
    expect(JSON.parse(String(ask[1].body))).toEqual({ email: "a@b.co" });
    expect(new Headers(ask[1].headers).get("accept-language")).toBe("es-BO");
    expect(verify[0]).toBe("http://gw/identity/auth/registration/email-code/verify");
    expect(JSON.parse(String(verify[1].body))).toEqual({ email: "a@b.co", code: "123456" });
    expect(register[0]).toBe("http://gw/identity/auth/register");
    expect(JSON.parse(String(register[1].body))).toMatchObject({ registrationProof: "p".repeat(43) });
    for (const [url] of [ask, verify, register]) expect(url).not.toMatch(/[?]|a@b\.co|p{10}/);
  });
  it("2.3.0: a wrong or expired code is the same 422 on `code`, and a spent or expired proof is a 422 on `registrationProof`", async () => {
    const wrong = await clientWith((async () => json(422, { title: "Invalid", status: 422, errors: [{ field: "code", message: "invalid" }] }, "application/problem+json")) as unknown as typeof fetch).verifyRegistrationEmailCode("a@b.co", "000000").catch((e: unknown) => e);
    expect(fieldErrorsOf(wrong)).toEqual({ code: "invalid" });
    const spent = await clientWith((async () => json(422, { title: "Invalid", status: 422, errors: [{ field: "registrationProof", message: "invalid" }] }, "application/problem+json")) as unknown as typeof fetch).register({ email: "a@b.co", password: "correct-horse-battery", role: "HOST", registrationProof: "x" }).catch((e: unknown) => e);
    expect("registrationProof" in fieldErrorsOf(spent)).toBe(true);
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
  it("B4: password reset, e-mail confirmation and resend hit the 1.3.0 contract; a 422 on token is an invalid link", async () => {
    const fetchFn = vi.fn(async () => json(204, null)) as unknown as typeof fetch;
    const client = clientWith(fetchFn);
    await client.resetPassword({ token: "t".repeat(43), newPassword: "a brand new passphrase" });
    await client.confirmEmail("v".repeat(43));
    await client.resendEmailVerification("access-token");
    const calls = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][];
    expect(calls.map(([url, init]) => [url, init.method])).toEqual([
      ["http://gw/identity/auth/password-reset", "POST"], ["http://gw/identity/auth/email-verification/confirm", "POST"], ["http://gw/identity/auth/email-verification", "POST"]
    ]);
    expect(JSON.parse(String(calls[0]?.[1].body))).toEqual({ token: "t".repeat(43), newPassword: "a brand new passphrase" });
    expect(JSON.parse(String(calls[1]?.[1].body))).toEqual({ token: "v".repeat(43) });
    expect(new Headers(calls[2]?.[1].headers).get("authorization")).toBe("Bearer access-token");
    const used = await clientWith((async () => json(422, { title: "Invalid", status: 422, errors: [{ field: "token", message: "expired" }] }, "application/problem+json")) as unknown as typeof fetch)
      .resetPassword({ token: "x", newPassword: "a brand new passphrase" }).catch((e: unknown) => e);
    expect(isInvalidLink(used)).toBe(true);
    const weak = await clientWith((async () => json(422, { title: "Invalid", status: 422, errors: [{ field: "newPassword", message: "short" }] }, "application/problem+json")) as unknown as typeof fetch)
      .resetPassword({ token: "x", newPassword: "a brand new passphrase" }).catch((e: unknown) => e);
    expect(isInvalidLink(weak)).toBe(false);
    expect(validate(passwordResetSchema, { token: "", newPassword: "a brand new passphrase" })).toEqual({ ok: false, errors: { token: "linkInvalid" } });
    expect(validate(passwordResetSchema, { token: "t", newPassword: "short" })).toEqual({ ok: false, errors: { newPassword: "passwordShort" } });
  });
});
