import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { invalidation } from "../invalidation.js";
import { notificationApi } from "../domains.js";

export function useRegisterDeviceToken<TResponse, TInput>(client: ApiClient) {
  return useMutation({ mutationFn: (input: TInput) => notificationApi(client).post("/devices", { body: input as never }) as Promise<TResponse> });
}
export function useRemoveDeviceToken(client: ApiClient) {
  return useMutation({ mutationFn: (input?: unknown) => notificationApi(client).delete("/devices", { body: input as never }) });
}
export function useUpdateNotificationPreferences<TResponse, TInput>(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => notificationApi(client).patch("/preferences", { body: input as never }) as Promise<TResponse>,
    onSuccess: () => Promise.all(invalidation.notificationPreferencesChanged().map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}
