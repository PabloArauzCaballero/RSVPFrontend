import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { giftApi } from "../domains.js";

const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useGiftItems<T>(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.gift.list(celebrationId), queryFn: () => giftApi(client).get("/celebrations/{celebrationId}/items", { path: { celebrationId }, auth: false }) as Promise<T>, ...cachePolicy.gift, enabled: Boolean(celebrationId) });
}
export function useAddGiftItem<TResponse, TInput>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => giftApi(client).post("/celebrations/{celebrationId}/items", { path: { celebrationId }, body: input as never }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export function useReserveGift<TResponse, TInput>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ giftItemId, input }: { giftItemId: string; input: TInput }) => giftApi(client).post("/items/{giftItemId}/reservations", { path: { giftItemId }, body: input as never, auth: false }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export function useApproveReservation<TResponse>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => giftApi(client).post("/reservations/{reservationId}/approve", { path: { reservationId } }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
