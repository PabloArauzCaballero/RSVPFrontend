/**
 * How long this client has seen each photo in PROCESSING.
 *
 * The API gives no time for the move to PROCESSING: `createdAt` is when the upload was signed (server clock), so it counts the
 * whole upload and comparing it with the device clock also counts the device's drift. The age here is local: monotonic time
 * between the first and the latest server answer that said PROCESSING. Cached data and failed polls do not make it grow.
 *
 * Which time counts: while the same app instance lives, everything between those two answers, even if nothing was polled in
 * between (screen closed, tab in the background). It is saved as a duration, never as a date, so a reload resumes from the
 * last saved age; the time between that last answer and the first one after the reload does not count. Without storage
 * (native), the count lasts as long as the app does.
 *
 * So short visits add little (a visit with a single answer adds nothing). `isProcessingStuck` therefore also gives up on a
 * photo whose upload was signed a very long time ago.
 *
 * Pending in the backend: expose `processingStartedAt` and the server's current time; both thresholds could then go.
 */
export const MEDIA_PROCESSING_STALE_MS = 3 * 60_000;
/** Compared with `createdAt` and the device clock, so it is high enough to absorb slow uploads and ordinary clock drift. */
export const MEDIA_PROCESSING_ABANDONED_MS = 24 * 60 * 60_000;

/** Stuck: watched in PROCESSING for too long, or (backup) signed more than a day ago. A missing or invalid date never counts. */
export function isProcessingStuck(observedAgeMs: number, createdAt: unknown, wallNow: number): boolean {
  if (observedAgeMs >= MEDIA_PROCESSING_STALE_MS) return true;
  const signedAt = typeof createdAt === "string" ? Date.parse(createdAt) : Number.NaN;
  return wallNow - signedAt >= MEDIA_PROCESSING_ABANDONED_MS;
}

export interface ProcessingAgeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProcessingAgeTracker {
  /** Call with each successful server answer: every photo of the celebration that is in PROCESSING now. */
  observe(celebrationId: string, processingIds: readonly string[]): void;
  /** Age as of the latest server answer; 0 for a photo not seen in PROCESSING. */
  ageMs(celebrationId: string, assetId: string): number;
}

const STORAGE_PREFIX = "rsvp.media-processing.";

export function createProcessingAgeTracker(now: () => number, storage: () => ProcessingAgeStorage | undefined): ProcessingAgeTracker {
  const celebrations = new Map<string, Map<string, { readonly startedAt: number; readonly ageMs: number }>>();

  // Storage may be missing, blocked or full: the tracker then works from memory only.
  const saved = (celebrationId: string): Record<string, unknown> => {
    try {
      const parsed: unknown = JSON.parse(storage()?.getItem(STORAGE_PREFIX + celebrationId) ?? "null");
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };
  const save = (celebrationId: string, ages: Record<string, number>): void => {
    try {
      if (Object.keys(ages).length) storage()?.setItem(STORAGE_PREFIX + celebrationId, JSON.stringify(ages));
      else storage()?.removeItem(STORAGE_PREFIX + celebrationId);
    } catch {
      // Memory keeps the count.
    }
  };

  return {
    observe(celebrationId, processingIds) {
      const at = now();
      const previous = celebrations.get(celebrationId);
      // Read on every answer: another tab may have saved a longer count, which must never go back.
      const stored = processingIds.length ? saved(celebrationId) : {};
      const next = new Map<string, { readonly startedAt: number; readonly ageMs: number }>();
      const ages: Record<string, number> = {};
      for (const id of processingIds) {
        const value = stored[id];
        const savedAge = typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
        const ageMs = Math.max(at - (previous?.get(id)?.startedAt ?? at), savedAge);
        next.set(id, { startedAt: at - ageMs, ageMs });
        ages[id] = Math.round(ageMs);
      }
      celebrations.set(celebrationId, next);
      save(celebrationId, ages);
    },
    ageMs: (celebrationId, assetId) => celebrations.get(celebrationId)?.get(assetId)?.ageMs ?? 0
  };
}

export const processingAge = createProcessingAgeTracker(
  () => performance.now(),
  () => (globalThis as { readonly localStorage?: ProcessingAgeStorage }).localStorage
);
