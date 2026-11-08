import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { spacing } from "@rsvp/design-tokens";
import { useMicrosite, useSaveMicrosite, type Microsite, type MicrositeInput, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { Field, Notice, PageIntro } from "../host/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { PortalScreen, usePortalHeader } from "./frame";
import { useSingleMutation } from "../platform/single-flight";
import { MoreToggle, RowsSkeleton } from "./parts";

const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = /^\+?[0-9]{6,15}$/;
const DAYS = /^[0-6](?:\s*,\s*[0-6])*$/;
const CONFLICT = 409;
const MAX_DESCRIPTION = 2000;

interface Form { es: string; en: string; website: string; instagram: string; facebook: string; whatsapp: string; line: string; reference: string; days: string; opens: string; closes: string; note: string }
const toForm = (m: Microsite): Form => ({
  es: m.descriptions["es-BO"] ?? "", en: m.descriptions["en-US"] ?? "", website: m.social["website"] ?? "", instagram: m.social["instagram"] ?? "", facebook: m.social["facebook"] ?? "", whatsapp: m.social["whatsapp"] ?? "",
  line: m.address?.line ?? "", reference: m.address?.reference ?? "", days: m.hours.weekly[0]?.weekdays.join(",") ?? "", opens: m.hours.weekly[0]?.opens ?? "", closes: m.hours.weekly[0]?.closes ?? "", note: m.hours.note ?? ""
});

/** Validation mirrors MicrositeInput; returns i18n keys by field so the screen shows them next to the field. */
export function validateMicrosite(form: Form): { readonly input: MicrositeInput; readonly errors: Partial<Record<keyof Form, string>> } {
  const errors: Partial<Record<keyof Form, string>> = {};
  const https = (key: "website" | "instagram" | "facebook"): void => { if (form[key].trim() && !/^https:\/\/[^\s]+$/.test(form[key].trim())) errors[key] = "portal.microsite.invalidUrl"; };
  https("website"); https("instagram"); https("facebook");
  if (form.whatsapp.trim() && !PHONE.test(form.whatsapp.trim())) errors.whatsapp = "portal.microsite.invalidPhone";
  const hasHours = Boolean(form.days.trim() || form.opens.trim() || form.closes.trim());
  if (hasHours) {
    if (!DAYS.test(form.days.trim())) errors.days = "portal.microsite.invalidDays";
    if (!HOUR.test(form.opens.trim()) || !HOUR.test(form.closes.trim()) || form.opens.trim() >= form.closes.trim()) errors.opens = "portal.microsite.invalidHour";
  }
  const descriptions: Record<string, string> = {};
  if (form.es.trim()) descriptions["es-BO"] = form.es.trim();
  if (form.en.trim()) descriptions["en-US"] = form.en.trim();
  if (form.es.trim().length > MAX_DESCRIPTION) errors.es = "portal.microsite.tooLong";
  if (form.en.trim().length > MAX_DESCRIPTION) errors.en = "portal.microsite.tooLong";
  const social: Record<string, string> = {};
  for (const key of ["website", "instagram", "facebook", "whatsapp"] as const) if (form[key].trim()) social[key] = form[key].trim();
  const input: MicrositeInput = {
    descriptions, social,
    hours: hasHours ? { weekly: [{ weekdays: form.days.split(",").map((day) => Number(day.trim())), opens: form.opens.trim(), closes: form.closes.trim() }], ...(form.note.trim() ? { note: form.note.trim() } : {}) } : { weekly: [] },
    ...(form.line.trim() ? { address: { line: form.line.trim(), ...(form.reference.trim() ? { reference: form.reference.trim() } : {}) } } : {})
  };
  return { input, errors };
}

/**
 * The PUT replaces the whole document, and this form edits only part of it: the gallery, the weekly hours blocks after the first and
 * the address city/coordinates are carried over from the version loaded so saving the form never erases what it cannot show.
 */
export function mergeMicrosite(input: MicrositeInput, loaded: Microsite): MicrositeInput {
  const rest = loaded.hours.weekly.slice(1);
  const weekly = input.hours?.weekly.length ? [...input.hours.weekly, ...rest] : [];
  const { city, latitude, longitude } = loaded.address ?? {};
  return {
    ...input,
    gallery: loaded.gallery,
    ...(input.hours ? { hours: { ...input.hours, weekly } } : {}),
    ...(input.address ? { address: { ...input.address, ...(city ? { city } : {}), ...(latitude !== undefined ? { latitude } : {}), ...(longitude !== undefined ? { longitude } : {}) } } : {})
  };
}

/** Fields kept behind "More options": the second language, the other networks, the weekly hours and the reference. The first four are what couples read first. */
const ADVANCED: readonly (keyof Form)[] = ["en", "instagram", "facebook", "reference", "days", "opens", "closes", "note"];
const hasAdvanced = (form: Form): boolean => ADVANCED.some((key) => form[key].trim() !== "");

function Editor({ microsite, providerId, onReload }: { readonly microsite: Microsite; readonly providerId: string; readonly onReload: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const save = useSaveMicrosite(client, providerId);
  const saveOnce = useSingleMutation(save);
  const [form, setForm] = useState<Form>(() => toForm(microsite));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saved, setSaved] = useState<number | null>(null);
  const [conflict, setConflict] = useState(false);
  const [more, setMore] = useState(() => hasAdvanced(toForm(microsite)));
  useEffect(() => { setForm(toForm(microsite)); }, [microsite.version]);
  const set = (patch: Partial<Form>): void => { setForm((current) => ({ ...current, ...patch })); setSaved(null); };
  const text = (key: keyof Form): string | undefined => (errors[key] ? t(errors[key] as string) : undefined);
  const submit = (): void => {
    const result = validateMicrosite(form);
    setErrors(result.errors); setConflict(false);
    if (ADVANCED.some((key) => result.errors[key])) setMore(true);
    if (Object.keys(result.errors).length) return;
    saveOnce({ input: mergeMicrosite(result.input, microsite), version: microsite.version }, {
      onSuccess: (next) => setSaved(next.version),
      onError: (error) => { if (error instanceof ApiError && error.status === CONFLICT) { setConflict(true); onReload(); } }
    });
  };
  usePortalHeader({ label: save.isPending ? t("portal.microsite.saving") : t("portal.microsite.save"), busy: save.isPending, disabled: save.isPending, onPress: submit, testID: "microsite-save" });
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.microsite.intro")}</PageIntro>
      <View style={{ gap: spacing[3] }}>
        <Field label={t("portal.microsite.descEs")} help={t("portal.microsite.descHelp")} multiline value={form.es} onChange={(es) => set({ es })} error={text("es")} testID="microsite-desc-es" />
        <Field label={t("portal.microsite.website")} value={form.website} onChange={(website) => set({ website })} error={text("website")} testID="microsite-website" />
        <Field label={t("portal.microsite.whatsapp")} keyboardType="phone-pad" value={form.whatsapp} onChange={(whatsapp) => set({ whatsapp })} error={text("whatsapp")} />
        <Field label={t("portal.microsite.address")} help={t("portal.microsite.addressHelp")} value={form.line} onChange={(line) => set({ line })} testID="microsite-address" />
        <MoreToggle label={t(more ? "portal.home.less" : "portal.home.more")} onPress={() => setMore((current) => !current)} testID="microsite-more" />
        {more ? (
          <View style={{ gap: spacing[3] }}>
            <Field label={t("portal.microsite.descEn")} multiline value={form.en} onChange={(en) => set({ en })} error={text("en")} testID="microsite-desc-en" />
            <Field label={t("portal.microsite.instagram")} value={form.instagram} onChange={(instagram) => set({ instagram })} error={text("instagram")} />
            <Field label={t("portal.microsite.facebook")} value={form.facebook} onChange={(facebook) => set({ facebook })} error={text("facebook")} />
            <Field label={t("portal.microsite.reference")} value={form.reference} onChange={(reference) => set({ reference })} />
            <Field label={t("portal.microsite.hoursDays")} value={form.days} onChange={(days) => set({ days })} error={text("days")} testID="microsite-days" />
            <Field label={t("portal.microsite.hoursOpens")} value={form.opens} onChange={(opens) => set({ opens })} error={text("opens")} testID="microsite-opens" />
            <Field label={t("portal.microsite.hoursCloses")} value={form.closes} onChange={(closes) => set({ closes })} testID="microsite-closes" />
            <Field label={t("portal.microsite.hoursNote")} value={form.note} onChange={(note) => set({ note })} />
          </View>
        ) : null}
        {Object.keys(errors).length ? <Notice kind="error">{t("portal.microsite.invalid")}</Notice> : null}
        {conflict ? <Notice kind="error">{t("portal.microsite.conflict")}</Notice> : null}
        {save.isError && !conflict ? <ErrorNotice error={save.error} onRetry={submit} /> : null}
        {saved !== null ? <Notice kind="success">{t("portal.microsite.saved", { version: saved })}</Notice> : null}
      </View>
    </View>
  );
}

/** D5 · Public profile editor (REQ-F28-02): descriptions per locale, social networks, address and weekly hours; whole-document PUT guarded by If-Match. */
function Microsites({ provider }: { readonly provider: Provider }): ReactNode {
  const client = useApiClient();
  const microsite = useMicrosite(client, provider.id);
  if (microsite.isPending) return <RowsSkeleton count={3} minHeight={96} trailing={false} />;
  if (microsite.isError) return <ErrorNotice error={microsite.error} onRetry={() => { void microsite.refetch(); }} onReload={() => { void microsite.refetch(); }} />;
  return <Editor microsite={microsite.data} providerId={provider.id} onReload={() => { void microsite.refetch(); }} />;
}

export function MicrositeScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.microsite.title")} current="microsite">{(provider) => <Microsites provider={provider} />}</PortalScreen>;
}
