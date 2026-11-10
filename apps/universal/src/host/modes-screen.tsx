import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useUpdateSettings, type ApprovalMode, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { ActionButton, ConfirmDialog, ErrorNotice, Notice, Section, styles } from "./ui";

/**
 * C18 · The four AUTO_ACCEPT / RESTRICTED switches. Each one explains what happens before it
 * changes, and the screen always says the change is not retroactive (REQ-F13-02/03/04).
 */

export const SWITCHES = ["giftReservationMode", "unregisteredRsvpMode", "extraCompanionMode", "externalGiftMode"] as const;
export type SwitchKey = (typeof SWITCHES)[number];
const OTHER: Readonly<Record<ApprovalMode, ApprovalMode>> = { AUTO_ACCEPT: "RESTRICTED", RESTRICTED: "AUTO_ACCEPT" };

type Pending = { readonly kind: "mode"; readonly key: SwitchKey; readonly value: ApprovalMode } | { readonly kind: "partner"; readonly value: boolean } | null;

function Modes({ celebration, refetch }: { readonly celebration: Celebration; readonly refetch: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const update = useUpdateSettings(client, celebration.id);
  const [pending, setPending] = useState<Pending>(null);
  const valueLabel = (value: ApprovalMode): string => t(`host.modes.values.${value}`);
  const confirm = (): void => {
    if (!pending) return;
    const patch = pending.kind === "mode" ? { [pending.key]: pending.value } : { partnerPriorityEnabled: pending.value };
    setPending(null);
    update.mutate({ target: celebration, patch }, { onSuccess: refetch });
  };
  const dialogBody = pending?.kind === "mode" ? t(`host.modes.switches.${pending.key}.${pending.value}`) : t("host.modes.partnerPriority.help");

  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.muted}>{t("host.modes.help")}</Text>
      <Notice>{t("host.modes.nonRetroactive")}</Notice>
      {SWITCHES.map((key) => {
        const value = celebration.settings[key];
        const next = OTHER[value];
        return (
          <Section key={key} title={t(`host.modes.switches.${key}.label`)}>
            <Text style={styles.label}>{t("host.modes.current", { value: valueLabel(value) })}</Text>
            <Text style={styles.body}>{t(`host.modes.switches.${key}.${value}`)}</Text>
            <ActionButton variant="secondary" label={t("host.modes.change", { value: valueLabel(next) })} onPress={() => setPending({ kind: "mode", key, value: next })} testID={`switch-${key}`} />
          </Section>
        );
      })}
      <Section title={t("host.modes.partnerPriority.label")}>
        <Text style={styles.body}>{t("host.modes.partnerPriority.help")}</Text>
        <ActionButton variant="secondary" label={celebration.settings.partnerPriorityEnabled ? t("host.common.remove") : t("host.common.add")} onPress={() => setPending({ kind: "partner", value: !celebration.settings.partnerPriorityEnabled })} />
      </Section>
      <ErrorNotice error={update.error} onReload={refetch} />
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
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="modes" title={t("host.modes.title")}>
      {({ celebration, refetch }) => <Modes celebration={celebration} refetch={refetch} />}
    </CelebrationScreen>
  );
}
