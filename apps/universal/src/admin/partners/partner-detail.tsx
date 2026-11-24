import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Chip, useColors, type ChipTone } from "@rsvp/ui";
import { useAdminDocumentDownload, useAdminPartner, useAdminUsersByIds, useRevealPartnerCi, useReviewPartnerDocument, type KypStatus, type PartnerDetail, type PartnerDocument, type PartnerStatus } from "@rsvp/query-hooks/admin";
import { useApiClient, useT } from "../../platform/providers";
import { useSingleMutation } from "../../platform/single-flight";
import { ActionButton, Notice, useStyles } from "../../host/ui";
import { RowsSkeleton } from "../../provider/parts";
import { EditorDialog } from "../editor-dialog";
import { AdminErrorNotice, AdminListError, ReasonDialog, useStamp } from "../shared";
import { Line } from "./partner-steps";
import { useDocumentKindLabel } from "./kyp-documents";

const DETAIL_WIDTH = 760;
export const STATUS_TONE: Readonly<Record<PartnerStatus, ChipTone>> = { VERIFIED: "yes", PENDING_VERIFICATION: "maybe", DRAFT: "wait", SUSPENDED: "no", REJECTED: "no" };
export const KYP_TONE: Readonly<Record<KypStatus, ChipTone>> = { COMPLETE: "yes", EXPIRING: "maybe", PENDING: "wait", EXPIRED: "no" };
const REVIEW_TONE: Readonly<Record<string, ChipTone>> = { ACCEPTED: "yes", PENDING: "wait", REJECTED: "no" };

function Block({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  return (
    <View style={{ gap: spacing[2], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }}>
      <Text accessibilityRole="header" style={styles.itemTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** The KYP as stored: the CI and the account arrive masked. «Mostrar CI» reads it in clear with ?reveal=ci, which the server audits. */
function KypBlock({ partner }: { readonly partner: PartnerDetail }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [reveal, setReveal] = useState(false);
  const revealed = useRevealPartnerCi(useApiClient(), partner.id, reveal);
  const kyp = partner.kyp;
  if (!kyp) return <Block title={t("admin.partners.steps.kyp")}><Text style={styles.muted}>{t("admin.partners.detail.noKyp")}</Text></Block>;
  const rep = kyp.representative;
  const ci = reveal && revealed.data?.kyp?.representative?.ciNumber ? revealed.data.kyp.representative.ciNumber : rep?.ciNumber;
  return (
    <Block title={t("admin.partners.steps.kyp")}>
      <Line label={t("admin.partners.fields.personType")} value={kyp.personType ? t(`admin.partners.personTypes.${kyp.personType}`) : ""} />
      <Line label={t("admin.partners.fields.legalName")} value={kyp.legalName} />
      <Line label={t("admin.partners.fields.nit")} value={kyp.nit} />
      <Line label={t("admin.partners.fields.seprec")} value={[kyp.seprecRegistration, kyp.seprecDate].filter(Boolean).join(" · ")} />
      <Line label={t("admin.partners.fields.companyType")} value={kyp.companyType} />
      <Line label={t("admin.partners.fields.addressLine")} value={[kyp.legalAddress?.line, kyp.legalAddress?.cityCode, kyp.legalAddress?.departmentCode].filter(Boolean).join(", ")} />
      <Line label={t("admin.partners.fields.repFullName")} value={rep?.fullName} />
      <Line label={t("admin.partners.fields.ci")} value={ci ? `${ci} ${rep?.ciExtension ?? ""} ${rep?.ciComplement ?? ""}`.trim() : ""} testID="partner-ci" />
      <View style={[styles.row, { gap: spacing[2] }]}>
        {reveal && revealed.data ? null : <ActionButton icon="search" variant="secondary" label={t("admin.partners.detail.revealCi")} busy={revealed.isFetching} onPress={() => setReveal(true)} testID="partner-reveal-ci" />}
        <Text style={styles.muted}>{t("admin.partners.detail.revealAudited")}</Text>
      </View>
      {revealed.error ? <AdminErrorNotice error={revealed.error} onRetry={() => { void revealed.refetch(); }} /> : null}
      <Line label={t("admin.partners.fields.ciExpiresOn")} value={rep?.ciExpiresOn} />
      <Line label={t("admin.partners.fields.inRegistration")} value={t(partner.representativeInRegistration ? "admin.partners.detail.yes" : "admin.partners.detail.no")} />
      <Line label={t("admin.partners.kyp.powerOfAttorney")} value={[kyp.powerOfAttorney?.number, kyp.powerOfAttorney?.notary, kyp.powerOfAttorney?.date].filter(Boolean).join(" · ")} />
      <Line label={t("admin.partners.fields.bank")} value={kyp.bankAccount ? [kyp.bankAccount.bank, kyp.bankAccount.accountNumber, kyp.bankAccount.holder, kyp.bankAccount.currency].filter(Boolean).join(" · ") : t("admin.partners.fields.noBank")} />
    </Block>
  );
}

function DocumentsBlock({ partner }: { readonly partner: PartnerDetail }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const label = useDocumentKindLabel();
  const client = useApiClient();
  const review = useReviewPartnerDocument(client, partner.id);
  const reviewOnce = useSingleMutation(review);
  const download = useAdminDocumentDownload(client);
  const downloadOnce = useSingleMutation(download);
  const [rejecting, setRejecting] = useState<PartnerDocument | null>(null);
  return (
    <Block title={t("admin.partners.documents.title")}>
      {partner.documents.length === 0 ? <Text style={styles.muted}>{t("admin.partners.detail.noDocuments")}</Text> : null}
      {partner.documents.map((doc) => (
        <View key={doc.id} testID={`partner-doc-${doc.id}`} style={{ gap: spacing[2], padding: spacing[3], borderWidth: 1, borderColor: palette.border, borderRadius: radius.md }}>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={styles.label}>{label(doc.kind)}</Text>
            <Chip tone={REVIEW_TONE[doc.reviewStatus] ?? "wait"}>{t(`admin.partners.review.${doc.reviewStatus}`)}</Chip>
          </View>
          <Text style={[styles.muted, { overflowWrap: "anywhere" } as object]}>{doc.fileName}{doc.status === "PENDING_UPLOAD" ? ` · ${t("admin.partners.documents.pendingUpload")}` : ""}</Text>
          {doc.reviewReason ? <Text style={styles.muted}>{t("admin.common.reasonOn", { reason: doc.reviewReason })}</Text> : null}
          <View style={styles.row}>
            {doc.status === "UPLOADED" ? <ActionButton icon="arrow" variant="secondary" label={t("admin.partners.documents.download")} busy={download.isPending && download.variables === doc.id} disabled={download.isPending} onPress={() => downloadOnce(doc.id, { onSuccess: (file) => { void Linking.openURL(file.url); } })} testID={`partner-doc-download-${doc.id}`} /> : null}
            {doc.status === "UPLOADED" && doc.reviewStatus !== "ACCEPTED" ? <ActionButton icon="check" variant="secondary" label={t("admin.partners.documents.accept")} disabled={review.isPending} onPress={() => reviewOnce({ documentId: doc.id, decision: "ACCEPTED" })} testID={`partner-doc-accept-${doc.id}`} /> : null}
            {doc.status === "UPLOADED" && doc.reviewStatus !== "REJECTED" ? <ActionButton icon="close" variant="danger" label={t("admin.partners.documents.reject")} disabled={review.isPending} onPress={() => setRejecting(doc)} testID={`partner-doc-reject-${doc.id}`} /> : null}
          </View>
        </View>
      ))}
      <AdminErrorNotice error={review.error ?? download.error} />
      <ReasonDialog visible={rejecting !== null} title={t("admin.partners.documents.rejectTitle", { name: rejecting ? label(rejecting.kind) : "" })} body={t("admin.partners.documents.rejectBody")} confirmLabel={t("admin.partners.documents.reject")}
        onCancel={() => setRejecting(null)} onConfirm={(reason) => { const doc = rejecting; setRejecting(null); if (doc) reviewOnce({ documentId: doc.id, decision: "REJECTED", reason }); }} />
    </Block>
  );
}

function AuditBlock({ partner, people }: { readonly partner: PartnerDetail; readonly people: (id: string | null) => string }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const stamp = useStamp();
  return (
    <Block title={t("admin.partners.detail.audit")}>
      {partner.audit.length === 0 ? <Text style={styles.muted}>{t("admin.partners.detail.noAudit")}</Text> : (
        <View role="list" style={{ gap: spacing[3] }}>
          {partner.audit.map((entry, index) => (
            <View key={`${entry.occurredAt}-${index}`} role="listitem" style={{ gap: 2 }}>
              <Text style={styles.label}>{t("admin.partners.detail.auditLine", { action: entry.action, who: people(entry.actorId), when: stamp(entry.occurredAt) })}</Text>
              {entry.reason ? <Text style={styles.muted}>{t("admin.common.reasonOn", { reason: entry.reason })}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </Block>
  );
}

/** Ver detalle (DP-12, DP-13): every field, the KYP masked, the documents with their review and the audit history. */
export function PartnerDetailDialog({ partnerId, onClose, onEdit, onCompleteKyp, cityName, categoryName }: {
  readonly partnerId: string; readonly onClose: () => void; readonly onEdit: (partner: PartnerDetail) => void; readonly onCompleteKyp: (partner: PartnerDetail) => void;
  readonly cityName: (code: string) => string; readonly categoryName: (code: string) => string;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const stamp = useStamp();
  const client = useApiClient();
  const query = useAdminPartner(client, partnerId);
  const partner = query.data;
  const users = useAdminUsersByIds(client, partner ? [partner.ownerUserId, partner.createdBy ?? "", ...partner.audit.map((entry) => entry.actorId)] : []);
  const people = (id: string | null): string => (id ? users.data?.get(id)?.email ?? id : "—");
  return (
    <EditorDialog title={partner ? partner.name : t("admin.partners.detail.title")} onClose={onClose} width={DETAIL_WIDTH} cancelTestID="partner-detail-close">
      {query.isPending ? <RowsSkeleton count={3} /> : query.error || !partner ? <AdminListError error={query.error} onRetry={() => { void query.refetch(); }} /> : (
        <View testID="partner-detail" style={{ gap: spacing[3] }}>
          <View style={styles.row}>
            <Chip tone={STATUS_TONE[partner.status]}>{t(`admin.partners.statuses.${partner.status}`)}</Chip>
            <Chip tone={KYP_TONE[partner.kypStatus]}>{t(`admin.partners.kypStatuses.${partner.kypStatus}`)}</Chip>
          </View>
          {partner.statusReason ? <Notice>{t("admin.common.reasonOn", { reason: partner.statusReason })}</Notice> : null}
          <View style={styles.row}>
            <ActionButton icon="arrow" variant="secondary" label={t("admin.partners.actions.edit")} onPress={() => onEdit(partner)} testID="partner-detail-edit" />
            {partner.kypStatus !== "COMPLETE" ? <ActionButton icon="check" variant="secondary" label={t("admin.partners.actions.completeKyp")} onPress={() => onCompleteKyp(partner)} testID="partner-detail-kyp" /> : null}
          </View>
          <Line label={t("admin.partners.columns.owner")} value={people(partner.ownerUserId)} />
          <Line label={t("admin.partners.fields.slug")} value={partner.slug} />
          <Line label={t("admin.partners.fields.plan")} value={t(`admin.partners.plans.${partner.plan}`, { defaultValue: partner.plan })} />
          <Line label={t("admin.partners.columns.origin")} value={`${t(`admin.partners.origins.${partner.origin}`)} · ${people(partner.createdBy)}`} />
          <Line label={t("admin.partners.columns.created")} value={stamp(partner.createdAt)} />
          <Line label={t("admin.partners.columns.updated")} value={stamp(partner.updatedAt)} />
          <Line label={t("admin.partners.columns.listings")} value={String(partner.publishedListings)} />
          <Line label={t("admin.partners.detail.kypDue")} value={partner.kypReviewDueAt} />
          <Block title={t("admin.partners.steps.identity")}>
            <Line label={t("admin.partners.fields.categories")} value={partner.identity.categoryCodes.map(categoryName).join(", ")} />
            <Line label={t("admin.partners.fields.description")} value={partner.identity.description} />
          </Block>
          <Block title={t("admin.partners.steps.contact")}>
            <Line label={t("admin.partners.fields.whatsapp")} value={partner.contact.whatsapp} />
            <Line label={t("admin.partners.fields.phone")} value={partner.contact.phone} />
            <Line label={t("admin.partners.fields.publicEmail")} value={partner.contact.publicEmail} />
            <Line label={t("admin.partners.fields.website")} value={partner.contact.website} />
            <Line label={t("admin.partners.fields.social")} value={Object.values(partner.contact.social ?? {}).filter(Boolean).join(" · ")} />
          </Block>
          <Block title={t("admin.partners.steps.coverage")}>
            <Line label={t("admin.partners.fields.city")} value={partner.coverage.cityCode ? cityName(partner.coverage.cityCode) : ""} />
            <Line label={t("admin.partners.fields.zones")} value={(partner.coverage.zoneCodes ?? []).map(cityName).join(", ")} />
          </Block>
          <KypBlock partner={partner} />
          <DocumentsBlock partner={partner} />
          <AuditBlock partner={partner} people={people} />
        </View>
      )}
    </EditorDialog>
  );
}
