import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { hostNotificationsApi } from "../guest/api.js";
import type { DeviceRegistration, HostNotification, NotificationPreferences, NotificationPreferencesPatch } from "../guest/types.js";

/** GET /notifications/celebrations/{id}/notifications: the host's in-app notices and delivery records. */
export const HOST_INBOX_LIMIT = 50;

export function useHostNotifications(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.notification.inbox(celebrationId), queryFn: () => hostNotificationsApi(client).inbox(celebrationId, HOST_INBOX_LIMIT), enabled: Boolean(celebrationId), refetchInterval: 30_000, ...cachePolicy.notification });
}

export function useHostNotificationPreferences(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.notification.preferences(celebrationId), queryFn: () => hostNotificationsApi(client).preferences(celebrationId), enabled: Boolean(celebrationId), ...cachePolicy.notification });
}

/**
 * Optimistic channel toggle: the cache flips immediately; a failure restores the previous value and
 * the error is thrown to the caller so the screen can say it was not saved (REQ-F18-04/05).
 */
export function useUpdateHostNotificationPreferences(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.notification.preferences(celebrationId);
  return useMutation({
    scope: { id: `host-notification-preferences:${celebrationId}` },
    networkMode: "always",
    mutationFn: async (body: NotificationPreferencesPatch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      if (previous && (body.channels || body.eventTypes)) {
        queryClient.setQueryData<NotificationPreferences>(key, {
          ...previous,
          channels: { ...previous.channels, ...body.channels },
          eventTypes: { ...previous.eventTypes, ...body.eventTypes }
        });
      }
      try {
        const saved = await hostNotificationsApi(client).updatePreferences(celebrationId, body);
        queryClient.setQueryData(key, saved);
        return saved;
      } catch (error) {
        if (previous && (body.channels || body.eventTypes)) queryClient.setQueryData(key, previous);
        throw error;
      }
    }
  });
}

/**
 * POST .../notifications/{id}/read keeps the first read time. Preserve server-confirmed reads if a batch stops partway.
 */
export function useMarkHostNotificationsRead(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.notification.inbox(celebrationId);
  return useMutation({
    scope: { id: `host-inbox:${celebrationId}` },
    networkMode: "always",
    mutationFn: async (ids: readonly string[]) => {
      await queryClient.cancelQueries({ queryKey: key });
      const selected = new Set(ids);
      const confirmed = new Map<string, string>();
      const at = new Date().toISOString();
      const setReadState = (update: (item: HostNotification) => HostNotification) =>
        queryClient.setQueryData<{ items: HostNotification[] }>(key, (current) =>
          current && { ...current, items: current.items.map(update) });
      const optimistic = new Set<string>();
      setReadState((item) => {
        if (!selected.has(item.id) || item.readAt !== null) return item;
        optimistic.add(item.id);
        return { ...item, readAt: at };
      });
      const api = hostNotificationsApi(client);
      try {
        for (const id of selected) {
          const saved = await api.markRead(celebrationId, id);
          confirmed.set(id, saved.readAt);
        }
      } finally {
        setReadState((item) => {
          const readAt = confirmed.get(item.id);
          if (readAt !== undefined) return { ...item, readAt };
          return optimistic.has(item.id) && item.readAt === at ? { ...item, readAt: null } : item;
        });
      }
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: key }); }
  });
}

/**
 * PUT /notifications/celebrations/{id}/recipients: ONE call after guests are registered or imported (or after a public sign-up),
 * so Notification knows every recipient and releases events held waiting for context. Idempotent.
 */
export function useSyncHostRecipients(client: ApiClient, celebrationId: string) {
  return useMutation({ mutationFn: () => hostNotificationsApi(client).syncRecipients(celebrationId) });
}

export function useHostDevices(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.notification.devices(celebrationId), queryFn: () => hostNotificationsApi(client).devices(celebrationId), enabled: Boolean(celebrationId), ...cachePolicy.notification });
}
export function useRegisterHostDevice(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (body: DeviceRegistration) => hostNotificationsApi(client).registerDevice(celebrationId, body), onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notification.devices(celebrationId) }) });
}
export function useUnregisterHostDevice(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (deviceId: string) => hostNotificationsApi(client).unregisterDevice(celebrationId, deviceId), onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notification.devices(celebrationId) }) });
}
export { usePushGiftReservation } from "./gift-reservation.js";
