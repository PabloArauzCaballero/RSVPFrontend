import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useAssignEventType, useAuditLog, useEventTypes, useRemoveCollaborator, useSetCollaborator, type Celebration } from "@rsvp/query-hooks";
import { formatCelebrationDate, type Translate } from "@rsvp/i18n";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { CelebrationErrorNotice } from "./celebration-errors";
import { useSingleFlight } from "../platform/single-flight";
import { isUserId } from "./limits";
import { ActionButton, ChoiceGroup, ConfirmDialog, Field, Loading, Notice, Section, styles } from "./ui";

/** C17 · Celebration type, team (collaborators) and change history. Each one is a real Celebration API operation. */

const ROLES = ["CO_HOST", "VIEWER"] as const;
type Role = (typeof ROLES)[number];

export function EventTypeSection({ celebration, onSaved }: { readonly celebration: Celebration; readonly onSaved: (message: string | null) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const types = useEventTypes(client, locale);
  const assign = useAssignEventType(client, celebration.id);
  const [code, setCode] = useState(celebration.eventTypeCode);
  const [confirming, setConfirming] = useState(false);
  const draft = celebration.status === "DRAFT";
  return (
    <Section title={t("host.settingsExtra.eventType.label")}>
      <Text style={styles.muted}>{draft ? t("host.settingsExtra.eventType.help") : t("host.settingsExtra.eventType.locked")}</Text>
      {types.isPending ? <Loading /> : null}
      <CelebrationErrorNotice error={types.error} />
      <ChoiceGroup label={t("host.settingsExtra.eventType.label")} value={code} onChange={draft ? setCode : () => undefined} choices={(types.data?.items ?? []).map((type) => ({ value: type.code, label: type.name }))} />
      <CelebrationErrorNotice error={assign.error} />
      <ActionButton label={t("host.settingsExtra.eventType.save")} disabled={!draft || code === celebration.eventTypeCode} busy={assign.isPending} onPress={() => setConfirming(true)} testID="save-event-type" />
      <ConfirmDialog visible={confirming} title={t("host.settingsExtra.eventType.label")} body={t("host.settingsExtra.eventType.help")} confirmLabel={t("host.settingsExtra.eventType.save")} onCancel={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); onSaved(null); assign.mutateAsync({ target: celebration, code }).then(() => onSaved(t("host.settings.saved")), () => undefined); }} />
    </Section>
  );
}

export function TeamSection({ celebration, onSaved }: { readonly celebration: Celebration; readonly onSaved: (message: string | null) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const once = useSingleFlight();
  const set = useSetCollaborator(client, celebration.id);
  const remove = useRemoveCollaborator(client, celebration.id);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [removing, setRemoving] = useState<string | null>(null);
  const trimmed = userId.trim().toLowerCase();
  const invalid = trimmed !== "" && !isUserId(trimmed);
  const add = (): void => {
    if (!isUserId(trimmed)) return;
    onSaved(null);
    once((release) => { set.mutateAsync({ target: celebration, userId: trimmed, role }).then(() => onSaved(t("host.settingsExtra.team.added")), () => undefined).finally(release); });
  };
  return (
    <Section title={t("host.settingsExtra.team.title")}>
      <Text style={styles.muted}>{t("host.settingsExtra.team.help")}</Text>
      {!celebration.collaborators.length ? <Notice>{t("host.settingsExtra.team.empty")}</Notice> : null}
      {celebration.collaborators.map((member) => (
        <View key={member.userId} style={[styles.row, { justifyContent: "space-between" }]} testID={`member-${member.userId}`}>
          <View style={{ flex: 1 }}>
            <Text selectable style={styles.body}>{member.userId}</Text>
            <Text style={styles.muted}>{t(`host.settingsExtra.team.roles.${member.role}`)}</Text>
          </View>
          <ActionButton variant="danger" label={t("host.settingsExtra.team.remove")} busy={remove.isPending && removing === member.userId} onPress={() => { remove.reset(); setRemoving(member.userId); }} testID={`remove-member-${member.userId}`} />
        </View>
      ))}
      <Field label={t("host.settingsExtra.team.userId")} value={userId} onChange={setUserId} testID="member-user-id" {...(invalid ? { error: t("host.limits.userId") } : {})} />
      <ChoiceGroup label={t("host.settingsExtra.team.role")} value={role} onChange={setRole} choices={ROLES.map((value) => ({ value, label: t(`host.settingsExtra.team.roles.${value}`) }))} />
      <CelebrationErrorNotice error={set.error ?? remove.error} />
      <ActionButton label={t("host.settingsExtra.team.add")} disabled={!isUserId(trimmed)} busy={set.isPending} onPress={add} testID="add-member" />
      <ConfirmDialog visible={removing !== null && !remove.isPending} danger title={t("host.settingsExtra.team.removeTitle")} body={t("host.settingsExtra.team.removeBody")} confirmLabel={t("host.settingsExtra.team.remove")} onCancel={() => setRemoving(null)}
        onConfirm={() => { const target = removing; onSaved(null); if (target) remove.mutateAsync({ target: celebration, userId: target }).then(() => onSaved(t("host.settingsExtra.team.removed")), () => undefined).finally(() => setRemoving(null)); }} />
    </Section>
  );
}

const AUDIT_ACTIONS = ["CREATED", "TYPE_ASSIGNED", "CONFIGURED", "SETTINGS_UPDATED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED", "TEMPLATE_SELECTED"];

/** The history stores a machine code per change; the person reads a sentence, and an unknown code still reads as a change. */
const auditLabel = (t: Translate, action: string): string => t(`host.settingsExtra.audit.actions.${AUDIT_ACTIONS.includes(action) ? action : "other"}`);

export function AuditSection({ celebrationId, timeZone }: { readonly celebrationId: string; readonly timeZone: string }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const audit = useAuditLog(client, celebrationId);
  const items = [...(audit.data?.items ?? [])].reverse();
  return (
    <Section title={t("host.settingsExtra.audit.title")}>
      {audit.isPending ? <Loading /> : null}
      <CelebrationErrorNotice error={audit.error} />
      {audit.isSuccess && !items.length ? <Notice>{t("host.settingsExtra.audit.empty")}</Notice> : null}
      {items.map((entry) => <Text key={entry.id} style={styles.body}>{t("host.settingsExtra.audit.item", { action: auditLabel(t, entry.action), at: formatCelebrationDate(entry.at, { locale, timeZone }) })}</Text>)}
    </Section>
  );
}
