import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { useAdminPartner, useAdminUserByEmail, useAdminUsersByIds, useChangePartnerOwner, useGrantRole, useRevokeRole, type PartnerOwnerChange } from "@rsvp/query-hooks/admin";
import { useApiClient, useT } from "../../platform/providers";
import { useSingleFlightGate } from "../../platform/single-flight";
import { ActionButton, Field, Notice, useStyles } from "../../host/ui";
import { EditorDialog } from "../editor-dialog";
import { AdminErrorNotice } from "../shared";
import { Line } from "./partner-steps";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** change-owner answers with their own copy; the reload re-reads the partner (a new version, the current owner). */
const CODED = ["OWNER_CHANGE_UNAVAILABLE", "SAME_OWNER", "REASON_REQUIRED", "PARTNER_VERSION_CONFLICT"] as const;
type Coded = (typeof CODED)[number];
const codeOf = (error: unknown): Coded | null => {
  const code = error instanceof ApiError ? error.problem?.code : undefined;
  return CODED.find((known) => known === code) ?? null;
};

type Failure = { readonly stage: "grant" | "change"; readonly error: unknown } | { readonly stage: "same" };
interface Outcome { readonly partner: PartnerOwnerChange; readonly revoke: "done" | "skipped" | "failed" }

/**
 * «Cambiar dueño» (DPA-3, DPA-9), only when EXPO_PUBLIC_PARTNER_OWNER_CHANGE is on. In order: (a) grant PROVIDER to the new owner
 * (idempotent: harmless if the change then fails, and a retry repeats it), (b) change-owner with If-Match, (c) only when the previous
 * owner owns no other partner, revoke their PROVIDER (F4). If (c) fails the change stands and the admin is told to revoke it by hand.
 */
export function ChangeOwnerDialog({ partnerId, onClose, onDone }: { readonly partnerId: string; readonly onClose: () => void; readonly onDone: (partnerId: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const partner = useAdminPartner(client, partnerId);
  const current = useAdminUsersByIds(client, partner.data ? [partner.data.ownerUserId] : []);
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState("");
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const lookup = useAdminUserByEmail(client, searched);
  const grant = useGrantRole(client);
  const change = useChangePartnerOwner(client);
  const revoke = useRevokeRole(client);
  const gate = useSingleFlightGate();
  const busy = grant.isPending || change.isPending || revoke.isPending;
  const newOwner = searched && lookup.data ? lookup.data : null;
  const previousOwnerId = partner.data?.ownerUserId;
  const previousEmail = previousOwnerId ? current.data?.get(previousOwnerId)?.email ?? previousOwnerId : "";

  const search = (): void => {
    if (!EMAIL.test(email.trim())) { setInvalidEmail(true); return; }
    setInvalidEmail(false);
    setFailure(null);
    setSearched(email.trim());
  };
  const reload = (): void => { setFailure(null); grant.reset(); change.reset(); void partner.refetch(); };

  const submit = (): void => {
    setTouched(true);
    const detail = partner.data;
    if (!detail || !newOwner || !reason.trim()) return;
    if (newOwner.id === detail.ownerUserId) { setFailure({ stage: "same" }); return; }
    if (!gate.begin()) return;
    setFailure(null);
    const previous = detail.ownerUserId;
    const finish = (result: Outcome): void => { setOutcome(result); gate.end(); };
    grant.mutate({ userId: newOwner.id, role: "PROVIDER" }, {
      onError: (error) => { setFailure({ stage: "grant", error }); gate.end(); },
      onSuccess: () => change.mutate({ providerId: detail.id, newOwnerUserId: newOwner.id, reason: reason.trim(), version: detail.version }, {
        onError: (error) => { setFailure({ stage: "change", error }); gate.end(); },
        onSuccess: (changed) => {
          if (changed.previousOwnerStillOwns > 0) { finish({ partner: changed, revoke: "skipped" }); return; }
          revoke.mutate({ userId: previous, role: "PROVIDER" }, { onSuccess: () => finish({ partner: changed, revoke: "done" }), onError: () => finish({ partner: changed, revoke: "failed" }) });
        }
      })
    });
  };

  const title = t("admin.partners.owner.changeTitle", { name: partner.data?.name ?? "" });
  if (outcome) {
    return (
      <EditorDialog title={title} onClose={() => onDone(partnerId)} cancelTestID="owner-change-close">
        <View testID="owner-changed" style={{ gap: spacing[3] }}>
          <Notice kind="success">{t("admin.partners.owner.changed", { email: newOwner?.email ?? "" })}</Notice>
          {outcome.revoke === "done" ? <Text style={styles.body}>{t("admin.partners.owner.revoked")}</Text> : null}
          {outcome.revoke === "skipped" ? <Text style={styles.body}>{t("admin.partners.owner.keepsRole", { count: outcome.partner.previousOwnerStillOwns })}</Text> : null}
          {outcome.revoke === "failed" ? <Notice kind="error">{t("admin.partners.owner.revokeFailed")}</Notice> : null}
          <Text style={styles.muted}>{t("admin.partners.owner.reloginBoth")}</Text>
        </View>
      </EditorDialog>
    );
  }

  const code = failure && failure.stage !== "same" ? codeOf(failure.error) : null;
  const failureNotice = (): ReactNode => {
    if (!failure) return null;
    if (failure.stage === "same") return <Notice kind="error">{t("admin.partners.owner.codes.SAME_OWNER")}</Notice>;
    if (failure.stage === "grant") return <><Notice kind="error">{t("admin.partners.owner.grantFailed")}</Notice><AdminErrorNotice error={failure.error} /></>;
    if (code) {
      return (
        <Notice kind="error">
          <Text style={styles.body}>{t(`admin.partners.owner.codes.${code}`)}</Text>
          {code === "OWNER_CHANGE_UNAVAILABLE" ? null : <ActionButton icon="refresh" variant="secondary" label={t("admin.partners.owner.reload")} onPress={reload} testID="owner-change-reload" />}
        </Notice>
      );
    }
    return <AdminErrorNotice error={failure.error} onReload={reload} />;
  };

  return (
    <EditorDialog title={title} onClose={onClose} onSave={submit} saveLabel={t("admin.partners.owner.confirm")} saveTestID="owner-change-save" cancelTestID="owner-change-cancel" busy={busy} canSave={Boolean(partner.data)}>
      {partner.error ? <AdminErrorNotice error={partner.error} onRetry={() => { void partner.refetch(); }} /> : null}
      <Text style={styles.body}>{t("admin.partners.owner.changeIntro")}</Text>
      <Line label={t("admin.partners.owner.current")} value={previousEmail} testID="owner-current" />
      <Field label={t("admin.partners.owner.newEmail")} value={email} onChange={(value) => { setInvalidEmail(false); setEmail(value); }} onSubmit={search} keyboardType="email-address" testID="owner-change-email" {...(invalidEmail ? { error: t("admin.partners.codes.INVALID_EMAIL") } : {})} />
      <ActionButton icon="search" variant="secondary" label={t("admin.partners.owner.search")} busy={lookup.isFetching} onPress={search} testID="owner-change-search" />
      {lookup.error ? <AdminErrorNotice error={lookup.error} onRetry={search} /> : null}
      {searched && !lookup.isFetching && lookup.data === null ? <Notice kind="error">{t("admin.partners.owner.notFound")}</Notice> : null}
      {newOwner ? <Notice kind="success">{t("admin.partners.owner.found", { email: newOwner.email })}</Notice> : null}
      {touched && !newOwner ? <Notice kind="error">{t("admin.partners.owner.required")}</Notice> : null}
      <Field label={t("admin.common.reason")} value={reason} onChange={setReason} multiline maxLength={500} testID="owner-change-reason" {...(touched && !reason.trim() ? { error: t("admin.partners.owner.reasonRequired") } : {})} />
      <Text style={styles.muted}>{t("admin.partners.owner.roleSteps")}</Text>
      {failureNotice()}
    </EditorDialog>
  );
}
