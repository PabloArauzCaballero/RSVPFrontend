import { queryKeys } from "./keys.js";

/** Mutation-to-query mapping. Keeping it centralized prevents screen-specific cache guesses. */
export const invalidation = {
  celebrationCreated: () => [queryKeys.celebration.all] as const,
  celebrationChanged: (id: string) => [queryKeys.celebration.detail(id), queryKeys.celebration.all] as const,
  rsvpChanged: (token: string) => [queryKeys.guest.rsvp(token)] as const,
  giftReservationChanged: (celebrationId: string) => [queryKeys.gift.list(celebrationId)] as const,
  providerChanged: () => [queryKeys.provider.all] as const,
  notificationPreferencesChanged: () => [queryKeys.notification.all] as const
};
