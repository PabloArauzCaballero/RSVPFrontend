import type { ApiClient } from "@rsvp/api-client";
import { providerService, type Provider } from "@rsvp/query-hooks";

/** Public read of a provider by id (GET /providers/{id}); used to check a code before remembering it. */
export const createApiClientForPublicRead = (client: ApiClient) => ({ get: (providerId: string): Promise<Provider> => providerService(client).get(providerId) });
