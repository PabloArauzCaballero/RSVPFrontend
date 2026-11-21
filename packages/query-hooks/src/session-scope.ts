import { hashKey, QueryClient, type DefaultOptions, type QueryKey } from "@tanstack/react-query";

/** The scope of an anonymous visitor (no session yet, or signed out). */
export const ANONYMOUS_SCOPE = "anonymous";

/** The cache key as React Query stores it: the domain key under the id of the person it belongs to. */
export const userScopedHash = (userId: string | null, queryKey: QueryKey): string => hashKey([{ user: userId ?? ANONYMOUS_SCOPE }, ...queryKey]);

/**
 * B12 / FRONTEND-COMPARTIDO-PII-001: the query cache belongs to one person.
 * - Every entry is hashed under the user id that is signed in when it is created, so two accounts on the same device never share
 *   an entry (celebrations, guests, dietary notes…) even when a screen asks with the same domain key. The domain keys in `keys.ts`
 *   stay as they are, so partial invalidation (`invalidateQueries({ queryKey })`) keeps working.
 * - `switchUser` (sign-out, another account, session lost) cancels what is in flight and empties every query and mutation.
 * One QueryClient lives for the whole app, so mounted observers never point at a discarded client.
 */
export interface SessionQueryCache {
  readonly client: QueryClient;
  readonly userId: string | null;
  /** No-op when the user did not change; otherwise empties the cache before anything is read for the next person. */
  switchUser(userId: string | null): void;
}

export function createSessionQueryCache(options: { readonly defaults?: DefaultOptions; readonly client?: QueryClient; readonly userId?: string | null } = {}): SessionQueryCache {
  let current = options.userId ?? null;
  const client = options.client ?? new QueryClient({ defaultOptions: options.defaults ?? {} });
  const base = client.getDefaultOptions();
  client.setDefaultOptions({ ...base, queries: { ...base.queries, queryKeyHashFn: (queryKey) => userScopedHash(current, queryKey) } });
  return {
    client,
    get userId() { return current; },
    switchUser(next) {
      if (next === current) return;
      current = next;
      void client.cancelQueries();
      // A screen still mounted across the switch must stop showing the previous person's data before the entries are dropped.
      for (const query of client.getQueryCache().getAll()) query.reset();
      client.clear();
    }
  };
}
