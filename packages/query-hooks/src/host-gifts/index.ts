import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { providerService } from "../provider/api.js";
import { giftApi } from "../gift/api.js";
import type { UpdateGiftSettingsInput } from "../gift/types.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";

/** F23 picker: locale and the bounded result window belong to its own cache key. */
export function useHostGiftCatalog(client: ApiClient, query: string, locale: string, enabled = true) {
  return useQuery({
    queryKey: ["host-gifts", "catalog", locale, query] as const,
    queryFn: () => providerService(client).searchListings(query, 50, locale),
    enabled,
    staleTime: 30_000,
    retry: false
  });
}

/** F23 acknowledges a preference only after an independent server read confirms it. */
export function useHostGiftVisibility(client: ApiClient, celebrationId: string) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateGiftSettingsInput) => {
      const api = giftApi(client);
      const written = await api.updateSettings(celebrationId, input);
      const saved = await api.settings(celebrationId);
      queries.setQueryData([...queryKeys.gift.list(celebrationId), "settings"], saved);
      if (saved.showRequesterToHost !== input.showRequesterToHost || saved.showRequesterToGuests !== input.showRequesterToGuests || saved.version < written.version) throw new Error("GIFT_VISIBILITY_NOT_APPLIED");
      return saved;
    },
    onSettled: () => Promise.all(invalidation.giftReservationChanged(celebrationId).map((queryKey) => queries.invalidateQueries({ queryKey }))),
    retry: false
  });
}
