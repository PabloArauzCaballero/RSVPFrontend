import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { supportedLocales } from "@rsvp/i18n";
import { useEditCelebration, useUpdateSettings, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { toWallClock, wallClockAt } from "./content-draft";
import { CURRENCIES, TIME_ZONES } from "./onboarding";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { AuditSection, EventTypeSection, TeamSection } from "./settings-extras";
import { spacing } from "@rsvp/design-tokens";
import { MoreOptions } from "./more-options";
import { ActionButton, ChoiceGroup, Field, Notice, Section, ToggleChip, useStyles } from "./ui";
import { ThemeChoice } from "./theme-choice";

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

/**
 * The stored deadline as the wall clock of the celebration. The API's `localTimes` only covers instants in
 * `content`, not `settings.rsvpDeadline` (verified against the live API), so it is converted here.
 */
export function deadlineClock(celebration: Pick<Celebration, "localTimes" | "settings" | "timeZone">): { readonly date: string; readonly time: string } {
  const local = wallClockAt(celebration, "rsvpDeadline");
  if (local.date || !celebration.settings.rsvpDeadline) return local;
  const [date = "", time = ""] = nowInZone(celebration.timeZone, new Date(celebration.settings.rsvpDeadline)).split("T");
  return { date, time };
}

function zoneName(timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" }).formatToParts(new Date()).find((part) => part.type === ZONE_NAME_PART)?.value ?? timeZone;
}

function SettingsForm({ celebration, refetch, onSaved, moreOpen, onMoreOpen }: { readonly celebration: Celebration; readonly refetch: () => void; readonly onSaved: (message: string | null) => void; readonly moreOpen: boolean; readonly onMoreOpen: (open: boolean) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const once = useSingleFlight();
  const edit = useEditCelebration(client, celebration.id);
  const settings = useUpdateSettings(client, celebration.id);
  const [languages, setLanguages] = useState<string[]>([...celebration.supportedLocales]);
  const [defaultLocale, setDefaultLocale] = useState(celebration.defaultLocale);
  const [timeZone, setTimeZone] = useState(celebration.timeZone);
  const [currency, setCurrency] = useState(celebration.currency);
  const [deadline, setDeadline] = useState(() => deadlineClock(celebration));
  const [invalid, setInvalid] = useState(false);
  const wall = toWallClock(deadline);
  const entered = wall.ok ? wall.value : null;
  const zones = TIME_ZONES.includes(celebration.timeZone as (typeof TIME_ZONES)[number]) ? [...TIME_ZONES] : [...TIME_ZONES, celebration.timeZone];

  const saveGeneral = (): void => {
    onSaved(null);
    const supported = languages.includes(defaultLocale) ? languages : [...languages, defaultLocale];
    once((release) => { edit.mutateAsync({ target: celebration, patch: { supportedLocales: supported, defaultLocale, timeZone, currency } }).then(() => { onSaved(t("host.settings.saved")); refetch(); }, () => undefined).finally(release); });
  };
  // `entered` is null both for an empty form and for text that is not a date: only the explicit clear button may send null.
  const saveDeadline = (clear: boolean): void => {
    if (!clear && !wall.ok) { setInvalid(true); return; }
    const value = clear ? null : entered;
    setInvalid(false);
    onSaved(null);
    once((release) => { settings.mutateAsync({ target: celebration, patch: { rsvpDeadline: value } }).then(() => { onSaved(t("host.settings.saved")); refetch(); }, () => undefined).finally(release); });
  };

  return (
    <View style={{ gap: spacing[5] }}>
      <Section title={t("host.settings.general")}>
        <Text style={styles.label}>{t("host.settings.languages")}</Text>
        <View style={styles.row}>
          {supportedLocales.map((code) => (
            <ToggleChip key={code} label={t(`celebration.language.${code}`)} on={languages.includes(code)}
              onPress={() => setLanguages((current) => (current.includes(code) ? current.filter((item) => item !== code || code === defaultLocale) : [...current, code]))} />
          ))}
        </View>
        <ChoiceGroup label={t("host.settings.defaultLanguage")} value={defaultLocale} onChange={setDefaultLocale} choices={languages.map((code) => ({ value: code, label: t(`celebration.language.${code}`) }))} />
        <ChoiceGroup label={t("host.settings.timeZone")} value={timeZone} onChange={setTimeZone} choices={zones.map((zone) => ({ value: zone, label: zone }))} />
        <ChoiceGroup label={t("host.settings.currency")} value={currency} onChange={setCurrency} choices={CURRENCIES.map((code) => ({ value: code, label: code }))} />
        <CelebrationErrorNotice error={edit.error} onReload={refetch} />
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
        <CelebrationErrorNotice error={settings.error} onReload={refetch} />
        <View style={styles.row}>
          <ActionButton variant="secondary" label={t("host.common.save")} busy={settings.isPending} onPress={() => saveDeadline(false)} testID="save-deadline" />
          {celebration.settings.rsvpDeadline ? <ActionButton variant="secondary" label={t("host.settings.deadline.clear")} onPress={() => saveDeadline(true)} /> : null}
        </View>
      </Section>
      <Section title={t("theme.title")}><ThemeChoice /></Section>
      <MoreOptions label={t("host.settings.more")} testID="more-settings" open={moreOpen} onOpenChange={onMoreOpen}>
        <EventTypeSection celebration={celebration} onSaved={onSaved} />
        <TeamSection celebration={celebration} onSaved={onSaved} />
        <AuditSection celebrationId={celebration.id} timeZone={celebration.timeZone} />
      </MoreOptions>
    </View>
  );
}

export function SettingsScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  // The form restarts from the stored values after every save (keyed by version), so the confirmation lives here.
  const [saved, setSaved] = useState<string | null>(null);
  // The form restarts after every save; whether «Más opciones» is open must outlive that.
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="settings" editable title={t("host.settings.title")} intro={t("host.settings.intro")}>
      {({ celebration, refetch }) => <>{saved ? <Notice kind="success">{saved}</Notice> : null}<SettingsForm key={celebration.version} celebration={celebration} refetch={refetch} onSaved={setSaved} moreOpen={moreOpen} onMoreOpen={setMoreOpen} /></>}
    </CelebrationScreen>
  );
}
