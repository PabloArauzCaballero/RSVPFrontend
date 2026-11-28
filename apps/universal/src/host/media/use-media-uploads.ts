import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createUploadQueue, DEFAULT_LIMITS, useMediaAssets, useUploadMedia, type MediaPurpose, type MediaQuota, type QueueItem } from "@rsvp/query-hooks";
import { MediaPermissionError, type MediaKind, type PickedMedia, type PickSource } from "../../platform/media-file";
import { pickMedia as defaultPick } from "../../platform/pick-media";
import { useApiClient } from "../../platform/providers";

/**
 * The state of the uploads of one celebration, shared by every screen that takes files: one queue (several files, progress and
 * error per file, retry), the quota, and what went wrong before a file reached the queue. `MediaUploadPanel` draws it; a screen
 * with its own header action calls `choose` from there.
 */
export const RIGHTS_NOTICE_VERSION = "2026-11-24";
/** How many files of one pick or drop become rows: a whole camera roll would draw hundreds of previews at once. */
export const MAX_FILES_PER_BATCH = 30;

export type MediaPicker = (kind: MediaKind, source?: PickSource) => Promise<readonly PickedMedia[]>;

/** Why nothing reached the queue. */
export type PickProblem =
  | { readonly kind: "permission"; readonly source: PickSource }
  /** The picker answered, but the file could not be read. */
  | { readonly kind: "unreadable" }
  /** Something that is not a file was dropped (a picture from another page). It is never downloaded. */
  | { readonly kind: "notAFile" }
  /** More files than one batch takes: the first ones went on, `left` stayed out. */
  | { readonly kind: "batch"; readonly max: number; readonly left: number };

export interface MediaUploadOptions {
  readonly celebrationId: string;
  readonly purpose: MediaPurpose;
  /** Injected in tests and by hosts with their own picker. */
  readonly pick?: MediaPicker;
  /** Called with the id of every file the server accepted. */
  readonly onUploaded?: (assetId: string) => void;
  /** Version of the rights notice the screen shows; defaults to the one this build knows. */
  readonly rightsNoticeVersion?: string;
}

export interface MediaUploads {
  readonly items: readonly QueueItem[];
  readonly quota: MediaQuota | undefined;
  readonly full: boolean;
  readonly music: boolean;
  readonly rightsAccepted: boolean;
  readonly needsRights: boolean;
  readonly problem: PickProblem | null;
  readonly toggleRights: () => void;
  /** Opens the library (or the file dialog) or the camera. */
  readonly choose: (source?: PickSource) => void;
  /** Files that arrived some other way (dropped on the page). */
  readonly addFiles: (files: readonly PickedMedia[]) => void;
  readonly reportNotAFile: () => void;
  readonly retry: (id: string) => void;
  readonly remove: (id: string) => void;
  /** Drops the row of a file the host deleted from somewhere else on the screen. */
  readonly forgetAsset: (assetId: string) => void;
  readonly clearFinished: () => void;
}

export function useMediaUploads({ celebrationId, purpose, pick = defaultPick, onUploaded, rightsNoticeVersion = RIGHTS_NOTICE_VERSION }: MediaUploadOptions): MediaUploads {
  const client = useApiClient();
  const assets = useMediaAssets(client, celebrationId);
  const upload = useUploadMedia(client, celebrationId);
  const quota = assets.data?.usage;
  const music = purpose === "music";
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [needsRights, setNeedsRights] = useState(false);
  const [problem, setProblem] = useState<PickProblem | null>(null);
  // The queue is created once per celebration; it reads the quota and the callbacks through a ref so a new value never recreates it.
  const latest = useMemo(() => ({ quota, upload: upload.mutateAsync, onUploaded }), [quota, upload.mutateAsync, onUploaded]);
  const ref = useRef(latest); // a stable box whose content is refreshed below
  ref.current = latest;
  const queue = useMemo(() => createUploadQueue(async ({ file, filename, contentType, size, purpose: filePurpose, rightsNoticeVersion: version, onProgress }) => {
    const asset = await ref.current.upload({ file, filename, contentType, size, onProgress, purpose: filePurpose, rightsNoticeVersion: version });
    ref.current.onUploaded?.(asset.id);
    return asset;
  }, { quota: () => ref.current.quota, limits: DEFAULT_LIMITS }), [ref]);
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  // The worker answers after the upload: each re-read of the list settles the rows still "Preparing" (processed, rejected or deleted).
  const listed = assets.data?.items;
  // It also runs when the queue itself changes: an upload that just ended can already be settled in the list that was read while it uploaded.
  useEffect(() => { if (listed) queue.reconcile(listed); }, [queue, listed, snapshot]);

  const allowed = (): boolean => {
    const blocked = music && !rightsAccepted;
    setNeedsRights(blocked);
    return !blocked;
  };
  const enqueue = (files: readonly PickedMedia[]): void => {
    if (!files.length) return;
    const left = files.length - MAX_FILES_PER_BATCH;
    if (left > 0) setProblem({ kind: "batch", max: MAX_FILES_PER_BATCH, left });
    queue.add(files.slice(0, MAX_FILES_PER_BATCH), { purpose, rightsNoticeVersion: music ? rightsNoticeVersion : null });
  };
  const choose = (source: PickSource = "library"): void => {
    setProblem(null);
    if (!allowed()) return;
    // The picker opens inside the press itself: a browser refuses a file dialog asked for later.
    pick(music ? "audio" : "image", source).then(enqueue, (error: unknown) => {
      setProblem(error instanceof MediaPermissionError ? { kind: "permission", source: error.source } : { kind: "unreadable" });
    });
  };

  return {
    items: snapshot.items, quota, full: Boolean(quota && quota.assets >= quota.maxAssets), music, rightsAccepted, needsRights, problem,
    toggleRights: () => { setRightsAccepted((value) => !value); setNeedsRights(false); },
    choose,
    addFiles: (files) => { setProblem(null); if (allowed()) enqueue(files); },
    reportNotAFile: () => setProblem({ kind: "notAFile" }),
    retry: queue.retry,
    remove: queue.remove,
    forgetAsset: (assetId) => snapshot.items.filter((item) => item.asset?.id === assetId).forEach((item) => queue.remove(item.id)),
    clearFinished: queue.clearFinished
  };
}
