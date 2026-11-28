"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { invalidation } from "../invalidation.js";

// A client module on purpose, like assistant-hooks.ts and replacements-hooks.ts: seo-web's server components import this barrel.

/**
 * Gift List 1.13.0 (R8a) · `putGiftListClosure`: the host or the organizer (MANAGE) closes or reopens the gift list by hand.
 * PUT semantics: the body states the wanted state, so repeating a request changes nothing (PF-4) and no Idempotency-Key is needed.
 * While the list is closed a guest cannot reserve (409 LIST_CLOSED, since 1.15.0); the reservations that already exist are not touched.
 * Answers: 200 the list, 401, 403 HOST_REQUIRED (not MANAGE), 404 (a celebration the caller cannot see, or GIFT_LIST_NOT_FOUND), 422, 503.
 */
export const giftListClosurePath = (celebrationId: string): string => `/gifts/celebrations/${encodeURIComponent(celebrationId)}/gift-list/closure`;

export interface GiftListClosure { readonly closed: boolean; readonly closedAt?: string | null }

export function useGiftListClosure(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (closed: boolean) => client.request<GiftListClosure, { readonly closed: boolean }>(giftListClosurePath(celebrationId), { method: "PUT", body: { closed } }),
    // Success or failure, the list is read again: it is the one place that says whether it is closed (`closed` of listGiftItems).
    onSettled: () => Promise.all(invalidation.giftReservationChanged(celebrationId).map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}
