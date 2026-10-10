import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";

export function useCelebration<T>(client: ApiClient, id: string) {
  return useQuery({ queryKey: queryKeys.celebration.detail(id), queryFn: () => client.request<T>(`/celebrations/${id}`), ...cachePolicy.celebration, enabled: Boolean(id) });
}
export function usePublicCelebration<T>(client: ApiClient, slug: string) {
  return useQuery({ queryKey: queryKeys.celebration.public(slug), queryFn: () => client.request<T>(`/celebrations/public/${slug}`, { auth: false }), ...cachePolicy.celebration, enabled: Boolean(slug) });
}
export function useCreateCelebration<TResponse, TInput>(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => client.request<TResponse, TInput>("/celebrations", { method: "POST", body: input }), onSuccess: () => Promise.all(invalidation.celebrationCreated().map((queryKey) => queryClient.invalidateQueries({ queryKey }))) });
}
