/**
 * How long this client has seen each photo in PROCESSING.
 *
 * The API gives no time for the move to PROCESSING: `createdAt` is when the upload was signed (server clock), so it counts the
 * whole upload and comparing it with the device clock also counts the device's drift. The age here is local: monotonic time
 * between the first and the latest server answer that said PROCESSING. Cached data and failed polls do not make it grow.
 *
 * It is saved as a duration, never as a date, so a reload resumes the count and a photo that really is stuck cannot be reset
 * forever. Time with the page closed does not count. Without storage (native), the count lasts as long as the app does.
 */
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
      let restored: Record<string, unknown> | undefined;
      const next = new Map<string, { readonly startedAt: number; readonly ageMs: number }>();
      const ages: Record<string, number> = {};
      for (const id of processingIds) {
        let startedAt = previous?.get(id)?.startedAt;
        if (startedAt === undefined) {
          restored ??= saved(celebrationId);
          const age = restored[id];
          startedAt = at - (typeof age === "number" && Number.isFinite(age) && age > 0 ? age : 0);
        }
        const ageMs = at - startedAt;
        next.set(id, { startedAt, ageMs });
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
