import { useId, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@rsvp/query-hooks";
import { useColors } from "@rsvp/ui";
import { FileDropArea, supportsFileDrop, type DragState } from "../../platform/file-drop";
import { MediaPermissionError } from "../../platform/media-file";
import { canTakePhoto, openPermissionSettings, pickMedia, toPickedDrop } from "../../platform/pick-media";
import type { PickedImage } from "../../platform/pick-image";
import { useT } from "../../platform/providers";
import { ActionButton, Notice, useStyles } from "../ui";

const MB = 1024 * 1024;

type Problem = "notAFile" | "severalFiles" | "unreadable" | "cameraDenied";

export interface DocumentDropProps {
  /** The one file the person chose: dropped, or taken with the camera. The screen validates it and uploads it. */
  readonly onPick: (file: PickedImage) => void;
  readonly disabled?: boolean;
  readonly testID?: string;
  /** The screen's own "choose a file" button (the file dialog or the system document picker). */
  readonly children: ReactNode;
}

/**
 * Where a person gives a verification document: drag it in (computer), choose it (every device) or photograph it (phone). One file
 * at a time, because each document has a kind. Nothing is uploaded from here: the screen keeps its own validation and upload.
 */
export function DocumentDrop({ onPick, disabled = false, testID = "document-drop", children }: DocumentDropProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const helpId = useId();
  const [drag, setDrag] = useState<DragState>("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [denied, setDenied] = useState(false);
  const droppable = supportsFileDrop();
  const camera = canTakePhoto();
  const hint = drag === "valid" ? t("host.documentDrop.dropNow") : drag === "invalid" ? t("host.documentDrop.dropInvalid") : t("host.documentDrop.hint", { max: Math.round(MAX_DOCUMENT_BYTES / MB) });
  const border = drag === "valid" ? palette.primary : drag === "invalid" ? palette.danger : palette.fieldBorder;

  const dropped = (files: readonly File[]): void => {
    setProblem(files.length > 1 ? "severalFiles" : null);
    const [first] = toPickedDrop(files);
    if (first) onPick(first);
  };
  const photograph = (): void => {
    setProblem(null); setDenied(false);
    pickMedia("image", "camera").then(([first]) => { if (first) onPick(first); }, (error: unknown) => {
      if (error instanceof MediaPermissionError) setDenied(true); else setProblem("unreadable");
    });
  };

  return (
    <View style={{ gap: spacing[2] }}>
      <FileDropArea label={t("host.documentDrop.zone")} describedBy={helpId} multiple accept={DOCUMENT_TYPES} disabled={disabled} onFiles={dropped} onNoFiles={() => setProblem("notAFile")} onDragState={setDrag} testID={testID}
        style={droppable ? { gap: spacing[3], padding: spacing[4], alignItems: "center", borderWidth: 2, borderStyle: "dashed", borderRadius: radius.lg, borderColor: border, backgroundColor: drag === "idle" ? "transparent" : palette.primaryMuted } : { gap: spacing[2] }}>
        <Text nativeID={helpId} style={[styles.muted, droppable ? { textAlign: "center" } : null]} aria-live={droppable ? "polite" : undefined}>{hint}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: droppable ? "center" : "flex-start", alignItems: "center", gap: spacing[3] }}>
          {children}
          {camera ? <ActionButton icon="upload" variant="secondary" label={t("host.documentDrop.takePhoto")} onPress={photograph} disabled={disabled} testID={`${testID}-camera`} /> : null}
        </View>
      </FileDropArea>
      {problem ? <Notice kind={problem === "severalFiles" ? "info" : "error"}>{t(`host.documentDrop.${problem}`)}</Notice> : null}
      {denied ? (
        <Notice kind="error">
          <Text style={styles.body}>{t("host.documentDrop.cameraDenied")}</Text>
          {openPermissionSettings ? <ActionButton variant="secondary" label={t("host.documentDrop.openSettings")} onPress={openPermissionSettings} testID={`${testID}-settings`} /> : null}
        </Notice>
      ) : null}
    </View>
  );
}
