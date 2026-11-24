import { useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { Checkbox, Chip, FilterSelect, useColors, type ChipTone } from "@rsvp/ui";
import { CONTACT_CHANNELS, partnerRequestErrors, partnerRequestPayload, PARTNER_REQUEST_MESSAGE_MAX, BUSINESS_NAME_MAX, type PartnerRequestFormValues, type PartnerRequestReference } from "@rsvp/forms";
import {
  PARTNER_REQUEST_LIMIT, PARTNER_REQUEST_WINDOW_DAYS, WITHDRAWN_BY_REQUESTER, useMyPartnerRequests, useOfferCategories, useProviderGeo, useSubmitPartnerRequest, useWithdrawPartnerRequest,
  type PartnerRequest
} from "@rsvp/query-hooks";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import { useSingleMutation } from "../platform/single-flight";
import { ActionButton, ChoiceGroup, ConfirmDialog, Field, Loading, Notice, useStyles } from "../host/ui";
import { Screen } from "../host/shell";
import { failureKind, isRetryable } from "../provider/errors";
import { homeFor } from "../auth/routes";

/**
 * DPA-10 · «Solicita ser partner»: any signed-in account (the (account) group, no PROVIDER needed after DPA-1) tells the team about
 * its events business; the team calls back, then asks for the KYP documents and creates the partner. The latest request decides
 * what is shown (newest first from /mine): a live one (OPEN, IN_REVIEW) or a CONVERTED one replaces the form; a REJECTED or
 * withdrawn one shows its reason and the form to try again. There are no e-mails yet (B3), so the screen asks to come back here.
 */

type Values = PartnerRequestFormValues;
const EMPTY: Values = { businessName: "", categoryCode: "", departmentCode: "", cityCode: "", contactPhone: "", contactChannel: "WHATSAPP", message: "", contactConsent: false };
/** Codes with their own wording (the rest read «Revisa este dato»). */
const FIELD_CODES = ["REQUIRED", "TOO_LONG", "UNKNOWN_CATEGORY", "UNKNOWN_DEPARTMENT", "UNKNOWN_CITY", "CITY_NOT_IN_DEPARTMENT", "INVALID_PHONE", "INVALID_CHANNEL", "CONSENT_REQUIRED"];
const FIELDS: readonly (keyof Values)[] = ["businessName", "categoryCode", "departmentCode", "cityCode", "contactChannel", "contactPhone", "message", "contactConsent"];
const LIVE: readonly PartnerRequest["status"][] = ["OPEN", "IN_REVIEW"];
const PORTAL = "/portal";
/** One tone per state; the label always says it too (never colour alone). */
export const REQUEST_TONE: Readonly<Record<PartnerRequest["status"] | "WITHDRAWN", ChipTone>> = { OPEN: "wait", IN_REVIEW: "maybe", CONVERTED: "yes", REJECTED: "no", WITHDRAWN: "wait" };

const problemCode = (error: unknown): string => (error instanceof ApiError ? error.problem?.code ?? "" : "");
const detailsOf = (error: unknown): Record<string, unknown> => {
  const details = error instanceof ApiError ? error.problem?.["details"] : undefined;
  return details && typeof details === "object" && !Array.isArray(details) ? details as Record<string, unknown> : {};
};
/** 422 VALIDATION_FAILED: `details` maps each field to its code. */
export function serverFieldErrors(error: unknown): Record<string, string> {
  if (problemCode(error) !== "VALIDATION_FAILED") return {};
  return Object.fromEntries(Object.entries(detailsOf(error)).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
const isWithdrawn = (request: PartnerRequest): boolean => request.status === "REJECTED" && request.statusReason === WITHDRAWN_BY_REQUESTER;

function useFieldText(): (field: string, code: string | undefined) => string | undefined {
  const t = useT();
  return (field, code) => {
    if (!code) return undefined;
    if (code === "TOO_LONG") return t(`account.partnerRequest.tooLong.${field}`, { defaultValue: t("account.partnerRequest.codes.TOO_LONG") });
    return t(`account.partnerRequest.codes.${FIELD_CODES.includes(code) ? code : "INVALID"}`);
  };
}

/** A labelled picker with its error or help under it. */
function Picker({ label, value, options, onChange, testID, error, help }: { readonly label: string; readonly value: string; readonly options: readonly { readonly value: string; readonly label: string }[]; readonly onChange: (value: string) => void; readonly testID: string; readonly error?: string | undefined; readonly help?: string | undefined }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  return (
    <View style={{ gap: spacing[1], alignItems: "flex-start", flexGrow: 1, flexBasis: 220 }}>
      <Text style={styles.label}>{label}</Text>
      <FilterSelect label={label} value={value} onChange={onChange} options={[{ value: "", label: t("account.partnerRequest.choose") }, ...options]} testID={testID} />
      {error ? <Text role="alert" style={[styles.muted, { color: palette.danger }]}>{error}</Text> : help ? <Text style={styles.muted}>{help}</Text> : null}
    </View>
  );
}

/** The failure of a submit that is not about one field: what happened and the next step. */
function SubmitFailure({ error, onNavigate }: { readonly error: unknown; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const code = problemCode(error);
  if (code === "REQUEST_LIMIT") {
    const details = detailsOf(error);
    const limit = typeof details["limit"] === "number" ? details["limit"] : PARTNER_REQUEST_LIMIT;
    const days = typeof details["windowDays"] === "number" ? details["windowDays"] : PARTNER_REQUEST_WINDOW_DAYS;
    return <Notice kind="error"><Text style={styles.body} testID="request-limit">{t("account.partnerRequest.errors.REQUEST_LIMIT", { limit, days })}</Text></Notice>;
  }
  if (code === "ALREADY_PARTNER_OWNER") {
    return (
      <Notice kind="error">
        <Text style={styles.body}>{t("account.partnerRequest.errors.ALREADY_PARTNER_OWNER")}</Text>
        <ActionButton icon="arrow" variant="secondary" label={t("account.partnerRequest.goToPortal")} onPress={() => onNavigate(PORTAL)} testID="request-go-portal" />
      </Notice>
    );
  }
  if (code === "REQUEST_ALREADY_OPEN") return <Notice kind="error"><Text style={styles.body}>{t("account.partnerRequest.errors.REQUEST_ALREADY_OPEN")}</Text></Notice>;
  if (code === "VALIDATION_FAILED") return <Notice kind="error"><Text style={styles.body}>{t("account.partnerRequest.errors.VALIDATION_FAILED")}</Text></Notice>;
  const kind = failureKind(error);
  const key = kind === "network" ? "network" : kind === "rateLimited" ? "rateLimited" : isRetryable(kind) ? "server" : "generic";
  return <Notice kind="error"><Text style={styles.body}>{t(`account.partnerRequest.errors.${key}`)}</Text></Notice>;
}

function RequestForm({ onNavigate, again, onSent }: { readonly onNavigate: (href: string) => void; readonly again: boolean; readonly onSent: (requestId: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const fieldText = useFieldText();
  const categories = useOfferCategories(client, locale);
  const geo = useProviderGeo(client);
  const submit = useSubmitPartnerRequest(client);
  const submitOnce = useSingleMutation(submit);
  const mine = useMyPartnerRequests(client);
  const [values, setValues] = useState<Values>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const cities = useMemo(() => [...(geo.data?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [geo.data]);
  const departments = useMemo(() => [...new Map(cities.map((city) => [city.departmentCode, { code: city.departmentCode, name: city.department }])).values()].sort((a, b) => a.name.localeCompare(b.name)), [cities]);
  const reference = useMemo<PartnerRequestReference | undefined>(() => (categories.data && geo.data ? {
    categoryCodes: new Set(categories.data.items.map((item) => item.code)),
    departmentCodes: new Set(departments.map((dep) => dep.code)),
    cityDepartment: new Map(cities.map((city) => [city.slug, city.departmentCode]))
  } : undefined), [categories.data, geo.data, departments, cities]);
  const clientErrors = submitted ? partnerRequestErrors(values, reference) : {};
  const errors: Record<string, string> = { ...serverErrors, ...clientErrors };
  const err = (field: keyof Values): string | undefined => fieldText(field, errors[field]);
  const set = (patch: Partial<Values>): void => {
    setValues((current) => ({ ...current, ...patch }));
    setServerErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !(field in patch))));
  };

  const send = (): void => {
    setSubmitted(true);
    const found = partnerRequestErrors(values, reference);
    if (Object.keys(found).length) return;
    submitOnce(partnerRequestPayload(values), {
      onSuccess: (created) => onSent(created.id),
      onError: (error) => {
        setServerErrors(serverFieldErrors(error));
        if (problemCode(error) === "REQUEST_ALREADY_OPEN") void mine.refetch();
      }
    });
  };

  if ((categories.isPending && !categories.data) || (geo.isPending && !geo.data)) return <Loading />;
  if (!categories.data || !geo.data) {
    return (
      <Notice kind="error">
        <Text style={styles.body}>{t("account.partnerRequest.referenceError")}</Text>
        <ActionButton icon="refresh" variant="secondary" label={t("account.partnerRequest.retry")} onPress={() => { void categories.refetch(); void geo.refetch(); }} testID="request-reference-retry" />
      </Notice>
    );
  }
  const failing = FIELDS.filter((field) => errors[field]).length;
  const phoneLabel = values.contactChannel === "PHONE" ? t("account.partnerRequest.fields.phone") : t("account.partnerRequest.fields.whatsapp");
  return (
    <View role="form" aria-label={t("account.partnerRequest.formLabel")} style={{ gap: spacing[4], maxWidth: 640 }} testID="partner-request-form">
      <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t(again ? "account.partnerRequest.againTitle" : "account.partnerRequest.formTitle")}</Text>
      <Field label={t("account.partnerRequest.fields.businessName")} help={t("account.partnerRequest.fields.businessNameHelp")} value={values.businessName} onChange={(businessName) => set({ businessName })} maxLength={BUSINESS_NAME_MAX} testID="request-business" {...(err("businessName") ? { error: err("businessName") as string } : {})} />
      <Picker label={t("account.partnerRequest.fields.category")} value={values.categoryCode} onChange={(categoryCode) => set({ categoryCode })} options={categories.data.items.map((item) => ({ value: item.code, label: item.name }))} testID="request-category" error={err("categoryCode")} />
      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <Picker label={t("account.partnerRequest.fields.department")} value={values.departmentCode} onChange={(departmentCode) => set({ departmentCode, cityCode: "" })} options={departments.map((dep) => ({ value: dep.code, label: dep.name }))} testID="request-department" error={err("departmentCode")} />
        <Picker label={t("account.partnerRequest.fields.city")} value={values.cityCode} onChange={(cityCode) => set({ cityCode })} options={cities.filter((city) => city.departmentCode === values.departmentCode).map((city) => ({ value: city.slug, label: city.name }))} testID="request-city" error={err("cityCode")} help={values.departmentCode ? undefined : t("account.partnerRequest.fields.cityFirst")} />
      </View>
      <ChoiceGroup label={t("account.partnerRequest.fields.channel")} value={values.contactChannel as (typeof CONTACT_CHANNELS)[number]} onChange={(contactChannel) => set({ contactChannel })} choices={CONTACT_CHANNELS.map((channel) => ({ value: channel, label: t(`account.partnerRequest.channels.${channel}`), testID: `request-channel-${channel}` }))} />
      {err("contactChannel") ? <Text role="alert" style={styles.muted}>{err("contactChannel")}</Text> : null}
      <Field label={phoneLabel} help={t("account.partnerRequest.fields.phoneHelp")} value={values.contactPhone} onChange={(contactPhone) => set({ contactPhone })} keyboardType="phone-pad" testID="request-phone" {...(err("contactPhone") ? { error: err("contactPhone") as string } : {})} />
      <Field label={t("account.partnerRequest.fields.message")} help={t("account.partnerRequest.fields.messageHelp", { count: values.message.length, max: PARTNER_REQUEST_MESSAGE_MAX })} value={values.message} onChange={(message) => set({ message })} multiline maxLength={PARTNER_REQUEST_MESSAGE_MAX} testID="request-message" {...(err("message") ? { error: err("message") as string } : {})} />
      <Checkbox label={t("account.partnerRequest.fields.consent")} value={values.contactConsent} onChange={(contactConsent) => set({ contactConsent })} {...(err("contactConsent") ? { error: err("contactConsent") as string } : {})} />
      {submit.error ? <SubmitFailure error={submit.error} onNavigate={onNavigate} /> : null}
      {failing && !submit.error ? <Text role="alert" style={styles.muted} testID="request-fix">{t("account.partnerRequest.fixErrors", { count: failing })}</Text> : null}
      <View style={styles.row}>
        <ActionButton icon="send" label={submit.isPending ? t("account.partnerRequest.submitting") : t("account.partnerRequest.submit")} busy={submit.isPending} onPress={send} testID="request-submit" />
      </View>
    </View>
  );
}

function StatusCard({ request, categoryName, cityName, onWithdraw }: { readonly request: PartnerRequest; readonly categoryName: (code: string) => string; readonly cityName: (code: string) => string; readonly onWithdraw?: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const stamp = useDay();
  const state = isWithdrawn(request) ? "WITHDRAWN" : request.status;
  const tone = REQUEST_TONE[state];
  const channel = t(`account.partnerRequest.channelNames.${request.contactChannel}`);
  return (
    <View style={[styles.card, { gap: spacing[3], maxWidth: 640 }]} testID="partner-request-status">
      <View style={[styles.row, { justifyContent: "space-between", alignItems: "center" }]}>
        <Text accessibilityRole="header" aria-level={2} style={[styles.subtitle, { flexShrink: 1 }]}>{request.businessName}</Text>
        <Chip tone={tone}>{t(`account.partnerRequest.statuses.${state}`)}</Chip>
      </View>
      <Text style={styles.muted}>{t("account.partnerRequest.summary", { category: categoryName(request.categoryCode), city: cityName(request.cityCode), date: stamp(request.createdAt) })}</Text>
      <Text role="status" style={styles.body} testID="partner-request-status-body">
        {t(`account.partnerRequest.statusBody.${state}`, { channel, phone: request.contactPhone, date: stamp(state === "WITHDRAWN" ? request.updatedAt : request.createdAt), reason: request.statusReason ?? "" })}
      </Text>
      {LIVE.includes(request.status) ? <Text style={styles.muted}>{t("account.partnerRequest.comeBack")}</Text> : null}
      {onWithdraw ? <View style={styles.row}><ActionButton icon="close" variant="secondary" label={t("account.partnerRequest.withdraw.action")} onPress={onWithdraw} testID="request-withdraw" /></View> : null}
    </View>
  );
}

/** Calendar day in the viewer's zone ("22 nov 2026"). */
function useDay(): (iso: string) => string {
  const locale = useLocale();
  return (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
  };
}

function WithdrawFailure({ error }: { readonly error: unknown }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const code = problemCode(error);
  const key = ["INVALID_REQUEST_TRANSITION", "PARTNER_REQUEST_VERSION_CONFLICT", "PARTNER_REQUEST_NOT_FOUND"].includes(code) ? code : failureKind(error) === "network" ? "network" : "withdrawGeneric";
  return <Notice kind="error"><Text style={styles.body}>{t(`account.partnerRequest.errors.${key}`)}</Text></Notice>;
}

function Steps(): ReactNode {
  const t = useT();
  const styles = useStyles();
  return (
    <View style={{ gap: spacing[2], maxWidth: 640 }} testID="partner-request-steps">
      <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("account.partnerRequest.steps.title")}</Text>
      {(["send", "call", "kyp"] as const).map((step, index) => <Text key={step} style={styles.body}>{`${index + 1}. ${t(`account.partnerRequest.steps.${step}`)}`}</Text>)}
      <Text style={styles.muted}>{t("account.partnerRequest.noEmail")}</Text>
    </View>
  );
}

function PartnerRequestBody({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const mine = useMyPartnerRequests(client);
  const categories = useOfferCategories(client, locale);
  const geo = useProviderGeo(client);
  const withdraw = useWithdrawPartnerRequest(client);
  const withdrawOnce = useSingleMutation(withdraw);
  const [asking, setAsking] = useState<PartnerRequest | null>(null);
  /** The request sent from this screen during this visit: it gets the «we got it» confirmation. */
  const [sentId, setSentId] = useState<string | null>(null);
  const day = useDay();

  const categoryName = (code: string): string => categories.data?.items.find((item) => item.code === code)?.name ?? code;
  const cityName = (code: string): string => geo.data?.items.find((city) => city.slug === code)?.name ?? code;

  if (mine.isPending) return <View accessibilityLiveRegion="polite"><Text style={styles.muted}>{t("account.partnerRequest.loading")}</Text><Loading /></View>;
  if (mine.error && !mine.data) {
    return (
      <Notice kind="error">
        <Text style={styles.body}>{t(failureKind(mine.error) === "network" ? "account.partnerRequest.loadErrorNetwork" : "account.partnerRequest.loadError")}</Text>
        <ActionButton icon="refresh" variant="secondary" label={t("account.partnerRequest.retry")} onPress={() => { void mine.refetch(); }} testID="request-load-retry" />
      </Notice>
    );
  }
  const items = mine.data?.items ?? [];
  const latest = items[0];
  const older = items.slice(1);
  const showForm = !latest || latest.status === "REJECTED";
  const justSent = latest !== undefined && latest.status === "OPEN" && latest.id === sentId;
  return (
    <View style={{ gap: spacing[6] }}>
      {withdraw.isSuccess ? <Notice kind="success">{t("account.partnerRequest.withdraw.done")}</Notice> : null}
      {justSent ? <Notice kind="success"><Text style={styles.body} testID="request-sent">{t("account.partnerRequest.sent")}</Text></Notice> : null}
      {withdraw.error ? <WithdrawFailure error={withdraw.error} /> : null}
      {latest ? <StatusCard request={latest} categoryName={categoryName} cityName={cityName} {...(latest.status === "OPEN" ? { onWithdraw: () => { withdraw.reset(); setAsking(latest); } } : {})} /> : null}
      {showForm ? <><Steps /><RequestForm onNavigate={onNavigate} again={Boolean(latest)} onSent={(id) => { withdraw.reset(); setSentId(id); }} /></> : null}
      {older.length ? (
        <View style={{ gap: spacing[2], maxWidth: 640 }} testID="partner-request-history">
          <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("account.partnerRequest.history")}</Text>
          {older.map((request) => <Text key={request.id} style={styles.muted}>{t("account.partnerRequest.historyItem", { name: request.businessName, status: t(`account.partnerRequest.statuses.${isWithdrawn(request) ? "WITHDRAWN" : request.status}`), date: day(request.createdAt) })}</Text>)}
        </View>
      ) : null}
      <ConfirmDialog visible={asking !== null} danger title={asking ? t("account.partnerRequest.withdraw.title", { name: asking.businessName }) : ""} body={t("account.partnerRequest.withdraw.body", { limit: PARTNER_REQUEST_LIMIT, days: PARTNER_REQUEST_WINDOW_DAYS })}
        confirmLabel={t("account.partnerRequest.withdraw.confirm")} confirmTestID="request-withdraw-confirm" busy={withdraw.isPending} onCancel={() => setAsking(null)}
        onConfirm={() => { const current = asking; setAsking(null); if (current) withdrawOnce({ requestId: current.id, version: current.version }, { onError: () => { void mine.refetch(); } }); }} />
    </View>
  );
}

export function PartnerRequestScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const claims = useClaims();
  const home = homeFor(claims.roles);
  return (
    <Screen title={t("account.partnerRequest.title")} intro={t("account.partnerRequest.intro")}
      {...(home ? { menu: <ActionButton icon="arrow" variant="secondary" label={t("account.partnerRequest.backHome")} onPress={() => onNavigate(home)} testID="request-home" /> } : {})}>
      <PartnerRequestBody onNavigate={onNavigate} />
    </Screen>
  );
}
