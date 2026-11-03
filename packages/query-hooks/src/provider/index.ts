import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { providerApi } from "../domains.js";

const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useProviders<T>(client: ApiClient, query: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)).toString();
  return useQuery({ queryKey: queryKeys.provider.search(search), queryFn: () => providerApi(client).get("/", { query: query as never, auth: false }) as Promise<T>, ...cachePolicy.provider });
}
export function useProviderCalendar<T>(client: ApiClient, providerId: string) {
  return useQuery({ queryKey: queryKeys.provider.calendar(providerId), queryFn: () => providerApi(client).get("/{providerId}/calendar", { path: { providerId }, auth: false }) as Promise<T>, ...cachePolicy.provider, enabled: Boolean(providerId) });
}
export function useRegisterProvider<TResponse, TInput>(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/", { body: input as never }) as Promise<TResponse>, onSuccess: () => refetchAll(queryClient, invalidation.providerChanged()) });
}
export function useVerifyProvider<TResponse>(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (providerId: string) => providerApi(client).post("/{providerId}/verify", { path: { providerId } }) as Promise<TResponse>, onSuccess: () => refetchAll(queryClient, invalidation.providerChanged()) });
}
export function useCreateListing<TResponse, TInput>(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/{providerId}/listings", { path: { providerId }, body: input as never }) as Promise<TResponse>, onSuccess: () => refetchAll(queryClient, invalidation.providerChanged()) });
}
export function useRequestQuote<TResponse, TInput>(client: ApiClient, providerId: string) {
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/{providerId}/quotes", { path: { providerId }, body: input as never }) as Promise<TResponse> });
}
export function useRequestBooking<TResponse, TInput>(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/{providerId}/bookings", { path: { providerId }, body: input as never }) as Promise<TResponse>, onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.provider.calendar(providerId) }) });
}
