import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@rsvp/api-client";
import { nativeMagicLink, personalLinkOrigin, personalLinkUrl } from "@rsvp/auth";
import { readContent, type HostContact, type PublicCelebrationView } from "@rsvp/celebration-theme";
import { colors, spacing } from "@rsvp/design-tokens";
import { rsvpSchema, unregisteredRsvpSchema } from "@rsvp/forms";
import { formatCelebrationDate, type Translate } from "@rsvp/i18n";
import {
  classifyRsvpError, countdownTo, newIdempotencyKey, rsvpScreenFor, useCelebrationBySlug, useGuestResource, useGuestRsvp, usePublicRegistrationSettings, useRegisterUnregistered, useSaveGuestRsvp,
  type Countdown as CountdownValue, type RsvpFailure, type RsvpState
} from "@rsvp/query-hooks";
import { LanguageSwitch } from "../auth/auth-ui";
import { ActionButton, ChoiceGroup, Field, Notice, styles } from "../host/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { copyText } from "../platform/clipboard";

/**
 * F21-04 · The five states of F15, native. Same contract calls and same copy (`rsvp.*`) as the web page;
 * the personal token lives only in component memory and the Authorization header.
 */

const palette = colors.light;
type Status = "" | "CONFIRMED" | "DECLINED";
interface Draft { status: Status; requestedCompanions: string; dietaryNotes: string; message: string }
interface ClosedInfo { deadline?: string; deadlineLocal?: string; timeZone?: string }
type Errors = Partial<Record<"status" | "requestedCompanions" | "dietaryNotes" | "message" | "name" | "email" | "consent", string>>;

const KNOWN_ISSUES = ["companions", "tooLong", "required", "email", "consent"];
function issueMessages(issues: readonly { path: (string | number)[]; message: string }[], t: Translate): Errors {
  const errors: Errors = {};
  for (const issue of issues) {
    const field = String(issue.path[0]) as keyof Errors;
    if (!(field in errors)) errors[field] = t(`rsvp.errors.${KNOWN_ISSUES.includes(issue.message) ? issue.message : "required"}`);
  }
  return errors;
}
const initialDraft = (state: RsvpState): Draft => ({ status: state.status === "PENDING" ? "" : state.status, requestedCompanions: String(state.requestedCompanions), dietaryNotes: state.dietaryNotes ?? "", message: state.message ?? "" });

function Frame({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
      <LanguageSwitch />
    </ScrollView>
  );
}

function Heading({ children }: { readonly children: string }): ReactNode {
  return <Text accessibilityRole="header" aria-level={1} style={styles.title}>{children}</Text>;
}

function Loading(): ReactNode {
  const t = useT();
  return <Frame><View accessibilityLiveRegion="polite" style={styles.row}><ActivityIndicator color={palette.primary} /><Text style={styles.muted}>{t("rsvp.loading")}</Text></View></Frame>;
}

/** Invalid, expired, revoked or unknown: one screen, no celebration data (REQ-F15-04 / F21-06). */
function Invalid(): ReactNode {
  const t = useT();
  return <Frame><View style={styles.card}><Heading>{t("rsvp.invalid.title")}</Heading><Text style={styles.body}>{t("rsvp.invalid.body")}</Text><Text style={styles.muted}>{t("rsvp.invalid.hint")}</Text></View></Frame>;
}

function LoadFailure({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }): ReactNode {
  const t = useT();
  return <Frame><Notice kind="error"><Text style={styles.body}>{message}</Text><ActionButton label={t("rsvp.actions.retry")} onPress={onRetry} /></Notice></Frame>;
}

function CountdownLine({ deadline }: { readonly deadline: string | null }): ReactNode {
  const t = useT();
  const [left, setLeft] = useState<CountdownValue | null>(() => countdownTo(deadline, Date.now()));
  useEffect(() => {
    setLeft(countdownTo(deadline, Date.now()));
    const timer = setInterval(() => setLeft(countdownTo(deadline, Date.now())), 30_000);
    return () => clearInterval(timer);
  }, [deadline]);
  if (!left) return null;
  return <Text accessibilityRole="timer" accessibilityLabel={t("rsvp.countdown.label")} style={[styles.label, { color: palette.text }]}>{t("rsvp.countdown.value", { days: left.days, hours: left.hours, minutes: left.minutes })}</Text>;
}

function DeadlineLine({ state }: { readonly state: RsvpState }): ReactNode {
  const t = useT();
  const locale = useLocale();
  if (!state.deadline) return <Text style={styles.body}>{t("rsvp.deadline.none")}</Text>;
  return <Text style={styles.body}>{t("rsvp.deadline.open", { date: formatCelebrationDate(state.deadline, { locale, timeZone: state.timeZone }), timeZone: state.timeZone })}</Text>;
}

function AnswerSummary({ state }: { readonly state: RsvpState }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const waiting = state.status === "CONFIRMED" ? Math.max(0, state.requestedCompanions - state.approvedCompanions) : 0;
  return (
    <View accessibilityLabel={t("rsvp.summary.label")} style={{ gap: spacing[1] }}>
      <Text style={[styles.label, { color: palette.primary }]}>{t(`rsvp.status.${state.status}`)}</Text>
      {state.status === "CONFIRMED" ? <Text style={styles.body}>{t("rsvp.summary.companions", { count: state.approvedCompanions })}</Text> : null}
      {waiting ? <Text style={styles.body}>{t("rsvp.summary.pendingCompanions", { count: waiting })}</Text> : null}
      {state.dietaryNotes ? <Text style={styles.body}>{t("rsvp.summary.dietary", { value: state.dietaryNotes })}</Text> : null}
      {state.message ? <Text style={styles.body}>{t("rsvp.summary.message", { value: state.message })}</Text> : null}
      {state.updatedAt ? <Text style={styles.muted}>{t("rsvp.summary.updated", { date: formatCelebrationDate(state.updatedAt, { locale, timeZone: state.timeZone }) })}</Text> : null}
    </View>
  );
}

function hostList(hosts: readonly string[], locale: string): string { return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(hosts); }

/** "Who to write to": the published `hostContact` (only with the hosts' consent) plus the host names. */
function HostContactLines({ hosts, contact }: { readonly hosts: readonly string[]; readonly contact?: HostContact | undefined }): ReactNode {
  const t = useT();
  const locale = useLocale();
  return (
    <>
      <Text style={styles.body}>{hosts.length ? t("rsvp.closed.contact", { hosts: hostList(hosts, locale) }) : t("rsvp.closed.contactGeneric")}</Text>
      {contact?.email ? <Text testID="host-contact-email" accessibilityRole="link" style={styles.body} onPress={() => { void Linking.openURL(`mailto:${contact.email}`); }}>{t("rsvp.closed.contactEmail")} {contact.email}</Text> : null}
      {contact?.phone ? <Text testID="host-contact-phone" accessibilityRole="link" style={styles.body} onPress={() => { void Linking.openURL(`tel:${contact.phone}`); }}>{t("rsvp.closed.contactPhone")} {contact.phone}</Text> : null}
    </>
  );
}

function Closed({ info, state, hosts, contact }: { readonly info: ClosedInfo; readonly state: RsvpState | null; readonly hosts: readonly string[]; readonly contact?: HostContact | undefined }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const deadline = info.deadline ?? state?.deadline ?? undefined;
  const timeZone = info.timeZone ?? state?.timeZone;
  const when = info.deadlineLocal ?? (deadline && timeZone ? formatCelebrationDate(deadline, { locale, timeZone }) : undefined);
  return (
    <View style={styles.card}>
      <Heading>{t("rsvp.closed.title")}</Heading>
      <Text style={styles.body}>{when && timeZone ? t("rsvp.closed.closedOn", { date: when, timeZone }) : t("rsvp.closed.closedGeneric")}</Text>
      <HostContactLines hosts={hosts} contact={contact} />
      {state && state.status !== "PENDING" ? <><Text style={styles.muted}>{t("rsvp.closed.yourAnswer", { status: t(`rsvp.status.${state.status}`) })}</Text><AnswerSummary state={state} /></> : null}
    </View>
  );
}

function FailureNotice({ failure, onRetry, busy }: { readonly failure: RsvpFailure; readonly onRetry: () => void; readonly busy: boolean }): ReactNode {
  const t = useT();
  const messages: Record<string, string> = {
    offline: t("rsvp.errors.offline"), unavailable: t("rsvp.errors.unavailable"), validation: t("rsvp.errors.validation"), conflict: t("rsvp.errors.conflict"), exists: t("rsvp.errors.conflict"), unknown: t("rsvp.errors.unknown"),
    "rate-limited": failure.kind === "rate-limited" && failure.retryAfterSeconds ? t("rsvp.errors.rateLimited", { seconds: failure.retryAfterSeconds }) : t("rsvp.errors.rateLimitedNoWait")
  };
  const retryable = ["offline", "unavailable", "rate-limited", "unknown"].includes(failure.kind);
  return (
    <Notice kind="error">
      <Text style={styles.body}>{messages[failure.kind] ?? t("rsvp.errors.unknown")}</Text>
      {retryable ? <ActionButton variant="secondary" label={t("rsvp.actions.retry")} disabled={busy} onPress={onRetry} /> : null}
      <Text style={styles.muted}>{t("rsvp.draft.kept")}</Text>
    </Notice>
  );
}

function AnswerFields({ draft, onChange, errors, allowed, askAttendance = true }: { readonly draft: Draft; readonly onChange: (patch: Partial<Draft>) => void; readonly errors: Errors; readonly allowed?: number; readonly askAttendance?: boolean }): ReactNode {
  const t = useT();
  return (
    <View style={{ gap: spacing[4] }}>
      {askAttendance ? (
        <View style={{ gap: spacing[1] }}>
          <ChoiceGroup<"CONFIRMED" | "DECLINED"> label={t("rsvp.form.statusLegend")} value={draft.status || null} onChange={(status) => onChange({ status })}
            choices={[{ value: "CONFIRMED", label: t("rsvp.form.confirm") }, { value: "DECLINED", label: t("rsvp.form.decline") }]} />
          {errors.status ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{errors.status}</Text> : null}
        </View>
      ) : null}
      {draft.status !== "DECLINED" ? <Field label={t("rsvp.form.companions")} keyboardType="number-pad" value={draft.requestedCompanions} onChange={(requestedCompanions) => onChange({ requestedCompanions })} error={errors.requestedCompanions} help={allowed === undefined ? undefined : t("rsvp.form.companionsHelp", { count: allowed })} /> : null}
      <Field label={t("rsvp.form.dietary")} help={t("rsvp.form.dietaryHelp")} multiline value={draft.dietaryNotes} onChange={(dietaryNotes) => onChange({ dietaryNotes })} error={errors.dietaryNotes} />
      <Field label={t("rsvp.form.message")} multiline value={draft.message} onChange={(message) => onChange({ message })} error={errors.message} />
    </View>
  );
}

export interface GuestRsvpScreenProps { readonly slug: string; readonly token?: string }

export function GuestRsvpScreen({ slug, token }: GuestRsvpScreenProps): ReactNode {
  const t = useT();
  const client = useApiClient();
  const celebration = useCelebrationBySlug<PublicCelebrationView>(client, slug);
  const celebrationId = celebration.data?.celebrationId;
  const resource = useGuestResource(client, celebrationId, token ?? "");
  const rsvp = useGuestRsvp(client, celebrationId, token ?? "");
  const [closed, setClosed] = useState<ClosedInfo | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  if (!slug || revoked || (celebration.error instanceof ApiError && celebration.error.status === 404)) return <Invalid />;
  if (celebration.isError) return <LoadFailure message={t("rsvp.errors.offline")} onRetry={() => { void celebration.refetch(); }} />;
  if (celebration.isPending) return <Loading />;
  const view = celebration.data;
  const content = readContent(view);
  const hosts = content.hosts.map((host) => host.name);
  if (!token) return <PublicRegistration view={view} slug={slug} hosts={hosts} contact={content.hostContact} />;
  if (rsvp.isError) {
    const failure = classifyRsvpError(rsvp.error);
    if (failure.kind === "invalid") return <Invalid />;
    return <LoadFailure message={failure.kind === "offline" ? t("rsvp.errors.offline") : t("rsvp.errors.unavailable")} onRetry={() => { void rsvp.refetch(); }} />;
  }
  if (rsvp.isPending) return <Loading />;
  const state = rsvp.data;
  const screen = closed ? "closed" : rsvpScreenFor(state);
  const header = <Text style={styles.muted}>{t("rsvp.page.invitationTo", { title: content.title })}</Text>;
  if (screen === "closed") return <Frame>{header}<Closed info={closed ?? {}} state={state} hosts={hosts} contact={content.hostContact} /></Frame>;

  const form = (
    <AnswerForm key={editing ? "edit" : "first"} celebrationId={view.celebrationId} token={token} state={state} allowed={resource.data?.allowedCompanions} mode={screen === "guest" ? "first" : "edit"}
      onCancel={screen === "confirmed" ? () => setEditing(false) : undefined} onClosed={setClosed} onInvalid={() => setRevoked(true)}
      onSaved={(next) => { setEditing(false); setNotice(next.status === "DECLINED" ? t("rsvp.success.declined") : screen === "guest" ? t("rsvp.success.confirmed") : t("rsvp.success.saved")); }} />
  );
  if (screen === "guest") {
    return <Frame>{header}<View style={styles.card}><Heading>{t("rsvp.guest.title")}</Heading><Text style={styles.body}>{t("rsvp.guest.intro")}</Text><DeadlineLine state={state} /><CountdownLine deadline={state.deadline} />{form}</View></Frame>;
  }
  return (
    <Frame>
      {header}
      <View style={styles.card}>
        <Heading>{state.status === "DECLINED" ? t("rsvp.confirmed.titleDeclined") : t("rsvp.confirmed.title")}</Heading>
        {notice ? <Notice kind="success">{notice}</Notice> : null}
        <AnswerSummary state={state} />
        <DeadlineLine state={state} />
        <CountdownLine deadline={state.deadline} />
        <ActionButton variant="secondary" label={t("gifts.title")} onPress={() => { router.push(`/c/${encodeURIComponent(slug)}/regalos/${encodeURIComponent(token)}` as never); }} testID="open-gifts" />
        {editing ? form : <><ActionButton label={t("rsvp.confirmed.edit")} onPress={() => { setNotice(""); setEditing(true); }} /><Text style={styles.muted}>{t("rsvp.confirmed.editHint")}</Text></>}
      </View>
    </Frame>
  );
}

function AnswerForm({ celebrationId, token, state, allowed, mode, onSaved, onClosed, onInvalid, onCancel }: { readonly celebrationId: string; readonly token: string; readonly state: RsvpState; readonly allowed: number | undefined; readonly mode: "first" | "edit"; readonly onSaved: (state: RsvpState) => void; readonly onClosed: (info: ClosedInfo) => void; readonly onInvalid: () => void; readonly onCancel?: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const save = useSaveGuestRsvp(client, celebrationId, token);
  // The draft lives in component state: a failed send never clears it. Nothing is written to device storage.
  const [draft, setDraft] = useState<Draft>(() => initialDraft(state));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);

  async function submit(): Promise<void> {
    const parsed = rsvpSchema.safeParse(draft);
    if (!parsed.success) { setErrors(issueMessages(parsed.error.issues, t)); return; }
    setErrors({});
    const declined = parsed.data.status === "DECLINED";
    const input = { status: parsed.data.status, requestedCompanions: declined ? 0 : parsed.data.requestedCompanions, dietaryNotes: parsed.data.dietaryNotes || null, message: parsed.data.message || null };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newIdempotencyKey() };
    try {
      const next = await save.mutateAsync({ current: state, input, idempotencyKey: attempt.current.key });
      setFailure(null);
      onSaved(next);
    } catch (error) {
      const failed = classifyRsvpError(error);
      if (failed.kind === "closed") onClosed(failed);
      else if (failed.kind === "invalid") onInvalid();
      else setFailure(failed);
    }
  }
  const busy = save.isPending;
  return (
    <View style={{ gap: spacing[4] }}>
      <AnswerFields draft={draft} errors={errors} allowed={allowed} onChange={(patch) => { setDraft((current) => ({ ...current, ...patch })); setErrors({}); }} />
      {Object.keys(errors).length ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{t("rsvp.errors.summary")}</Text> : null}
      {failure ? <FailureNotice failure={failure} busy={busy} onRetry={() => { void submit(); }} /> : null}
      <ActionButton testID="rsvp-submit" label={busy ? t("rsvp.form.submitting") : mode === "first" ? t("rsvp.form.submit") : t("rsvp.form.save")} busy={busy} onPress={() => { void submit(); }} />
      {onCancel ? <ActionButton variant="secondary" label={t("rsvp.form.cancelEdit")} disabled={busy} onPress={onCancel} /> : null}
    </View>
  );
}

/** GET .../public-settings first: the form only appears when public registration can succeed. */
function PublicRegistration(props: { readonly view: PublicCelebrationView; readonly slug: string; readonly hosts: readonly string[]; readonly contact: HostContact | undefined }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const settings = usePublicRegistrationSettings(client, props.view.celebrationId);
  if (settings.isPending) return <Loading />;
  if (settings.isError) return <LoadFailure message={t("rsvp.unregistered.unavailable")} onRetry={() => { void settings.refetch(); }} />;
  if (!settings.data.publicRegistrationEnabled) return <RestrictedNotice hosts={props.hosts} contact={props.contact} />;
  return <PublicRegistrationForm {...props} />;
}

function RestrictedNotice({ hosts, contact }: { readonly hosts: readonly string[]; readonly contact: HostContact | undefined }): ReactNode {
  const t = useT();
  return <Frame><View style={styles.card}><Heading>{t("rsvp.unregistered.restrictedTitle")}</Heading><Text style={styles.body}>{t("rsvp.unregistered.restrictedBody")}</Text><HostContactLines hosts={hosts} contact={contact} /></View></Frame>;
}

function PublicRegistrationForm({ view, slug, hosts, contact }: { readonly view: PublicCelebrationView; readonly slug: string; readonly hosts: readonly string[]; readonly contact: HostContact | undefined }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const register = useRegisterUnregistered(client, view.celebrationId);
  const [draft, setDraft] = useState<Draft & { name: string; email: string; consent: boolean }>({ status: "CONFIRMED", requestedCompanions: "0", dietaryNotes: "", message: "", name: "", email: "", consent: false });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const [receipt, setReceipt] = useState<{ link: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const title = useMemo(() => readContent(view).title, [view]);

  async function submit(): Promise<void> {
    const parsed = unregisteredRsvpSchema.safeParse(draft);
    if (!parsed.success) { setErrors(issueMessages(parsed.error.issues, t)); return; }
    setErrors({});
    const input = { name: parsed.data.name, email: parsed.data.email, locale, consent: true as const, requestedCompanions: parsed.data.requestedCompanions, dietaryNotes: parsed.data.dietaryNotes || null, message: parsed.data.message || null };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newIdempotencyKey() };
    try {
      const response = await register.mutateAsync({ input, idempotencyKey: attempt.current.key });
      setFailure(null);
      setReceipt({ link: response.accessToken ? personalLinkUrl(personalLinkOrigin({ EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL, RSVP_PUBLIC_ORIGIN: process.env.EXPO_PUBLIC_RSVP_ORIGIN }), slug, response.accessToken.token).url : null });
    } catch (error) { setFailure(classifyRsvpError(error)); }
  }

  if (failure?.kind === "restricted") return <RestrictedNotice hosts={hosts} contact={contact} />;
  if (receipt) {
    return (
      <Frame>
        <View style={styles.card}>
          <Heading>{t("rsvp.unregistered.doneTitle")}</Heading>
          {receipt.link ? (
            <>
              <Text style={styles.body}>{t("rsvp.unregistered.doneBody")}</Text>
              <Field label={t("rsvp.unregistered.linkLabel")} value={receipt.link} onChange={() => undefined} />
              <ActionButton label={t("rsvp.actions.copyLink")} onPress={() => { void copyText(receipt.link ?? "").then(setCopied); }} />
              {copied ? <Notice kind="success">{t("rsvp.actions.copied")}</Notice> : null}
            </>
          ) : <Text style={styles.body}>{t("rsvp.unregistered.replayBody")}</Text>}
        </View>
      </Frame>
    );
  }
  const busy = register.isPending;
  return (
    <Frame>
      <Text style={styles.muted}>{t("rsvp.page.invitationTo", { title })}</Text>
      <View style={styles.card}>
        <Heading>{t("rsvp.unregistered.title")}</Heading>
        <Text style={styles.body}>{t("rsvp.unregistered.intro")}</Text>
        <Field label={t("rsvp.form.name")} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} error={errors.name} />
        <Field label={t("rsvp.form.email")} keyboardType="email-address" help={t("rsvp.form.emailHelp")} value={draft.email} onChange={(email) => setDraft({ ...draft, email })} error={errors.email} />
        <AnswerFields draft={draft} askAttendance={false} errors={errors} onChange={(patch) => setDraft({ ...draft, ...patch })} />
        <Pressable accessibilityRole="checkbox" aria-checked={draft.consent} accessibilityLabel={t("rsvp.form.consent")} onPress={() => setDraft({ ...draft, consent: !draft.consent })} style={[styles.option, draft.consent && styles.optionSelected]}>
          <Text style={styles.body}>{draft.consent ? "☑ " : "☐ "}{t("rsvp.form.consent")}</Text>
        </Pressable>
        {errors.consent ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{errors.consent}</Text> : null}
        {failure ? <FailureNotice failure={failure} busy={busy} onRetry={() => { void submit(); }} /> : null}
        <ActionButton testID="rsvp-register" label={busy ? t("rsvp.form.submitting") : t("rsvp.form.register")} busy={busy} onPress={() => { void submit(); }} />
      </View>
    </Frame>
  );
}

/** F21-03 · "open in app" helper for the web fallback of the same screen: used by the legacy token-only landing. */
export function openInApp(token: string, slug?: string): Promise<void> { return Linking.openURL(nativeMagicLink(token, slug)); }
