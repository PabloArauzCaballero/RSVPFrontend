import { createApiClient, type ApiClient } from "@rsvp/api-client";

/**
 * Browser-side client for the personal RSVP page. The token travels only in the Authorization header
 * of the call (never in a URL, storage, analytics event or query key), so the page is rendered on the
 * client after a no-store request. `NEXT_PUBLIC_API_URL` points at the gateway (Kong).
 */
const DEFAULT_API_URL = "http://localhost:8000";
const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };

const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });

export function guestApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

export function createGuestClient(baseUrl: string = guestApiBase(), fetchFn: typeof fetch = noStoreFetch): ApiClient {
  return createApiClient({ baseUrl, tokenStore: anonymous, refreshSession: { refresh: async () => { throw new Error("Guests never refresh a session"); } }, fetchFn });
}
