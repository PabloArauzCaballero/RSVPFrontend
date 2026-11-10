import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { DeviceRegistration } from "@rsvp/query-hooks";
import { readLocal, writeLocal } from "../platform/local-store";

/**
 * Registers this installation for push (REQ-F19-01/02 code path). Only a physical phone with granted permission
 * gets an Expo token; every other situation returns a state the screen can explain. This is NOT proof of
 * delivery: that needs a real device, the EAS build and a push credential (see BLOCKERS).
 */

export type PushPermission = "undetermined" | "granted" | "denied" | "unsupported" | "failed";
export type PushOutcome =
  | { readonly kind: "registered" }
  | { readonly kind: "denied" }
  | { readonly kind: "unsupported" }
  | { readonly kind: "no-project" }
  | { readonly kind: "failed" };

const INSTALLATION_KEY = "rsvp.push.installation";
export const PUSH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_INSTALLATION = "00000000-0000-4000-8000-000000000000";
const IOS_OR_ANDROID = Platform.OS === "ios" || Platform.OS === "android";

export const supportsPush = (): boolean => IOS_OR_ANDROID && Device.isDevice;

export async function currentPermission(): Promise<PushPermission> {
  if (!supportsPush()) return "unsupported";
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return status === "granted" ? "granted" : status === "denied" || !canAskAgain ? "denied" : "undetermined";
  } catch {
    return "failed";
  }
}

/** A stable per-install id (UUID) the backend uses to replace, not duplicate, this device. */
let installation: Promise<string> | undefined;
export async function installationId(): Promise<string> {
  installation ??= (async () => {
    const stored = await readLocal(INSTALLATION_KEY);
    if (stored && stored !== LEGACY_INSTALLATION && PUSH_UUID.test(stored)) return stored;
    // The installation ID is an identifier, not a credential. Older native runtimes lack randomUUID.
    const uuid = globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (digit) => {
      const value = Math.floor(Math.random() * 16);
      return (digit === "x" ? value : (value & 3) | 8).toString(16);
    });
    await writeLocal(INSTALLATION_KEY, uuid);
    return uuid;
  })();
  return installation;
}

export function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const id = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return id && PUSH_UUID.test(id) ? id : undefined;
}

export async function enablePush(register: (body: DeviceRegistration) => Promise<unknown>, { prompt = true, channelName = "RSVP" } = {}): Promise<PushOutcome> {
  if (!supportsPush()) return { kind: "unsupported" };
  const projectId = easProjectId();
  if (!projectId) return { kind: "no-project" };
  try {
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== "granted" && (!prompt || !canAskAgain || status === "denied")) return { kind: "denied" };
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: channelName, importance: Notifications.AndroidImportance.DEFAULT });
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await register({ installationId: await installationId(), projectId, platform: Platform.OS === "ios" ? "ios" : "android", token: token.data });
    return { kind: "registered" };
  } catch { return { kind: "failed" }; }
}
