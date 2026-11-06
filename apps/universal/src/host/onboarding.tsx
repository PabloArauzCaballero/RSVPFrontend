import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useCelebration, useCreateCelebration, useEventTypes, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import { canUseHostWorkspace } from "./gate";
import { slugify, toWallClock } from "./content-draft";
import { editorPath, HOST_ROUTES, withCelebration } from "./routes";
import { TemplateGallery } from "./template-gallery";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LIMITS, overLimit, slugProblem } from "./limits";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Loading, Notice, Screen, Section, styles } from "./ui";

/** C3–C5 · Event type, basics (date, language, time zone, currency, hosts by role) and template with live preview. */

export const TIME_ZONES = ["America/La_Paz", "America/Lima", "America/Bogota", "America/Santiago", "America/Argentina/Buenos_Aires", "America/Asuncion", "America/Mexico_City", "America/New_York", "Europe/Madrid"] as const;
export const CURRENCIES = ["BOB", "USD", "EUR", "ARS", "BRL", "CLP", "PEN", "PYG", "MXN"] as const;
const LANGUAGES = ["es-BO", "en-US"] as const;
const LAST_STEP = 3;
const DETAILS_STEP = 2;

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function zoneChoices(): string[] {
  const device = deviceTimeZone();
  return TIME_ZONES.includes(device as (typeof TIME_ZONES)[number]) ? [...TIME_ZONES] : [...TIME_ZONES, device];
}

export function OnboardingScreen({ step: initialStep, celebrationId, onNavigate }: { readonly step: number; readonly celebrationId?: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const claims = useClaims();
  const types = useEventTypes(client, locale);
  const create = useCreateCelebration<Celebration>(client);
  const existing = useCelebration(client, celebrationId ?? "");
  const [step, setStep] = useState(celebrationId ? LAST_STEP : Math.min(initialStep, DETAILS_STEP));
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [when, setWhen] = useState({ date: "", time: "" });
  const [timeZone, setTimeZone] = useState(deviceTimeZone());
  const [language, setLanguage] = useState<string>(locale);
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [hosts, setHosts] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<string | null>(null);
  const once = useSingleFlight();
  const type = types.data?.items.find((item) => item.code === (typeCode ?? existing.data?.eventTypeCode));
  if (!canUseHostWorkspace(claims)) return <Screen title={t("host.onboarding.title")}><Notice kind="error">{t("host.common.accessDenied")}</Notice></Screen>;

  const submit = (): void => {
    const eventDate = toWallClock(when);
    if (!eventDate.ok) { setInvalid(t("host.onboarding.dateLabel")); return; }
    if (!typeCode || !title.trim()) { setInvalid(t("host.onboarding.titleLabel")); return; }
    if (overLimit(title, LIMITS.title) !== null) { setInvalid(t("host.limits.tooLong", { count: overLimit(title, LIMITS.title) ?? 0, max: LIMITS.title })); return; }
    if (slugProblem(slug)) { setInvalid(t("host.onboarding.slugLabel")); return; }
    setInvalid(null);
    const namedHosts = Object.fromEntries(Object.entries(hosts).filter(([, name]) => name.trim()));
    once((release) => create.mutate({
      slug, eventTypeCode: typeCode, defaultLocale: language, supportedLocales: [language], timeZone, currency,
      content: { title: title.trim(), ...(eventDate.value ? { eventDate: eventDate.value } : {}), ...(Object.keys(namedHosts).length ? { hosts: namedHosts } : {}) }
    }, { onSuccess: (created) => onNavigate(withCelebration(`${HOST_ROUTES.onboarding}/${LAST_STEP}`, created.id)), onSettled: release }));
  };

  const steps: Readonly<Record<number, () => ReactNode>> = {
    1: () => (
      <Section title={t("host.onboarding.typeTitle")}>
        <Text style={styles.muted}>{t("host.onboarding.typeHelp")}</Text>
        {types.isPending ? <Loading /> : null}
        <ErrorNotice error={types.error} />
        <ChoiceGroup label={t("host.onboarding.typeTitle")} value={typeCode} onChange={setTypeCode} choices={(types.data?.items ?? []).map((item) => ({ value: item.code, label: item.name, description: item.description ?? undefined }))} />
        <ActionButton label={t("host.common.next")} disabled={!typeCode} onPress={() => setStep(DETAILS_STEP)} testID="onboarding-next" />
      </Section>
    ),
    2: () => (
      <Section title={t("host.onboarding.detailsTitle")}>
        <Field label={t("host.onboarding.titleLabel")} placeholder={t("host.onboarding.titlePlaceholder")} value={title} testID="onboarding-title" {...(overLimit(title, LIMITS.title) !== null ? { error: t("host.limits.tooLong", { count: overLimit(title, LIMITS.title) ?? 0, max: LIMITS.title }) } : {})} onChange={(value) => { setTitle(value); if (!slugEdited) setSlug(slugify(value)); }} />
        <Field label={t("host.onboarding.slugLabel")} help={t("host.onboarding.slugHelp", { url: `/c/${slug}` })} value={slug} testID="onboarding-slug" {...(slug && slugProblem(slug) ? { error: t(`host.limits.slug${slugProblem(slug) === "length" ? "Length" : "Pattern"}`) } : {})} onChange={(value) => { setSlugEdited(true); setSlug(value.toLowerCase()); }} />
        <View style={styles.row}>
          <View style={{ flexGrow: 1 }}><Field label={t("host.onboarding.dateLabel")} value={when.date} onChange={(date) => setWhen((current) => ({ ...current, date }))} keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flexGrow: 1 }}><Field label={t("host.onboarding.timeLabel")} value={when.time} onChange={(time) => setWhen((current) => ({ ...current, time }))} keyboardType="numbers-and-punctuation" /></View>
        </View>
        <ChoiceGroup label={t("host.onboarding.timeZoneLabel")} value={timeZone} onChange={setTimeZone} choices={zoneChoices().map((zone) => ({ value: zone, label: zone }))} />
        <Text style={styles.muted}>{t("host.onboarding.timeZoneHelp")}</Text>
        <ChoiceGroup label={t("host.onboarding.languageLabel")} value={language} onChange={setLanguage} choices={LANGUAGES.map((value) => ({ value, label: t(`celebration.language.${value}`) }))} />
        <ChoiceGroup label={t("host.onboarding.currencyLabel")} value={currency} onChange={setCurrency} choices={CURRENCIES.map((value) => ({ value, label: value }))} />
        <Text accessibilityRole="header" style={styles.label}>{t("host.onboarding.hostsTitle")}</Text>
        {(type?.hostRoles ?? []).map((role) => <Field key={role.role} label={role.label} value={hosts[role.role] ?? ""} onChange={(name) => setHosts((current) => ({ ...current, [role.role]: name }))} />)}
        {invalid ? <Notice kind="error">{t("host.common.invalid", { detail: invalid })}</Notice> : null}
        <CelebrationErrorNotice error={create.error} />
        <View style={styles.row}>
          <ActionButton variant="secondary" label={t("host.common.back")} onPress={() => setStep(1)} />
          <ActionButton label={t("host.onboarding.create")} busy={create.isPending} onPress={submit} testID="onboarding-create" />
        </View>
      </Section>
    ),
    3: () => (
      <Section title={t("host.onboarding.templateTitle")}>
        <Text style={styles.muted}>{t("host.onboarding.templateHelp")}</Text>
        {existing.data ? <TemplateGallery celebration={existing.data} eventType={type} onApplied={() => { void existing.refetch(); }} /> : <Loading />}
        <View style={styles.row}>
          <ActionButton label={t("host.onboarding.finish")} onPress={() => onNavigate(withCelebration(editorPath("general"), celebrationId))} testID="onboarding-finish" />
        </View>
      </Section>
    )
  };

  return (
    <Screen title={t("host.onboarding.title")}>
      <Text style={styles.muted}>{t("host.onboarding.step", { step })}</Text>
      {steps[step]?.()}
    </Screen>
  );
}
