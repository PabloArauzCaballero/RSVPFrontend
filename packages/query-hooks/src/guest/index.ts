import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { guestApi } from "../domains.js";

const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useRsvp<T>(client: ApiClient, token: string) {
  return useQuery({ queryKey: queryKeys.guest.rsvp(token), queryFn: () => guestApi(client).get("/rsvp/{token}", { path: { token }, auth: false }) as Promise<T>, ...cachePolicy.guest, enabled: Boolean(token) });
}
export function useRespondToRsvp<TResponse, TInput>(client: ApiClient, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => guestApi(client).patch("/rsvp/{token}", { path: { token }, body: input as never, auth: false }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.rsvpChanged(token))
  });
}
export function useRegisterGuest<TResponse, TInput>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => guestApi(client).post("/celebrations/{celebrationId}/guests", { path: { celebrationId }, body: input as never }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.guestsChanged(celebrationId))
  });
}
