import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse, setupServer } from "@rsvp/testing";

/** REQ-F19-01/02 code path with a faked phone. This does NOT prove delivery: that needs a real device, an EAS build and a push credential. */
async function load(os: "ios" | "android" | "web", isDevice = true) {
  vi.resetModules();
  vi.doMock("react-native", () => ({ Platform: { OS: os } }));
  vi.doMock("expo-device", () => ({ isDevice }));
  const [register, constants, push] = await Promise.all([import("../src/push/register"), import("./stubs/expo-constants"), import("./stubs/expo-notifications")]);
  return { ...register, constants: constants.constants, push: push.push, permissionCalls: push.permissionCalls };
}
const PROJECT = "11111111-2222-4333-8444-555555555555";
/** Fresh module graph per scenario (Platform and Device are read at import); the stubs' state is set through it. */
async function scenario(os: "ios" | "android" | "web", setup: { isDevice?: boolean; projectId?: string | undefined; permission?: "undetermined" | "denied"; failToken?: boolean } = {}) {
  const mod = await load(os, setup.isDevice ?? true);
  mod.constants.projectId = "projectId" in setup ? setup.projectId : PROJECT;
  mod.push.permission = setup.permission ?? "undetermined";
  mod.push.failToken = setup.failToken ?? false;
  mod.permissionCalls.length = 0;
  return mod;
}

beforeEach(() => { vi.resetModules(); });

describe("REQ-F19-01 · push registration (code path)", () => {
  it("granted → asks for the Expo token with the EAS project and registers a device with a stable installation id", async () => {
    const { enablePush, installationId, push } = await scenario("ios");
    const bodies: unknown[] = [];
    expect(await enablePush(async (body) => { bodies.push(body); })).toEqual({ kind: "registered" });
    expect(push.projectIdSeen).toBe("11111111-2222-4333-8444-555555555555");
    expect(bodies).toEqual([{ installationId: expect.stringMatching(/^[0-9a-f-]{36}$/i), projectId: "11111111-2222-4333-8444-555555555555", platform: "ios", token: "ExponentPushToken[abc123]" }]);
    expect(await installationId()).toBe((bodies[0] as { installationId: string }).installationId);
  });

  it("denied permission: nothing is registered and the state says denied", async () => {
    const { enablePush, currentPermission, permissionCalls } = await scenario("android", { permission: "denied" });
    const register = vi.fn();
    expect(await enablePush(register)).toEqual({ kind: "denied" });
    expect(register).not.toHaveBeenCalled();
    expect(await currentPermission()).toBe("denied");
    expect(permissionCalls).toEqual([]);
  });

  it("simulator and web are unsupported; a missing EAS project and a token failure are reported, not swallowed", async () => {
    const register = vi.fn();
    expect(await (await scenario("ios", { isDevice: false })).enablePush(register)).toEqual({ kind: "unsupported" });
    expect(await (await scenario("web")).enablePush(register)).toEqual({ kind: "unsupported" });
    expect(await (await scenario("ios", { projectId: undefined })).enablePush(register)).toEqual({ kind: "no-project" });
    expect(await (await scenario("ios", { failToken: true })).enablePush(register)).toEqual({ kind: "failed" });
    expect(register).not.toHaveBeenCalled();
  });

  it("creates the Android channel before asking and never prompts during session restoration", async () => {
    const { enablePush, permissionCalls } = await scenario("android");
    const register = vi.fn();
    expect(await enablePush(register, { prompt: false })).toEqual({ kind: "denied" });
    expect(permissionCalls).toEqual([]);
    await enablePush(register);
    expect(permissionCalls).toEqual(["channel", "prompt"]);
    expect(register).toHaveBeenCalledTimes(1);
  });
});

describe("REQ-F19-02 · device registration follows the session", () => {
  const url = "http://push.msw";
  const celebration = "5f1c2d3e-4a5b-4c6d-8e7f-a1b2c3d4e5f6";
  const device = "00000000-0000-4000-8000-000000000701";
  const path = `/notifications/celebrations/${celebration}/devices`;
  const errors = [400, 401, 403, 404, 409, 413, 415, 422, 503] as const;
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  async function deviceSession() {
    const { permissionCalls, push } = await scenario("ios");
    const [{ createPushSession }, { createApiClient, toApiError }] = await Promise.all([
      import("../src/push/session"),
      import("@rsvp/api-client")
    ]);
    let user: string | undefined = "host";
    const client = createApiClient({
      baseUrl: url,
      // Node fetch does not accept jsdom's AbortSignal.
      fetchFn: (input, options) => fetch(input, { ...options, signal: undefined }),
      tokenStore: { getAccessToken: async () => user ?? null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined },
      refreshSession: { refresh: async () => { throw toApiError(401, "test", { status: 401 }); } }
    });
    return { client, session: createPushSession(client, () => user), permissionCalls, push, setUser: (value: string | undefined) => { user = value; } };
  }

  it("revokes before logout and restores only the opted-in account without prompting", async () => {
    const { session, setUser, permissionCalls } = await deviceSession();
    const operations: string[] = [];
    server.use(
      http.post(`${url}${path}`, async ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer host");
        expect(await request.json()).toMatchObject({ platform: "ios", projectId: PROJECT });
        operations.push("register");
        return HttpResponse.json({ id: device }, { status: 201 });
      }),
      http.delete(`${url}${path}/${device}`, ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer host");
        operations.push("revoke");
        return new HttpResponse(null, { status: 204 });
      })
    );
    expect(await session.enable("host", celebration, "RSVP")).toEqual({ kind: "registered" });
    expect(await session.scopes("host")).toEqual([celebration]);
    await session.end("host", async () => { operations.push("logout"); setUser(undefined); });
    setUser("other");
    await session.resume("other", "RSVP");
    expect(await session.scopes("other")).toEqual([]);
    setUser("host");
    await session.resume("host", "RSVP");
    expect(operations).toEqual(["register", "revoke", "logout", "register"]);
    expect(permissionCalls).toEqual(["prompt"]);
  });

  it("still logs out when the revoke fails", async () => {
    const { session } = await deviceSession();
    server.use(
      http.post(`${url}${path}`, () => HttpResponse.json({ id: device }, { status: 201 })),
      http.delete(`${url}${path}/${device}`, () => HttpResponse.json({ status: 503 }, { status: 503 }))
    );
    await session.enable("host", celebration, "RSVP");
    const logout = vi.fn(async () => undefined);
    await session.end("host", logout);
    expect(logout).toHaveBeenCalledOnce();
  });

  it.each(errors)("handles POST HTTP %i without remembering a registration", async (status) => {
    const { session } = await deviceSession();
    server.use(http.post(`${url}${path}`, () => HttpResponse.json({ status }, { status })));
    expect(await session.enable("host", celebration, "RSVP")).toEqual({ kind: "failed" });
    expect(await session.scopes("host")).toEqual([]);
  });

  it.each(errors)("handles GET and DELETE HTTP %i for this celebration", async (status) => {
    const { client, session } = await deviceSession();
    const { hostNotificationsApi } = await import("@rsvp/query-hooks");
    server.use(
      http.get(`${url}${path}`, () => HttpResponse.json({ status }, { status })),
      http.post(`${url}${path}`, () => HttpResponse.json({ id: device }, { status: 201 })),
      http.delete(`${url}${path}/${device}`, () => HttpResponse.json({ status }, { status }))
    );
    await expect(hostNotificationsApi(client).devices(celebration)).rejects.toMatchObject({ status });
    expect(await session.enable("host", celebration, "RSVP")).toEqual({ kind: "registered" });
    const remove = session.remove("host", celebration, device);
    if (status === 404) {
      await expect(remove).resolves.toBeUndefined();
      expect(await session.scopes("host")).toEqual([]);
    } else {
      await expect(remove).rejects.toMatchObject({ status });
      expect(await session.scopes("host")).toEqual([celebration]);
    }
  });
});
