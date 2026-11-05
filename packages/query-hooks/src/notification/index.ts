import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { hostNotificationsApi } from "../guest/api.js";
import type { DeviceRegistration, HostNotification, NotificationPreferences, NotificationPreferencesPatch } from "../guest/types.js";

/** GET /notifications/celebrations/{id}/notifications: delivery records addressed to the host; `readAt` is the server's read state (contract 1.4.0). */
export function useHostNotifications(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.notification.inbox(celebrationId), queryFn: () => hostNotificationsApi(client).inbox(celebrationId), enabled: Boolean(celebrationId), refetchInterval: 30_000, ...cachePolicy.notification });
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
    mutationFn: (body: NotificationPreferencesPatch) => hostNotificationsApi(client).updatePreferences(celebrationId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(key, {
          channels: { ...previous.channels, ...body.channels },
          eventTypes: { ...previous.eventTypes, ...body.eventTypes },
          // null restores the service-wide schedule; the server answer replaces this guess on success.
          quietHours: body.quietHours === undefined ? previous.quietHours : body.quietHours === null ? { ...previous.quietHours, source: "DEFAULT" } : { ...body.quietHours, source: "RECIPIENT" }
        });
      }
      return { previous };
    },
    onError: (_error, _body, context) => { if (context?.previous) queryClient.setQueryData(key, context.previous); },
    onSuccess: (saved) => { queryClient.setQueryData(key, saved); }
  });
}

/**
 * POST .../notifications/{id}/read (idempotent; the server keeps the first read time). The inbox flips to read at once
 * and is restored if the call fails, so the unread count is the server's, shared by every device.
 */
export function useMarkHostNotificationsRead(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.notification.inbox(celebrationId);
  return useMutation({
    mutationFn: async (ids: readonly string[]) => { for (const id of ids) await hostNotificationsApi(client).markRead(celebrationId, id); },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ items: HostNotification[] }>(key);
      const at = new Date().toISOString();
      if (previous) queryClient.setQueryData(key, { ...previous, items: previous.items.map((item) => (ids.includes(item.id) && !item.readAt ? { ...item, readAt: at } : item)) });
      return { previous };
    },
    onError: (_error, _ids, context) => { if (context?.previous) queryClient.setQueryData(key, context.previous); },
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
