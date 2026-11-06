import { ApiError } from "@rsvp/api-client";

/**
 * What kind of failure this is, for the words and the way out. The shared host notice only knows 401/403/404/409/422;
 * the guest screens also meet rate limits (Kong, 30 requests a minute on /rsvp), a service that is down, and no network at all.
 */
export type Failure =
  | { readonly kind: "rateLimited"; readonly waitSeconds: number | null }
  | { readonly kind: "unavailable" }
  | { readonly kind: "offline" }
  | { readonly kind: "api" };

const MAX_WAIT_SECONDS = 3600;

export function classifyFailure(error: unknown): Failure {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      const wait = error.retryAfterSeconds;
      return { kind: "rateLimited", waitSeconds: wait !== undefined && Number.isFinite(wait) && wait > 0 ? Math.min(Math.ceil(wait), MAX_WAIT_SECONDS) : null };
    }
    return error.status >= 500 ? { kind: "unavailable" } : { kind: "api" };
  }
  // fetch rejects with a TypeError when the network is down, the host is unreachable or CORS blocks the answer.
  return error instanceof TypeError ? { kind: "offline" } : { kind: "api" };
}

