import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { supportedLocales } from "@rsvp/i18n";
import { useEditCelebration, useUpdateSettings, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { toWallClock, wallClockAt } from "./content-draft";
import { CURRENCIES, TIME_ZONES } from "./onboarding";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Notice, Section, styles } from "./ui";

/** C17 · Languages, time zone, currency and RSVP deadline, with a preview of the effect (REQ-F13-01/06). */

const ZONE_NAME_PART = "timeZoneName";

/** "Now" as the wall clock of the celebration zone (YYYY-MM-DDTHH:mm), formatted by Intl: no offset arithmetic. */
export function nowInZone(timeZone: string, now: Date = new Date()): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}T${parts["hour"]}:${parts["minute"]}`;
}

/** True when a wall-clock deadline in the celebration zone is already over: RSVPs freeze. */
export function deadlinePassed(deadline: string | null, timeZone: string, now: Date = new Date()): boolean {
  return deadline !== null && deadline <= nowInZone(timeZone, now);
}

function zoneName(timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" }).formatToParts(new Date()).find((part) => part.type === ZONE_NAME_PART)?.value ?? timeZone;
}

function SettingsForm({ celebration, refetch }: { readonly celebration: Celebration; readonly refetch: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const edit = useEditCelebration(client, celebration.id);
  const settings = useUpdateSettings(client, celebration.id);
  const [languages, setLanguages] = useState<string[]>([...celebration.supportedLocales]);
  const [defaultLocale, setDefaultLocale] = useState(celebration.defaultLocale);
  const [timeZone, setTimeZone] = useState(celebration.timeZone);
  const [currency, setCurrency] = useState(celebration.currency);
  const [deadline, setDeadline] = useState(() => wallClockAt(celebration, "rsvpDeadline"));
  const [invalid, setInvalid] = useState(false);
  const wall = toWallClock(deadline);
  const entered = wall.ok ? wall.value : null;
  const zones = TIME_ZONES.includes(celebration.timeZone as (typeof TIME_ZONES)[number]) ? [...TIME_ZONES] : [...TIME_ZONES, celebration.timeZone];

  const saveGeneral = (): void => {
    const supported = languages.includes(defaultLocale) ? languages : [...languages, defaultLocale];
    edit.mutate({ target: celebration, patch: { supportedLocales: supported, defaultLocale, timeZone, currency } }, { onSuccess: refetch });
  };
  const saveDeadline = (value: string | null): void => {
    if (!wall.ok && value !== null) { setInvalid(true); return; }
    setInvalid(false);
    settings.mutate({ target: celebration, patch: { rsvpDeadline: value } }, { onSuccess: refetch });
  };

  return (
    <View style={{ gap: 16 }}>
      <Section title={t("host.settings.title")}>
        <Text style={styles.label}>{t("host.settings.languages")}</Text>
        <View style={styles.row}>
          {supportedLocales.map((code) => (
            <ActionButton key={code} variant={languages.includes(code) ? "primary" : "secondary"} label={t(`celebration.language.${code}`)}
              onPress={() => setLanguages((current) => (current.includes(code) ? current.filter((item) => item !== code || code === defaultLocale) : [...current, code]))} />
          ))}
        </View>
        <ChoiceGroup label={t("host.settings.defaultLanguage")} value={defaultLocale} onChange={setDefaultLocale} choices={languages.map((code) => ({ value: code, label: t(`celebration.language.${code}`) }))} />
        <ChoiceGroup label={t("host.settings.timeZone")} value={timeZone} onChange={setTimeZone} choices={zones.map((zone) => ({ value: zone, label: zone }))} />
        <ChoiceGroup label={t("host.settings.currency")} value={currency} onChange={setCurrency} choices={CURRENCIES.map((code) => ({ value: code, label: code }))} />
        <ErrorNotice error={edit.error} onReload={refetch} />
        <ActionButton label={t("host.common.save")} busy={edit.isPending} onPress={saveGeneral} testID="save-settings" />
      </Section>
      <Section title={t("host.settings.deadline.label")}>
        <View style={styles.row}>
          <View style={{ flexGrow: 1 }}><Field label={t("host.settings.deadline.date")} value={deadline.date} onChange={(date) => setDeadline((current) => ({ ...current, date }))} /></View>
          <View style={{ flexGrow: 1 }}><Field label={t("host.settings.deadline.time")} value={deadline.time} onChange={(time) => setDeadline((current) => ({ ...current, time }))} /></View>
        </View>
        <Text style={styles.muted}>{t("host.settings.deadline.help", { timeZone: celebration.timeZone })}</Text>
        {entered ? <Notice>{t("host.settings.deadline.effect", { date: entered.replace("T", " "), zone: zoneName(celebration.timeZone, celebration.defaultLocale) })}</Notice> : <Notice>{t("host.settings.deadline.none")}</Notice>}
        {deadlinePassed(entered, celebration.timeZone) ? <Notice kind="error">{t("host.settings.deadline.past")}</Notice> : null}
        {invalid ? <Notice kind="error">{t("host.common.invalid", { detail: t("host.settings.deadline.label") })}</Notice> : null}
        <ErrorNotice error={settings.error} onReload={refetch} />
        <View style={styles.row}>
          <ActionButton label={t("host.common.save")} busy={settings.isPending} onPress={() => saveDeadline(entered)} testID="save-deadline" />
          {celebration.settings.rsvpDeadline ? <ActionButton variant="secondary" label={t("host.settings.deadline.clear")} onPress={() => saveDeadline(null)} /> : null}
        </View>
      </Section>
    </View>
  );
}

export function SettingsScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="settings" title={t("host.settings.title")}>
      {({ celebration, refetch }) => <SettingsForm key={celebration.version} celebration={celebration} refetch={refetch} />}
    </CelebrationScreen>
  );
}
