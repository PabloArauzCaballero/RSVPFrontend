import { useState, type ReactNode } from "react";
import { Switch, Text, View } from "react-native";
import { colors, spacing } from "@rsvp/design-tokens";
import { useHostNotificationPreferences, useUpdateHostNotificationPreferences, type NotificationChannel, type NotificationPreferences } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { useSingleFlightGate } from "../../platform/single-flight";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Field, Loading, Notice, Section, styles } from "../ui";
import { FailureNotice, RetryNotice } from "./parts";

/**
 * Preferences (REQ-F18-03/04/06): per channel, per event type and the quiet-hours window (contract 1.4.0). Each change is saved to
 * the backend on its own and reverts if the save fails. Hours are in the celebration's time zone; deferred notices are not dropped.
 */

export const CHANNELS: readonly NotificationChannel[] = ["EMAIL", "WHATSAPP", "SMS", "PUSH"];
/** Template keys a host can mute (contract 1.4.0 `EventTypePreferences`). Unlisted types are enabled. */
export const HOST_EVENT_TYPES = ["celebrationPublished", "companionRequested", "giftRequested", "leadCapReached"] as const;
const palette = colors.light;
const HOUR = /^(?:[0-9]|1[0-9]|2[0-3])$/;

function QuietHours({ quiet, busy, onSave, error, saved }: { readonly quiet: NotificationPreferences["quietHours"]; readonly busy: boolean; readonly saved: boolean; readonly onSave: (value: { start: number; end: number } | null) => void; readonly error: boolean }): ReactNode {
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
    <Section title={t("guests.preferences.quietTitle")}>
      <Text style={styles.body}>{t("guests.preferences.quietIntro")}</Text>
      <Text testID="quiet-current" style={styles.label}>
        {quiet.start === quiet.end ? t("guests.preferences.quietOff") : t("guests.preferences.quietCurrent", { start: quiet.start, end: quiet.end })} · {quiet.source === "DEFAULT" ? t("guests.preferences.quietSourceDefault") : t("guests.preferences.quietSourceMine")}
      </Text>
      <Field label={t("guests.preferences.quietStart")} value={start} onChange={setStart} keyboardType="number-pad" testID="quiet-start" />
      <Field label={t("guests.preferences.quietEnd")} value={end} onChange={setEnd} keyboardType="number-pad" testID="quiet-end" error={invalid ? t("guests.preferences.quietInvalid") : undefined} />
      <View style={styles.row}>
        <ActionButton label={t("guests.preferences.quietSave")} onPress={save} busy={busy} testID="quiet-save" />
        <ActionButton variant="secondary" label={t("guests.preferences.quietDefault")} onPress={() => onSave(null)} disabled={busy || quiet.source === "DEFAULT"} testID="quiet-default" />
      </View>
      {saved ? <Notice kind="success">{t("guests.preferences.saved")}</Notice> : null}
      {error ? <Notice kind="error">{t("guests.preferences.saveFailed")}</Notice> : null}
    </Section>
  );
}

function PreferencesBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
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
  if (prefs.isPending) return <Loading />;
  if (prefs.isError) return <RetryNotice error={prefs.error} onRetry={() => { void prefs.refetch(); }} />;
  const channels = prefs.data.channels ?? {};
  const eventTypes = prefs.data.eventTypes ?? {};
  const toggleEvent = (key: string, value: boolean): void => save({ eventTypes: { [key]: value } });
  const toggle = (channel: NotificationChannel, value: boolean): void => save({ channels: { [channel]: value } });
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("guests.preferences.intro")}</Text>
      <Section title={t("guests.preferences.channelsTitle")}>
        {CHANNELS.map((channel) => {
          const on = channels[channel] === true;
          return (
            <View key={channel} style={[styles.row, { justifyContent: "space-between", minHeight: 48 }]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.label}>{t(`guests.preferences.${channel}`)}</Text>
                <Text style={styles.muted}>{on ? t("guests.preferences.on") : t("guests.preferences.off")}</Text>
              </View>
              <Switch accessibilityLabel={t(`guests.preferences.${channel}`)} testID={`pref-${channel}`} disabled={update.isPending} value={on} onValueChange={(value) => toggle(channel, value)}
                trackColor={{ true: palette.primary, false: palette.border }} thumbColor="#FFFFFF" />
            </View>
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
            <View key={key} style={[styles.row, { justifyContent: "space-between", minHeight: 48 }]}>
              <Text style={[styles.label, { flexShrink: 1 }]}>{t(`guests.preferences.event.${key}`)}</Text>
              <Switch accessibilityLabel={t(`guests.preferences.event.${key}`)} testID={`event-${key}`} disabled={update.isPending} value={on} onValueChange={(value) => toggleEvent(key, value)}
                trackColor={{ true: palette.primary, false: palette.border }} thumbColor="#FFFFFF" />
            </View>
          );
        })}
      </Section>
      <QuietHours key={`${prefs.data.quietHours.start}-${prefs.data.quietHours.end}-${prefs.data.quietHours.source}`} quiet={prefs.data.quietHours} busy={update.isPending} error={here("quiet", "failed")} saved={here("quiet", "saved")} onSave={(value) => save({ quietHours: value }, "quiet")} />
      <ActionButton variant="secondary" label={t("guests.preferences.pushSetup")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.push, celebrationId))} />
    </View>
  );
}

export function PreferencesScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="preferences" title={t("guests.preferences.title")}>{({ celebration }) => <PreferencesBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
