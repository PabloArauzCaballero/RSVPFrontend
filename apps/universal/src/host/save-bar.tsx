import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { CheckMark, Enter } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { CelebrationErrorNotice } from "./celebration-errors";
import { useScreenHeader } from "./gate";
import { ActionButton, Notice, useStyles } from "./ui";

/**
 * The save header of the editing screens: «Guardar» in the frame's primary slot and a line that says where the work stands
 * (unsaved, or just saved with the check drawn). Saving stays an explicit tap; nothing saves behind the host's back.
 */

/**
 * Publishes the editing screen's header: «Guardar» as the one primary action (top right; a fixed bar below 768 px), the
 * secondary actions in «⋯» and the status line above them. Called by the screen's body, which owns the draft.
 */
export function useSaveHeader({ dirty, saved, busy, invalid, error, onReload, onSave, saveTestID, menu, disabled = false, label }: {
  readonly dirty: boolean; readonly saved: boolean; readonly busy: boolean; readonly invalid?: string | null; readonly error?: unknown; readonly onReload?: () => void;
  readonly onSave: () => void; readonly saveTestID: string; readonly menu?: ReactNode; readonly disabled?: boolean; /** Replaces «Guardar cambios» when the primary action is not a save. */ readonly label?: string;
}): void {
  const t = useT();
  const styles = useStyles();
  // Only what needs saying: unsaved work, or the check once it is saved. «Nothing to save» is the absence of a line.
  const line = dirty
    ? <Text style={styles.body}>{t("host.editor.dirty")}</Text>
    : saved
      ? <Enter from="up" key="saved"><View role="status" style={[styles.row, { gap: spacing[2] }]}><CheckMark size={22} tone="success" /><Text style={[styles.body, { fontWeight: "600" }]}>{t("host.common.saved")}</Text></View></Enter>
      : null;
  const status = invalid || error || line ? (
    <View style={{ gap: spacing[2] }}>
      {invalid ? <Notice kind="error">{invalid}</Notice> : null}
      <CelebrationErrorNotice error={error} {...(onReload ? { onReload } : {})} />
      {line}
    </View>
  ) : null;
  useScreenHeader({
    actions: <ActionButton label={busy ? t("host.common.saving") : label ?? t("host.editor.save")} busy={busy} disabled={disabled} onPress={onSave} testID={saveTestID} />,
    ...(menu ? { menu } : {}),
    status
  });
}
