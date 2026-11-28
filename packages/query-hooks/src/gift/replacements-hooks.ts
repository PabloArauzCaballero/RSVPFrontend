"use client";
import { useQuery } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { retryTransient } from "../policy.js";
import { replacementsKey, replacementsPath, type GiftReplacements, type ReplacementsQuery } from "./replacements.js";

// A client module on purpose, like assistant-hooks.ts: seo-web's server components import this barrel.

/**
 * The replacements of an unavailable gift (MANAGE only). Read live on every open: they depend on the stock of the providers, so nothing is kept for
 * long (`staleTime` 0) and the key is a child of the gift list, which a swap invalidates. A 403 or 404 is not retried; a network error or a 5xx is, once.
 */
export function useGiftReplacements(client: ApiClient, celebrationId: string, giftItemId: string, query: ReplacementsQuery, enabled = true) {
  return useQuery({
    queryKey: replacementsKey(celebrationId, giftItemId, query),
    queryFn: ({ signal }) => client.request<GiftReplacements>(replacementsPath(celebrationId, giftItemId, query), { signal }),
    staleTime: 0, gcTime: 60_000, retry: retryTransient, enabled: enabled && Boolean(celebrationId) && Boolean(giftItemId)
  });
}
