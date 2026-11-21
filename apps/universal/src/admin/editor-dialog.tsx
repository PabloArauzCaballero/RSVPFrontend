import type { ReactNode } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Button, OverlayEnter, overlayAnimation } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { useStyles } from "../host/ui";

const DIALOG_WIDTH = 560;

/**
 * A form (or a read-only sheet) over an admin list: title, content that scrolls, and the closing actions always in sight.
 * With `onSave` it is an editor (Cancel + the save action); without it, a viewer with one Close action. `busy` locks both
 * buttons and the system back gesture while a request is in flight.
 */
export function EditorDialog({ title, saveLabel, saveTestID, busy = false, canSave = true, onSave, onClose, closeLabel, cancelTestID = "catalog-cancel", width = DIALOG_WIDTH, children }: {
  readonly title: string;
  readonly saveLabel?: string;
  readonly saveTestID?: string;
  readonly busy?: boolean;
  readonly canSave?: boolean;
  readonly onSave?: () => void;
  readonly onClose: () => void;
  /** Defaults to "Cancelar" for an editor and "Cerrar" for a viewer. */
  readonly closeLabel?: string;
  readonly cancelTestID?: string;
  readonly width?: number;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const editing = onSave !== undefined;
  return (
    <Modal visible transparent animationType={overlayAnimation("fade")} onRequestClose={busy ? () => undefined : onClose}>
      <View style={styles.overlay}>
        <OverlayEnter from="none">
          <View accessibilityViewIsModal role="dialog" aria-label={title} style={[styles.dialog, { maxWidth: width, maxHeight: "94%" }]}>
            <Text accessibilityRole="header" style={styles.subtitle}>{title}</Text>
            <ScrollView tabIndex={0} aria-label={title} style={{ flexShrink: 1 }} contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[1] }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              <View style={{ flex: 1 }}><Button variant="secondary" icon="close" block state={busy ? "disabled" : "default"} onPress={onClose} testID={cancelTestID}>{closeLabel ?? t(editing ? "host.common.cancel" : "admin.common.close")}</Button></View>
              {editing ? <View style={{ flex: 1 }}><Button icon="check" block state={busy ? "loading" : canSave ? "default" : "disabled"} onPress={onSave} {...(saveTestID ? { testID: saveTestID } : {})}>{saveLabel ?? t("admin.common.save")}</Button></View> : null}
            </View>
          </View>
        </OverlayEnter>
      </View>
    </Modal>
  );
}
