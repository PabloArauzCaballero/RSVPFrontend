import type { Notification, NotificationHandler, NotificationResponse } from "expo-notifications";
import type { HostNotification } from "@rsvp/query-hooks";
import { describe, expect, it, vi } from "vitest";
import { listenToPush, pushDestination, unreadPushCount } from "../src/push/handlers";

const id = "00000000-0000-4000-8000-000000000101";
const celebrationId = "5f1c2d3e-4a5b-4c6d-8e7f-a1b2c3d4e5f6";
const notification = {
  date: 0,
  request: {
    identifier: "receipt",
    trigger: null,
    content: {
      title: null, subtitle: null, body: null, data: { notificationId: id }, badge: null, sound: null,
      categoryIdentifier: null, launchImageName: null, attachments: [], threadIdentifier: null
    }
  }
} satisfies Notification;

function fakeDriver(initial: NotificationResponse | null = null) {
  let handler: NotificationHandler | null = null;
  let receive: ((value: Notification) => void) | undefined;
  let open: ((value: NotificationResponse) => void) | undefined;
  const removeReceive = vi.fn();
  const removeOpen = vi.fn();
  const driver = {
    DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT" as const,
    setNotificationHandler: (value: NotificationHandler | null) => { handler = value; },
    addNotificationReceivedListener: (listener: (value: Notification) => void) => {
      receive = listener;
      return { remove: removeReceive };
    },
    addNotificationResponseReceivedListener: (listener: (value: NotificationResponse) => void) => {
      open = listener;
      return { remove: removeOpen };
    },
    getLastNotificationResponse: () => initial,
    clearLastNotificationResponse: vi.fn()
  };
  return {
    driver, removeReceive, removeOpen,
    present: () => handler?.handleNotification(notification),
    receive: (value: Notification) => receive?.(value),
    open: (value: NotificationResponse) => open?.(value)
  };
}

describe("REQ-F19-03/04/05 · Expo driver events", () => {
  it("shows an app notice in the foreground and leaves presentation to the system in the background", async () => {
    const native = fakeDriver();
    const received = vi.fn();
    const opened = vi.fn();
    let active = true;
    const stop = listenToPush({ received, opened }, native.driver, () => active);
    expect(await native.present()).toMatchObject({ shouldShowBanner: false, shouldPlaySound: false, shouldSetBadge: false });
    native.receive(notification);
    expect(received).toHaveBeenCalledWith(id);
    active = false;
    expect(await native.present()).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldSetBadge: false });
    native.receive(notification);
    expect(received).toHaveBeenCalledTimes(1);
    native.open({ notification, actionIdentifier: native.driver.DEFAULT_ACTION_IDENTIFIER });
    expect(opened).toHaveBeenCalledWith(id);
    stop();
    expect(native.removeReceive).toHaveBeenCalledOnce();
    expect(native.removeOpen).toHaveBeenCalledOnce();
  });

  it("handles the cold-start response once and ignores arbitrary URLs and custom actions", () => {
    const response = { notification, actionIdentifier: "expo.modules.notifications.actions.DEFAULT" };
    const native = fakeDriver(response);
    const opened = vi.fn();
    const stop = listenToPush({ received: vi.fn(), opened }, native.driver);
    native.open(response);
    native.open({ notification, actionIdentifier: "APPROVE" });
    native.open({
      ...response, notification: { ...notification, request: {
        ...notification.request, identifier: "other", content: { ...notification.request.content, data: { url: "https://example.invalid" } }
      } }
    });
    expect(opened).toHaveBeenCalledExactlyOnceWith(id);
    expect(native.driver.clearLastNotificationResponse).toHaveBeenCalledTimes(2);
    stop();
  });

  it("uses the authenticated notice's template and read status for destination and badge", () => {
    const notice: HostNotification = {
      id, eventId: id, channel: "PUSH", template: "companionRequested", locale: "es-BO", status: "SENT",
      attempts: 1, availableAt: "2026-11-06T00:00:00Z", createdAt: "2026-11-06T00:00:00Z", subject: "Test", text: "Test", readAt: null
    };
    expect(pushDestination({ celebrationId, notification: notice })).toBe(`/bandeja/acompanantes?c=${celebrationId}`);
    expect(pushDestination({ celebrationId, notification: { ...notice, template: "testPush" } })).toBe(`/notificaciones?c=${celebrationId}`);
    expect(unreadPushCount([notice, { ...notice, readAt: notice.createdAt }])).toBe(1);
    expect(unreadPushCount([{ ...notice, readAt: notice.createdAt }])).toBe(0);
  });
});
