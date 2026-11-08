import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@rsvp/api-client";
import { nativeMagicLink, personalLinkOrigin, personalLinkUrl } from "@rsvp/auth";
import { readContent, type HostContact, type PublicCelebrationView } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { Celebrate, Checkbox, CheckMark, Chip } from "@rsvp/ui";
import { rsvpSchema, unregisteredRsvpSchema } from "@rsvp/forms";
import { formatCelebrationDate, type AppLocale, type Translate } from "@rsvp/i18n";
import {
  classifyRsvpError, countdownTo, guestVisible, newIdempotencyKey, rsvpScreenFor, useCelebrationBySlug, useGiftList, useGuestResource, useGuestRsvp, usePublicRegistrationSettings, useRegisterUnregistered, useSaveGuestRsvp,
  type Countdown as CountdownValue, type RsvpFailure, type RsvpState
} from "@rsvp/query-hooks";
import { AttendanceChoice, CompanionsStepper, ExtrasFields, type Attendance } from "./answer-fields";
import { GuestFrame, type GuestFrameProps } from "./frame";
import { InvalidLink, LinkState, OfflineState } from "./link-states";
import { ActionButton, Field, Notice, styles } from "../host/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { useSingleFlightGate } from "../platform/single-flight";
import { copyText } from "../platform/clipboard";
import { livePalette } from "../platform/theme";

/**
 * The guest's whole journey in one place (F21-04, mode Persuade): the invitation on the cover, the answer under it
 * (two taps for "I am coming"), a drawn check when it is saved and, only if there is a gift list, one tap to it.
 * Same contract calls as the web page; the personal token lives only in component memory and the Authorization header.
 */

const palette = livePalette;
/** From here a wait is told in minutes. */
const LONG_WAIT_SECONDS = 90;
interface Draft { status: Attendance; requestedCompanions: string; dietaryNotes: string; message: string }
interface ClosedInfo { deadline?: string; deadlineLocal?: string; timeZone?: string }
type Errors = Partial<Record<"status" | "requestedCompanions" | "dietaryNotes" | "message" | "name" | "email" | "consent", string>>;
type Saved = "first" | "edit" | null;

const KNOWN_ISSUES = ["companions", "tooLong", "required", "email", "consent"];
function issueMessages(issues: readonly { path: (string | number)[]; message: string }[], t: Translate): Errors {
  const errors: Errors = {};
  for (const issue of issues) {
    const field = String(issue.path[0]) as keyof Errors;
    if (!(field in errors)) errors[field] = field === "status" ? t("rsvp.invite.chooseOne") : t(`rsvp.invite.errors.${KNOWN_ISSUES.includes(issue.message) ? issue.message : "required"}`);
  }
  return errors;
}
const initialDraft = (state: RsvpState): Draft => ({ status: state.status === "PENDING" ? "" : state.status, requestedCompanions: String(state.requestedCompanions), dietaryNotes: state.dietaryNotes ?? "", message: state.message ?? "" });

function hostList(hosts: readonly string[], locale: string): string { return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(hosts); }

/** The invitation as it sits on the cover: its title, who invites, and when and where when the hosts published them. */
function coverFor(view: PublicCelebrationView, locale: AppLocale, t: Translate): GuestFrameProps {
  const content = readContent(view);
  const hosts = content.hosts.map((host) => host.name);
  let when = "";
  if (content.eventDate) {
    try { when = formatCelebrationDate(content.eventDate, { locale, timeZone: view.timeZone }, { dateStyle: "full" }); } catch { when = ""; }
  }
  const meta = [when, content.venueName].filter(Boolean).join(" · ");
  return { heading: content.title || t("rsvp.page.title"), ...(hosts.length ? { lead: t("rsvp.invite.hostedBy", { hosts: hostList(hosts, locale) }) } : {}), ...(meta ? { meta } : {}) };
}

function Question({ children }: { readonly children: string }): ReactNode {
  return <Text accessibilityRole="header" aria-level={2} style={[styles.title, { fontSize: 28, lineHeight: 31, letterSpacing: -0.8 }]}>{children}</Text>;
}

function Loading(): ReactNode {
  const t = useT();
  return <GuestFrame><View accessibilityLiveRegion="polite" style={styles.row}><ActivityIndicator color={palette.primary} /><Text style={styles.muted}>{t("rsvp.invite.loading")}</Text></View></GuestFrame>;
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
  return <Text accessibilityRole="timer" accessibilityLabel={t("rsvp.invite.countdownLabel")} style={[styles.label, { color: palette.text }]}>{t("rsvp.invite.countdown", { days: left.days, hours: left.hours, minutes: left.minutes })}</Text>;
}

function DeadlineLine({ state }: { readonly state: RsvpState }): ReactNode {
  const t = useT();
  const locale = useLocale();
  if (!state.deadline) return <Text style={styles.muted}>{t("rsvp.invite.deadlineNone")}</Text>;
  return <Text style={styles.muted}>{t("rsvp.invite.deadlineOpen", { date: formatCelebrationDate(state.deadline, { locale, timeZone: state.timeZone }), timeZone: state.timeZone })}</Text>;
}

function AnswerSummary({ state }: { readonly state: RsvpState }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const waiting = state.status === "CONFIRMED" ? Math.max(0, state.requestedCompanions - state.approvedCompanions) : 0;
  return (
    <View accessibilityLabel={t("rsvp.invite.summaryLabel")} style={{ gap: spacing[1] }}>
      <Chip tone={state.status === "CONFIRMED" ? "yes" : state.status === "DECLINED" ? "no" : "wait"}>{t(`rsvp.status.${state.status}`)}</Chip>
      {state.status === "CONFIRMED" && state.approvedCompanions > 0 ? <Text style={styles.body}>{t("rsvp.invite.summaryCompanions", { count: state.approvedCompanions })}</Text> : null}
      {waiting ? <Text style={styles.body}>{t("rsvp.invite.summaryPending", { count: waiting })}</Text> : null}
      {state.dietaryNotes ? <Text style={styles.body}>{t("rsvp.invite.summaryDietary", { value: state.dietaryNotes })}</Text> : null}
      {state.message ? <Text style={styles.body}>{t("rsvp.invite.summaryMessage", { value: state.message })}</Text> : null}
      {state.updatedAt ? <Text style={styles.muted}>{t("rsvp.invite.summaryUpdated", { date: formatCelebrationDate(state.updatedAt, { locale, timeZone: state.timeZone }) })}</Text> : null}
    </View>
  );
}

/** "Who to write to": the published `hostContact` (only with the hosts' consent) plus the host names. */
function HostContactLines({ hosts, contact }: { readonly hosts: readonly string[]; readonly contact?: HostContact | undefined }): ReactNode {
  const t = useT();
  const locale = useLocale();
  return (
    <View style={{ gap: spacing[1], alignItems: "center" }}>
      <Text style={[styles.body, { textAlign: "center" }]}>{hosts.length ? t("rsvp.invite.contact", { hosts: hostList(hosts, locale) }) : t("rsvp.invite.contactGeneric")}</Text>
      {contact?.email ? <Text testID="host-contact-email" accessibilityRole="link" style={[styles.body, { fontWeight: "700", textDecorationLine: "underline" }]} onPress={() => { void Linking.openURL(`mailto:${contact.email}`); }}>{t("rsvp.invite.contactEmail")} {contact.email}</Text> : null}
      {contact?.phone ? <Text testID="host-contact-phone" accessibilityRole="link" style={[styles.body, { fontWeight: "700", textDecorationLine: "underline" }]} onPress={() => { void Linking.openURL(`tel:${contact.phone}`); }}>{t("rsvp.invite.contactPhone")} {contact.phone}</Text> : null}
    </View>
  );
}

/** The deadline passed: said warmly, with who can still help and the last answer on record. */
function Closed({ info, state, cover, hosts, contact }: { readonly info: ClosedInfo; readonly state: RsvpState | null; readonly cover: GuestFrameProps; readonly hosts: readonly string[]; readonly contact?: HostContact | undefined }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const deadline = info.deadline ?? state?.deadline ?? undefined;
  const timeZone = info.timeZone ?? state?.timeZone;
  const when = info.deadlineLocal ?? (deadline && timeZone ? formatCelebrationDate(deadline, { locale, timeZone }) : undefined);
  const lead = when && timeZone ? t("rsvp.invite.closedOn", { date: when, timeZone }) : t("rsvp.invite.closedGeneric");
  return (
    <LinkState illustration="calendar" frame={cover} title={t("rsvp.invite.closedTitle")} body={`${lead} ${t("rsvp.invite.closedHelp")}`}>
      <HostContactLines hosts={hosts} contact={contact} />
      {state && state.status !== "PENDING" ? <View style={{ alignSelf: "stretch", gap: spacing[2], marginTop: spacing[3] }}><Text style={styles.muted}>{t("rsvp.invite.yourAnswer")}</Text><AnswerSummary state={state} /></View> : null}
    </LinkState>
  );
}

function FailureNotice({ failure, onRetry, busy }: { readonly failure: RsvpFailure; readonly onRetry: () => void; readonly busy: boolean }): ReactNode {
  const t = useT();
  const messages: Record<string, string> = {
    offline: t("rsvp.invite.errors.offline"), unavailable: t("rsvp.invite.errors.unavailable"), validation: t("rsvp.invite.errors.validation"), conflict: t("rsvp.invite.errors.conflict"), exists: t("rsvp.invite.errors.conflict"), unknown: t("rsvp.invite.errors.unknown"),
    restricted: t("rsvp.invite.errors.restricted"),
    "rate-limited": failure.kind === "rate-limited" && failure.retryAfterSeconds
      // A long wait (anonymous requests can be held for ~50 minutes) is said in minutes, never as a count of seconds.
      ? failure.retryAfterSeconds >= LONG_WAIT_SECONDS ? t("rsvp.invite.errors.rateLimitedMinutes", { minutes: Math.ceil(failure.retryAfterSeconds / 60) }) : t("rsvp.invite.errors.rateLimited", { seconds: Math.ceil(failure.retryAfterSeconds) })
      : t("rsvp.invite.errors.rateLimitedNoWait")
  };
  const retryable = ["offline", "unavailable", "rate-limited", "unknown"].includes(failure.kind);
  return (
    <Notice kind="error">
      <Text style={styles.body}>{messages[failure.kind] ?? t("rsvp.invite.errors.unknown")}</Text>
      {retryable ? <ActionButton variant="secondary" label={t("rsvp.invite.retry")} disabled={busy} onPress={onRetry} testID="rsvp-retry" /> : null}
      <Text style={styles.muted}>{t("rsvp.invite.kept")}</Text>
    </Notice>
  );
}

/** One tap to the gift list, shown only when the list has something to give (or could not be checked). */
function GiftsLink({ client, celebrationId, slug, token }: { readonly client: ReturnType<typeof useApiClient>; readonly celebrationId: string; readonly slug: string; readonly token: string }): ReactNode {
  const t = useT();
  const list = useGiftList(client, celebrationId, token);
  const empty = list.isSuccess && guestVisible(list.data.items).length === 0;
  if (empty) return null;
  return (
    <View style={{ alignSelf: "stretch", gap: spacing[2] }}>
      <ActionButton label={t("rsvp.invite.giftsCta")} onPress={() => { router.push(`/c/${encodeURIComponent(slug)}/regalos/${encodeURIComponent(token)}` as never); }} testID="open-gifts" />
      <Text style={[styles.muted, { textAlign: "center" }]}>{t("rsvp.invite.giftsHint")}</Text>
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
  const [saved, setSaved] = useState<Saved>(null);
  const locale = useLocale();

  if (!slug || revoked || (celebration.error instanceof ApiError && celebration.error.status === 404)) return <InvalidLink />;
  if (celebration.isError) return <OfflineState onRetry={() => { void celebration.refetch(); }} />;
  if (celebration.isPending) return <Loading />;
  const view = celebration.data;
  const content = readContent(view);
  const hosts = content.hosts.map((host) => host.name);
  const cover = coverFor(view, locale, t);
  if (!token) return <PublicRegistration view={view} slug={slug} cover={cover} hosts={hosts} contact={content.hostContact} />;
  if (rsvp.isError) {
    const failure = classifyRsvpError(rsvp.error);
    if (failure.kind === "invalid") return <InvalidLink />;
    return <OfflineState unavailable={failure.kind !== "offline"} onRetry={() => { void rsvp.refetch(); }} />;
  }
  if (rsvp.isPending) return <Loading />;
  const state = rsvp.data;
  const screen = closed ? "closed" : rsvpScreenFor(state);
  if (screen === "closed") return <Closed info={closed ?? {}} state={state} cover={cover} hosts={hosts} contact={content.hostContact} />;

  const form = (
    <AnswerForm key={editing ? "edit" : "first"} celebrationId={view.celebrationId} token={token} state={state} allowed={resource.data?.allowedCompanions} mode={screen === "guest" ? "first" : "edit"}
      onCancel={screen === "confirmed" ? () => setEditing(false) : undefined} onClosed={setClosed} onInvalid={() => setRevoked(true)}
      onSaved={() => { setEditing(false); setSaved(screen === "guest" ? "first" : "edit"); }} />
  );
  if (screen === "guest") {
    return (
      <GuestFrame {...cover}>
        <View style={{ gap: spacing[2] }}>
          <Question>{t("rsvp.invite.question")}</Question>
          <Text style={styles.body}>{t("rsvp.invite.lead")}</Text>
          <DeadlineLine state={state} />
          <CountdownLine deadline={state.deadline} />
        </View>
        {form}
      </GuestFrame>
    );
  }
  const declined = state.status === "DECLINED";
  return (
    <GuestFrame {...cover}>
      {saved === "first" ? (
        <View style={{ gap: spacing[4] }}>
          {declined ? (
            <LinkState illustration="invitation" title={t("rsvp.invite.declinedTitle")} body={t("rsvp.invite.declinedBody")} frame={cover} />
          ) : (
            <Celebrate title={t("rsvp.invite.doneTitle")} body={state.deadline ? t("rsvp.invite.doneBodyUntil", { date: formatCelebrationDate(state.deadline, { locale, timeZone: state.timeZone }) }) : t("rsvp.invite.doneBodyAnytime")} />
          )}
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <CheckMark size={32} tone={declined ? "brand" : "success"} />
          <View style={{ flex: 1 }}><Question>{declined ? t("rsvp.invite.againTitleNo") : t("rsvp.invite.againTitleYes")}</Question></View>
        </View>
      )}
      {saved === "edit" ? <Notice kind="success">{t("rsvp.invite.savedNote")}</Notice> : null}
      {!editing ? <GiftsLink client={client} celebrationId={view.celebrationId} slug={slug} token={token} /> : null}
      <View style={{ gap: spacing[3] }}>
        <AnswerSummary state={state} />
        {saved === "first" ? null : <DeadlineLine state={state} />}
        <CountdownLine deadline={state.deadline} />
      </View>
      {editing ? form : <View style={{ gap: spacing[2] }}><ActionButton variant="secondary" label={t("rsvp.invite.edit")} onPress={() => { setSaved(null); setEditing(true); }} testID="rsvp-edit" />{saved === "first" ? null : <Text style={styles.muted}>{t("rsvp.invite.editHint")}</Text>}</View>}
    </GuestFrame>
  );
}

function AnswerForm({ celebrationId, token, state, allowed, mode, onSaved, onClosed, onInvalid, onCancel }: { readonly celebrationId: string; readonly token: string; readonly state: RsvpState; readonly allowed: number | undefined; readonly mode: "first" | "edit"; readonly onSaved: (state: RsvpState) => void; readonly onClosed: (info: ClosedInfo) => void; readonly onInvalid: () => void; readonly onCancel?: (() => void) | undefined }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const save = useSaveGuestRsvp(client, celebrationId, token);
  // The draft lives in component state: a failed send never clears it. Nothing is written to device storage.
  const [draft, setDraft] = useState<Draft>(() => initialDraft(state));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const flight = useSingleFlightGate();

  async function submit(): Promise<void> {
    const parsed = rsvpSchema.safeParse(draft);
    if (!parsed.success) { setErrors(issueMessages(parsed.error.issues, t)); return; }
    setErrors({});
    const declined = parsed.data.status === "DECLINED";
    const input = { status: parsed.data.status, requestedCompanions: declined ? 0 : parsed.data.requestedCompanions, dietaryNotes: parsed.data.dietaryNotes || null, message: parsed.data.message || null };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newIdempotencyKey() };
    if (!flight.begin()) return;
    try {
      const next = await save.mutateAsync({ current: state, input, idempotencyKey: attempt.current.key });
      setFailure(null);
      onSaved(next);
    } catch (error) {
      const failed = classifyRsvpError(error);
      if (failed.kind === "closed") onClosed(failed);
      else if (failed.kind === "invalid") onInvalid();
      else setFailure(failed);
    } finally { flight.end(); }
  }
  const busy = save.isPending;
  const change = (patch: Partial<Draft>): void => { setDraft((current) => ({ ...current, ...patch })); setErrors({}); };
  const label = busy ? t("rsvp.invite.submitting") : mode === "edit" ? t("rsvp.invite.save") : draft.status === "CONFIRMED" ? t("rsvp.invite.submitYes") : draft.status === "DECLINED" ? t("rsvp.invite.submitNo") : t("rsvp.invite.submitNone");
  return (
    <View style={{ gap: spacing[5] }}>
      <AttendanceChoice value={draft.status} onChange={(status) => change({ status })} error={errors.status} />
      {draft.status === "CONFIRMED" ? <CompanionsStepper value={draft.requestedCompanions} onChange={(requestedCompanions) => change({ requestedCompanions })} allowed={allowed} error={errors.requestedCompanions} /> : null}
      {draft.status ? <ExtrasFields dietaryNotes={draft.dietaryNotes} message={draft.message} onChange={change} errors={errors} /> : null}
      {Object.keys(errors).length ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{t("rsvp.invite.errors.summary")}</Text> : null}
      {failure ? <FailureNotice failure={failure} busy={busy} onRetry={() => { void submit(); }} /> : null}
      <View style={{ gap: spacing[2] }}>
        <ActionButton testID="rsvp-submit" label={label} busy={busy} onPress={() => { void submit(); }} />
        {onCancel ? <ActionButton variant="secondary" label={t("rsvp.invite.cancelEdit")} disabled={busy} onPress={onCancel} testID="rsvp-cancel-edit" /> : null}
      </View>
    </View>
  );
}

/** GET .../public-settings first: the form only appears when public registration can succeed. */
function PublicRegistration(props: { readonly view: PublicCelebrationView; readonly slug: string; readonly cover: GuestFrameProps; readonly hosts: readonly string[]; readonly contact: HostContact | undefined }): ReactNode {
  const client = useApiClient();
  const settings = usePublicRegistrationSettings(client, props.view.celebrationId);
  if (settings.isPending) return <Loading />;
  if (settings.isError) return <OfflineState onRetry={() => { void settings.refetch(); }} unavailable />;
  if (!settings.data.publicRegistrationEnabled) return <RestrictedNotice cover={props.cover} hosts={props.hosts} contact={props.contact} />;
  return <PublicRegistrationForm {...props} />;
}

function RestrictedNotice({ cover, hosts, contact }: { readonly cover: GuestFrameProps; readonly hosts: readonly string[]; readonly contact: HostContact | undefined }): ReactNode {
  const t = useT();
  return (
    <LinkState illustration="invitation" frame={cover} title={t("rsvp.invite.open.restrictedTitle")} body={t("rsvp.invite.open.restrictedBody")}>
      <HostContactLines hosts={hosts} contact={contact} />
    </LinkState>
  );
}

function PublicRegistrationForm({ view, slug, cover, hosts, contact }: { readonly view: PublicCelebrationView; readonly slug: string; readonly cover: GuestFrameProps; readonly hosts: readonly string[]; readonly contact: HostContact | undefined }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const register = useRegisterUnregistered(client, view.celebrationId);
  const [draft, setDraft] = useState<{ status: Attendance; requestedCompanions: string; dietaryNotes: string; message: string; name: string; email: string; consent: boolean }>({ status: "CONFIRMED", requestedCompanions: "0", dietaryNotes: "", message: "", name: "", email: "", consent: false });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const [receipt, setReceipt] = useState<{ link: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const flight = useSingleFlightGate();

  async function submit(): Promise<void> {
    const parsed = unregisteredRsvpSchema.safeParse(draft);
    if (!parsed.success) { setErrors(issueMessages(parsed.error.issues, t)); return; }
    setErrors({});
    const input = { name: parsed.data.name, email: parsed.data.email, locale, consent: true as const, requestedCompanions: parsed.data.requestedCompanions, dietaryNotes: parsed.data.dietaryNotes || null, message: parsed.data.message || null };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newIdempotencyKey() };
    if (!flight.begin()) return;
    try {
      const response = await register.mutateAsync({ input, idempotencyKey: attempt.current.key });
      setFailure(null);
      setReceipt({ link: response.accessToken ? personalLinkUrl(personalLinkOrigin({ EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL, RSVP_PUBLIC_ORIGIN: process.env.EXPO_PUBLIC_RSVP_ORIGIN }), slug, response.accessToken.token).url : null });
    } catch (error) { setFailure(classifyRsvpError(error)); } finally { flight.end(); }
  }

  if (failure?.kind === "restricted") return <RestrictedNotice cover={cover} hosts={hosts} contact={contact} />;
  if (receipt) {
    return (
      <GuestFrame {...cover}>
        <Celebrate title={t("rsvp.invite.open.doneTitle")} body={receipt.link ? t("rsvp.invite.open.doneBody") : t("rsvp.invite.open.replayBody")} />
        {receipt.link ? (
          <View style={{ gap: spacing[3] }}>
            <Field label={t("rsvp.invite.open.linkLabel")} value={receipt.link} onChange={() => undefined} />
            <ActionButton label={t("rsvp.invite.open.copyLink")} onPress={() => { void copyText(receipt.link ?? "").then(setCopied); }} testID="rsvp-copy-link" />
            {copied ? <Notice kind="success">{t("rsvp.invite.open.copied")}</Notice> : null}
          </View>
        ) : null}
        <Text style={styles.muted} testID="rsvp-email-notice">{t("rsvp.invite.open.emailNotice")}</Text>
      </GuestFrame>
    );
  }
  const busy = register.isPending;
  const change = (patch: Partial<typeof draft>): void => { setDraft((current) => ({ ...current, ...patch })); setErrors({}); };
  return (
    <GuestFrame {...cover}>
      <View style={{ gap: spacing[2] }}>
        <Question>{t("rsvp.invite.open.title")}</Question>
        <Text style={styles.body}>{t("rsvp.invite.open.lead")}</Text>
      </View>
      <View style={{ gap: spacing[5] }}>
        <Field label={t("rsvp.invite.open.name")} value={draft.name} onChange={(name) => change({ name })} error={errors.name} testID="rsvp-name" />
        <Field label={t("rsvp.invite.open.email")} keyboardType="email-address" help={t("rsvp.invite.open.emailHelp")} value={draft.email} onChange={(email) => change({ email })} error={errors.email} testID="rsvp-email" />
        <CompanionsStepper value={draft.requestedCompanions} onChange={(requestedCompanions) => change({ requestedCompanions })} allowed={undefined} error={errors.requestedCompanions} />
        <ExtrasFields dietaryNotes={draft.dietaryNotes} message={draft.message} onChange={change} errors={errors} />
        <Checkbox label={t("rsvp.invite.open.consent")} value={draft.consent} onChange={(consent) => change({ consent })} />
        {errors.consent ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{errors.consent}</Text> : null}
        {Object.keys(errors).length ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{t("rsvp.invite.errors.summary")}</Text> : null}
        {failure ? <FailureNotice failure={failure} busy={busy} onRetry={() => { void submit(); }} /> : null}
        <ActionButton testID="rsvp-register" label={busy ? t("rsvp.invite.submitting") : t("rsvp.invite.open.submit")} busy={busy} onPress={() => { void submit(); }} />
      </View>
    </GuestFrame>
  );
}

/** F21-03 · "open in app" helper for the web fallback of the same screen: used by the legacy token-only landing. */
export function openInApp(token: string, slug?: string): Promise<void> { return Linking.openURL(nativeMagicLink(token, slug)); }
