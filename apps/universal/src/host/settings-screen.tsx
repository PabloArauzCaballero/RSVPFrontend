import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { supportedLocales } from "@rsvp/i18n";
import { useEditCelebration, useUpdateSettings, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, useScreenHeader, type ScreenProps } from "./gate";
import { toWallClock, wallClockAt } from "./content-draft";
import { CURRENCIES, TIME_ZONES } from "./onboarding";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { AuditSection, EventTypeSection, TeamSection } from "./settings-extras";
import { spacing } from "@rsvp/design-tokens";
import { MoreOptions } from "./more-options";
import { ActionButton, ChoiceGroup, DateInput, FilterSelect, Notice, Section, TimeInput, ToggleChip, useStyles } from "./ui";
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

  const generalChanged = defaultLocale !== celebration.defaultLocale || timeZone !== celebration.timeZone || currency !== celebration.currency
    || [...languages].sort().join() !== [...celebration.supportedLocales].sort().join();
  const original = deadlineClock(celebration);
  const deadlineChanged = deadline.date !== original.date || deadline.time !== original.time;

  // One «Guardar» for the whole screen: the celebration (languages, zone, currency) and the deadline are two API calls, sent in turn
  // with the version the first one returned, and only the ones that changed.
  const save = (): void => {
    if (deadlineChanged && !wall.ok) { setInvalid(true); return; }
    setInvalid(false);
    onSaved(null);
    once((release) => {
      void (async () => {
        let target: Celebration = celebration;
        if (generalChanged) {
          const supported = languages.includes(defaultLocale) ? languages : [...languages, defaultLocale];
          target = await edit.mutateAsync({ target, patch: { supportedLocales: supported, defaultLocale, timeZone, currency } });
        }
        if (deadlineChanged) await settings.mutateAsync({ target, patch: { rsvpDeadline: entered } });
        onSaved(t("host.settings.saved"));
        refetch();
      })().catch(() => undefined).finally(release);
    });
  };
  const clearDeadline = (): void => {
    setInvalid(false);
    onSaved(null);
    once((release) => { settings.mutateAsync({ target: celebration, patch: { rsvpDeadline: null } }).then(() => { onSaved(t("host.settings.saved")); refetch(); }, () => undefined).finally(release); });
  };
  const busy = edit.isPending || settings.isPending;
  useScreenHeader({ actions: <ActionButton label={busy ? t("host.common.saving") : t("host.common.save")} busy={busy} onPress={save} testID="save-settings" /> });

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
        {languages.length > 1 ? <ChoiceGroup label={t("host.settings.defaultLanguage")} value={defaultLocale} onChange={setDefaultLocale} choices={languages.map((code) => ({ value: code, label: t(`celebration.language.${code}`) }))} /> : null}
      </Section>
      <Section title={t("host.settings.deadline.label")}>
        <View style={styles.row}>
          <View style={{ flexGrow: 1 }}><DateInput label={t("host.settings.deadline.date")} value={deadline.date} onChange={(date) => setDeadline((current) => ({ ...current, date }))} testID="deadline-date" /></View>
          <View style={{ flexGrow: 1 }}><TimeInput label={t("host.settings.deadline.time")} value={deadline.time} onChange={(time) => setDeadline((current) => ({ ...current, time }))} testID="deadline-time" /></View>
        </View>
        <Text style={styles.muted}>{t("host.settings.deadline.help", { timeZone })}</Text>
        {entered ? <Notice>{t("host.settings.deadline.effect", { date: entered.replace("T", " "), zone: zoneName(timeZone, celebration.defaultLocale) })}</Notice> : null}
        {deadlinePassed(entered, timeZone) ? <Notice kind="error">{t("host.settings.deadline.past")}</Notice> : null}
        {invalid ? <Notice kind="error">{t("host.common.invalid", { detail: t("host.settings.deadline.label") })}</Notice> : null}
        {celebration.settings.rsvpDeadline ? <View style={styles.row}><ActionButton icon="close" variant="secondary" label={t("host.settings.deadline.clear")} onPress={clearDeadline} testID="clear-deadline" /></View> : null}
      </Section>
      <CelebrationErrorNotice error={edit.error ?? settings.error} onReload={refetch} />
      <Section title={t("theme.title")}><ThemeChoice /></Section>
      <MoreOptions label={t("host.settings.more")} testID="more-settings" open={moreOpen} onOpenChange={onMoreOpen}>
        <Section title={t("host.settings.format")}>
          <Text style={styles.muted}>{t("host.settings.formatHelp")}</Text>
          <View style={{ gap: spacing[1], alignItems: "flex-start" }}>
            <Text style={styles.label}>{t("host.settings.timeZone")}</Text>
            <FilterSelect label={t("host.settings.timeZone")} value={timeZone} onChange={setTimeZone} options={zones.map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") }))} testID="settings-time-zone" />
          </View>
          <View style={{ gap: spacing[1], alignItems: "flex-start" }}>
            <Text style={styles.label}>{t("host.settings.currency")}</Text>
            <FilterSelect label={t("host.settings.currency")} value={currency} onChange={setCurrency} options={CURRENCIES.map((code) => ({ value: code, label: code }))} testID="settings-currency" />
          </View>
        </Section>
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
