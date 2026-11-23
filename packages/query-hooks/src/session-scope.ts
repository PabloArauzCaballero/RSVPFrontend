import { hashKey, QueryClient, skipToken, type DefaultOptions, type QueryKey, type QueryObserver } from "@tanstack/react-query";

/** The scope of an anonymous visitor (no session yet, or signed out). */
export const ANONYMOUS_SCOPE = "anonymous";

/** The cache key as React Query stores it: the domain key under the id of the person it belongs to. */
export const userScopedHash = (userId: string | null, queryKey: QueryKey): string => hashKey([{ user: userId ?? ANONYMOUS_SCOPE }, ...queryKey]);

/**
 * B12 / FRONTEND-COMPARTIDO-PII-001: the query cache belongs to one person.
 * - Every entry is hashed under the user id that is signed in when it is created, so two accounts on the same device never share
 *   an entry (celebrations, guests, dietary notes…) even when a screen asks with the same domain key. The domain keys in `keys.ts`
 *   stay as they are, so partial invalidation (`invalidateQueries({ queryKey })`) keeps working.
 * - `switchUser` (sign-in, sign-out, another account, session lost) cancels what is in flight, empties every query and mutation,
 *   and hands each mounted screen an empty entry of the next person so it renders again and asks with its own, current options.
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
      const queries = client.getQueryCache().getAll();
      const mounted = queries.flatMap((query) => query.observers);
      void client.cancelQueries();
      // The dropped entries lose their data too: an observer remembers the last entry that had data and offers it as placeholder
      // (`keepPreviousData`), so it must not be able to hand the previous person's data to the next one.
      for (const query of queries) query.reset();
      client.clear();
      for (const observer of mounted) detach(observer);
    }
  };
}

/**
 * A26: after `clear()` a mounted observer still points at the dropped entry, and a screen that only reads `isPending`/`data` of a
 * request that was in flight sees nothing change, so it is never rendered again and never asks again ("Abriendo tu invitación…"
 * forever on a public page while the web session is restored).
 * Refetching with the observer's options is not an option: they hold the `queryFn` closure rendered for the previous person.
 * So the observer is moved to an inert entry of the next person (`skipToken`: the old closure is dropped and nothing can run it) and
 * every listener is notified. Its component renders again and passes its own current options, with the `queryFn` built for the
 * new person; React Query then fetches them because the entry has no data. `queryHash`/`_defaulted` are dropped so the hash is
 * computed again under the new user; `placeholderData`/`initialData` are dropped so the inert entry starts with nothing.
 */
function detach(observer: QueryObserver<unknown, unknown, unknown, unknown, QueryKey>): void {
  const { queryHash: _hash, _defaulted: _defaults, placeholderData: _placeholder, initialData: _initial, ...options } = observer.options;
  observer.setOptions({ ...options, queryFn: skipToken, enabled: false, notifyOnChangeProps: "all" });
}
