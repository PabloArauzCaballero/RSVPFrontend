import { describe, expect, it } from "vitest";
import { createApiClient } from "@rsvp/api-client";
import { IdentityClient, SessionManager, createMemorySessionStore, classifyAuthError, fieldErrorsOf } from "../src/index.js";

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

/**
 * The 4-step sign-up (Identity 2.3.0) against the real service AND its real mail pipeline (Postgres outbox -> RabbitMQ -> Notification).
 * It needs a way to read the mail that "arrives": IDENTITY_LIVE_MAIL_URL is `GET <url>?to=<address>` -> `{ text }` (the stand-in of
 * api.resend.com that `apps/universal/scripts/live/registro-backend-local.mjs` serves). Not part of the default run.
 */
const mailUrl = process.env["IDENTITY_LIVE_MAIL_URL"];
describe.skipIf(!base || !mailUrl)("REQ-F05 · e-mail proof before the account, against real Identity and Notification", () => {
  const noStore = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
  const identity = new IdentityClient(createApiClient({ baseUrl: base ?? "", tokenStore: noStore, refreshSession: { refresh: async () => { throw new Error("unused"); } }, fetchFn: (url, init) => fetch(url, init) }));
  const stamp = Date.now();
  const codeFor = async (address: string): Promise<string> => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const answer = await fetch(`${mailUrl}?to=${encodeURIComponent(address)}`);
      if (answer.ok) { const found = /(\d{6})/.exec(((await answer.json()) as { text: string }).text); if (found?.[1]) return found[1]; }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error("the mail did not arrive");
  };

  it("code -> proof -> verified account; a wrong code is one 422; the proof is single use", async () => {
    const address = `proof-${stamp}@example.test`;
    await identity.requestRegistrationEmailCode(address, "es-BO");
    const code = await codeFor(address);
    const wrong = await identity.verifyRegistrationEmailCode(address, code === "000000" ? "111111" : "000000").catch((e: unknown) => e);
    expect(fieldErrorsOf(wrong)).toHaveProperty("code");
    const { proof } = await identity.verifyRegistrationEmailCode(address, code);
    const session = await identity.register({ email: address, password: "correct-horse-battery", role: "HOST", registrationProof: proof });
    expect(session.userId).toMatch(/^[0-9a-f-]{36}$/);
    const reuse = await identity.register({ email: `other-${stamp}@example.test`, password: "correct-horse-battery", role: "HOST", registrationProof: proof }).catch((e: unknown) => e);
    expect("registrationProof" in fieldErrorsOf(reuse)).toBe(true);
  });

  it("asking for a code is the same bare answer for a new and an existing address, and an existing one cannot verify", async () => {
    const existing = `existing-${stamp}@example.test`;
    await identity.register({ email: existing, password: "correct-horse-battery", role: "HOST" });
    await expect(identity.requestRegistrationEmailCode(`new-${stamp}@example.test`)).resolves.toBeUndefined();
    await expect(identity.requestRegistrationEmailCode(existing)).resolves.toBeUndefined();
    const attempt = await identity.verifyRegistrationEmailCode(existing, "123456").catch((e: unknown) => e);
    expect(fieldErrorsOf(attempt)).toHaveProperty("code");
  });
});
