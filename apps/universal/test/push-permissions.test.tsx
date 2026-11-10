import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createContractMock } from "@rsvp/testing/contract-mock";
import type { RequestOptions } from "@rsvp/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactNative from "react-native";
import { PushPermissionsScreen } from "../src/push/permissions-screen";
import { contractClient, renderApp } from "./support";
import { constants } from "./stubs/expo-constants";
import { permissionCalls, push } from "./stubs/expo-notifications";
import { resetSecureStore } from "./stubs/expo-secure-store";

vi.mock("expo-device", () => ({ isDevice: true }));
vi.mock("react-native", async (original) => {
  const native = await original<typeof ReactNative>();
  return { ...native, Platform: { ...native.Platform, OS: "ios" }, AppState: { addEventListener: () => ({ remove: () => undefined }) } };
});

beforeEach(() => {
  resetSecureStore();
  permissionCalls.length = 0;
  push.permission = "undetermined";
  push.failToken = false;
  constants.projectId = "11111111-2222-4333-8444-555555555555";
});

describe("F19 · permissions screen with a simulated native driver", () => {
  it("explains the benefit before asking and reflects only this installation", async () => {
    const mock = createContractMock();
    mock.state.devices.push({ id: "other", installationId: "unrelated", status: "ACTIVE", platform: "ios" });
    const { client } = contractClient(mock);
    const deleted: string[] = [];
    renderApp(<PushPermissionsScreen celebrationId={mock.celebrationId} onNavigate={vi.fn()} />, {
      request: async <TResponse, TBody>(path: string, options?: RequestOptions<TBody>): Promise<TResponse> => {
        if (options?.method === "DELETE") {
          deleted.push(path);
          mock.state.devices.splice(1, 1);
          return undefined as TResponse;
        }
        return client.request(path, options);
      }
    });
    const enable = await screen.findByTestId("enable-push");
    expect(screen.getByText(/Te avisamos cuando alguien confirme/)).toBeTruthy();
    expect(permissionCalls).toEqual([]);
    expect(screen.queryByTestId("disable-push")).toBeNull();
    fireEvent.click(enable);
    expect(await screen.findByText(/Este dispositivo está registrado/)).toBeTruthy();
    expect(permissionCalls).toEqual(["prompt"]);
    fireEvent.click(await screen.findByTestId("disable-push"));
    await waitFor(() => expect(screen.queryByTestId("disable-push")).toBeNull());
    expect(deleted).toEqual([`/notifications/celebrations/${mock.celebrationId}/devices/00000000-0000-4000-8000-000000000701`]);
    expect(mock.state.devices).toHaveLength(1);
    expect(await screen.findByTestId("enable-push")).toBeTruthy();
    expect(mock.state.log.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("keeps preferences usable after denial and offers system settings", async () => {
    push.permission = "denied";
    const mock = createContractMock();
    const { client } = contractClient(mock);
    const navigate = vi.fn();
    renderApp(<PushPermissionsScreen celebrationId={mock.celebrationId} onNavigate={navigate} />, client);
    expect(await screen.findByText(/avisos están bloqueados/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir ajustes" })).toBeTruthy();
    expect(screen.queryByTestId("enable-push")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Preferencias de avisos" }));
    expect(navigate).toHaveBeenCalledWith(`/preferencias?c=${mock.celebrationId}`);
    expect(permissionCalls).toEqual([]);
  });

  it("offers retry when the native token request fails", async () => {
    push.failToken = true;
    const mock = createContractMock();
    const { client } = contractClient(mock);
    renderApp(<PushPermissionsScreen celebrationId={mock.celebrationId} onNavigate={vi.fn()} />, client);
    fireEvent.click(await screen.findByTestId("enable-push"));
    expect(await screen.findByText(/No pudimos activar los avisos/)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("enable-push").getAttribute("aria-disabled")).not.toBe("true"));
    expect(mock.state.log.some((call) => call.method === "POST")).toBe(false);
  });
});
