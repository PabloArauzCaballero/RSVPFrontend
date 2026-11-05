import { createContractClient, type ApiClient } from "@rsvp/api-client";
import type { GiftListPaths, ProviderCatalogPaths } from "@rsvp/contracts";

/**
 * Typed callers for the services behind the gateway. Paths come from the generated contract
 * (REQ-F04-01): a renamed or removed route fails compilation. Their specs declare no body or
 * response schemas yet, so payloads are typed by the caller until the backend publishes them.
 */
export const giftApi = (client: ApiClient) => createContractClient<GiftListPaths>(client, "/gifts");
export const providerApi = (client: ApiClient) => createContractClient<ProviderCatalogPaths>(client);
