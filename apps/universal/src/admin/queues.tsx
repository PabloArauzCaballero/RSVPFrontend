import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { useModerationDecision, useModerationQueue, useVerificationAction, useVerificationQueue, type ModerationItem, type ModerationStatus, type VerificationAction, type VerificationItem, type VerificationStatus } from "@rsvp/query-hooks/admin";
import { spacing } from "@rsvp/design-tokens";
import { AvatarMark, Button, Chip, Stagger, useColors } from "@rsvp/ui";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, FilterSelect, Notice, OverflowMenu, PageIntro, useStyles } from "../host/ui";
import { AdminScreen, adminOnly } from "./admin-screen";
import { AdminErrorNotice, QueryBoundary, ReasonDialog, useStamp, Stack } from "./shared";
import { useSingleMutation } from "../platform/single-flight";

/** E7 verification queue (REQ-F14-03) and E8 moderation (REQ-F14-04): act on a row, reject/suspend need a reason. */

/** A compact queue row: a hairline between rows (no card), readable at 360 px. */
function useRowStyle(): object {
  const palette = useColors();
  return { gap: spacing[2], paddingVertical: spacing[4], borderTopWidth: 1, borderTopColor: palette.border, maxWidth: 720 };
}

const PAGE = 10;
function ShowMore({ total, shown, onMore }: { readonly total: number; readonly shown: number; readonly onMore: () => void }): ReactNode {
  const t = useT();
  return total > shown ? <ActionButton variant="secondary" label={t("admin.dashboard.showMore", { count: total - shown })} onPress={onMore} testID="admin-show-more" /> : null;
}

type Nav = { readonly onNavigate: (href: string) => void };

const VERIFICATION_STATUSES: readonly VerificationStatus[] = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];
const ACTIONS_BY_STATUS: Readonly<Record<VerificationStatus, readonly VerificationAction[]>> = {
  // provider-catalog only moves PENDING to VERIFIED/REJECTED and VERIFIED to SUSPENDED (any other transition answers 409): a rejected
  // provider is resubmitted by its owner, and nothing reinstates a suspended one yet, so those two states offer no button.
  PENDING: ["verify", "reject"], VERIFIED: ["suspend"], REJECTED: [], SUSPENDED: []
};

/** A row = who, state, when, and one visible action. The other (negative) actions sit behind the "⋯" menu so a long queue stays scannable. */
function RowActions({ primary, items }: { readonly primary?: ReactNode; readonly items: readonly { readonly key: string; readonly label: string; readonly onPress: () => void; readonly testID: string; readonly destructive: boolean }[] }): ReactNode {
  const t = useT();
  const styles = useStyles();
  if (!primary && items.length === 0) return null;
  return <View style={[styles.row, { flexWrap: "nowrap" }]}>{primary}<OverflowMenu label={t("admin.dashboard.more")} items={items} /></View>;
}

function VerificationRow({ item, busy, onVerify, onAsk }: { readonly item: VerificationItem; readonly busy: boolean; readonly onVerify: () => void; readonly onAsk: (action: "reject" | "suspend") => void }): ReactNode {
  const t = useT();
  const stamp = useStamp();
  const styles = useStyles();
  const rowStyle = useRowStyle();
  const actions = ACTIONS_BY_STATUS[item.status] ?? [];
  const state = busy ? "loading" : "default";
  const label = (action: VerificationAction): string => t(`admin.verification.${action}Named`, { name: item.name });
  const button = (action: VerificationAction): ReactNode => (
    <Button key={action} variant={action === "verify" ? "primary" : "danger"} state={state} accessibilityLabel={t(`admin.verification.${action}Named`, { name: item.name })} onPress={() => (action === "verify" ? onVerify() : onAsk(action))} testID={`${action}-${item.providerId}`}>{t(`admin.verification.${action}`)}</Button>
  );
  const first = actions[0];
  const rest = actions.slice(1);
  return (
    <View style={rowStyle} accessibilityLabel={item.name}>
      <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap", gap: spacing[3] }]}><View style={{ flexShrink: 0 }}><AvatarMark name={item.name} size={40} /></View><Text accessibilityRole="header" style={[styles.subtitle, { flex: 1, flexShrink: 1, overflowWrap: "anywhere" } as object]}>{item.name}</Text><Chip tone={item.status === "VERIFIED" ? "yes" : item.status === "PENDING" ? "maybe" : "no"}>{t(`admin.verification.state.${item.status}`)}</Chip></View>
      <Text style={styles.muted}>{`${item.category} · ${item.city} · ${t("admin.verification.submitted", { when: stamp(item.submittedAt) })}`}</Text>
      {item.reason ? <Text style={styles.muted}>{t("admin.common.reasonOn", { reason: item.reason })}</Text> : null}
      {actions.length === 0 ? <Text style={styles.muted} testID={`no-action-${item.providerId}`}>{t(item.status === "REJECTED" ? "admin.verification.noActionRejected" : "admin.verification.noActionSuspended")}</Text> : null}
      {first ? <RowActions primary={button(first)} items={rest.map((action) => ({ key: action, label: label(action), onPress: () => onAsk(action as "reject" | "suspend"), testID: `${action}-${item.providerId}`, destructive: true }))} /> : null}
    </View>
  );
}

function VerificationScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [status, setStatus] = useState<VerificationStatus>("PENDING");
  const [shown, setShown] = useState(PAGE);
  const queue = useVerificationQueue(client, status);
  const act = useVerificationAction(client);
  const actOnce = useSingleMutation(act);
  const [asking, setAsking] = useState<{ readonly item: VerificationItem; readonly action: "reject" | "suspend" } | null>(null);
  return (
    <AdminScreen title={t("admin.verification.title")} current="verification" onNavigate={onNavigate}>
      <Stack>
      <PageIntro>{t("admin.verification.intro")}</PageIntro>
      <FilterSelect label={t("admin.common.filter")} value={status} onChange={(next) => { act.reset(); setShown(PAGE); setStatus(next); }} options={VERIFICATION_STATUSES.map((value) => ({ value, label: t(`admin.verification.statuses.${value}`) }))} />
      {act.isSuccess ? <Notice kind="success">{t("admin.verification.done")}</Notice> : null}
      <AdminErrorNotice error={act.error} onReload={() => { act.reset(); void queue.refetch(); }} />
      <QueryBoundary query={queue} avatar illustration={status === "PENDING" ? "nothingPending" : "emptySearch"} {...(status === "PENDING" ? { emptyTitle: t("admin.common.allClearTitle") } : {})} empty={t("admin.verification.empty", { status: t(`admin.verification.statuses.${status}`) })}>
        {(data) => <><Stagger>{data.items.slice(0, shown).map((item) => (
          <VerificationRow key={item.providerId} item={item} busy={act.isPending && act.variables?.providerId === item.providerId}
            onVerify={() => actOnce({ providerId: item.providerId, action: "verify" })} onAsk={(action) => setAsking({ item, action })} />
        ))}</Stagger><ShowMore total={data.items.length} shown={shown} onMore={() => setShown((current) => current + PAGE)} /></>}
      </QueryBoundary>
      <ReasonDialog visible={asking !== null} title={asking ? t(`admin.verification.${asking.action}Title`, { name: asking.item.name }) : ""} body={asking ? t(`admin.verification.${asking.action}Body`) : ""}
        confirmLabel={asking ? t(`admin.verification.${asking.action}`) : ""} onCancel={() => setAsking(null)}
        onConfirm={(reason) => { if (asking) actOnce({ providerId: asking.item.providerId, action: asking.action, reason }); setAsking(null); }} />
      </Stack>
    </AdminScreen>
  );
}

const MODERATION_STATUSES: readonly ModerationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

function ModerationRow({ item, busy, onApprove, onReject }: { readonly item: ModerationItem; readonly busy: boolean; readonly onApprove: () => void; readonly onReject: () => void }): ReactNode {
  const t = useT();
  const stamp = useStamp();
  const styles = useStyles();
  const rowStyle = useRowStyle();
  const state = busy ? "loading" : "default";
  return (
    <View style={rowStyle} accessibilityLabel={item.title}>
      <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}><Text accessibilityRole="header" style={[styles.subtitle, { flex: 1, flexShrink: 1, overflowWrap: "anywhere" } as object]}>{item.title}</Text><Chip tone={item.status === "APPROVED" ? "yes" : item.status === "PENDING" ? "maybe" : "no"}>{t(`admin.moderation.state.${item.status}`)}</Chip></View>
      <Text style={styles.muted}>{`${t(`admin.moderation.kinds.${item.kind}`)} · ${stamp(item.submittedAt)}`}</Text>
      {item.reason ? <Text style={styles.muted}>{t("admin.common.reasonOn", { reason: item.reason })}</Text> : null}
      <RowActions
        primary={item.status === "PENDING" ? <Button variant="primary" state={state} accessibilityLabel={t("admin.moderation.approveNamed", { name: item.title })} onPress={onApprove} testID={`approve-${item.id}`}>{t("admin.moderation.approve")}</Button> : null}
        items={[
          ...(item.url ? [{ key: "open", label: t("admin.moderation.open", { name: item.title }), onPress: () => { void Linking.openURL(item.url ?? ""); }, testID: `open-${item.id}`, destructive: false }] : []),
          ...(item.status === "PENDING" ? [{ key: "reject", label: t("admin.moderation.rejectNamed", { name: item.title }), onPress: onReject, testID: `reject-${item.id}`, destructive: true }] : [])
        ]} />
    </View>
  );
}

function ModerationScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [status, setStatus] = useState<ModerationStatus>("PENDING");
  const [shown, setShown] = useState(PAGE);
  const queue = useModerationQueue(client, status);
  const decide = useModerationDecision(client);
  const decideOnce = useSingleMutation(decide);
  const [rejecting, setRejecting] = useState<ModerationItem | null>(null);
  return (
    <AdminScreen title={t("admin.moderation.title")} current="moderation" onNavigate={onNavigate}>
      <Stack>
      <PageIntro>{t("admin.moderation.intro")}</PageIntro>
      <ChoiceGroup label={t("admin.common.filter")} value={status} onChange={(next) => { decide.reset(); setShown(PAGE); setStatus(next); }} choices={MODERATION_STATUSES.map((value) => ({ value, label: t(`admin.moderation.statuses.${value}`) }))} />
      {decide.isSuccess ? <Notice kind="success">{t("admin.moderation.done")}</Notice> : null}
      <AdminErrorNotice error={decide.error} onReload={() => { decide.reset(); void queue.refetch(); }} />
      <QueryBoundary query={queue} illustration={status === "PENDING" ? "nothingPending" : "emptySearch"} {...(status === "PENDING" ? { emptyTitle: t("admin.common.allClearTitle") } : {})} empty={t("admin.moderation.empty", { status: t(`admin.moderation.statuses.${status}`) })}>
        {(data) => <><Stagger>{data.items.slice(0, shown).map((item) => (
          <ModerationRow key={item.id} item={item} busy={decide.isPending && decide.variables?.id === item.id}
            onApprove={() => decideOnce({ id: item.id, decision: "approve" })} onReject={() => setRejecting(item)} />
        ))}</Stagger><ShowMore total={data.items.length} shown={shown} onMore={() => setShown((current) => current + PAGE)} /></>}
      </QueryBoundary>
      <ReasonDialog visible={rejecting !== null} title={rejecting ? t("admin.moderation.rejectTitle", { name: rejecting.title }) : ""} body={t("admin.moderation.rejectBody")} confirmLabel={t("admin.moderation.reject")}
        onCancel={() => setRejecting(null)} onConfirm={(reason) => { if (rejecting) decideOnce({ id: rejecting.id, decision: "reject", reason }); setRejecting(null); }} />
      </Stack>
    </AdminScreen>
  );
}

export const VerificationScreen = adminOnly(VerificationScreenContent);

export const ModerationScreen = adminOnly(ModerationScreenContent);
