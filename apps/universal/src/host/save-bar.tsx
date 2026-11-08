import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { CheckMark, Enter, StickyActions } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { CelebrationErrorNotice } from "./celebration-errors";
import { ActionButton, Notice, useStyles } from "./ui";

/**
 * The save bar of the editing screens. It is the product's `StickyActions` (one fixed bar, safe-area aware, stacked on a
 * phone) and always says where the work stands: unsaved, just saved (the check is drawn) or nothing to save. Saving stays an
 * explicit tap; nothing saves behind the host's back.
 */

/** The one bar pinned to the bottom of a long page (web); the shared pattern, so the editing screens never draw a second one. */
export function ActionBar({ children }: { readonly children: ReactNode }): ReactNode {
  return <StickyActions>{children}</StickyActions>;
}

export function SaveBar({ dirty, saved, busy, invalid, error, onReload, onSave, saveTestID, aside, disabled = false }: {
  readonly dirty: boolean; readonly saved: boolean; readonly busy: boolean; readonly invalid?: string | null; readonly error?: unknown; readonly onReload?: () => void;
  readonly onSave: () => void; readonly saveTestID: string; readonly aside?: ReactNode; readonly disabled?: boolean;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const status = dirty
    ? <Text style={styles.body}>{t("host.editor.dirty")}</Text>
    : saved
      ? <Enter from="up" key="saved"><View role="status" style={[styles.row, { gap: spacing[2] }]}><CheckMark size={22} tone="success" /><Text style={[styles.body, { fontWeight: "700" }]}>{t("host.common.saved")}</Text></View></Enter>
      : <Text style={styles.muted}>{t("host.editor.clean")}</Text>;
  const summary = (
    <View style={{ gap: spacing[2], paddingBottom: spacing[1] }}>
      {invalid ? <Notice kind="error">{invalid}</Notice> : null}
      <CelebrationErrorNotice error={error} {...(onReload ? { onReload } : {})} />
      <View style={{ minHeight: 28, justifyContent: "center" }}>{status}</View>
    </View>
  );
  return (
    <StickyActions summary={summary}>
      <ActionButton label={busy ? t("host.common.saving") : t("host.editor.save")} busy={busy} disabled={disabled} onPress={onSave} testID={saveTestID} />
      {aside}
    </StickyActions>
  );
}
