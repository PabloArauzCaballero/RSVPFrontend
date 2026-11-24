import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushInvite } from "../src/push/push-invite";
import { markRemoved, rememberDevice } from "../src/push/device-registry";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { fakeClient, renderApp } from "./support";

/** F12 · The inbox leads to push on a real phone until this phone receives the celebration's notices; never on the web. */
const device = vi.hoisted(() => ({ phone: true }));
vi.mock("../src/push/register", async (original) => ({ ...(await original<Record<string, unknown>>()), supportsPush: () => device.phone }));
const CELEBRATION_ID = "11111111-2222-4333-8444-555555555555";
const onNavigate = vi.fn();
const show = () => renderApp(<PushInvite celebrationId={CELEBRATION_ID} onNavigate={onNavigate} />, fakeClient({}).client);
const settle = () => new Promise((done) => setTimeout(done, 20));

beforeEach(() => { resetSecureStore(); device.phone = true; onNavigate.mockReset(); });

describe("F12 · push invite in the inbox", () => {
  it("on a phone without push for this celebration: one card, in Spanish, that opens the permission screen", async () => {
    show();
    expect(await screen.findByText("Recibe estos avisos en tu teléfono")).toBeTruthy();
    fireEvent.click(screen.getByTestId("push-invite-open"));
    expect(onNavigate).toHaveBeenCalledWith(`/permisos-push?c=${CELEBRATION_ID}`);
  });

  it("hidden once this phone is registered or was removed by the person, and always on the web", async () => {
    for (const setup of [() => rememberDevice(CELEBRATION_ID, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"), () => markRemoved(CELEBRATION_ID)]) {
      resetSecureStore();
      await setup();
      const view = show();
      await settle();
      await waitFor(() => expect(screen.queryByTestId("push-invite")).toBeNull());
      view.unmount();
    }
    device.phone = false;
    show();
    await settle();
    expect(screen.queryByTestId("push-invite")).toBeNull();
  });
});
