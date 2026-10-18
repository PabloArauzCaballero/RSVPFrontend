import { ApiError, createApiClient, type ApiClient } from "@rsvp/api-client";

/**
 * Server-side client for public, unauthenticated reads through the gateway. Pages never call
 * fetch themselves: they use the loaders in lib/celebration.ts and lib/providers.ts.
 */

const DEFAULT_API_URL = "http://localhost:8000";
export const REVALIDATE_SECONDS = 60;
const NOT_FOUND = 404;

const anonymous = {
  getAccessToken: async () => null,
  getRefreshToken: async () => null,
  setTokens: async () => undefined,
  clear: async () => undefined
};

export function apiBaseUrl(): string {
  return process.env.RSVP_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

/** Next.js data cache: each response is reused for REVALIDATE_SECONDS (ISR for the data, per URL and language). */
const cachedFetch: typeof fetch = (input, init) => fetch(input, { ...init, credentials: "omit", next: { revalidate: REVALIDATE_SECONDS } } as RequestInit);

export function publicClient(fetchFn: typeof fetch = cachedFetch): ApiClient {
  return createApiClient({ baseUrl: apiBaseUrl(), tokenStore: anonymous, refreshSession: { refresh: async () => { throw new Error("Public client never refreshes"); } }, fetchFn });
}

/** 404 becomes `null`; any other failure propagates to the error boundary. */
export async function orNull<TValue>(request: Promise<TValue>): Promise<TValue | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND) return null;
    throw error;
  }
}
