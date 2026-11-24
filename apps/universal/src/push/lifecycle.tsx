import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import type { ApiClient } from "@rsvp/api-client";
import { hostNotificationsApi } from "@rsvp/query-hooks";
import { useAuth } from "../auth/auth-context";
import { notificationTarget } from "../host/guests/notification-target";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { clearRegistry, forgetCelebration, readRegistry, rememberDevice, type DeviceRegistry } from "./device-registry";
import { silentRegistration, supportsPush } from "./register";

/**
 * F12 · Everything push does outside the permission screen, on a real phone only (web, simulators and tests do nothing):
 * - a notice that arrives with the app open is shown as a banner;
 * - tapping a notice (app open, in the background or closed) opens its screen once the session is ready;
 * - while signed in, every celebration this phone is registered in is refreshed at start and when the OS rotates the token;
 * - a celebration opened with permission already granted is registered without asking again (`useSilentPushRegistration`);
 * - signing out unregisters this phone from each celebration (`unregisterPushDevices`), so it stops receiving that account's notices.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNREGISTER_BUDGET_MS = 5000;

/** The screen a tapped notice opens, from the backend's `data` (celebrationId and template). Anything malformed opens nothing. */
export function pushRoute(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const { celebrationId, template } = data as Record<string, unknown>;
  if (typeof celebrationId !== "string" || !UUID.test(celebrationId)) return null;
  // The same destinations as the in-app inbox; any other notice opens the inbox of that celebration.
  const target = typeof template === "string" ? notificationTarget(template) : null;
  return withCelebration(target === "requests" ? HOST_ROUTES.requests : target === "report" ? HOST_ROUTES.report : HOST_ROUTES.notifications, celebrationId);
}

const active = (registry: DeviceRegistry): string[] => Object.entries(registry).filter(([, entry]) => entry !== "off").map(([celebrationId]) => celebrationId);
const gone = (error: unknown): boolean => typeof error === "object" && error !== null && "status" in error && [403, 404].includes((error as { status: number }).status);

/** Registers this installation in one celebration and remembers its device id. A celebration that is gone or no longer ours is forgotten. */
async function registerIn(client: ApiClient, celebrationId: string, body: NonNullable<Awaited<ReturnType<typeof silentRegistration>>>): Promise<void> {
  try {
    const device = await hostNotificationsApi(client).registerDevice(celebrationId, body);
    await rememberDevice(celebrationId, device.id);
  } catch (error) {
    if (gone(error)) await forgetCelebration(celebrationId);
    // Anything else (offline, 5xx) is retried at the next start.
  }
}

/** Mounted once under the providers. Renders nothing. */
export function PushLifecycle({ client }: { readonly client: ApiClient }): null {
  const router = useRouter();
  const signedIn = useAuth().state.status === "authenticated";
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    if (!supportsPush()) return;
    Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
    let live = true;
    const open = (response: Notifications.NotificationResponse | null): void => {
      if (!live || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const next = pushRoute(response.notification.request.content.data);
      if (next) setRoute(next);
    };
    // A tap that launched the app from closed arrives before any listener exists.
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => { live = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!route || !signedIn) return;
    setRoute(null);
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    router.push(route);
  }, [route, signedIn, router]);

  useEffect(() => {
    if (!signedIn || !supportsPush()) return;
    let live = true;
    const refresh = async (): Promise<void> => {
      const celebrations = active(await readRegistry());
      if (celebrations.length === 0) return;
      const body = await silentRegistration();
      if (!body || !live) return;
      for (const celebrationId of celebrations) await registerIn(client, celebrationId, body);
    };
    void refresh();
    const subscription = Notifications.addPushTokenListener(() => { void refresh(); });
    return () => { live = false; subscription.remove(); };
  }, [signedIn, client]);

  return null;
}

/** A celebration opened with push already allowed on this phone is registered too, without asking; never one the person removed. */
export function useSilentPushRegistration(client: ApiClient, celebrationId: string | undefined): void {
  useEffect(() => {
    if (!celebrationId || !UUID.test(celebrationId) || !supportsPush()) return;
    let live = true;
    void (async () => {
      if ((await readRegistry())[celebrationId]) return;
      const body = await silentRegistration();
      if (body && live) await registerIn(client, celebrationId, body);
    })();
    return () => { live = false; };
  }, [client, celebrationId]);
}

/**
 * Before the session ends: unregister this phone from every celebration it receives notices for, within a short budget so a bad
 * connection never blocks signing out. A celebration that could not be reached keeps the device until the next DeviceNotRegistered.
 */
export async function unregisterPushDevices(client: ApiClient): Promise<void> {
  if (!supportsPush()) return;
  const registry = await readRegistry();
  const api = hostNotificationsApi(client);
  const calls = Object.entries(registry).flatMap(([celebrationId, entry]) => (entry === "off" ? [] : [api.unregisterDevice(celebrationId, entry)]));
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([Promise.allSettled(calls), new Promise((done) => { timer = setTimeout(done, UNREGISTER_BUDGET_MS); })]);
  if (timer) clearTimeout(timer);
  await clearRegistry();
}
