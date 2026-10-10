import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";

export function useProviders<T>(client: ApiClient, query: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)).toString();
  return useQuery({ queryKey: queryKeys.provider.search(search), queryFn: () => client.request<T>(`/providers/?${search}`, { auth: false }), ...cachePolicy.provider });
}
export function useCreateListing<TResponse, TInput>(client: ApiClient, providerId: string) { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: TInput) => client.request<TResponse, TInput>(`/providers/${providerId}/listings`, { method: "POST", body: input }), onSuccess: () => Promise.all(invalidation.providerChanged().map((queryKey) => queryClient.invalidateQueries({ queryKey }))) }); }
