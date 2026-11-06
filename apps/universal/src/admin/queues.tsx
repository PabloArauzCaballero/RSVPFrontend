import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { useModerationDecision, useModerationQueue, useVerificationAction, useVerificationQueue, type ModerationItem, type ModerationStatus, type VerificationAction, type VerificationItem, type VerificationStatus } from "@rsvp/query-hooks/admin";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, Notice, styles } from "../host/ui";
import { AdminScreen, adminOnly } from "./admin-screen";
import { AdminErrorNotice, QueryBoundary, ReasonDialog, useStamp } from "./shared";
import { useSingleMutation } from "../platform/single-flight";

/** E7 verification queue (REQ-F14-03) and E8 moderation (REQ-F14-04): act on a row, reject/suspend need a reason. */

type Nav = { readonly onNavigate: (href: string) => void };

const VERIFICATION_STATUSES: readonly VerificationStatus[] = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];
const ACTIONS_BY_STATUS: Readonly<Record<VerificationStatus, readonly VerificationAction[]>> = {
  // provider-catalog only moves PENDING to VERIFIED/REJECTED and VERIFIED to SUSPENDED (any other transition answers 409): a rejected
  // provider is resubmitted by its owner, and nothing reinstates a suspended one yet, so those two states offer no button.
  PENDING: ["verify", "reject"], VERIFIED: ["suspend"], REJECTED: [], SUSPENDED: []
};

function VerificationRow({ item, busy, onVerify, onAsk }: { readonly item: VerificationItem; readonly busy: boolean; readonly onVerify: () => void; readonly onAsk: (action: "reject" | "suspend") => void }): ReactNode {
  const t = useT();
  const stamp = useStamp();
  return (
    <View style={styles.card} accessibilityLabel={item.name}>
      <Text accessibilityRole="header" style={styles.subtitle}>{item.name}</Text>
      <Text style={styles.muted}>{`${item.category} · ${item.city} · ${t("admin.verification.submitted", { when: stamp(item.submittedAt) })}`}</Text>
      {item.reason ? <Text style={styles.muted}>{t("admin.common.reasonOn", { reason: item.reason })}</Text> : null}
      {(ACTIONS_BY_STATUS[item.status] ?? []).length === 0 ? <Text style={styles.muted} testID={`no-action-${item.providerId}`}>{t(item.status === "REJECTED" ? "admin.verification.noActionRejected" : "admin.verification.noActionSuspended")}</Text> : null}
      <View style={styles.row}>
        {(ACTIONS_BY_STATUS[item.status] ?? []).map((action) => (
          <ActionButton key={action} variant={action === "verify" ? "primary" : "danger"} busy={busy} label={t(`admin.verification.${action}Named`, { name: item.name })}
            onPress={() => (action === "verify" ? onVerify() : onAsk(action))} testID={`${action}-${item.providerId}`} />
        ))}
      </View>
    </View>
  );
}

function VerificationScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [status, setStatus] = useState<VerificationStatus>("PENDING");
  const queue = useVerificationQueue(client, status);
  const act = useVerificationAction(client);
  const actOnce = useSingleMutation(act);
  const [asking, setAsking] = useState<{ readonly item: VerificationItem; readonly action: "reject" | "suspend" } | null>(null);
  return (
    <AdminScreen title={t("admin.verification.title")} current="verification" onNavigate={onNavigate}>
      <ChoiceGroup label={t("admin.common.filter")} value={status} onChange={(next) => { act.reset(); setStatus(next); }} choices={VERIFICATION_STATUSES.map((value) => ({ value, label: t(`admin.verification.statuses.${value}`) }))} />
      {act.isSuccess ? <Notice kind="success">{t("admin.verification.done")}</Notice> : null}
      <AdminErrorNotice error={act.error} onReload={() => { act.reset(); void queue.refetch(); }} />
      <QueryBoundary query={queue} empty={t("admin.verification.empty", { status: t(`admin.verification.statuses.${status}`) })}>
        {(data) => <>{data.items.map((item) => (
          <VerificationRow key={item.providerId} item={item} busy={act.isPending && act.variables?.providerId === item.providerId}
            onVerify={() => actOnce({ providerId: item.providerId, action: "verify" })} onAsk={(action) => setAsking({ item, action })} />
        ))}</>}
      </QueryBoundary>
      <ReasonDialog visible={asking !== null} title={asking ? t(`admin.verification.${asking.action}Title`, { name: asking.item.name }) : ""} body={asking ? t(`admin.verification.${asking.action}Body`) : ""}
        confirmLabel={asking ? t(`admin.verification.${asking.action}`) : ""} onCancel={() => setAsking(null)}
        onConfirm={(reason) => { if (asking) actOnce({ providerId: asking.item.providerId, action: asking.action, reason }); setAsking(null); }} />
    </AdminScreen>
  );
}

const MODERATION_STATUSES: readonly ModerationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

function ModerationRow({ item, busy, onApprove, onReject }: { readonly item: ModerationItem; readonly busy: boolean; readonly onApprove: () => void; readonly onReject: () => void }): ReactNode {
  const t = useT();
  const stamp = useStamp();
  return (
    <View style={styles.card} accessibilityLabel={item.title}>
      <Text accessibilityRole="header" style={styles.subtitle}>{item.title}</Text>
      <Text style={styles.muted}>{`${t(`admin.moderation.kinds.${item.kind}`)} · ${item.submittedBy} · ${stamp(item.submittedAt)}`}</Text>
      {item.url ? <ActionButton variant="secondary" label={t("admin.moderation.open", { name: item.title })} onPress={() => { void Linking.openURL(item.url ?? ""); }} /> : null}
      {item.reason ? <Text style={styles.muted}>{t("admin.common.reasonOn", { reason: item.reason })}</Text> : null}
      {item.status === "PENDING" ? (
        <View style={styles.row}>
          <ActionButton busy={busy} label={t("admin.moderation.approveNamed", { name: item.title })} onPress={onApprove} testID={`approve-${item.id}`} />
          <ActionButton busy={busy} variant="danger" label={t("admin.moderation.rejectNamed", { name: item.title })} onPress={onReject} testID={`reject-${item.id}`} />
        </View>
      ) : null}
    </View>
  );
}

function ModerationScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [status, setStatus] = useState<ModerationStatus>("PENDING");
  const queue = useModerationQueue(client, status);
  const decide = useModerationDecision(client);
  const decideOnce = useSingleMutation(decide);
  const [rejecting, setRejecting] = useState<ModerationItem | null>(null);
  return (
    <AdminScreen title={t("admin.moderation.title")} current="moderation" onNavigate={onNavigate}>
      <ChoiceGroup label={t("admin.common.filter")} value={status} onChange={(next) => { decide.reset(); setStatus(next); }} choices={MODERATION_STATUSES.map((value) => ({ value, label: t(`admin.moderation.statuses.${value}`) }))} />
      {decide.isSuccess ? <Notice kind="success">{t("admin.moderation.done")}</Notice> : null}
      <AdminErrorNotice error={decide.error} onReload={() => { decide.reset(); void queue.refetch(); }} />
      <QueryBoundary query={queue} empty={t("admin.moderation.empty", { status: t(`admin.moderation.statuses.${status}`) })}>
        {(data) => <>{data.items.map((item) => (
          <ModerationRow key={item.id} item={item} busy={decide.isPending && decide.variables?.id === item.id}
            onApprove={() => decideOnce({ id: item.id, decision: "approve" })} onReject={() => setRejecting(item)} />
        ))}</>}
      </QueryBoundary>
      <ReasonDialog visible={rejecting !== null} title={rejecting ? t("admin.moderation.rejectTitle", { name: rejecting.title }) : ""} body={t("admin.moderation.rejectBody")} confirmLabel={t("admin.moderation.reject")}
        onCancel={() => setRejecting(null)} onConfirm={(reason) => { if (rejecting) decideOnce({ id: rejecting.id, decision: "reject", reason }); setRejecting(null); }} />
    </AdminScreen>
  );
}

export const VerificationScreen = adminOnly(VerificationScreenContent);

export const ModerationScreen = adminOnly(ModerationScreenContent);
