import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import type { HostNotification } from "@rsvp/query-hooks";
import { notificationTarget } from "../host/guests/notification-target";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { PUSH_UUID } from "./register";

export interface ResolvedPush {
  readonly celebrationId: string;
  readonly notification: HostNotification;
}

export function pushDestination({ celebrationId, notification }: ResolvedPush): string {
  return withCelebration(HOST_ROUTES[notificationTarget(notification.template) ?? "notifications"], celebrationId);
}

export function unreadPushCount(items: readonly HostNotification[]): number {
  return items.filter((item) => item.readAt === null).length;
}

function pushId(notification: Notifications.Notification): string | undefined {
  const id: unknown = notification.request.content.data.notificationId;
  return typeof id === "string" && PUSH_UUID.test(id) ? id : undefined;
}

type Driver = Pick<typeof Notifications,
  "setNotificationHandler" | "addNotificationReceivedListener" | "addNotificationResponseReceivedListener"
  | "getLastNotificationResponse" | "clearLastNotificationResponse" | "DEFAULT_ACTION_IDENTIFIER">;

/** The system presents background pushes. The default tap and cold launch share one handler. */
export function listenToPush(
  callbacks: { readonly received: (id: string) => void; readonly opened: (id: string) => void },
  driver: Driver = Notifications,
  isForeground = () => AppState.currentState === "active"
): () => void {
  driver.setNotificationHandler({
    handleNotification: async () => {
      const show = !isForeground();
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    }
  });
  let handled: string | undefined;
  const open = (response: Notifications.NotificationResponse): void => {
    if (response.actionIdentifier !== driver.DEFAULT_ACTION_IDENTIFIER) return;
    const id = pushId(response.notification);
    const eventId = response.notification.request.identifier;
    if (handled === eventId) return;
    handled = eventId;
    driver.clearLastNotificationResponse();
    if (id) callbacks.opened(id);
  };
  const received = driver.addNotificationReceivedListener((notification) => {
    const id = pushId(notification);
    if (id && isForeground()) callbacks.received(id);
  });
  const opened = driver.addNotificationResponseReceivedListener(open);
  const initial = driver.getLastNotificationResponse();
  if (initial) open(initial);
  return () => {
    received.remove();
    opened.remove();
    driver.setNotificationHandler(null);
  };
}
