import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useConfigureGuestRetention, useGuestDefaults, useGuestRetention, useSetGuestDefaults, type RetentionSettings } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, ConfirmDialog, Field, Loading, Notice, Section, styles } from "../ui";
import { FailureNotice, RetryNotice } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";
import { parseCompanions, parseRetentionDays } from "./settings-input";

export { GUEST_SETTINGS_PATH } from "./settings-input";

/**
 * Guest settings: the companions a new guest gets by default and how long personal data is kept (contract v1.9.0,
 * `guest-settings` and `retention-settings`, MANAGE only). Each form saves on its own and says what the server stored.
 */

function DefaultsSection({ celebrationId }: { readonly celebrationId: string }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const defaults = useGuestDefaults(client, celebrationId);
  const save = useSetGuestDefaults(client, celebrationId);
  const flight = useSingleFlightGate();
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (defaults.isPending) return <Loading />;
  if (defaults.isError) return <RetryNotice error={defaults.error} onRetry={() => { void defaults.refetch(); }} />;
  const value = draft ?? String(defaults.data.defaultAllowedCompanions);
  const parsed = parseCompanions(value);
  const submit = (): void => {
    if (parsed === null || !flight.begin()) return;
    setSaved(false);
    save.mutate(parsed, { onSuccess: () => { setDraft(null); setSaved(true); }, onSettled: flight.end });
  };
  return (
    <Section title={t("guests.settings.defaultsTitle")}>
      <Text style={styles.body}>{t("guests.settings.defaultsIntro")}</Text>
      <Field label={t("guests.settings.defaultCompanions")} help={t("guests.settings.defaultCompanionsHelp")} keyboardType="number-pad" value={value} onChange={(next) => { setDraft(next); setSaved(false); }}
        error={parsed === null ? t("guests.form.errors.companions") : undefined} testID="default-companions" />
      <FailureNotice error={save.error} onRetry={submit} />
      {saved ? <Notice kind="success">{t("guests.settings.defaultsSaved", { count: defaults.data.defaultAllowedCompanions })}</Notice> : null}
      <ActionButton label={save.isPending ? t("guests.form.saving") : t("guests.settings.save")} busy={save.isPending} disabled={parsed === null} onPress={submit} testID="save-defaults" />
    </Section>
  );
}

function retentionLine(settings: RetentionSettings, t: ReturnType<typeof useT>): string {
  return settings.retentionDays === null ? t("guests.settings.retentionNone") : t("guests.settings.retentionCurrent", { count: settings.retentionDays });
}

function RetentionSection({ celebrationId }: { readonly celebrationId: string }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const retention = useGuestRetention(client, celebrationId);
  const save = useConfigureGuestRetention(client, celebrationId);
  const flight = useSingleFlightGate();
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState<number | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  if (retention.isPending) return <Loading />;
  if (retention.isError) return <RetryNotice error={retention.error} onRetry={() => { void retention.refetch(); }} />;
  const value = draft ?? (retention.data.retentionDays === null ? "" : String(retention.data.retentionDays));
  const parsed = parseRetentionDays(value);
  const commit = (days: number | null): void => {
    if (!flight.begin()) return;
    setSaved(false);
    save.mutate(days, { onSuccess: () => { setDraft(null); setSaved(true); }, onSettled: flight.end });
  };
  const confirmed = (): void => { const days = pending; setPending(undefined); if (days !== undefined) commit(days); };
  return (
    <Section title={t("guests.settings.retentionTitle")}>
      <Text style={styles.body}>{t("guests.settings.retentionIntro")}</Text>
      <Text testID="retention-current" accessibilityLiveRegion="polite" style={styles.label}>{retentionLine(retention.data, t)}</Text>
      <Field label={t("guests.settings.retentionDays")} help={t("guests.settings.retentionHelp")} keyboardType="number-pad" value={value} onChange={(next) => { setDraft(next); setSaved(false); }}
        error={parsed === "invalid" ? t("guests.settings.retentionInvalid") : undefined} testID="retention-days" />
      <FailureNotice error={save.error} onRetry={() => { if (parsed !== "invalid") setPending(parsed); }} />
      {saved ? <Notice kind="success">{t("guests.settings.retentionSaved")}</Notice> : null}
      <View style={styles.row}>
        <ActionButton label={t("guests.settings.save")} busy={save.isPending} disabled={parsed === "invalid" || parsed === null} onPress={() => { if (parsed !== "invalid") setPending(parsed); }} testID="save-retention" />
        <ActionButton variant="secondary" label={t("guests.settings.retentionClear")} disabled={save.isPending || retention.data.retentionDays === null} onPress={() => setPending(null)} testID="clear-retention" />
      </View>
      <ConfirmDialog visible={pending !== undefined} danger={pending !== null} title={pending === null ? t("guests.settings.clearTitle") : t("guests.settings.retentionConfirmTitle")}
        body={pending === null ? t("guests.settings.clearBody") : t("guests.settings.retentionConfirmBody", { count: pending ?? 0 })} confirmLabel={pending === null ? t("guests.settings.retentionClear") : t("guests.settings.save")} onConfirm={confirmed} onCancel={() => setPending(undefined)} />
    </Section>
  );
}

function SettingsBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  return (
    <View style={{ gap: spacing[4] }}>
      <DefaultsSection celebrationId={celebrationId} />
      <RetentionSection celebrationId={celebrationId} />
      <ActionButton variant="secondary" label={t("guests.form.back")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
    </View>
  );
}

export function GuestSettingsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="guests" title={t("guests.settings.title")}>{({ celebration }) => <SettingsBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
