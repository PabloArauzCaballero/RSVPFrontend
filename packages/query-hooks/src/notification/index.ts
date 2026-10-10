import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";

export function useUpdateNotificationPreferences<TResponse, TInput>(client: ApiClient) { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: TInput) => client.request<TResponse, TInput>("/notifications/preferences", { method: "PATCH", body: input }), onSuccess: () => Promise.all(invalidation.notificationPreferencesChanged().map((queryKey) => queryClient.invalidateQueries({ queryKey }))) }); }
