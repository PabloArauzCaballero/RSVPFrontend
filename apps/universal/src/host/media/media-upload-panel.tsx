import { useId, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { ACCEPTED_AUDIO_TYPES, ACCEPTED_IMAGE_TYPES, DEFAULT_LIMITS } from "@rsvp/query-hooks";
import { useColors } from "@rsvp/ui";
import { FileDropArea, supportsFileDrop, type DragState } from "../../platform/file-drop";
import { canTakePhoto, openPermissionSettings, toPickedDrop } from "../../platform/pick-media";
import { useT } from "../../platform/providers";
import { ActionButton, Notice, ToggleChip, useStyles } from "../ui";
import { Bar, UploadRow } from "./upload-row";
import type { MediaUploads, PickProblem } from "./use-media-uploads";

const MB = 1024 * 1024;
const MAX_AUDIO_MINUTES = 10;
const megabytes = (bytes: number): string => (bytes / MB >= 10 ? String(Math.round(bytes / MB)) : (bytes / MB).toFixed(1));

export interface MediaUploadPanelProps {
  readonly uploads: MediaUploads;
  /** False when the screen's own header action already opens the picker: one primary action per screen. */
  readonly showPickButton?: boolean;
  /** The line inside the drop zone, where there is drag and drop. */
  readonly dropHint?: string;
  /** Files the screen reports itself (rejected or stuck, with their delete): their rows are not repeated here. */
  readonly hiddenAssetIds?: readonly string[];
}

function ProblemNotice({ problem }: { readonly problem: PickProblem }): ReactNode {
  const t = useT();
  const styles = useStyles();
  if (problem.kind === "batch") return <Notice kind="error">{t("host.media.pickProblems.batch", { max: problem.max, left: problem.left })}</Notice>;
  if (problem.kind !== "permission") return <Notice kind="error">{t(`host.media.pickProblems.${problem.kind}`)}</Notice>;
  return (
    <Notice kind="error">
      <Text style={styles.body}>{t(`host.media.pickProblems.${problem.source}Denied`)}</Text>
      {openPermissionSettings ? <ActionButton variant="secondary" label={t("host.media.openSettings")} onPress={openPermissionSettings} testID="media-open-settings" /> : null}
    </Notice>
  );
}

/**
 * The upload surface every screen shares: drag and drop on the web, the file dialog or photo library, the camera on a phone,
 * the limits the server enforces, and one row per file with preview, progress, its own error and retry.
 */
export function MediaUploadPanel({ uploads, showPickButton = true, dropHint, hiddenAssetIds = [] }: MediaUploadPanelProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const helpId = useId();
  const area = useRef<View>(null);
  const [drag, setDrag] = useState<DragState>("idle");
  const { quota, music, full } = uploads;
  const droppable = supportsFileDrop();
  const camera = !music && canTakePhoto();
  const rows = uploads.items.filter((item) => !(item.asset && hiddenAssetIds.includes(item.asset.id)));
  const finished = rows.some((item) => item.status === "done" || item.status === "error");
  // The button that was pressed goes away with its row: the focus goes to the upload zone instead of the top of the page.
  const refocus = (): void => { (area.current as unknown as { focus?: () => void } | null)?.focus?.(); };
  const idleHint = dropHint ?? t(music ? "host.media.dropHintMusic" : "host.media.dropHint");
  const hint = drag === "valid" ? t("host.media.dropNow") : drag === "invalid" ? t("host.media.dropInvalid") : idleHint;
  const border = drag === "valid" ? palette.primary : drag === "invalid" ? palette.danger : palette.fieldBorder;

  return (
    <View style={{ gap: spacing[3] }} testID="media-uploader">
      {quota ? (
        <View style={{ gap: spacing[2] }}>
          <Text style={styles.body} testID="media-quota">{t("host.media.quota", { assets: quota.assets, maxAssets: quota.maxAssets, used: `${megabytes(quota.bytes)} MB`, max: `${megabytes(quota.maxBytes)} MB` })}</Text>
          <Bar now={quota.bytes} max={quota.maxBytes} label={t("host.media.quotaLabel")} />
        </View>
      ) : null}
      {full ? <Notice kind="error">{t("host.media.quotaFull")}</Notice> : null}
      {music ? (
        <View style={{ gap: spacing[2] }}>
          <Text style={styles.body}>{t("host.media.rightsTitle")}</Text>
          <ToggleChip label={t("host.media.rights")} on={uploads.rightsAccepted} onPress={uploads.toggleRights} testID="media-rights" />
          {uploads.needsRights ? <Notice kind="error">{t("host.media.rightsRequired")}</Notice> : null}
        </View>
      ) : null}
      <FileDropArea ref={area} label={t(music ? "host.media.zoneMusic" : "host.media.zone")} describedBy={helpId} multiple={!music} accept={music ? ACCEPTED_AUDIO_TYPES : ACCEPTED_IMAGE_TYPES}
        onFiles={(files) => uploads.addFiles(toPickedDrop(files))} onNoFiles={uploads.reportNotAFile} onDragState={setDrag} testID="media-dropzone"
        style={droppable ? { gap: spacing[3], padding: spacing[5], alignItems: "center", borderWidth: 2, borderStyle: "dashed", borderRadius: radius.lg, borderColor: border, backgroundColor: drag === "idle" ? "transparent" : palette.primaryMuted } : { gap: spacing[3] }}>
        {droppable ? <Text style={[styles.body, { textAlign: "center", fontWeight: "600" }]} aria-live="polite">{hint}</Text> : null}
        <Text nativeID={helpId} style={[styles.muted, droppable ? { textAlign: "center" } : null]}>
          {music ? t("host.media.helpMusic", { max: Math.round(DEFAULT_LIMITS.audio / MB), minutes: MAX_AUDIO_MINUTES }) : t("host.media.help", { max: Math.round(DEFAULT_LIMITS.image / MB), svgMax: Math.round(DEFAULT_LIMITS.svg / MB) })}
        </Text>
        {showPickButton || camera ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignSelf: "stretch", gap: spacing[3] }}>
            {showPickButton ? <ActionButton icon="plus" label={music ? t("host.media.addMusic") : t("host.media.add")} onPress={() => uploads.choose("library")} disabled={full} testID="media-add" /> : null}
            {camera ? <ActionButton icon="upload" variant="secondary" label={t("host.media.takePhoto")} onPress={() => uploads.choose("camera")} disabled={full} testID="media-camera" /> : null}
          </View>
        ) : null}
      </FileDropArea>
      {uploads.problem ? <ProblemNotice problem={uploads.problem} /> : null}
      {rows.map((item) => <UploadRow key={item.id} item={item} onRetry={() => uploads.retry(item.id)} onRemove={() => { uploads.remove(item.id); refocus(); }} />)}
      {finished ? <ActionButton variant="secondary" label={t("host.media.clear")} onPress={() => { uploads.clearFinished(); refocus(); }} testID="media-clear" /> : null}
    </View>
  );
}
