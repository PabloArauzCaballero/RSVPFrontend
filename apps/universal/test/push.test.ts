import { beforeEach, describe, expect, it, vi } from "vitest";

/** REQ-F19-01/02 code path with a faked phone. This does NOT prove delivery: that needs a real device, an EAS build and a push credential. */
async function load(os: "ios" | "android" | "web", isDevice = true) {
  vi.resetModules();
  vi.doMock("react-native", () => ({ Platform: { OS: os } }));
  vi.doMock("expo-device", () => ({ isDevice }));
  const [register, constants, push] = await Promise.all([import("../src/push/register"), import("./stubs/expo-constants"), import("./stubs/expo-notifications")]);
  return { ...register, constants: constants.constants, push: push.push };
}
const PROJECT = "11111111-2222-4333-8444-555555555555";
/** Fresh module graph per scenario (Platform and Device are read at import); the stubs' state is set through it. */
async function scenario(os: "ios" | "android" | "web", setup: { isDevice?: boolean; projectId?: string | undefined; permission?: "undetermined" | "denied"; failToken?: boolean } = {}) {
  const mod = await load(os, setup.isDevice ?? true);
  mod.constants.projectId = "projectId" in setup ? setup.projectId : PROJECT;
  mod.push.permission = setup.permission ?? "undetermined";
  mod.push.failToken = setup.failToken ?? false;
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
    const { enablePush, currentPermission } = await scenario("android", { permission: "denied" });
    const register = vi.fn();
    expect(await enablePush(register)).toEqual({ kind: "denied" });
    expect(register).not.toHaveBeenCalled();
    expect(await currentPermission()).toBe("denied");
  });

  it("simulator and web are unsupported; a missing EAS project and a token failure are reported, not swallowed", async () => {
    const register = vi.fn();
    expect(await (await scenario("ios", { isDevice: false })).enablePush(register)).toEqual({ kind: "unsupported" });
    expect(await (await scenario("web")).enablePush(register)).toEqual({ kind: "unsupported" });
    expect(await (await scenario("ios", { projectId: undefined })).enablePush(register)).toEqual({ kind: "no-project" });
    expect(await (await scenario("ios", { failToken: true })).enablePush(register)).toEqual({ kind: "failed" });
    expect(register).not.toHaveBeenCalled();
  });
});
