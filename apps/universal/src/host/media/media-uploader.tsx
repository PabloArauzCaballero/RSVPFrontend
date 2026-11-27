import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { createUploadQueue, DEFAULT_LIMITS, useMediaAssets, useUploadMedia, type MediaPurpose, type QueueItem, type UploadFailure } from "@rsvp/query-hooks";
import { pickMedia as defaultPick, type PickedImage } from "../../platform/pick-media";
import { useApiClient, useT } from "../../platform/providers";
import { useColors } from "@rsvp/ui";
import { ActionButton, Notice, ToggleChip, useStyles } from "../ui";

/**
 * F6 · Upload of any media file of a celebration: several at once, progress and a clear error per file, retry, and the quota the
 * celebration has used. It is a self-contained component the editor (F5) imports; it knows nothing about where the file ends up.
 * Music asks the host to accept the rights notice first, and the accepted version travels with the upload as audit.
 */
export const RIGHTS_NOTICE_VERSION = "2026-11-24";
const MB = 1024 * 1024;
const PERCENT = 100;
const MAX_AUDIO_MINUTES = 10;

export interface MediaUploaderProps {
  readonly celebrationId: string;
  readonly purpose: MediaPurpose;
  /** Injected in tests and by hosts with their own picker. */
  readonly pick?: (kind: "image" | "audio") => Promise<readonly PickedImage[]>;
  /** Called with the id of every file the server accepted. */
  readonly onUploaded?: (assetId: string) => void;
  /** Version of the rights notice the screen shows; defaults to the one this build knows. */
  readonly rightsNoticeVersion?: string;
}

const megabytes = (bytes: number): string => (bytes / MB >= 10 ? String(Math.round(bytes / MB)) : (bytes / MB).toFixed(1));
const FAILURE_KEY: Readonly<Record<UploadFailure, string>> = {
  type: "type", tooLarge: "tooLarge", quotaAssets: "quotaAssets", quotaBytes: "quotaBytes", rights: "rights", invalid: "invalid", tooLong: "tooLong", rejected: "rejected", forbidden: "forbidden", network: "network", server: "server"
};

function Bar({ now, max, label }: { readonly now: number; readonly max: number; readonly label: string }): ReactNode {
  const palette = useColors();
  const percent = Math.min(PERCENT, Math.round((now / max) * PERCENT));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(now, max)} style={{ height: 8, borderRadius: 4, borderWidth: 1, borderColor: palette.fieldBorder, overflow: "hidden", backgroundColor: palette.primaryMuted }}>
      <View style={{ width: `${percent}%`, height: 6, backgroundColor: palette.primary }} />
    </View>
  );
}

function Row({ item, onRetry, onRemove }: { readonly item: QueueItem; readonly onRetry: () => void; readonly onRemove: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const percent = Math.round(item.progress * PERCENT);
  const text = item.status === "error" && item.failure ? t(`host.media.failures.${FAILURE_KEY[item.failure]}`, { name: item.name })
    : item.status === "uploading" ? t("host.media.uploading", { name: item.name, percent })
    : item.status === "processing" ? t("host.media.processing", { name: item.name })
    : item.status === "done" ? t("host.media.done", { name: item.name }) : `${item.name} · ${t("host.media.queued")}`;
  return (
    <View style={{ gap: spacing[2] }} testID={`media-row-${item.id}`}>
      {item.status === "error" ? <Notice kind="error">{text}</Notice> : <Text style={styles.body} accessibilityLiveRegion="polite">{text}</Text>}
      {/* The live region above only changes with the STATE of the file; the progress travels in the bar's value, so a screen reader asks for it instead of hearing every tick. */}
      {item.status === "uploading" ? <><Bar now={percent} max={PERCENT} label={t("host.media.progressLabel", { name: item.name })} /><Text style={styles.body}>{percent} %</Text></> : null}
      <View style={{ flexDirection: "row", gap: spacing[3], flexWrap: "wrap" }}>
        {item.status === "error" && item.retryable ? <ActionButton variant="secondary" label={t("host.media.retry")} onPress={onRetry} testID={`media-retry-${item.id}`} /> : null}
        {item.status === "error" || item.status === "queued" || item.status === "processing" ? <ActionButton variant="secondary" label={t("host.media.remove")} onPress={onRemove} testID={`media-remove-${item.id}`} /> : null}
      </View>
    </View>
  );
}

export function MediaUploader({ celebrationId, purpose, pick = defaultPick, onUploaded, rightsNoticeVersion = RIGHTS_NOTICE_VERSION }: MediaUploaderProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const assets = useMediaAssets(client, celebrationId);
  const upload = useUploadMedia(client, celebrationId);
  const quota = assets.data?.usage;
  const music = purpose === "music";
  const [accepted, setAccepted] = useState(false);
  const [needsRights, setNeedsRights] = useState(false);
  // The queue is created once per celebration; it reads the quota and the rights version through refs so a new value never recreates it.
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
  const full = Boolean(quota && quota.assets >= quota.maxAssets);

  const add = async (): Promise<void> => {
    if (music && !accepted) { setNeedsRights(true); return; }
    setNeedsRights(false);
    const picked = await pick(music ? "audio" : "image");
    if (picked.length) queue.add(picked.map((item) => ({ file: item.file, name: item.name, type: item.type, size: item.size })), { purpose, rightsNoticeVersion: music ? rightsNoticeVersion : null });
  };
  const finished = snapshot.items.some((item) => item.status === "done" || item.status === "error");

  return (
    <View style={{ gap: spacing[3] }} testID="media-uploader">
      {quota ? (
        <View style={{ gap: spacing[2] }}>
          <Text style={styles.body} testID="media-quota">{t("host.media.quota", { assets: quota.assets, maxAssets: quota.maxAssets, used: `${megabytes(quota.bytes)} MB`, max: `${megabytes(quota.maxBytes)} MB` })}</Text>
          <Bar now={quota.bytes} max={quota.maxBytes} label={t("host.media.quotaLabel")} />
        </View>
      ) : null}
      {full ? <Notice kind="error">{t("host.media.quotaFull")}</Notice> : null}
      <Text style={styles.body}>{music ? t("host.media.helpMusic", { max: Math.round(DEFAULT_LIMITS.audio / MB), minutes: MAX_AUDIO_MINUTES }) : t("host.media.help", { max: Math.round(DEFAULT_LIMITS.image / MB) })}</Text>
      {music ? (
        <View style={{ gap: spacing[2] }}>
          <Text style={styles.body}>{t("host.media.rightsTitle")}</Text>
          <ToggleChip label={t("host.media.rights")} on={accepted} onPress={() => { setAccepted((value) => !value); setNeedsRights(false); }} testID="media-rights" />
          {needsRights ? <Notice kind="error">{t("host.media.rightsRequired")}</Notice> : null}
        </View>
      ) : null}
      <ActionButton icon="plus" label={music ? t("host.media.addMusic") : t("host.media.add")} onPress={() => { void add(); }} disabled={full} testID="media-add" />
      {snapshot.items.map((item) => <Row key={item.id} item={item} onRetry={() => queue.retry(item.id)} onRemove={() => queue.remove(item.id)} />)}
      {finished ? <ActionButton variant="secondary" label={t("host.media.clear")} onPress={queue.clearFinished} testID="media-clear" /> : null}
    </View>
  );
}
