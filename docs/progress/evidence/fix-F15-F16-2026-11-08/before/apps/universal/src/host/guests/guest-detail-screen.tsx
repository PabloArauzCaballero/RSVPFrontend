import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatCelebrationDate } from "@rsvp/i18n";
import { personalLinkPath } from "@rsvp/auth";
import { maskSecret, useChangeGuestGroup, useGuestDetail, useGuestGroups, useGuestList, useIssueGuestToken, useRevokeGuestToken, type Celebration } from "@rsvp/query-hooks";
import { copyText } from "../../platform/clipboard";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { shareText } from "../../platform/share";
import { siteOrigin } from "../../platform/site-origin";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, ChoiceGroup, ConfirmDialog, ErrorNotice, Loading, Notice, Section, styles } from "../ui";
import { RetryNotice, StatusBadge } from "./parts";

/**
 * C23 · Guest detail and personal link. The secret exists only in this component's state, once, and is never
 * rendered whole: the screen shows `abcd…wxyz`, and the full URL goes to the clipboard or the share sheet (REQ-F16-05/06).
 */

interface Issued { readonly url: string; readonly masked: string; readonly expiresAt: string }

function LinkSection({ celebration, guestId }: { readonly celebration: Celebration; readonly guestId: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const issue = useIssueGuestToken(client, celebration.id);
  const revoke = useRevokeGuestToken(client, celebration.id);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [confirm, setConfirm] = useState<"revoke" | "reissue" | null>(null);
  const [message, setMessage] = useState("");

  const origin = siteOrigin();
  const generate = (): void => {
    setMessage("");
    issue.mutate(guestId, {
      // The backend's canonical URL when it sent one; otherwise the same format built here from the configured origin.
      onSuccess: (token) => setIssued({ url: token.url ?? `${origin}${personalLinkPath(celebration.slug, token.token)}`, masked: `${origin}/c/${celebration.slug}/rsvp/${maskSecret(token.token)}`, expiresAt: token.expiresAt })
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
    if (action === "revoke") revoke.mutate(guestId, { onSuccess: () => { setIssued(null); setMessage(t("guests.detail.link.revoked")); } });
  };

  return (
    <Section title={t("guests.detail.link.title")}>
      <Text style={styles.body}>{t("guests.detail.link.intro")}</Text>
      {issued ? (
        <View style={{ gap: spacing[2] }}>
          <Text selectable={false} testID="masked-link" style={[styles.body, { fontFamily: "monospace" }]}>{t("guests.detail.link.masked", { value: issued.masked })}</Text>
          <Text style={styles.muted}>{t("guests.detail.link.expires", { date: formatCelebrationDate(issued.expiresAt, { locale, timeZone: celebration.timeZone }) })}</Text>
          <Text style={styles.muted}>{t("guests.detail.link.once")}</Text>
          <View style={styles.row}>
            <ActionButton label={t("guests.detail.link.copy")} onPress={() => { void copy(); }} testID="copy-link" />
            <ActionButton variant="secondary" label={t("guests.detail.link.share")} onPress={() => { void share(); }} testID="share-link" />
          </View>
        </View>
      ) : <Text style={styles.muted}>{t("guests.detail.link.none")}</Text>}
      <View style={styles.row}>
        {issued ? <ActionButton variant="secondary" label={t("guests.detail.link.reissue")} onPress={() => setConfirm("reissue")} /> : <ActionButton label={t("guests.detail.link.issue")} busy={issue.isPending} onPress={generate} testID="issue-link" />}
        <ActionButton variant="danger" label={t("guests.detail.link.revoke")} busy={revoke.isPending} onPress={() => setConfirm("revoke")} testID="revoke-link" />
      </View>
      {message ? <Notice kind="success">{message}</Notice> : null}
      <ErrorNotice error={issue.error ?? revoke.error} />
      <ConfirmDialog visible={confirm !== null} danger title={confirm === "reissue" ? t("guests.detail.link.reissueTitle") : t("guests.detail.link.revokeTitle")} body={confirm === "reissue" ? t("guests.detail.link.reissueBody") : t("guests.detail.link.revokeBody")}
        confirmLabel={confirm === "reissue" ? t("guests.detail.link.reissue") : t("guests.detail.link.revoke")} onConfirm={confirmed} onCancel={() => setConfirm(null)} />
    </Section>
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
    <Section title={t("guests.detail.groupTitle")}>
      <ChoiceGroup label={t("guests.detail.group")} value={current ?? ""} onChange={(value) => change.mutate({ guestId, groupId: value || null }, { onSuccess: () => setCurrent(value || null) })}
        choices={[{ value: "", label: t("guests.detail.groupNone") }, ...groups.data.items.map((group) => ({ value: group.id, label: `${group.name} (${group.memberCount})` }))]} />
      {change.isSuccess ? <Notice kind="success">{t("guests.detail.groupSaved")}</Notice> : null}
      <ErrorNotice error={change.error} />
    </Section>
  );
}

function DetailBody({ celebration, guestId, onNavigate }: { readonly celebration: Celebration; readonly guestId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const guest = useGuestDetail(client, celebration.id, guestId);
  const status = useGuestList(client, celebration.id, { search: guest.data?.name ?? "", limit: 100 });
  if (guest.isPending) return <Loading />;
  if (guest.isError) return <RetryNotice error={guest.error} onRetry={() => { void guest.refetch(); }} />;
  const data = guest.data;
  const row = status.data?.items.find((item) => item.guestId === guestId);
  return (
    <View style={{ gap: spacing[4] }}>
      <Section title={data.name}>
        {row ? <StatusBadge status={row.status} /> : null}
        {data.email ? <Text style={styles.body}>{t("guests.detail.email")}: {data.email}</Text> : null}
        {data.phone ? <Text style={styles.body}>{t("guests.detail.phone")}: {data.phone}</Text> : null}
        <Text style={styles.body}>{t("guests.detail.companions")}: {data.allowedCompanions}</Text>
        <Text style={styles.body}>{t("guests.detail.locale")}: {data.locale}</Text>
        <Text style={styles.muted}>{t("guests.detail.consent", { date: formatCelebrationDate(data.consentGivenAt, { locale, timeZone: celebration.timeZone }) })}</Text>
      </Section>
      <GroupSection celebrationId={celebration.id} guestId={guestId} groupId={data.groupId} />
      <LinkSection celebration={celebration} guestId={guestId} />
      <ActionButton variant="secondary" label={t("guests.form.back")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebration.id))} />
    </View>
  );
}

export function GuestDetailScreen(props: ScreenProps & { readonly guestId?: string }): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen {...props} current="guests" title={t("guests.detail.title")}>
      {({ celebration }) => (props.guestId ? <DetailBody celebration={celebration} guestId={props.guestId} onNavigate={props.onNavigate} /> : <Notice kind="error">{t("guests.detail.missing")}</Notice>)}
    </CelebrationScreen>
  );
}

