import type { ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { colors, spacing } from "@rsvp/design-tokens";
import { CheckMark } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { CelebrationErrorNotice } from "./celebration-errors";
import { ActionButton, Notice, styles } from "./ui";

/**
 * The save bar of the editing screens. It stays at the bottom of the page and always says where the work stands:
 * unsaved, just saved (the check is drawn) or nothing to save. Saving stays an explicit tap; nothing saves behind the host's back.
 */

const STICKY = Platform.select({ web: { position: "sticky", bottom: 0 }, default: {} }) as object;
const palette = colors.light;

/** A bar pinned to the bottom of the page (web) that keeps the action of the screen within reach. */
export function ActionBar({ children }: { readonly children: ReactNode }): ReactNode {
  return <View style={[{ backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border, paddingVertical: spacing[3], gap: spacing[3] }, STICKY]}>{children}</View>;
}

export function SaveBar({ dirty, saved, busy, invalid, error, onReload, onSave, saveTestID, aside, disabled = false }: {
  readonly dirty: boolean; readonly saved: boolean; readonly busy: boolean; readonly invalid?: string | null; readonly error?: unknown; readonly onReload?: () => void;
  readonly onSave: () => void; readonly saveTestID: string; readonly aside?: ReactNode; readonly disabled?: boolean;
}): ReactNode {
  const t = useT();
  const status = dirty
    ? <Text style={styles.body}>{t("host.editor.dirty")}</Text>
    : saved
      ? <View role="status" style={[styles.row, { gap: spacing[2] }]}><CheckMark size={22} tone="success" /><Text style={[styles.body, { fontWeight: "700" }]}>{t("host.common.saved")}</Text></View>
      : <Text style={styles.muted}>{t("host.editor.clean")}</Text>;
  return (
    <ActionBar>
      {invalid ? <Notice kind="error">{invalid}</Notice> : null}
      <CelebrationErrorNotice error={error} {...(onReload ? { onReload } : {})} />
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <View style={{ flexGrow: 1 }}>{status}</View>
        <View style={styles.row}>
          {aside}
          <ActionButton label={busy ? t("host.common.saving") : t("host.editor.save")} busy={busy} disabled={disabled} onPress={onSave} testID={saveTestID} />
        </View>
      </View>
    </ActionBar>
  );
}
