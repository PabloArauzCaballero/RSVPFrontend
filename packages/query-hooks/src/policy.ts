import { ApiError } from "@rsvp/api-client";

/** Deliberate cache policy: mutable host resources stay short; public catalog may stay warm. */
export const cachePolicy = {
  celebration: { staleTime: 30_000, gcTime: 5 * 60_000 },
  guest: { staleTime: 15_000, gcTime: 5 * 60_000 },
  gift: { staleTime: 10_000, gcTime: 5 * 60_000 },
  provider: { staleTime: 5 * 60_000, gcTime: 30 * 60_000 },
  identity: { staleTime: 15_000, gcTime: 5 * 60_000 },
  notification: { staleTime: 10_000, gcTime: 5 * 60_000 }
} as const;

/** 4xx answers are final (bad token, closed window, unpublished slug…); only network, 429 and 5xx failures are worth another try. */
export const retryTransient = (count: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status < 500 && error.status !== 429) return false;
  return count < 1;
};
