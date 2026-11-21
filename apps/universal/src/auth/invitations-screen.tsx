import { useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { useAnswerInvitation, useMyInvitations, type InvitationDecision, type ReceivedInvitation } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { HOST_ROUTES, hostNav } from "../host/routes";
import { ActionButton, ConfirmDialog, ErrorNotice, Loading, Notice, Screen, Section, errorMessage, useStyles } from "../host/ui";

/**
 * The invitee's side of IDENTIDAD-SEG-003 (identity.openapi.json 2.0.0): organizations that invited this account, to accept
 * or decline. Nobody becomes a member without pressing Accept here. The e-mail link opens this page with
 * `?invitacion=<id>&token=<token>`; the token is what proves the address while the account's e-mail is not verified, so it
 * is kept in memory and removed from the address bar at once. It is a sub-page of «Equipo» (organizations) in the navigation.
 */

const STATUS_NOT_FOUND = 404;
const STATUS_FORBIDDEN = 403;
const STATUS_CONFLICT = 409;
type Translator = ReturnType<typeof useT>;

function answerError(error: unknown, t: Translator): string {
  if (error instanceof ApiError && error.status === STATUS_NOT_FOUND) return t("org.inbox.errors.notFound");
  if (error instanceof ApiError && error.status === STATUS_FORBIDDEN) return t("org.inbox.errors.forbidden");
  if (error instanceof ApiError && error.status === STATUS_CONFLICT) return t("org.inbox.errors.conflict");
  return errorMessage(error, t);
}

/** Drops the single-use token from the visible URL (and history) on the web; native deep links have no address bar. */
function forgetTokenInAddressBar(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token")) return;
  url.searchParams.delete("token");
  window.history.replaceState(window.history.state, "", url.pathname + (url.search || "") + url.hash);
}

interface Pending { readonly id: string; readonly invitation: ReceivedInvitation | null; readonly token?: string }

function InvitationCard({ pending, onAnswered }: { readonly pending: Pending; readonly onAnswered: (decision: InvitationDecision) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const answer = useAnswerInvitation(useApiClient());
  const [confirming, setConfirming] = useState(false);
  const inFlight = useRef(false);
  const organization = pending.invitation?.organizationName ?? t("org.inbox.thisOrganization");
  const respond = (decision: InvitationDecision): void => {
    if (answer.isPending || inFlight.current) return;
    inFlight.current = true;
    answer.mutate({ invitationId: pending.id, decision, ...(pending.token ? { token: pending.token } : {}) }, {
      onSuccess: () => { setConfirming(false); onAnswered(decision); },
      onError: () => setConfirming(false),
      onSettled: () => { inFlight.current = false; }
    });
  };
  const busy = (decision: InvitationDecision): boolean => answer.isPending && answer.variables?.decision === decision;
  return (
    <View style={[styles.option, { gap: 8 }]} testID={`invitation-${pending.id}`}>
      {pending.invitation ? (
        <>
          <Text style={[styles.body, { fontWeight: "600" }]}>{t("org.inbox.card", { organization, role: t(pending.invitation.role === "PLANNER" ? "org.memberPlanner" : "org.memberHost") })}</Text>
          <Text style={styles.muted}>{t("org.inbox.expires", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(pending.invitation.expiresAt)) })}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.body, { fontWeight: "600" }]}>{t("org.inbox.fromLinkTitle")}</Text>
          <Text style={styles.muted}>{t("org.inbox.fromLinkBody")}</Text>
        </>
      )}
      {answer.isError ? <Notice kind="error">{answerError(answer.error, t)}</Notice> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ActionButton label={busy("accept") ? t("org.inbox.accepting") : t("org.inbox.accept")} busy={busy("accept")} disabled={answer.isPending} onPress={() => respond("accept")} testID={`invitation-accept-${pending.id}`} />
        <ActionButton variant="secondary" label={busy("decline") ? t("org.inbox.declining") : t("org.inbox.decline")} busy={busy("decline")} disabled={answer.isPending} onPress={() => setConfirming(true)} testID={`invitation-decline-${pending.id}`} />
      </View>
      <ConfirmDialog visible={confirming} title={t("org.inbox.confirmDeclineTitle")} body={t("org.inbox.confirmDeclineBody")} confirmLabel={t("org.inbox.decline")} danger busy={busy("decline")}
        confirmTestID={`invitation-decline-confirm-${pending.id}`} onConfirm={() => respond("decline")} onCancel={() => setConfirming(false)} />
    </View>
  );
}

export function InvitationsScreen({ onNavigate, invitationId, token }: { readonly onNavigate: (href: string) => void; readonly invitationId?: string; readonly token?: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const mine = useMyInvitations(useApiClient());
  // The link's token lives only in memory: read once, then gone from the address bar.
  const [link] = useState(() => (invitationId ? { id: invitationId, ...(token ? { token } : {}) } : null));
  const [answered, setAnswered] = useState<Readonly<Record<string, InvitationDecision>>>({});
  useEffect(() => { forgetTokenInAddressBar(); }, []);
  const items = mine.data?.items ?? [];
  const pending: Pending[] = items.filter((item) => !answered[item.id]).map((item) => ({ id: item.id, invitation: item, ...(link?.id === item.id && link.token ? { token: link.token } : {}) }));
  if (link && !answered[link.id] && !items.some((item) => item.id === link.id)) pending.unshift({ id: link.id, invitation: null, ...(link.token ? { token: link.token } : {}) });
  const outcome = Object.values(answered).at(-1);
  return (
    <Screen title={t("org.inbox.title")} nav={hostNav(t, undefined)} current="organizations" onNavigate={onNavigate}>
      <Text style={styles.body}>{t("org.inbox.intro")}</Text>
      {outcome === "accept" ? <><Notice kind="success">{t("org.inbox.accepted")}</Notice><ActionButton variant="secondary" label={t("org.inbox.goToTeams")} onPress={() => onNavigate(HOST_ROUTES.organizations)} testID="invitations-go-teams" /></> : null}
      {outcome === "decline" ? <Notice kind="success">{t("org.inbox.declined")}</Notice> : null}
      <Section title={t("org.inbox.title")}>
        {mine.isPending ? <Loading /> : null}
        {mine.isError ? <><ErrorNotice error={mine.error} /><ActionButton icon="refresh" variant="secondary" label={t("org.retry")} onPress={() => { void mine.refetch(); }} testID="invitations-retry" /></> : null}
        {mine.isSuccess && !mine.data.emailVerified ? <Notice>{t("org.inbox.unverified")}</Notice> : null}
        {!mine.isPending && !pending.length ? <Text style={styles.muted}>{t("org.inbox.empty")}</Text> : null}
        {pending.map((entry) => <InvitationCard key={entry.id} pending={entry} onAnswered={(decision) => setAnswered((current) => ({ ...current, [entry.id]: decision }))} />)}
      </Section>
    </Screen>
  );
}
