import { act, render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "@rsvp/api-client";
import type * as QueryHooks from "@rsvp/query-hooks";

/**
 * F12 · What push does outside the permission screen, with a faked phone: tap routing, silent registration, token refresh and
 * unregistering on sign-out. This does NOT prove delivery to an iPhone: that needs the TestFlight build and the APNs key in EAS.
 */
const PROJECT = "a7c4435b-6494-458c-b142-83b2b0705ef1";
const A = "11111111-2222-4333-8444-555555555555", B = "66666666-7777-4888-9999-000000000000";
const DEVICE_A = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", DEVICE_B = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const client = {} as ApiClient;

async function phone(os: "ios" | "web", setup: { permission?: "granted" | "undetermined"; signedIn?: boolean; failRegister?: number } = {}) {
  vi.resetModules();
  vi.doMock("react-native", () => ({ Platform: { OS: os } }));
  vi.doMock("expo-device", () => ({ isDevice: true }));
  const routerPush = vi.fn();
  vi.doMock("expo-router", () => ({ useRouter: () => ({ push: routerPush }) }));
  const auth = { state: { status: setup.signedIn === false ? "anonymous" : "authenticated" } };
  vi.doMock("../src/auth/auth-context", () => ({ useAuth: () => auth }));
  const api = {
    registerDevice: vi.fn(async (celebrationId: string) => {
      if (setup.failRegister) throw Object.assign(new Error("HTTP"), { status: setup.failRegister });
      return { id: celebrationId === A ? DEVICE_A : DEVICE_B };
    }),
    unregisterDevice: vi.fn(async () => undefined)
  };
  vi.doMock("@rsvp/query-hooks", async (original) => ({ ...(await original<typeof QueryHooks>()), hostNotificationsApi: () => api }));
  const [lifecycle, registry, notifications, constants, store] = await Promise.all([
    import("../src/push/lifecycle"), import("../src/push/device-registry"), import("./stubs/expo-notifications"), import("./stubs/expo-constants"), import("./stubs/expo-secure-store")
  ]);
  store.resetSecureStore();
  constants.constants.projectId = PROJECT;
  notifications.push.permission = setup.permission ?? "granted";
  notifications.lifecycle.last = null;
  return { ...lifecycle, ...registry, notifications, api, routerPush, auth };
}

beforeEach(() => { vi.resetModules(); });

describe("F12 · tapping a notice opens its screen", () => {
  it("maps the backend's celebration and template to the same screens as the inbox", async () => {
    const { pushRoute } = await phone("ios");
    expect(pushRoute({ celebrationId: A, template: "hostRsvpConfirmed" })).toBe(`/rsvp/reporte?c=${A}`);
    expect(pushRoute({ celebrationId: A, template: "companionRequested" })).toBe(`/bandeja/acompanantes?c=${A}`);
    expect(pushRoute({ celebrationId: A, template: "giftRequested" })).toBe(`/notificaciones?c=${A}`);
    expect(pushRoute({ celebrationId: A })).toBe(`/notificaciones?c=${A}`);
    for (const data of [null, "x", {}, { celebrationId: "../admin" }, { celebrationId: 7, template: "hostRsvpConfirmed" }]) expect(pushRoute(data)).toBeNull();
  });

  it("a tap while signed in navigates; a tap that launched the app waits for the session; other actions are ignored", async () => {
    const mod = await phone("ios", { signedIn: false });
    mod.notifications.lifecycle.last = { actionIdentifier: mod.notifications.DEFAULT_ACTION_IDENTIFIER, notification: { request: { content: { data: { celebrationId: A, template: "companionRequested" } } } } };
    const view = render(<mod.PushLifecycle client={client} />);
    await waitFor(() => expect(mod.notifications.lifecycle.handler).toBeDefined());
    expect(mod.routerPush).not.toHaveBeenCalled();
    mod.auth.state.status = "authenticated";
    view.rerender(<mod.PushLifecycle client={client} />);
    await waitFor(() => expect(mod.routerPush).toHaveBeenCalledWith(`/bandeja/acompanantes?c=${A}`));
    expect(mod.notifications.lifecycle.cleared).toBe(1);
    act(() => mod.notifications.emit.response({ actionIdentifier: "dismiss", notification: { request: { content: { data: { celebrationId: B } } } } }));
    act(() => mod.notifications.emit.response({ actionIdentifier: mod.notifications.DEFAULT_ACTION_IDENTIFIER, notification: { request: { content: { data: { celebrationId: B, template: "hostRsvpDeclined" } } } } }));
    await waitFor(() => expect(mod.routerPush).toHaveBeenLastCalledWith(`/rsvp/reporte?c=${B}`));
    expect(mod.routerPush).toHaveBeenCalledTimes(2);
    const handler = mod.notifications.lifecycle.handler as { handleNotification: () => Promise<Record<string, boolean>> };
    expect(await handler.handleNotification()).toMatchObject({ shouldShowBanner: true, shouldShowList: true });
    view.unmount();
  });
});

describe("F12 · registration without asking again", () => {
  it("an opened celebration is registered when permission is already granted, and remembered", async () => {
    const mod = await phone("ios");
    renderHook(() => mod.useSilentPushRegistration(client, A));
    await waitFor(() => expect(mod.api.registerDevice).toHaveBeenCalledWith(A, { installationId: expect.stringMatching(/^[0-9a-f-]{36}$/i), projectId: PROJECT, platform: "ios", token: "ExponentPushToken[abc123]" }));
    await waitFor(async () => expect(await mod.readRegistry()).toEqual({ [A]: DEVICE_A }));
  });

  it("never prompts, never re-adds a phone the person removed, and does nothing on the web", async () => {
    const undetermined = await phone("ios", { permission: "undetermined" });
    renderHook(() => undetermined.useSilentPushRegistration(client, A));
    await new Promise((done) => setTimeout(done, 20));
    expect(undetermined.api.registerDevice).not.toHaveBeenCalled();
    expect(undetermined.notifications.push.permission).toBe("undetermined");

    const removed = await phone("ios");
    await removed.markRemoved(A);
    renderHook(() => removed.useSilentPushRegistration(client, A));
    await new Promise((done) => setTimeout(done, 20));
    expect(removed.api.registerDevice).not.toHaveBeenCalled();

    const web = await phone("web");
    renderHook(() => web.useSilentPushRegistration(client, A));
    render(<web.PushLifecycle client={client} />);
    await new Promise((done) => setTimeout(done, 20));
    expect(web.api.registerDevice).not.toHaveBeenCalled();
    expect(web.notifications.lifecycle.handler).toBeUndefined();
  });

  it("at start and when the OS rotates the token, every registered celebration is refreshed; a celebration that is gone is forgotten", async () => {
    const mod = await phone("ios");
    await mod.rememberDevice(A, DEVICE_A);
    await mod.markRemoved(B);
    render(<mod.PushLifecycle client={client} />);
    await waitFor(() => expect(mod.api.registerDevice).toHaveBeenCalledTimes(1));
    expect(mod.api.registerDevice).toHaveBeenCalledWith(A, expect.objectContaining({ token: "ExponentPushToken[abc123]" }));
    act(() => mod.notifications.emit.token());
    await waitFor(() => expect(mod.api.registerDevice).toHaveBeenCalledTimes(2));

    const gone = await phone("ios", { failRegister: 404 });
    await gone.rememberDevice(A, DEVICE_A);
    render(<gone.PushLifecycle client={client} />);
    await waitFor(async () => expect(await gone.readRegistry()).toEqual({}));
  });
});

describe("F12 · signing out", () => {
  it("unregisters this phone from each celebration it receives notices for, then forgets them", async () => {
    const mod = await phone("ios");
    await mod.rememberDevice(A, DEVICE_A);
    await mod.rememberDevice(B, DEVICE_B);
    await mod.markRemoved(B);
    await mod.rememberDevice(A, DEVICE_A);
    await mod.unregisterPushDevices(client);
    expect(mod.api.unregisterDevice).toHaveBeenCalledTimes(1);
    expect(mod.api.unregisterDevice).toHaveBeenCalledWith(A, DEVICE_A);
    expect(await mod.readRegistry()).toEqual({});
  });

  it("a stored value that is not two ids is ignored, never sent", async () => {
    const mod = await phone("ios");
    const store = await import("./stubs/expo-secure-store");
    await store.setItemAsync("rsvp.push.devices", JSON.stringify({ [A]: "not-a-device", "../x": DEVICE_A, [B]: DEVICE_B }));
    expect(await mod.readRegistry()).toEqual({ [B]: DEVICE_B });
    await store.setItemAsync("rsvp.push.devices", "{broken");
    expect(await mod.readRegistry()).toEqual({});
  });
});
