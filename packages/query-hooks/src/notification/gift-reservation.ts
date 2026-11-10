import { useQuery } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { giftApi } from "../gift/api.js";
import { queryKeys } from "../keys.js";

/** A detail opened from a notification always checks the server, including after a background decision. */
export function usePushGiftReservation(client: ApiClient, celebrationId: string, reservationId: string) {
  return useQuery({
    queryKey: [...queryKeys.gift.list(celebrationId), "reservations", "all"] as const,
    queryFn: () => giftApi(client).reservations(celebrationId),
    select: (list) => list.items.find((row) => row.id === reservationId && row.celebrationId === celebrationId) ?? null,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    enabled: Boolean(celebrationId && reservationId)
  });
}
