import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { newIdempotencyKey, type DeviceRegistration } from "@rsvp/query-hooks";
import { readLocal, writeLocal } from "../platform/local-store";

/**
 * Registers this installation for push (REQ-F19-01/02 code path). Only a physical phone with granted permission
 * gets an Expo token; every other situation returns a state the screen can explain. This is NOT proof of
 * delivery: that needs a real device, the EAS build and a push credential (see BLOCKERS).
 */

export type PushPermission = "undetermined" | "granted" | "denied" | "unsupported";
export type PushOutcome =
  | { readonly kind: "registered" }
  | { readonly kind: "denied" }
  | { readonly kind: "unsupported" }
  | { readonly kind: "no-project" }
  | { readonly kind: "failed" };

const INSTALLATION_KEY = "rsvp.push.installation";
const IOS_OR_ANDROID = Platform.OS === "ios" || Platform.OS === "android";

export const supportsPush = (): boolean => IOS_OR_ANDROID && Device.isDevice;

export async function currentPermission(): Promise<PushPermission> {
  if (!supportsPush()) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/** A stable per-install id (UUID) the backend uses to replace, not duplicate, this device. */
export async function installationId(): Promise<string> {
  const stored = await readLocal(INSTALLATION_KEY);
  if (stored) return stored;
  const created = newIdempotencyKey();
  const uuid = /^[0-9a-f-]{36}$/i.test(created) ? created : "00000000-0000-4000-8000-000000000000";
  await writeLocal(INSTALLATION_KEY, uuid);
  return uuid;
}

export function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

export async function enablePush(register: (body: DeviceRegistration) => Promise<unknown>): Promise<PushOutcome> {
  if (!supportsPush()) return { kind: "unsupported" };
  const projectId = easProjectId();
  if (!projectId) return { kind: "no-project" };
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return { kind: "denied" };
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "default", importance: Notifications.AndroidImportance.DEFAULT });
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await register({ installationId: await installationId(), projectId, platform: Platform.OS === "ios" ? "ios" : "android", token: token.data });
    return { kind: "registered" };
  } catch { return { kind: "failed" }; }
}
