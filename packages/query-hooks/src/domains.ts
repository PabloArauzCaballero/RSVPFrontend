import { createContractClient, type ApiClient } from "@rsvp/api-client";
import type { GiftListPaths, GuestRsvpPaths, NotificationPaths, ProviderCatalogPaths } from "@rsvp/contracts";

/**
 * Typed callers for the services behind the gateway. Paths come from the generated contract
 * (REQ-F04-01): a renamed or removed route fails compilation. Their specs declare no body or
 * response schemas yet, so payloads are typed by the caller until the backend publishes them.
 */
export const guestApi = (client: ApiClient) => createContractClient<GuestRsvpPaths>(client, "/guests");
export const giftApi = (client: ApiClient) => createContractClient<GiftListPaths>(client, "/gifts");
export const providerApi = (client: ApiClient) => createContractClient<ProviderCatalogPaths>(client, "/providers");
export const notificationApi = (client: ApiClient) => createContractClient<NotificationPaths>(client, "/notifications");
