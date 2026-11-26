"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { invalidation } from "../invalidation.js";
import { newIdempotencyKey } from "../guest/rsvp-flow.js";
import { assistantApi, createBatchKeys, type GiftBatchRequest, type GiftItemUpdateRequest } from "./assistant.js";

// A client module on purpose: `useState` does not exist in the server build of React, and seo-web's server components import this barrel.
const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

/**
 * Adds the gifts of the assistant in ONE call (all or nothing). The key is stable for the same selection: a retry after a lost answer or a 5xx replays it
 * and the server answers the stored result, so nothing is added twice; another selection gets a new key.
 */
export function useAddGiftBatch(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  const [keyFor] = useState(() => createBatchKeys(newIdempotencyKey));
  return useMutation({
    mutationFn: (body: GiftBatchRequest) => assistantApi(client).addBatch(celebrationId, body, keyFor(body)),
    onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
/** PATCH /items/{id}: quantity and coordinated-gift switch, with the version the host read (409 GIFT_VERSION_CONFLICT when stale). */
export function useUpdateGiftItem(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ giftItemId, body }: { readonly giftItemId: string; readonly body: GiftItemUpdateRequest }) => assistantApi(client).updateItem(celebrationId, giftItemId, body),
    onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export function useSetDeliveryNotes(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryNotes: string | null) => assistantApi(client).putDeliveryNotes(celebrationId, deliveryNotes),
    onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
