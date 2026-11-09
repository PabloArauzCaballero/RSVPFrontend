import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useUpdateSettings, type ApprovalMode, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { Chip } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import { Row, RowList } from "./gifts/offer-row";
import { ActionButton, ConfirmDialog, Notice, useStyles } from "./ui";

/**
 * C18 · The four AUTO_ACCEPT / RESTRICTED switches. Each one explains what happens before it
 * changes, and the screen always says the change is not retroactive (REQ-F13-02/03/04).
 */

export const SWITCHES = ["giftReservationMode", "unregisteredRsvpMode", "extraCompanionMode", "externalGiftMode"] as const;
export type SwitchKey = (typeof SWITCHES)[number];
const OTHER: Readonly<Record<ApprovalMode, ApprovalMode>> = { AUTO_ACCEPT: "RESTRICTED", RESTRICTED: "AUTO_ACCEPT" };

type Pending = { readonly kind: "mode"; readonly key: SwitchKey; readonly value: ApprovalMode } | { readonly kind: "partner"; readonly value: boolean } | null;

function Modes({ celebration, refetch }: { readonly celebration: Celebration; readonly refetch: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const update = useUpdateSettings(client, celebration.id);
  const once = useSingleFlight();
  const [pending, setPending] = useState<Pending>(null);
  const valueLabel = (value: ApprovalMode): string => t(`host.modes.values.${value}`);
  const confirm = (): void => {
    if (!pending) return;
    const patch = pending.kind === "mode" ? { [pending.key]: pending.value } : { partnerPriorityEnabled: pending.value };
    setPending(null);
    once((release) => update.mutate({ target: celebration, patch }, { onSuccess: refetch, onSettled: release }));
  };
  const dialogBody = pending?.kind === "mode" ? t(`host.modes.switches.${pending.key}.${pending.value}`) : t("host.modes.partnerPriority.help");

  const partnerOn = celebration.settings.partnerPriorityEnabled;
  return (
    <View style={{ gap: spacing[6] }}>
      <Text style={[styles.muted, { maxWidth: 720 }]}>{t("host.modes.help")} {t("host.modes.nonRetroactive")}</Text>
      <RowList>
        {SWITCHES.map((key, index) => {
          const value = celebration.settings[key];
          const next = OTHER[value];
          return (
            <Row key={key} first={index === 0} testID={`mode-${key}`}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing[2] }}>
                <Text accessibilityRole="header" aria-level={2} style={[styles.subtitle, { flexGrow: 1, flexShrink: 1, flexBasis: 220 }]}>{t(`host.modes.switches.${key}.label`)}</Text>
                <Chip tone={value === "AUTO_ACCEPT" ? "yes" : "wait"}>{valueLabel(value)}</Chip>
              </View>
              <Text style={[styles.body, { maxWidth: 640 }]}>{t(`host.modes.switches.${key}.${value}`)}</Text>
              <View style={styles.row}><ActionButton variant="secondary" busy={update.isPending} label={t("host.modes.change", { value: valueLabel(next) })} onPress={() => setPending({ kind: "mode", key, value: next })} testID={`switch-${key}`} /></View>
            </Row>
          );
        })}
        <Row testID="mode-partnerPriority">
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing[2] }}>
            <Text accessibilityRole="header" aria-level={2} style={[styles.subtitle, { flexGrow: 1, flexShrink: 1, flexBasis: 220 }]}>{t("host.modes.partnerPriority.label")}</Text>
            <Chip tone={partnerOn ? "yes" : "wait"}>{partnerOn ? t("host.modes.partnerPriority.on") : t("host.modes.partnerPriority.off")}</Chip>
          </View>
          <Text style={[styles.body, { maxWidth: 640 }]}>{t("host.modes.partnerPriority.help")}</Text>
          <View style={styles.row}><ActionButton variant="secondary" label={partnerOn ? t("host.modes.partnerPriority.disable") : t("host.modes.partnerPriority.enable")} testID="switch-partnerPriority" onPress={() => setPending({ kind: "partner", value: !partnerOn })} /></View>
        </Row>
      </RowList>
      {update.isSuccess ? <Notice kind="success">{t("host.modes.saved")}</Notice> : null}
      <CelebrationErrorNotice error={update.error} onReload={refetch} />
      <ConfirmDialog visible={pending !== null} title={pending?.kind === "mode" ? t("host.modes.confirmTitle", { value: valueLabel(pending.value) }) : t("host.modes.partnerPriority.label")}
        body={dialogBody} confirmLabel={t("host.modes.confirm")} onConfirm={confirm} onCancel={() => setPending(null)}>
        <Notice>{t("host.modes.nonRetroactive")}</Notice>
      </ConfirmDialog>
    </View>
  );
}

export function ModesScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="modes" editable title={t("host.modes.title")} intro={t("host.modes.intro")}>
      {({ celebration, refetch }) => <Modes celebration={celebration} refetch={refetch} />}
    </CelebrationScreen>
  );
}
