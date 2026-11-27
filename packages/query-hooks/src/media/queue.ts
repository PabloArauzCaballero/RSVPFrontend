import type { MediaAsset, MediaPurpose, MediaQuota } from "../celebration/types.js";
import { UploadError } from "./upload.js";

/**
 * Upload queue for the files of F6: several files at once, per-file progress, per-file errors that say what to do, and retry.
 * It knows nothing about React or the network: it gets the function that uploads one file and reports to whoever subscribes
 * (`useSyncExternalStore` compatible), so the same queue serves the host's gallery and the editor.
 */
export type QueueStatus = "queued" | "uploading" | "processing" | "done" | "error";

/** Why a file failed, in terms the person can act on. `retryable` says whether pressing "retry" can help as is. */
export type UploadFailure =
  | "type" | "tooLarge" | "quotaAssets" | "quotaBytes" | "rights" | "invalid" | "tooLong" | "rejected" | "forbidden" | "network" | "server";

export interface QueueItem {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly purpose: MediaPurpose;
  readonly status: QueueStatus;
  /** 0 to 1 while uploading. */
  readonly progress: number;
  readonly failure?: UploadFailure;
  readonly retryable?: boolean;
  readonly asset?: MediaAsset;
}

export interface QueueFile { readonly file: Blob; readonly name: string; readonly type: string; readonly size: number }

export interface QueueOptions {
  readonly purpose: MediaPurpose;
  readonly rightsNoticeVersion?: string | null;
}

export type UploadOne = (input: { readonly file: Blob; readonly filename: string; /** What the picker said: a browser can leave the Blob's own type empty (HEIC), so the declared one travels apart. */ readonly contentType: string; readonly size: number; readonly purpose: MediaPurpose; readonly rightsNoticeVersion?: string | null; readonly onProgress: (fraction: number) => void }) => Promise<MediaAsset>;

export interface QueueSnapshot { readonly items: readonly QueueItem[]; readonly active: number }

interface Problem { readonly status?: number; readonly problem?: { readonly code?: string } }

const CODES: Readonly<Record<string, readonly [UploadFailure, boolean]>> = {
  UNSUPPORTED_MEDIA_TYPE: ["type", false], PURPOSE_TYPE_MISMATCH: ["type", false], MEDIA_TOO_LARGE: ["tooLarge", false],
  MEDIA_QUOTA_ASSETS_EXCEEDED: ["quotaAssets", false], MEDIA_QUOTA_BYTES_EXCEEDED: ["quotaBytes", false],
  RIGHTS_NOTICE_REQUIRED: ["rights", false], RIGHTS_NOTICE_OUTDATED: ["rights", false],
  INVALID_IMAGE: ["invalid", false], INVALID_SVG: ["invalid", false], INVALID_AUDIO: ["invalid", false], MEDIA_TYPE_MISMATCH: ["invalid", false],
  IMAGE_TOO_LARGE: ["tooLarge", false], SVG_TOO_LARGE: ["tooLarge", false], SVG_TOO_COMPLEX: ["invalid", false], ANIMATION_TOO_LONG: ["tooLong", false], AUDIO_TOO_LONG: ["tooLong", false]
};

/** Maps what the server or the network said to a failure kind. A 5xx or a dropped connection can be retried as is; a 4xx cannot until the person changes something. */
export function classifyFailure(error: unknown): { readonly failure: UploadFailure; readonly retryable: boolean } {
  if (error instanceof UploadError) return error.status === 0 ? { failure: "network", retryable: true } : { failure: error.status === 403 ? "forbidden" : "server", retryable: error.status >= 500 || error.status === 403 };
  const problem = error as Problem;
  const known = problem.problem?.code ? CODES[problem.problem.code] : undefined;
  if (known) return { failure: known[0], retryable: known[1] };
  if (problem.status === 403) return { failure: "forbidden", retryable: false };
  if (problem.status === 429 || (problem.status !== undefined && problem.status >= 500)) return { failure: "server", retryable: true };
  return { failure: problem.status === undefined ? "network" : "server", retryable: true };
}

export interface UploadQueue {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => QueueSnapshot;
  readonly add: (files: readonly QueueFile[], options: QueueOptions) => readonly string[];
  readonly retry: (id: string) => void;
  readonly remove: (id: string) => void;
  /**
   * Settles the files the server was still processing when their upload ended, from the list the host re-reads while the worker runs:
   * PROCESSED closes the row as done, REJECTED turns it into a `rejected` error (the file itself is the problem, so it is not retryable
   * as is) and DELETED removes the row. Rows that are not `processing`, or whose asset is not in the list yet, are left alone.
   */
  readonly reconcile: (assets: readonly MediaAsset[]) => void;
  /** Removes the finished ones (done and errors the person dismissed with "clear"). */
  readonly clearFinished: () => void;
}

/** Cheap checks done before a byte is uploaded, with the same limits the server enforces. */
export function precheck(file: Pick<QueueFile, "type" | "size">, purpose: MediaPurpose, quota: MediaQuota | undefined, pendingBytes: number, pendingCount: number, limits: { readonly image: number; readonly audio: number }): UploadFailure | null {
  const audio = file.type === "audio/mpeg";
  if ((audio) !== (purpose === "music")) return "type";
  if (!ACCEPTED.has(file.type)) return "type";
  if (file.size <= 0 || file.size > (audio ? limits.audio : limits.image)) return "tooLarge";
  if (quota) {
    if (quota.assets + pendingCount + 1 > quota.maxAssets) return "quotaAssets";
    if (quota.bytes + pendingBytes + file.size > quota.maxBytes) return "quotaBytes";
  }
  return null;
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml", "image/heic", "image/heif"] as const;
export const ACCEPTED_AUDIO_TYPES = ["audio/mpeg"] as const;
const ACCEPTED: ReadonlySet<string> = new Set([...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_AUDIO_TYPES]);
export const DEFAULT_LIMITS = { image: 10 * 1024 * 1024, audio: 15 * 1024 * 1024 } as const;

export function createUploadQueue(upload: UploadOne, config: { readonly concurrency?: number; readonly quota?: () => MediaQuota | undefined; readonly limits?: { readonly image: number; readonly audio: number } } = {}): UploadQueue {
  const concurrency = config.concurrency ?? 2;
  const limits = config.limits ?? DEFAULT_LIMITS;
  let items: QueueItem[] = [];
  const sources = new Map<string, { readonly file: QueueFile; readonly options: QueueOptions }>();
  const listeners = new Set<() => void>();
  let sequence = 0;
  let snapshot: QueueSnapshot = { items, active: 0 };

  const publish = (): void => {
    snapshot = { items, active: items.filter((item) => item.status === "uploading").length };
    listeners.forEach((listener) => listener());
  };
  const patch = (id: string, change: Partial<QueueItem>): void => {
    items = items.map((item) => (item.id === id ? { ...item, ...change } : item));
    publish();
  };
  const pump = (): void => {
    const waiting = items.filter((item) => item.status === "queued");
    let running = items.filter((item) => item.status === "uploading").length;
    for (const item of waiting) {
      if (running >= concurrency) break;
      running += 1;
      void run(item.id);
    }
  };
  const run = async (id: string): Promise<void> => {
    const source = sources.get(id);
    if (!source) return;
    patch(id, { status: "uploading", progress: 0, failure: undefined, retryable: undefined });
    try {
      const asset = await upload({
        file: source.file.file, filename: source.file.name, contentType: source.file.type, size: source.file.size, purpose: source.options.purpose, rightsNoticeVersion: source.options.rightsNoticeVersion ?? null,
        onProgress: (fraction) => patch(id, { progress: Math.max(0, Math.min(1, fraction)) })
      });
      patch(id, { status: asset.status === "PROCESSED" ? "done" : "processing", progress: 1, asset });
    } catch (error) {
      patch(id, { status: "error", ...classifyFailure(error) });
    }
    pump();
  };

  return {
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    add: (files, options) => {
      const quota = config.quota?.();
      let pendingBytes = 0;
      let pendingCount = 0;
      const created = files.map((file): QueueItem => {
        sequence += 1;
        const id = `upload-${sequence}`;
        sources.set(id, { file, options });
        const blocked = precheck(file, options.purpose, quota, pendingBytes, pendingCount, limits);
        if (!blocked) { pendingBytes += file.size; pendingCount += 1; }
        return { id, name: file.name, size: file.size, type: file.type, purpose: options.purpose, status: blocked ? "error" : "queued", progress: 0, ...(blocked ? { failure: blocked, retryable: false } : {}) };
      });
      items = [...items, ...created];
      publish();
      pump();
      return created.map((item) => item.id);
    },
    retry: (id) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item || item.status !== "error") return;
      patch(id, { status: "queued", progress: 0, failure: undefined, retryable: undefined });
      pump();
    },
    reconcile: (assets) => {
      const byId = new Map(assets.map((asset) => [asset.id, asset]));
      let changed = false;
      const next: QueueItem[] = [];
      for (const item of items) {
        const known = item.status === "processing" && item.asset ? byId.get(item.asset.id) : undefined;
        if (!known || known.status === "PROCESSING" || known.status === "PENDING_UPLOAD") { next.push(item); continue; }
        changed = true;
        if (known.status === "DELETED") { sources.delete(item.id); continue; }
        next.push(known.status === "PROCESSED" ? { ...item, status: "done", progress: 1, asset: known } : { ...item, status: "error", failure: "rejected", retryable: false, asset: known });
      }
      if (!changed) return;
      items = next;
      publish();
    },
    remove: (id) => { sources.delete(id); items = items.filter((item) => item.id !== id); publish(); },
    clearFinished: () => {
      const finished = items.filter((item) => item.status === "done" || item.status === "error");
      finished.forEach((item) => sources.delete(item.id));
      items = items.filter((item) => item.status !== "done" && item.status !== "error");
      publish();
    }
  };
}
