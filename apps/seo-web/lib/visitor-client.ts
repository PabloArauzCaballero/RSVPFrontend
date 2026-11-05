import { createApiClient, UnauthorizedError, type ApiClient } from "@rsvp/api-client";

/**
 * Provider Catalog needs a signed-in account for quotes and date requests (401 otherwise). seo-web has no login of its own:
 * the access token of a session started in the app is read from sessionStorage (this tab) and sent as Bearer only on those calls.
 */
export const VISITOR_TOKEN_KEY = "rsvp.visitor.token";
/** A 401 is final here: the visitor session is not refreshed, so the caller sees the 401 and offers sign-in. */
const noRefresh = { refresh: async (_token: string, correlationId: string): Promise<never> => { throw new UnauthorizedError(correlationId); } };

export function readVisitorToken(): string | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage.getItem(VISITOR_TOKEN_KEY); } catch { return null; }
}

export function createVisitorClient(baseUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"): ApiClient {
  return createApiClient({
    baseUrl, refreshSession: noRefresh, fetchFn: (input, init) => fetch(input, { ...init, cache: "no-store", credentials: "omit" }),
    tokenStore: { getAccessToken: async () => readVisitorToken(), getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined }
  });
}
