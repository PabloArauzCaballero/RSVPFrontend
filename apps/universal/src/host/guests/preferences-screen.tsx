import { useRef, useState, type ReactNode } from "react";
import { Switch, Text, View } from "react-native";
import { colors, spacing } from "@rsvp/design-tokens";
import { quietHourSchema } from "@rsvp/forms";
import { Input } from "@rsvp/ui";
import { useHostNotificationPreferences, useUpdateHostNotificationPreferences, type NotificationChannel, type NotificationPreferences } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, ErrorNotice, Loading, Notice, Section, styles } from "../ui";
import { RetryNotice } from "./parts";

/**
 * Preferences (REQ-F18-03/04/06): per channel, per event type and the quiet-hours window (contract 1.4.0). Each change is saved to
 * the backend on its own and reverts if the save fails. Hours are in the celebration's time zone; deferred notices are not dropped.
 */

export const CHANNELS: readonly NotificationChannel[] = ["EMAIL", "WHATSAPP", "SMS", "PUSH"];
/** Template keys a host can mute (contract 1.4.0 `EventTypePreferences`). Unlisted types are enabled. */
export const HOST_EVENT_TYPES = ["celebrationPublished", "companionRequested", "giftRequested", "leadCapReached"] as const;
const palette = colors.light;

function QuietHours({ quiet, timeZone, busy, onSave, feedback }: {
  readonly quiet: NotificationPreferences["quietHours"];
  readonly timeZone: string;
  readonly busy: boolean;
  readonly onSave: (value: { start: number; end: number } | null, onSaved: () => void) => void;
  readonly feedback: ReactNode;
}): ReactNode {
  const t = useT();
  const [draft, setDraft] = useState<{ start: string; end: string } | null>(null);
  const start = draft?.start ?? String(quiet.start);
  const end = draft?.end ?? String(quiet.end);
  const [submitted, setSubmitted] = useState(false);
  const startHour = quietHourSchema.safeParse(start);
  const endHour = quietHourSchema.safeParse(end);
  const save = (): void => {
    setSubmitted(true);
    if (!startHour.success || !endHour.success) return;
    setSubmitted(false);
    onSave({ start: startHour.data, end: endHour.data }, () => setDraft(null));
  };
  return (
    <Section title={t("guests.preferences.quietTitle")}>
      <Text style={styles.body}>{t("guests.preferences.quietIntro")}</Text>
      <Text style={styles.muted}>{t("guests.preferences.quietZone", { timeZone })}</Text>
      <Text testID="quiet-current" style={styles.label}>
        {quiet.start === quiet.end ? t("guests.preferences.quietOff") : t("guests.preferences.quietCurrent", { start: quiet.start, end: quiet.end })} · {quiet.source === "DEFAULT" ? t("guests.preferences.quietSourceDefault") : t("guests.preferences.quietSourceMine")}
      </Text>
      <Input label={t("guests.preferences.quietStart")} value={start} onChangeText={(value) => setDraft({ start: value, end })} keyboardType="number-pad" testID="quiet-start"
        state={busy ? "disabled" : "default"} error={submitted && !startHour.success ? t("guests.preferences.quietInvalid") : undefined} />
      <Input label={t("guests.preferences.quietEnd")} value={end} onChangeText={(value) => setDraft({ start, end: value })} keyboardType="number-pad" testID="quiet-end"
        state={busy ? "disabled" : "default"} error={submitted && !endHour.success ? t("guests.preferences.quietInvalid") : undefined} />
      <View style={styles.row}>
        <ActionButton label={t("guests.preferences.quietSave")} onPress={save} busy={busy} testID="quiet-save" />
        <ActionButton variant="secondary" label={t("guests.preferences.quietDefault")} onPress={() => onSave(null, () => { setDraft(null); setSubmitted(false); })} disabled={busy || quiet.source === "DEFAULT"} testID="quiet-default" />
      </View>
      {feedback}
    </Section>
  );
}

type PreferenceArea = "channels" | "events" | "quiet";

function PreferencesBody({ celebrationId, timeZone, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const prefs = useHostNotificationPreferences(client, celebrationId);
  const update = useUpdateHostNotificationPreferences(client, celebrationId);
  const saving = useRef(false);
  const [area, setArea] = useState<PreferenceArea | null>(null);
  const save = (body: Parameters<typeof update.mutate>[0], section: PreferenceArea, onSaved?: () => void): void => {
    if (saving.current) return;
    saving.current = true;
    setArea(section);
    update.mutate(body, { onSuccess: onSaved, onSettled: () => { saving.current = false; } });
  };
  const feedback = (section: PreferenceArea): ReactNode => {
    if (area !== section) return null;
    if (update.isPending) return <Notice>{t("guests.preferences.saving")}</Notice>;
    if (update.isSuccess) return <Notice kind="success">{t("guests.preferences.saved")}</Notice>;
    if (!update.isError) return null;
    return (
      <>
        <Notice kind="error">{t(section === "quiet" ? "guests.preferences.quietSaveFailed" : "guests.preferences.saveFailed")}</Notice>
        <ErrorNotice error={update.error} onReload={() => { void prefs.refetch(); }} />
      </>
    );
  };
  if (prefs.isPending) return <Loading />;
  if (prefs.isError) return <RetryNotice error={prefs.error} onRetry={() => { void prefs.refetch(); }} />;
  const channels = prefs.data.channels ?? {};
  const eventTypes = prefs.data.eventTypes ?? {};
  const toggleEvent = (key: string, value: boolean): void => save({ eventTypes: { [key]: value } }, "events");
  const toggle = (channel: NotificationChannel, value: boolean): void => save({ channels: { [channel]: value } }, "channels");
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
              <Switch accessibilityLabel={t(`guests.preferences.${channel}`)} testID={`pref-${channel}`} value={on} disabled={update.isPending} onValueChange={(value) => toggle(channel, value)}
                trackColor={{ true: palette.primary, false: palette.border }} thumbColor={palette.surface} />
            </View>
          );
        })}
        {feedback("channels")}
      </Section>
      <Section title={t("guests.preferences.eventsTitle")}>
        <Text style={styles.body}>{t("guests.preferences.eventsIntro")}</Text>
        {HOST_EVENT_TYPES.map((key) => {
          const on = eventTypes[key] !== false;
          return (
            <View key={key} style={[styles.row, { justifyContent: "space-between", minHeight: 48 }]}>
              <Text style={[styles.label, { flexShrink: 1 }]}>{t(`guests.preferences.event.${key}`)}</Text>
              <Switch accessibilityLabel={t(`guests.preferences.event.${key}`)} testID={`event-${key}`} value={on} disabled={update.isPending} onValueChange={(value) => toggleEvent(key, value)}
                trackColor={{ true: palette.primary, false: palette.border }} thumbColor={palette.surface} />
            </View>
          );
        })}
        {feedback("events")}
      </Section>
      <QuietHours quiet={prefs.data.quietHours}
        timeZone={timeZone} busy={update.isPending} feedback={feedback("quiet")} onSave={(value, onSaved) => save({ quietHours: value }, "quiet", onSaved)} />
      <ActionButton variant="secondary" label={t("guests.preferences.pushSetup")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.push, celebrationId))} />
    </View>
  );
}

export function PreferencesScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="preferences" title={t("guests.preferences.title")}>{({ celebration }) => <PreferencesBody key={celebration.id} celebrationId={celebration.id} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
