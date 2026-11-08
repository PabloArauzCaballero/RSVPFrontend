import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Avatar, fonts } from "@rsvp/ui";
import { formatCelebrationDate } from "@rsvp/i18n";
import { personalLinkPath } from "@rsvp/auth";
import { ApiError } from "@rsvp/api-client";
import { maskSecret, useCelebration, useChangeGuestGroup, useEraseGuest, useGuestDetail, useGuestGroups, useGuestList, useIssueGuestToken, useRevokeGuestToken, type Celebration } from "@rsvp/query-hooks";
import { copyText } from "../../platform/clipboard";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { shareText } from "../../platform/share";
import { siteOrigin } from "../../platform/site-origin";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Celebrate, FilterSelect, ConfirmDialog, Notice, OverflowMenu, useStyles } from "../ui";
import { FailureNotice, RetryNotice, StatusBadge, TextAction, BlockSkeleton } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";

/**
 * C23 · Guest detail and personal link. The secret exists only in this component's state, once, and is never
 * rendered whole: the screen shows `abcd…wxyz`, and the full URL goes to the clipboard or the share sheet (REQ-F16-05/06).
 */

interface Issued { readonly url: string; readonly masked: string; readonly expiresAt: string }

/** State and actions of the guest's link, shared by the link block (copy, share) and the "Más opciones" block (reissue, revoke). */
function useGuestLink(celebration: Celebration | undefined, guestId: string) {
  const t = useT();
  const client = useApiClient();
  const issue = useIssueGuestToken(client, celebration?.id ?? "");
  const revoke = useRevokeGuestToken(client, celebration?.id ?? "");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [confirm, setConfirm] = useState<"revoke" | "reissue" | null>(null);
  const [message, setMessage] = useState("");
  const flight = useSingleFlightGate();

  const origin = siteOrigin();
  const generate = (): void => {
    if (!celebration || !flight.begin()) return;
    setMessage("");
    issue.mutate(guestId, {
      onSettled: flight.end,
      // The backend's canonical URL when it sent one; otherwise the same format built here from the configured origin.
      onSuccess: (token) => {
        const slug = celebration?.slug ?? "";
        const url = token.url ?? `${origin}${personalLinkPath(slug, token.token)}`;
        setIssued({ url, masked: `${origin}/c/${slug}/rsvp/${maskSecret(token.token)}`, expiresAt: token.expiresAt });
        // One tap: the link is on the clipboard as soon as it exists. If the platform refuses, "Copiar enlace" is right there.
        void copyText(url).then((copied) => { if (copied) setMessage(t("guests.detail.link.copied")); });
      }
    });
  };
  const copy = async (): Promise<void> => { if (issued) setMessage((await copyText(issued.url)) ? t("guests.detail.link.copied") : t("guests.detail.link.copyFailed")); };
  const share = async (): Promise<void> => {
    if (!issued) return;
    const title = celebration?.content["title"];
    const outcome = await shareText({ title: t("guests.detail.link.shareTitle"), message: `${t("guests.detail.link.shareText", { title: typeof title === "string" ? title : celebration?.slug ?? "" })} ${issued.url}` });
    if (outcome === "unsupported") setMessage((await copyText(issued.url)) ? t("guests.detail.link.copied") : t("guests.detail.link.copyFailed"));
  };
  const confirmed = (): void => {
    const action = confirm;
    setConfirm(null);
    if (action === "reissue") generate();
    if (action === "revoke" && flight.begin()) { setMessage(""); revoke.mutate(guestId, { onSuccess: () => { setIssued(null); setMessage(t("guests.detail.link.revoked")); }, onSettled: flight.end }); }
  };
  return { issue, revoke, issued, confirm, setConfirm, message, generate, copy, share, confirmed, timeZone: celebration?.timeZone ?? "UTC" };
}
type GuestLink = ReturnType<typeof useGuestLink>;

/** The link itself. Its one primary action ("Generar y copiar enlace", then "Copiar enlace") lives in the header; here the link is explained, masked and can be shared. */
function LinkSection({ link, name }: { readonly link: GuestLink; readonly name: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const { issued, issue, revoke, confirm, message } = link;
  return (
    <View style={[styles.card, { maxWidth: 720 }]}>
      <Text accessibilityRole="header" style={styles.subtitle}>{t("guests.detail.link.title")}</Text>
      <Text style={styles.body}>{t("guests.detail.link.intro")}</Text>
      {issued ? (
        <Celebrate title={t("guests.detail.link.readyTitle", { name })} body={t("guests.detail.link.readyBody")}>
          <Text selectable={false} testID="masked-link" style={[styles.body, { fontFamily: fonts.mono }]}>{t("guests.detail.link.masked", { value: issued.masked })}</Text>
          <Text style={styles.muted}>{t("guests.detail.link.expires", { date: formatCelebrationDate(issued.expiresAt, { locale, timeZone: link.timeZone }) })}</Text>
          <Text style={styles.muted}>{t("guests.detail.link.once")}</Text>
          <View style={styles.row}>
            <ActionButton variant="secondary" label={t("guests.detail.link.share")} onPress={() => { void link.share(); }} testID="share-link" />
          </View>
        </Celebrate>
      ) : <Text style={styles.muted}>{t("guests.detail.link.none")}</Text>}
      {message ? <Notice kind="success">{message}</Notice> : null}
      <FailureNotice error={issue.error ?? revoke.error} />
      <ConfirmDialog visible={confirm !== null} danger title={confirm === "reissue" ? t("guests.detail.link.reissueTitle") : t("guests.detail.link.revokeTitle")} body={confirm === "reissue" ? t("guests.detail.link.reissueBody") : t("guests.detail.link.revokeBody")}
        confirmLabel={confirm === "reissue" ? t("guests.detail.link.reissue") : t("guests.detail.link.revoke")} onConfirm={link.confirmed} onCancel={() => link.setConfirm(null)} />
    </View>
  );
}

function GroupSection({ celebrationId, guestId, groupId }: { readonly celebrationId: string; readonly guestId: string; readonly groupId: string | null }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const groups = useGuestGroups(client, celebrationId);
  const change = useChangeGuestGroup(client, celebrationId);
  const [current, setCurrent] = useState<string | null>(groupId);
  if (!groups.data || groups.data.items.length === 0) return null;
  return (
    <View style={[styles.card, { maxWidth: 720 }]}>
      <Text style={styles.label}>{t("guests.detail.groupTitle")}</Text>
      <FilterSelect testID="guest-group" label={t("guests.detail.groupTitle")} value={current ?? ""}
        onChange={(value) => { if (change.isPending || value === (current ?? "")) return; change.mutate({ guestId, groupId: value || null }, { onSuccess: () => setCurrent(value || null) }); }}
        options={[{ value: "", label: t("guests.detail.groupNone") }, ...groups.data.items.map((group) => ({ value: group.id, label: group.name, count: group.memberCount }))]} />
      {change.isSuccess ? <Notice kind="success">{t("guests.detail.groupSaved")}</Notice> : null}
      <FailureNotice error={change.error} />
    </View>
  );
}

/** Irreversible removal of a guest and their data (the backend's `erasure`); there is no soft delete, so the dialog says so. Opened from the header menu. */
function useEraseFlow(celebration: Celebration | undefined, guestId: string, onDone: () => void) {
  const client = useApiClient();
  const erase = useEraseGuest(client, celebration?.id ?? "");
  const flight = useSingleFlightGate();
  const [confirm, setConfirm] = useState(false);
  const run = (): void => {
    setConfirm(false);
    if (!celebration || !flight.begin()) return;
    erase.mutate(guestId, { onSuccess: onDone, onSettled: flight.end });
  };
  return { erase, confirm, setConfirm, run };
}
type EraseFlow = ReturnType<typeof useEraseFlow>;

function DetailBody({ celebration, guestId, guest, link, eraser, onNavigate }: { readonly celebration: Celebration; readonly guestId: string; readonly guest: ReturnType<typeof useGuestDetail>; readonly link: GuestLink; readonly eraser: EraseFlow; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const status = useGuestList(client, celebration.id, { search: guest.data?.name ?? "", limit: 100 });
  if (guest.isPending) return <BlockSkeleton />;
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
          <Text accessibilityRole="header" aria-level={2} style={[styles.title, { fontSize: 28, lineHeight: 32 }]}>{data.name}</Text>
          {row ? <View style={{ alignSelf: "flex-start" }}><StatusBadge status={row.status} /></View> : null}
          {data.email ? <Text style={styles.body}>{t("guests.detail.email")}: {data.email}</Text> : null}
          {data.phone ? <Text style={styles.body}>{t("guests.detail.phone")}: {data.phone}</Text> : null}
          <Text style={styles.muted}>{t("guests.detail.companions")}: {data.allowedCompanions} · {t("guests.detail.locale")}: {data.locale}</Text>
          <Text style={styles.muted}>{t("guests.detail.consent", { date: formatCelebrationDate(data.consentGivenAt, { locale, timeZone: celebration.timeZone }) })}</Text>
        </View>
      </View>
      <LinkSection link={link} name={data.name} />
      <GroupSection celebrationId={celebration.id} guestId={guestId} groupId={data.groupId} />
      <FailureNotice error={eraser.erase.error} onRetry={() => eraser.setConfirm(true)} />
      <ConfirmDialog visible={eraser.confirm} danger title={t("guests.detail.erase.confirmTitle", { name: data.name })} body={t("guests.detail.erase.confirmBody")} confirmLabel={t("guests.detail.erase.confirm")} onConfirm={eraser.run} onCancel={() => eraser.setConfirm(false)} />
      <TextAction label={t("guests.form.back")} onPress={back} />
    </View>
  );
}

/** The link and the removal are lifted here so the header can carry the one primary action and the "⋯" menu while the body explains the result. One tree for every state: the frame never remounts when the celebration arrives. */
export function GuestDetailScreen(props: ScreenProps & { readonly guestId?: string }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const guestId = props.guestId ?? "";
  const celebration = useCelebration(client, props.celebrationId ?? "").data;
  const guest = useGuestDetail(client, celebration?.id ?? "", guestId);
  const link = useGuestLink(celebration, guestId);
  const eraser = useEraseFlow(celebration, guestId, () => props.onNavigate(withCelebration(HOST_ROUTES.guests, props.celebrationId)));
  const ready = Boolean(guest.data);
  const primary = link.issued
    ? <ActionButton label={t("guests.detail.link.copy")} onPress={() => { void link.copy(); }} testID="copy-link" />
    : <ActionButton label={t("guests.detail.link.issue")} busy={link.issue.isPending} onPress={link.generate} testID="issue-link" />;
  return (
    <CelebrationScreen {...props} current="guests" title={t("guests.detail.title")} intro={t("guests.detail.intro")}
      actions={ready ? primary : undefined}
      menu={ready ? (
        <OverflowMenu label={t("guests.more")} testID="guest-more" items={[
          ...(link.issued ? [{ key: "reissue", label: t("guests.detail.link.reissue"), onPress: () => link.setConfirm("reissue") }] : []),
          { key: "revoke", label: t("guests.detail.link.revoke"), testID: "revoke-link", destructive: true, disabled: link.revoke.isPending, onPress: () => link.setConfirm("revoke") },
          { key: "erase", label: t("guests.detail.erase.action"), testID: "erase-guest", destructive: true, disabled: eraser.erase.isPending, onPress: () => eraser.setConfirm(true) }
        ]} />
      ) : undefined}>
      {({ celebration: loaded }) => (props.guestId ? <DetailBody celebration={loaded} guestId={guestId} guest={guest} link={link} eraser={eraser} onNavigate={props.onNavigate} /> : <Notice kind="error">{t("guests.detail.missing")}</Notice>)}
    </CelebrationScreen>
  );
}
