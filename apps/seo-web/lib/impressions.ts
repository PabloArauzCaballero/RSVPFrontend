import type { ApiClient } from "@rsvp/api-client";

const MAX_BATCH = 50;
const FLUSH_MS = 1200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Collects the listings that actually entered the viewport and reports them with POST /providers/impressions in batches
 * (1-50 distinct ids per call). A listing is reported once per page view; the body carries only listing ids and the surface:
 * no visitor identifier, no query, no location, no cookie.
 */
export function createImpressionBatcher(post: (body: { listingIds: string[]; surface: string }) => Promise<unknown>, surface: string, schedule: (fn: () => void, ms: number) => unknown = setTimeout) {
  const reported = new Set<string>();
  let queue: string[] = [];
  let timer: unknown = null;
  async function flush(): Promise<void> {
    timer = null;
    while (queue.length) {
      const listingIds = queue.slice(0, MAX_BATCH);
      queue = queue.slice(MAX_BATCH);
      try { await post({ listingIds, surface }); } catch { /* metrics are best effort: never surface an error to the visitor */ }
    }
  }
  return {
    seen(listingId: string): void {
      if (!UUID.test(listingId) || reported.has(listingId)) return;
      reported.add(listingId);
      queue.push(listingId);
      if (queue.length >= MAX_BATCH) void flush();
      else if (timer === null) timer = schedule(() => { void flush(); }, FLUSH_MS);
    },
    flush
  };
}

export const recordImpressions = (client: ApiClient, body: { listingIds: string[]; surface: string }): Promise<unknown> =>
  client.request("/providers/impressions", { method: "POST", auth: false, body });
