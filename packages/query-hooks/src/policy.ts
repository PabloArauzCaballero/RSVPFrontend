/** Deliberate cache policy: mutable host resources stay short; public catalog may stay warm. */
export const cachePolicy = {
  celebration: { staleTime: 30_000, gcTime: 5 * 60_000 },
  guest: { staleTime: 15_000, gcTime: 5 * 60_000 },
  gift: { staleTime: 10_000, gcTime: 5 * 60_000 },
  provider: { staleTime: 5 * 60_000, gcTime: 30 * 60_000 },
  notification: { staleTime: 10_000, gcTime: 5 * 60_000 }
} as const;
