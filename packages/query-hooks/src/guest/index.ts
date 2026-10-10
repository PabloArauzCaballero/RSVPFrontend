import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";

export function useRsvp<T>(client: ApiClient, token: string) { return useQuery({ queryKey: queryKeys.guest.rsvp(token), queryFn: () => client.request<T>(`/guests/rsvp/${token}`, { auth: false }), ...cachePolicy.guest, enabled: Boolean(token) }); }
export function useRespondToRsvp<TResponse, TInput>(client: ApiClient, token: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => client.request<TResponse, TInput>(`/guests/rsvp/${token}`, { method: "PATCH", body: input, auth: false }), onSuccess: () => Promise.all(invalidation.rsvpChanged(token).map((queryKey) => queryClient.invalidateQueries({ queryKey }))) });
}
