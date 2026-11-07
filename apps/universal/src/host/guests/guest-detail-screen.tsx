import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Avatar } from "@rsvp/ui";
import { formatCelebrationDate } from "@rsvp/i18n";
import { personalLinkPath } from "@rsvp/auth";
import { ApiError } from "@rsvp/api-client";
import { maskSecret, useChangeGuestGroup, useEraseGuest, useGuestDetail, useGuestGroups, useGuestList, useIssueGuestToken, useRevokeGuestToken, type Celebration } from "@rsvp/query-hooks";
import { copyText } from "../../platform/clipboard";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { shareText } from "../../platform/share";
import { siteOrigin } from "../../platform/site-origin";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Celebrate, ChoiceGroup, ConfirmDialog, Loading, Notice, styles } from "../ui";
import { FailureNotice, MoreOptions, RetryNotice, StatusBadge, TextAction } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";

/**
 * C23 · Guest detail and personal link. The secret exists only in this component's state, once, and is never
 * rendered whole: the screen shows `abcd…wxyz`, and the full URL goes to the clipboard or the share sheet (REQ-F16-05/06).
 */

interface Issued { readonly url: string; readonly masked: string; readonly expiresAt: string }

/** State and actions of the guest's link, shared by the link block (copy, share) and the "Más opciones" block (reissue, revoke). */
function useGuestLink(celebration: Celebration, guestId: string) {
  const t = useT();
  const client = useApiClient();
  const issue = useIssueGuestToken(client, celebration.id);
  const revoke = useRevokeGuestToken(client, celebration.id);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [confirm, setConfirm] = useState<"revoke" | "reissue" | null>(null);
  const [message, setMessage] = useState("");
  const flight = useSingleFlightGate();

  const origin = siteOrigin();
  const generate = (): void => {
    if (!flight.begin()) return;
    setMessage("");
    issue.mutate(guestId, {
      onSettled: flight.end,
      // The backend's canonical URL when it sent one; otherwise the same format built here from the configured origin.
      onSuccess: (token) => {
        const url = token.url ?? `${origin}${personalLinkPath(celebration.slug, token.token)}`;
        setIssued({ url, masked: `${origin}/c/${celebration.slug}/rsvp/${maskSecret(token.token)}`, expiresAt: token.expiresAt });
        // One tap: the link is on the clipboard as soon as it exists. If the platform refuses, "Copiar enlace" is right there.
        void copyText(url).then((copied) => { if (copied) setMessage(t("guests.detail.link.copied")); });
      }
    });
  };
  const copy = async (): Promise<void> => { if (issued) setMessage((await copyText(issued.url)) ? t("guests.detail.link.copied") : t("guests.detail.link.copyFailed")); };
  const share = async (): Promise<void> => {
    if (!issued) return;
    const title = celebration.content["title"];
    const outcome = await shareText({ title: t("guests.detail.link.shareTitle"), message: `${t("guests.detail.link.shareText", { title: typeof title === "string" ? title : celebration.slug })} ${issued.url}` });
    if (outcome === "unsupported") setMessage((await copyText(issued.url)) ? t("guests.detail.link.copied") : t("guests.detail.link.copyFailed"));
  };
  const confirmed = (): void => {
    const action = confirm;
    setConfirm(null);
    if (action === "reissue") generate();
    if (action === "revoke" && flight.begin()) { setMessage(""); revoke.mutate(guestId, { onSuccess: () => { setIssued(null); setMessage(t("guests.detail.link.revoked")); }, onSettled: flight.end }); }
  };
  return { issue, revoke, issued, confirm, setConfirm, message, generate, copy, share, confirmed, timeZone: celebration.timeZone };
}
type GuestLink = ReturnType<typeof useGuestLink>;

/** The link itself: one primary action at a time. Not issued: "Generar enlace". Issued: the milestone with Copy first. */
function LinkSection({ link, name }: { readonly link: GuestLink; readonly name: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { issued, issue, revoke, confirm, message } = link;
  return (
    <View style={[styles.card, { maxWidth: 720 }]}>
      <Text accessibilityRole="header" style={styles.subtitle}>{t("guests.detail.link.title")}</Text>
      <Text style={styles.body}>{t("guests.detail.link.intro")}</Text>
      {issued ? (
        <Celebrate title={t("guests.detail.link.readyTitle", { name })} body={t("guests.detail.link.readyBody")}>
          <Text selectable={false} testID="masked-link" style={[styles.body, { fontFamily: "monospace" }]}>{t("guests.detail.link.masked", { value: issued.masked })}</Text>
          <Text style={styles.muted}>{t("guests.detail.link.expires", { date: formatCelebrationDate(issued.expiresAt, { locale, timeZone: link.timeZone }) })}</Text>
          <Text style={styles.muted}>{t("guests.detail.link.once")}</Text>
          <View style={styles.row}>
            <ActionButton label={t("guests.detail.link.copy")} onPress={() => { void link.copy(); }} testID="copy-link" />
            <ActionButton variant="secondary" label={t("guests.detail.link.share")} onPress={() => { void link.share(); }} testID="share-link" />
          </View>
        </Celebrate>
      ) : (
        <>
          <Text style={styles.muted}>{t("guests.detail.link.none")}</Text>
          <ActionButton label={t("guests.detail.link.issue")} busy={issue.isPending} onPress={link.generate} testID="issue-link" />
        </>
      )}
      {message ? <Notice kind="success">{message}</Notice> : null}
      <FailureNotice error={issue.error ?? revoke.error} />
      <ConfirmDialog visible={confirm !== null} danger title={confirm === "reissue" ? t("guests.detail.link.reissueTitle") : t("guests.detail.link.revokeTitle")} body={confirm === "reissue" ? t("guests.detail.link.reissueBody") : t("guests.detail.link.revokeBody")}
        confirmLabel={confirm === "reissue" ? t("guests.detail.link.reissue") : t("guests.detail.link.revoke")} onConfirm={link.confirmed} onCancel={() => link.setConfirm(null)} />
    </View>
  );
}

/** Reissue and revoke are the rare moves: they live behind "Más opciones" with the removal. */
function LinkAdmin({ link }: { readonly link: GuestLink }): ReactNode {
  const t = useT();
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={styles.label}>{t("guests.detail.link.manage")}</Text>
      <View style={styles.row}>
        {link.issued ? <ActionButton variant="secondary" label={t("guests.detail.link.reissue")} onPress={() => link.setConfirm("reissue")} /> : null}
        <ActionButton variant="danger" label={t("guests.detail.link.revoke")} busy={link.revoke.isPending} onPress={() => link.setConfirm("revoke")} testID="revoke-link" />
      </View>
    </View>
  );
}

function GroupSection({ celebrationId, guestId, groupId }: { readonly celebrationId: string; readonly guestId: string; readonly groupId: string | null }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const groups = useGuestGroups(client, celebrationId);
  const change = useChangeGuestGroup(client, celebrationId);
  const [current, setCurrent] = useState<string | null>(groupId);
  if (!groups.data || groups.data.items.length === 0) return null;
  return (
    <View style={[styles.card, { maxWidth: 720 }]}>
      <ChoiceGroup label={t("guests.detail.groupTitle")} value={current ?? ""} onChange={(value) => { if (change.isPending || value === (current ?? "")) return; change.mutate({ guestId, groupId: value || null }, { onSuccess: () => setCurrent(value || null) }); }}
        choices={[{ value: "", label: t("guests.detail.groupNone") }, ...groups.data.items.map((group) => ({ value: group.id, label: `${group.name} (${group.memberCount})` }))]} />
      {change.isSuccess ? <Notice kind="success">{t("guests.detail.groupSaved")}</Notice> : null}
      <FailureNotice error={change.error} />
    </View>
  );
}

/** Irreversible removal of a guest and their data (the backend's `erasure`); there is no soft delete, so the dialog says so. */
function EraseSection({ celebration, guestId, name, onDone }: { readonly celebration: Celebration; readonly guestId: string; readonly name: string; readonly onDone: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const erase = useEraseGuest(client, celebration.id);
  const flight = useSingleFlightGate();
  const [confirm, setConfirm] = useState(false);
  const run = (): void => {
    setConfirm(false);
    if (!flight.begin()) return;
    erase.mutate(guestId, { onSuccess: onDone, onSettled: flight.end });
  };
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={styles.label}>{t("guests.detail.erase.title")}</Text>
      <Text style={styles.muted}>{t("guests.detail.erase.intro")}</Text>
      <FailureNotice error={erase.error} onRetry={() => setConfirm(true)} />
      <View style={{ alignItems: "flex-start" }}><ActionButton variant="danger" label={t("guests.detail.erase.action")} busy={erase.isPending} onPress={() => setConfirm(true)} testID="erase-guest" /></View>
      <ConfirmDialog visible={confirm} danger title={t("guests.detail.erase.confirmTitle", { name })} body={t("guests.detail.erase.confirmBody")} confirmLabel={t("guests.detail.erase.confirm")} onConfirm={run} onCancel={() => setConfirm(false)} />
    </View>
  );
}

function DetailBody({ celebration, guestId, onNavigate }: { readonly celebration: Celebration; readonly guestId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const guest = useGuestDetail(client, celebration.id, guestId);
  const link = useGuestLink(celebration, guestId);
  const status = useGuestList(client, celebration.id, { search: guest.data?.name ?? "", limit: 100 });
  if (guest.isPending) return <Loading />;
  if (guest.isError && guest.error instanceof ApiError && guest.error.status === 404) {
    return <View style={{ gap: spacing[2] }}><Notice kind="error">{t("guests.detail.missing")}</Notice><TextAction label={t("guests.form.back")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebration.id))} /></View>;
  }
  if (guest.isError) return <RetryNotice error={guest.error} onRetry={() => { void guest.refetch(); }} />;
  const data = guest.data;
  const row = status.data?.items.find((item) => item.guestId === guestId);
  const back = () => onNavigate(withCelebration(HOST_ROUTES.guests, celebration.id));
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={[styles.card, { maxWidth: 720, flexDirection: "row", alignItems: "center", gap: spacing[4] }]}>
        <Avatar name={data.name} size={64} />
        <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
          <Text accessibilityRole="header" aria-level={2} style={[styles.title, { fontSize: 24, lineHeight: 28 }]}>{data.name}</Text>
          {row ? <View style={{ alignSelf: "flex-start" }}><StatusBadge status={row.status} /></View> : null}
          {data.email ? <Text style={styles.body}>{t("guests.detail.email")}: {data.email}</Text> : null}
          {data.phone ? <Text style={styles.body}>{t("guests.detail.phone")}: {data.phone}</Text> : null}
          <Text style={styles.muted}>{t("guests.detail.companions")}: {data.allowedCompanions} · {t("guests.detail.locale")}: {data.locale}</Text>
          <Text style={styles.muted}>{t("guests.detail.consent", { date: formatCelebrationDate(data.consentGivenAt, { locale, timeZone: celebration.timeZone }) })}</Text>
        </View>
      </View>
      <LinkSection link={link} name={data.name} />
      <GroupSection celebrationId={celebration.id} guestId={guestId} groupId={data.groupId} />
      <MoreOptions label={t("guests.more")} testID="guest-more">
        <LinkAdmin link={link} />
        <EraseSection celebration={celebration} guestId={guestId} name={data.name} onDone={back} />
      </MoreOptions>
      <TextAction label={t("guests.form.back")} onPress={back} />
    </View>
  );
}

export function GuestDetailScreen(props: ScreenProps & { readonly guestId?: string }): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen {...props} current="guests" title={t("guests.detail.title")} intro={t("guests.detail.intro")}>
      {({ celebration }) => (props.guestId ? <DetailBody celebration={celebration} guestId={props.guestId} onNavigate={props.onNavigate} /> : <Notice kind="error">{t("guests.detail.missing")}</Notice>)}
    </CelebrationScreen>
  );
}

