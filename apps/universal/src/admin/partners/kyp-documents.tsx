import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Chip, useColors } from "@rsvp/ui";
import { useDeleteIntakeDocument, useUploadIntakeDocument, useUploadPartnerDocument, type KypDocumentInput, type KypDocumentKind, type PutObject } from "@rsvp/query-hooks/admin";
import { useApiClient, useT } from "../../platform/providers";
import { pickDocument, type PickedImage } from "../../platform/pick-document";
import { ActionButton, useStyles } from "../../host/ui";
import { documentProblem } from "../../provider/documents-screen";
import { AdminErrorNotice } from "../shared";
import { useFieldError, type Errors } from "./partner-steps";

/** Labels of the document kinds an admin sees; a kind this build does not know keeps its code instead of vanishing. */
export const KNOWN_DOCUMENT_KINDS: readonly string[] = ["IDENTITY", "BUSINESS_REGISTRATION", "TAX_ID", "ADDRESS_PROOF", "POWER_OF_ATTORNEY", "BANK_CERTIFICATE", "OTHER"];
export function useDocumentKindLabel(): (kind: string) => string {
  const t = useT();
  return (kind) => (KNOWN_DOCUMENT_KINDS.includes(kind) ? t(`admin.partners.documents.kinds.${kind}`) : t("admin.partners.documents.unknownKind", { kind }));
}

export interface KypDocumentRow { readonly id: string; readonly kind: string; readonly fileName: string; readonly status: "PENDING_UPLOAD" | "UPLOADED"; readonly reviewStatus?: string | null }
type Upload = (variables: { readonly input: KypDocumentInput; readonly put: PutObject }, options: { readonly onError: () => void; readonly onSuccess: () => void }) => void;

/** The bytes go straight to the object store with exactly the method and headers the service signed (no bearer). */
const putFile = (file: PickedImage): PutObject => async ({ url, method, headers }) => {
  const response = await fetch(url, { method, headers: { ...headers }, body: file.file }).catch(() => null);
  if (!response?.ok) throw new Error(`PUT ${response?.status ?? "network"}`);
};

/**
 * One uploader per required KYP document kind: what is missing, what is uploading, what arrived (with its file name),
 * and the error of that kind (a bad file, a failed transfer, or `documents.<KIND>` from the server).
 */
function KypDocumentList({ required, documents, upload, uploading, uploadError, onDelete, deleting, errors }: {
  readonly required: readonly string[];
  readonly documents: readonly KypDocumentRow[];
  readonly upload: Upload;
  readonly uploading: string | null;
  readonly uploadError: unknown;
  readonly onDelete?: (documentId: string) => void;
  readonly deleting?: boolean;
  readonly errors: Errors;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const label = useDocumentKindLabel();
  const err = useFieldError(errors);
  const [problem, setProblem] = useState<{ readonly kind: string; readonly key: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const choose = async (kind: string): Promise<void> => {
    setProblem(null); setFailed(null);
    const file = await pickDocument();
    if (!file) return;
    const issue = documentProblem(file);
    if (issue) { setProblem({ kind, key: issue }); return; }
    upload({ input: { kind: kind as KypDocumentKind, fileName: file.name.replace(/[\\/]/g, "_").slice(0, 160), contentType: file.type as KypDocumentInput["contentType"], sizeBytes: file.size }, put: putFile(file) }, { onError: () => setFailed(kind), onSuccess: () => setFailed(null) });
  };
  const extra = documents.filter((doc) => !required.includes(doc.kind));
  return (
    <View role="group" aria-label={t("admin.partners.documents.title")} style={{ gap: spacing[3] }}>
      <Text accessibilityRole="header" style={styles.itemTitle}>{t("admin.partners.documents.title")}</Text>
      <Text style={styles.muted}>{t("admin.partners.documents.help")}</Text>
      {required.map((kind) => {
        const done = documents.filter((doc) => doc.kind === kind && doc.status === "UPLOADED");
        const accepted = done.find((doc) => doc.reviewStatus !== "REJECTED");
        const busy = uploading === kind;
        const message = problem?.kind === kind ? t(problem.key) : failed === kind ? t("admin.partners.documents.putFailed") : err(`documents.${kind}`).error;
        return (
          <View key={kind} testID={`kyp-doc-${kind}`} style={{ gap: spacing[2], padding: spacing[3], borderWidth: 1, borderColor: message ? palette.danger : palette.border, borderRadius: radius.md }}>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text style={styles.label}>{label(kind)}</Text>
              <Chip tone={busy ? "maybe" : accepted ? "yes" : "wait"}>{t(busy ? "admin.partners.documents.uploading" : accepted ? "admin.partners.documents.uploaded" : "admin.partners.documents.missing")}</Chip>
            </View>
            {done.map((doc) => (
              <View key={doc.id} style={[styles.row, { justifyContent: "space-between" }]}>
                <Text style={[styles.muted, { flex: 1, overflowWrap: "anywhere" } as object]}>{doc.fileName}{doc.reviewStatus === "REJECTED" ? ` · ${t("admin.partners.review.REJECTED")}` : ""}</Text>
                {onDelete ? <ActionButton icon="trash" variant="secondary" label={t("admin.partners.documents.remove")} disabled={deleting || busy} onPress={() => onDelete(doc.id)} testID={`kyp-doc-delete-${doc.id}`} /> : null}
              </View>
            ))}
            {message ? <Text role="alert" style={[styles.muted, { color: palette.danger }]}>{message}</Text> : null}
            <ActionButton icon="upload" variant="secondary" label={t(accepted ? "admin.partners.documents.replace" : "admin.partners.documents.choose")} busy={busy} disabled={uploading !== null && !busy} onPress={() => { void choose(kind); }} testID={`kyp-doc-upload-${kind}`} />
          </View>
        );
      })}
      {extra.length ? <Text style={styles.muted}>{t("admin.partners.documents.others", { names: extra.map((doc) => `${label(doc.kind)} (${doc.fileName})`).join(", ") })}</Text> : null}
      {uploadError && !failed ? <AdminErrorNotice error={uploadError} /> : null}
    </View>
  );
}

export function IntakeDocuments({ intakeId, required, documents, errors }: { readonly intakeId: string; readonly required: readonly string[]; readonly documents: readonly KypDocumentRow[]; readonly errors: Errors }): ReactNode {
  const client = useApiClient();
  const upload = useUploadIntakeDocument(client, intakeId);
  const remove = useDeleteIntakeDocument(client, intakeId);
  return <KypDocumentList required={required} documents={documents} errors={errors} upload={(variables, options) => upload.mutate(variables, options)} uploading={upload.isPending ? upload.variables?.input.kind ?? null : null} uploadError={upload.error ?? remove.error} onDelete={(id) => remove.mutate(id)} deleting={remove.isPending} />;
}

/** Existing partners: an ACCEPTED document is only removed through review, so there is no delete here. */
export function PartnerDocuments({ providerId, required, documents, errors }: { readonly providerId: string; readonly required: readonly string[]; readonly documents: readonly KypDocumentRow[]; readonly errors: Errors }): ReactNode {
  const client = useApiClient();
  const upload = useUploadPartnerDocument(client, providerId);
  return <KypDocumentList required={required} documents={documents} errors={errors} upload={(variables, options) => upload.mutate(variables, options)} uploading={upload.isPending ? upload.variables?.input.kind ?? null : null} uploadError={upload.error} />;
}
