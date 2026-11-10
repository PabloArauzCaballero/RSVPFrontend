import { useState, type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { themeFromTemplate } from "@rsvp/celebration-theme";
import { Enter, PressFeedback, Skeleton, SkeletonList, StepTransition, useColors } from "@rsvp/ui";
import { radius, spacing } from "@rsvp/design-tokens";
import { useCelebration, useCreateCelebration, useEventTypes, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import { canUseHostWorkspace } from "./gate";
import { isCalendarDate, slugify, toWallClock } from "./content-draft";
import { editorPath, HOST_ROUTES, withCelebration } from "./routes";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LIMITS, overLimit, slugProblem } from "./limits";
import { CenteredActions, LoadFailed } from "./load-failed";
import { previewView, type PreviewSource } from "./preview-model";
import { PreviewFrame } from "./preview-stage";
import { MoreOptions } from "./more-options";
import { ActionButton, Celebrate, ChoiceGroup, Field, FilterSelect, Illustration, Notice, Screen, useStyles } from "./ui";

/**
 * Guided sign-up (docs/design/upgrade-brief.md §2): what you celebrate, who and when, name and link, in three short
 * steps with the invitation drawing itself beside the form. Time zone, language and currency are chosen for the host
 * (device zone, app language, the currency of that zone) and only show up if they want to change them.
 */

export const TIME_ZONES = ["America/La_Paz", "America/Lima", "America/Bogota", "America/Santiago", "America/Argentina/Buenos_Aires", "America/Asuncion", "America/Mexico_City", "America/New_York", "Europe/Madrid"] as const;
export const CURRENCIES = ["BOB", "USD", "EUR", "ARS", "BRL", "CLP", "PEN", "PYG", "MXN"] as const;
const LANGUAGES = ["es-BO", "en-US"] as const;
/** The currency people in each listed zone pay with; anything else starts at BOB and can be changed. */
const ZONE_CURRENCY: Readonly<Record<string, (typeof CURRENCIES)[number]>> = {
  "America/La_Paz": "BOB", "America/Lima": "PEN", "America/Santiago": "CLP", "America/Argentina/Buenos_Aires": "ARS", "America/Asuncion": "PYG", "America/Mexico_City": "MXN", "America/New_York": "USD", "Europe/Madrid": "EUR"
};
const STEPS = ["type", "who", "name"] as const;
type StepName = (typeof STEPS)[number];
const LAST = STEPS.length;
const WIDE = 960;
const PREVIEW_WIDTH = 360;
const MAX_PREVIEW_NAMES = 2;
const PREVIEW_NARROW = 220;
const PREVIEW_WIDE = 480;
const PREVIEW_READY = 400;
const READY_WIDTH = 560;

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function defaultCurrency(timeZone: string): string {
  return ZONE_CURRENCY[timeZone] ?? CURRENCIES[0];
}

/** "America/La_Paz" → "La Paz": the city is what a host recognises. */
export function zoneLabel(zone: string): string {
  return (zone.split("/").pop() ?? zone).replaceAll("_", " ");
}

function zoneChoices(): string[] {
  const device = deviceTimeZone();
  return TIME_ZONES.includes(device as (typeof TIME_ZONES)[number]) ? [...TIME_ZONES] : [...TIME_ZONES, device];
}

/** The celebration's name proposed from the hosts' names, in the order the event type lists the roles ("Ana" + "Luis" → "Ana y Luis"). */
export function suggestedTitle(type: TranslatedEventType | undefined, hosts: Readonly<Record<string, string>>, join: (first: string, second: string) => string): string {
  const names = (type?.hostRoles ?? []).map((role) => (hosts[role.role] ?? "").trim()).filter(Boolean).slice(0, MAX_PREVIEW_NAMES);
  const [first, second] = names;
  return first && second ? join(first, second) : first ?? "";
}

/** Three segments that fill as the host moves on; the words say where they are, the bar shows how far is left. */
function StepProgress({ step, onBack }: { readonly step: number; readonly onBack?: () => void }): ReactNode {
  const t = useT();
  const palette = useColors();
  const styles = useStyles();
  const name = t(`host.onboarding.stepLabels.${STEPS[step - 1] ?? "type"}`);
  return (
    <View role="progressbar" aria-label={t("host.onboarding.progress")} aria-valuemin={1} aria-valuemax={LAST} aria-valuenow={step} aria-valuetext={`${t("host.onboarding.step", { step })}: ${name}`} style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: "row", gap: spacing[1] }}>
        {STEPS.map((key, index) => <View key={key} style={{ flex: 1, height: 4, borderRadius: radius.full, backgroundColor: index < step ? palette.primary : palette.border }} />)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <Text style={styles.label}>{`${t("host.onboarding.step", { step })} · ${name}`}</Text>
        {onBack ? <PressFeedback accessibilityRole="button" accessibilityLabel={t("host.common.back")} onPress={onBack} testID="onboarding-back" style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: spacing[2] }}><Text style={[styles.label, { color: palette.primary }]}>{t("host.common.back")}</Text></PressFeedback> : null}
      </View>
    </View>
  );
}

export function OnboardingScreen({ step: initialStep, celebrationId, onNavigate }: { readonly step: number; readonly celebrationId?: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const client = useApiClient();
  const locale = useLocale();
  const claims = useClaims();
  const { width } = useWindowDimensions();
  const types = useEventTypes(client, locale);
  const create = useCreateCelebration<Celebration>(client);
  const existing = useCelebration(client, celebrationId ?? "");
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), LAST));
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [when, setWhen] = useState({ date: "", time: "" });
  const [timeZone, setTimeZone] = useState(deviceTimeZone());
  const [currency, setCurrency] = useState<string>(() => defaultCurrency(deviceTimeZone()));
  const [language, setLanguage] = useState<string>(locale);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [hosts, setHosts] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const once = useSingleFlight();
  const type = types.data?.items.find((item) => item.code === (typeCode ?? existing.data?.eventTypeCode));
  const wide = width >= WIDE;
  if (!canUseHostWorkspace(claims)) return <Screen title={t("host.onboarding.title")}><Notice kind="error">{t("host.common.accessDenied")}</Notice></Screen>;

  const join = (first: string, second: string): string => t("host.onboarding.joinNames", { first, second });
  const effectiveTitle = titleEdited ? title : suggestedTitle(type, hosts, join);
  const effectiveSlug = slugEdited ? slug : slugify(effectiveTitle);
  const wall = toWallClock(when);
  const dateProblem = !wall.ok ? (isCalendarDate(when.date.trim()) ? "timeInvalid" : "dateInvalid") : null;
  const titleProblem = !effectiveTitle.trim() ? t("host.onboarding.titleRequired") : overLimit(effectiveTitle, LIMITS.title) !== null ? t("host.limits.tooLong", { count: overLimit(effectiveTitle, LIMITS.title) ?? 0, max: LIMITS.title }) : null;
  const slugIssue = slugProblem(effectiveSlug);

  const source: PreviewSource = {
    id: "draft", slug: effectiveSlug, eventTypeCode: typeCode ?? "", defaultLocale: language, supportedLocales: [language], timeZone, currency, templateId: null, publishedAt: null, version: 0, translations: {},
    content: {
      title: effectiveTitle.trim() || t("host.onboarding.previewFallbackTitle"),
      ...(wall.ok && wall.value ? { eventDate: wall.value } : {}),
      ...(Object.values(hosts).some((name) => name.trim()) ? { hosts: Object.fromEntries(Object.entries(hosts).filter(([, name]) => name.trim())) } : {})
    }
  };
  const theme = themeFromTemplate(null, type?.enabledSections ?? []);
  const live = (height: number): ReactNode => <PreviewFrame device="mobile" theme={theme} view={previewView(source, type, language)} label={t("host.onboarding.previewTitle")} height={height} />;

  const submit = (): void => {
    setTried(true);
    if (!typeCode || titleProblem || slugIssue || !wall.ok) return;
    const namedHosts = Object.fromEntries(Object.entries(hosts).filter(([, name]) => name.trim()));
    once((release) => create.mutate({
      slug: effectiveSlug, eventTypeCode: typeCode, defaultLocale: language, supportedLocales: [language], timeZone, currency,
      content: { title: effectiveTitle.trim(), ...(wall.value ? { eventDate: wall.value } : {}), ...(Object.keys(namedHosts).length ? { hosts: namedHosts } : {}) }
    }, { onSuccess: (created) => onNavigate(withCelebration(`${HOST_ROUTES.onboarding}/listo`, created.id)), onSettled: release }));
  };
  const goWho = (): void => setStep(2);
  const goName = (): void => { setTried(true); if (wall.ok) { setTried(false); setStep(3); } };

  if (celebrationId) {
    return (
      <Screen title={t("host.onboarding.title")}>
        {existing.isPending ? <SkeletonList label={t("host.common.loading")}><View style={{ gap: spacing[4], alignItems: "center" }}><Skeleton width={96} height={96} radius={radius.xl} /><Skeleton width="60%" height={24} /><Skeleton width={PREVIEW_WIDTH} height={PREVIEW_READY} radius={radius.xl} /></View></SkeletonList> : null}
        {existing.data ? (
          <View style={{ gap: spacing[5] }}>
            {/* The moment: rings of light behind the drawn check; the only celebration of the sign-up. */}
            <View style={{ width: "100%", maxWidth: READY_WIDTH, alignSelf: "center", borderRadius: radius.lg, paddingVertical: spacing[10], paddingHorizontal: spacing[6], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }}>
              <Celebrate title={t("host.onboarding.readyTitle")} body={t("host.onboarding.readyBody")}>
                <CenteredActions>
                  <ActionButton icon="check" label={t("host.onboarding.finish")} onPress={() => onNavigate(withCelebration(editorPath("general"), celebrationId))} testID="onboarding-finish" />
                  <ActionButton icon="plus" variant="secondary" label={t("host.onboarding.chooseStyle")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.templates, celebrationId))} testID="onboarding-style" />
                </CenteredActions>
              </Celebrate>
            </View>
            <Enter from="down" delay={120}>
              <View style={{ width: "100%", maxWidth: PREVIEW_WIDTH, alignSelf: "center" }}>
                <PreviewFrame device="mobile" theme={themeFromTemplate(null, type?.enabledSections ?? [])} view={previewView(existing.data, type, existing.data.defaultLocale)} label={t("host.onboarding.previewTitle")} height={PREVIEW_READY} />
              </View>
            </Enter>
          </View>
        ) : null}
      </Screen>
    );
  }

  const stepName = STEPS[step - 1] as StepName;
  const bodies: Readonly<Record<StepName, () => ReactNode>> = {
    type: () => (
      <View style={{ gap: spacing[4] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
          <Illustration name="welcomeHost" tone="auto" size="md" />
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text accessibilityRole="header" style={styles.subtitle}>{t("host.onboarding.typeTitle")}</Text>
            <Text style={styles.muted}>{t("host.onboarding.typeHelp")}</Text>
          </View>
        </View>
        {types.isPending ? <SkeletonList label={t("host.common.loading")}><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>{[120, 96, 140, 110, 128].map((width, index) => <Skeleton key={index} width={width} height={44} radius={radius.md} />)}</View></SkeletonList> : null}
        {types.isError ? <LoadFailed title={t("host.onboarding.typeTitle")} error={types.error} onRetry={() => { void types.refetch(); }} /> : null}
        <ChoiceGroup label={t("host.onboarding.typeLabel")} value={typeCode} onChange={(code) => { if (code !== typeCode) setHosts({}); setTypeCode(code); }} choices={(types.data?.items ?? []).map((item) => ({ value: item.code, label: item.name }))} />
        {type?.description ? <Text style={styles.muted}>{type.description}</Text> : null}
      </View>
    ),
    who: () => (
      <View style={{ gap: spacing[4] }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("host.onboarding.whoTitle")}</Text>
        <Text style={styles.muted}>{t("host.onboarding.hostsHelp")}</Text>
        {(type?.hostRoles ?? []).map((role) => <Field key={role.role} label={role.label} value={hosts[role.role] ?? ""} onChange={(name) => setHosts((current) => ({ ...current, [role.role]: name }))} />)}
        <View style={styles.row}>
          <View style={{ flexGrow: 1, flexBasis: 160 }}><Field label={t("host.onboarding.dateLabel")} value={when.date} onChange={(date) => setWhen((current) => ({ ...current, date }))} keyboardType="numbers-and-punctuation" {...(tried && dateProblem === "dateInvalid" ? { error: t("host.onboarding.dateInvalid") } : {})} /></View>
          <View style={{ flexGrow: 1, flexBasis: 120 }}><Field label={t("host.onboarding.timeLabel")} value={when.time} onChange={(time) => setWhen((current) => ({ ...current, time }))} keyboardType="numbers-and-punctuation" {...(tried && dateProblem === "timeInvalid" ? { error: t("host.onboarding.timeInvalid") } : {})} /></View>
        </View>
        <Text style={styles.muted}>{t("host.onboarding.dateHelp")}</Text>
      </View>
    ),
    name: () => (
      <View style={{ gap: spacing[4] }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("host.onboarding.nameTitle")}</Text>
        <Field label={t("host.onboarding.titleLabel")} placeholder={t("host.onboarding.titlePlaceholder")} help={t("host.onboarding.titleHelp")} value={effectiveTitle} testID="onboarding-title" {...(titleProblem && (tried || effectiveTitle) ? { error: titleProblem } : {})}
          onChange={(value) => { setTitleEdited(true); setTitle(value); }} />
        <Field label={t("host.onboarding.slugLabel")} help={t("host.onboarding.slugHelp", { url: `/c/${effectiveSlug}` })} value={effectiveSlug} testID="onboarding-slug" {...(effectiveSlug && slugIssue ? { error: t(`host.limits.slug${slugIssue === "length" ? "Length" : "Pattern"}`) } : {})}
          onChange={(value) => { setSlugEdited(true); setSlug(value.toLowerCase()); }} />
        {/* Zone, language and currency come from the device and the zone: nobody has to decide them to get an invitation. */}
        <View style={{ gap: spacing[2] }}>
          <Text style={styles.muted}>{t("host.onboarding.defaultsSummary", { timeZone: zoneLabel(timeZone), language: t(`celebration.language.${language}`), currency })}</Text>
          <MoreOptions label={t("ui.moreOptions")} testID="onboarding-more">
            <View style={{ gap: spacing[1], alignItems: "flex-start" }}>
              <Text style={styles.label}>{t("host.onboarding.timeZoneLabel")}</Text>
              <FilterSelect label={t("host.onboarding.timeZoneLabel")} value={timeZone} onChange={(zone) => { setTimeZone(zone); setCurrency(defaultCurrency(zone)); }} options={zoneChoices().map((zone) => ({ value: zone, label: zoneLabel(zone) }))} testID="onboarding-time-zone" />
              <Text style={styles.muted}>{t("host.onboarding.timeZoneHelp")}</Text>
            </View>
            <ChoiceGroup label={t("host.onboarding.languageLabel")} value={language} onChange={setLanguage} choices={LANGUAGES.map((value) => ({ value, label: t(`celebration.language.${value}`) }))} />
            <View style={{ gap: spacing[1], alignItems: "flex-start" }}>
              <Text style={styles.label}>{t("host.onboarding.currencyLabel")}</Text>
              <FilterSelect label={t("host.onboarding.currencyLabel")} value={currency} onChange={setCurrency} options={CURRENCIES.map((value) => ({ value, label: value }))} testID="onboarding-currency" />
            </View>
          </MoreOptions>
        </View>
        <CelebrationErrorNotice error={create.error} />
      </View>
    )
  };

  // The step's one action sits where every screen keeps it (top right; a fixed bar on a phone); going back is a quiet link above the step.
  const primary = step === 1
    ? <ActionButton icon="arrow" label={t("host.common.next")} disabled={!typeCode} onPress={goWho} testID="onboarding-next" />
    : step === 2
      ? <ActionButton icon="arrow" label={t("host.common.next")} onPress={goName} testID="onboarding-next" />
      : <ActionButton icon="plus" label={t("host.onboarding.create")} busy={create.isPending} onPress={submit} testID="onboarding-create" />;
  const form = (
    <View style={{ gap: spacing[5], flex: wide ? 1 : undefined, width: "100%" }}>
      <StepProgress step={step} {...(step > 1 ? { onBack: () => setStep(step - 1) } : {})} />
      {!wide && step > 1 ? (
        <Enter from="down" key="preview">
          <View style={{ gap: spacing[2] }}>
            <PressFeedback accessibilityRole="button" accessibilityLabel={previewOpen ? t("host.onboarding.previewHide") : t("host.onboarding.previewShow")} aria-expanded={previewOpen} onPress={() => setPreviewOpen((open) => !open)} style={{ alignSelf: "flex-start", justifyContent: "center" }}>
              <Text style={[styles.label, { color: palette.primary }]}>{`${t("host.onboarding.previewTitle")} · ${previewOpen ? t("host.onboarding.previewHide") : t("host.onboarding.previewShow")}`}</Text>
            </PressFeedback>
            {previewOpen ? live(PREVIEW_NARROW) : null}
          </View>
        </Enter>
      ) : null}
      <StepTransition step={step} announce={`${t("host.onboarding.step", { step })}: ${t(`host.onboarding.stepLabels.${stepName}`)}`}>{bodies[stepName]()}</StepTransition>
    </View>
  );
  return (
    <Screen title={t("host.onboarding.title")} intro={t("host.onboarding.intro")} actions={primary}>
      {wide ? (
        <View style={{ flexDirection: "row", gap: spacing[8], alignItems: "flex-start" }}>
          {form}
          {typeCode ? (
            <Enter from="left">
            <View style={{ width: PREVIEW_WIDTH, gap: spacing[2] }}>
              <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("host.onboarding.previewTitle")}</Text>
              <Text style={styles.muted}>{t("host.onboarding.previewHint")}</Text>
              {live(PREVIEW_WIDE)}
            </View>
            </Enter>
          ) : null}
        </View>
      ) : form}
    </Screen>
  );
}
