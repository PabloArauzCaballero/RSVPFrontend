import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";

export function useGiftItems<T>(client: ApiClient, celebrationId: string) { return useQuery({ queryKey: queryKeys.gift.list(celebrationId), queryFn: () => client.request<T>(`/gifts/celebrations/${celebrationId}/items`, { auth: false }), ...cachePolicy.gift, enabled: Boolean(celebrationId) }); }
export function useReserveGift<TResponse, TInput>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ giftItemId, input }: { giftItemId: string; input: TInput }) => client.request<TResponse, TInput>(`/gifts/items/${giftItemId}/reservations`, { method: "POST", body: input, auth: false }), onSuccess: () => Promise.all(invalidation.giftReservationChanged(celebrationId).map((queryKey) => queryClient.invalidateQueries({ queryKey }))) });
}
