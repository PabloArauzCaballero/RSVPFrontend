import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useHostNotificationPreferences, useUpdateHostNotificationPreferences, type NotificationChannel, type NotificationPreferences } from "@rsvp/query-hooks";
import { SwitchRow } from "@rsvp/ui";
import { useApiClient, useT } from "../../platform/providers";
import { useSingleFlightGate } from "../../platform/single-flight";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Field, Notice, OverflowMenu, Section, useStyles } from "../ui";
import { FailureNotice, MoreOptions, RetryNotice, BlockSkeleton } from "./parts";

/**
 * Preferences (REQ-F18-03/04/06): per channel, per event type and the quiet-hours window (contract 1.4.0). Each change is saved to
 * the backend on its own and reverts if the save fails. Hours are in the celebration's time zone; deferred notices are not dropped.
 */

export const CHANNELS: readonly NotificationChannel[] = ["EMAIL", "WHATSAPP", "SMS", "PUSH"];
/** Template keys a host can mute (contract 1.4.0 `EventTypePreferences`). Unlisted types are enabled. */
export const HOST_EVENT_TYPES = ["celebrationPublished", "companionRequested", "giftRequested", "leadCapReached"] as const;
const HOUR = /^(?:[0-9]|1[0-9]|2[0-3])$/;

function QuietHours({ quiet, busy, onSave, error, saved }: { readonly quiet: NotificationPreferences["quietHours"]; readonly busy: boolean; readonly saved: boolean; readonly onSave: (value: { start: number; end: number } | null) => void; readonly error: boolean }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const [start, setStart] = useState(String(quiet.start));
  const [end, setEnd] = useState(String(quiet.end));
  const [invalid, setInvalid] = useState(false);
  const save = (): void => {
    if (!HOUR.test(start.trim()) || !HOUR.test(end.trim())) { setInvalid(true); return; }
    setInvalid(false);
    onSave({ start: Number(start), end: Number(end) });
  };
  return (
    <View style={[styles.card, { gap: spacing[4] }]}>
      <Text style={styles.body}>{t("guests.preferences.quietIntro")}</Text>
      <Text testID="quiet-current" style={styles.label}>
        {quiet.start === quiet.end ? t("guests.preferences.quietOff") : t("guests.preferences.quietCurrent", { start: quiet.start, end: quiet.end })} · {quiet.source === "DEFAULT" ? t("guests.preferences.quietSourceDefault") : t("guests.preferences.quietSourceMine")}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[3] }}>
        <View style={{ flexGrow: 1, flexBasis: 160, minWidth: 0 }}><Field label={t("guests.preferences.quietStart")} value={start} onChange={setStart} keyboardType="number-pad" testID="quiet-start" /></View>
        <View style={{ flexGrow: 1, flexBasis: 160, minWidth: 0 }}><Field label={t("guests.preferences.quietEnd")} value={end} onChange={setEnd} keyboardType="number-pad" testID="quiet-end" error={invalid ? t("guests.preferences.quietInvalid") : undefined} /></View>
      </View>
      <View style={styles.row}>
        <ActionButton icon="check" label={t("guests.preferences.quietSave")} onPress={save} busy={busy} testID="quiet-save" />
        <ActionButton icon="check" variant="secondary" label={t("guests.preferences.quietDefault")} onPress={() => onSave(null)} disabled={busy || quiet.source === "DEFAULT"} testID="quiet-default" />
      </View>
      {saved ? <Notice kind="success">{t("guests.preferences.saved")}</Notice> : null}
      {error ? <Notice kind="error">{t("guests.preferences.saveFailed")}</Notice> : null}
    </View>
  );
}

function PreferencesBody({ celebrationId }: { readonly celebrationId: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const prefs = useHostNotificationPreferences(client, celebrationId);
  const update = useUpdateHostNotificationPreferences(client, celebrationId);
  const [outcome, setOutcome] = useState<{ readonly result: "saved" | "failed"; readonly area: "toggles" | "quiet" } | null>(null);
  // `isPending` flips a render late, so two fast taps would send two PATCHes: the gate decides synchronously.
  const flight = useSingleFlightGate();
  const save = (body: Parameters<typeof update.mutate>[0], area: "toggles" | "quiet" = "toggles"): void => {
    if (!flight.begin()) return;
    setOutcome(null);
    update.mutate(body, { onSuccess: () => setOutcome({ result: "saved", area }), onError: () => setOutcome({ result: "failed", area }), onSettled: flight.end });
  };
  const here = (area: "toggles" | "quiet", result: "saved" | "failed"): boolean => outcome?.area === area && outcome.result === result;
  if (prefs.isPending) return <BlockSkeleton />;
  if (prefs.isError) return <RetryNotice error={prefs.error} onRetry={() => { void prefs.refetch(); }} />;
  const channels = prefs.data.channels ?? {};
  const eventTypes = prefs.data.eventTypes ?? {};
  const toggleEvent = (key: string, value: boolean): void => save({ eventTypes: { [key]: value } });
  const toggle = (channel: NotificationChannel, value: boolean): void => save({ channels: { [channel]: value } });
  return (
    <View style={{ gap: spacing[4] }}>
      <Section title={t("guests.preferences.channelsTitle")}>
        {CHANNELS.map((channel) => {
          const on = channels[channel] === true;
          return (
            <SwitchRow key={channel} label={t(`guests.preferences.${channel}`)} value={on} disabled={update.isPending} testID={`pref-${channel}`} onChange={(value) => toggle(channel, value)} />
          );
        })}
        {here("toggles", "saved") ? <Notice kind="success">{t("guests.preferences.saved")}</Notice> : null}
        {here("toggles", "failed") ? <Notice kind="error">{t("guests.preferences.saveFailed")}</Notice> : null}
        {update.isError ? <FailureNotice error={update.error} /> : null}
      </Section>
      <Section title={t("guests.preferences.eventsTitle")}>
        <Text style={styles.body}>{t("guests.preferences.eventsIntro")}</Text>
        {HOST_EVENT_TYPES.map((key) => {
          const on = eventTypes[key] !== false;
          return (
            <SwitchRow key={key} label={t(`guests.preferences.event.${key}`)} value={on} disabled={update.isPending} testID={`event-${key}`} onChange={(value) => toggleEvent(key, value)} />
          );
        })}
      </Section>
      <MoreOptions label={t("guests.preferences.quietTitle")} testID="prefs-more">
        <QuietHours key={`${prefs.data.quietHours.start}-${prefs.data.quietHours.end}-${prefs.data.quietHours.source}`} quiet={prefs.data.quietHours} busy={update.isPending} error={here("quiet", "failed")} saved={here("quiet", "saved")} onSave={(value) => save({ quietHours: value }, "quiet")} />
      </MoreOptions>
    </View>
  );
}

export function PreferencesScreen(props: ScreenProps): ReactNode {
  const t = useT();
  const toPush = (celebrationId: string) => () => props.onNavigate(withCelebration(HOST_ROUTES.push, celebrationId));
  return (
    <CelebrationScreen {...props} current="preferences" title={t("guests.preferences.title")} intro={t("guests.preferences.intro")}
      menu={({ celebration }) => <OverflowMenu label={t("guests.more")} testID="preferences-more" items={[{ key: "push", label: t("guests.preferences.pushSetup"), onPress: toPush(celebration.id) }]} />}>
      {({ celebration }) => <PreferencesBody celebrationId={celebration.id} />}
    </CelebrationScreen>
  );
}
