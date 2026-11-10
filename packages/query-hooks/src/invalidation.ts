import { queryKeys } from "./keys.js";

/** Mutation-to-query mapping. Keeping it centralized prevents screen-specific cache guesses. */
export const invalidation = {
  celebrationCreated: () => [queryKeys.celebration.all] as const,
  celebrationChanged: (id: string) => [queryKeys.celebration.detail(id), queryKeys.celebration.all, queryKeys.celebration.publishCheck(id), queryKeys.celebration.audit(id)] as const,
  eventTypesChanged: () => [queryKeys.eventType.all] as const,
  templatesChanged: () => [queryKeys.template.all] as const,
  mediaChanged: (celebrationId: string) => [queryKeys.media.list(celebrationId)] as const,
  rsvpChanged: (celebrationId: string, fingerprint: string) => [queryKeys.guest.rsvp(celebrationId, fingerprint)] as const,
  /** Host-side read models derived from the guest list and RSVPs (list, summary, requests, exports). */
  guestsChanged: (celebrationId: string) => [queryKeys.guest.lists(celebrationId), queryKeys.guest.summary(celebrationId), queryKeys.guest.companionRequests(celebrationId), queryKeys.guest.rsvps(celebrationId)] as const,
  giftReservationChanged: (celebrationId: string) => [queryKeys.gift.list(celebrationId)] as const,
  organizationsChanged: () => [queryKeys.identity.organizations] as const,
  organizationChanged: (id: string) => [queryKeys.identity.organization(id), queryKeys.identity.organizations] as const,
  providerChanged: () => [queryKeys.provider.all] as const,
  notificationPreferencesChanged: (celebrationId: string) => [queryKeys.notification.preferences(celebrationId)] as const
};
