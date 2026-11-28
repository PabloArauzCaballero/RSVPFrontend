"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { invalidation } from "../invalidation.js";
import { newIdempotencyKey } from "../guest/rsvp-flow.js";
import { assistantApi, createBatchKeys, type BatchKeys, mayHaveBeenApplied, type GiftBatchRequest } from "./assistant.js";

// A client module on purpose: `useState` does not exist in the server build of React, and seo-web's server components import this barrel.
const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

/**
 * Adds the gifts of the assistant in ONE call (all or nothing). The key is stable for the same body: a retry after a lost answer or a 5xx replays it
 * and the server answers the stored result (201 Idempotency-Replayed), so nothing is added twice; another body gets a new key and a success forgets it.
 * The list is read again after every DEFINITIVE answer (2xx or 4xx: the server said what the list holds). It is NOT read after a missing answer or a 5xx:
 * the write may have been applied, and refreshing the list under the screen would make the selection look already added before the replay answers.
 */
export function useAddGiftBatch(client: ApiClient, celebrationId: string, keys?: BatchKeys) {
  const queryClient = useQueryClient();
  const [own] = useState(() => createBatchKeys(newIdempotencyKey));
  const keyFor = keys ?? own;
  return useMutation({
    mutationFn: (body: GiftBatchRequest) => assistantApi(client).addBatch(celebrationId, body, keyFor(body)),
    onSuccess: (_result, body) => { keyFor.reset(body); void refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId)); },
    onError: (error) => { if (!mayHaveBeenApplied(error)) void refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId)); }
  });
}
export function useSetDeliveryNotes(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryNotes: string | null) => assistantApi(client).putDeliveryNotes(celebrationId, deliveryNotes),
    onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
