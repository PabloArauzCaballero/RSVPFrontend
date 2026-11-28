import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Stagger, useColors } from "@rsvp/ui";
import { DOCUMENT_KINDS, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, useDeleteDocument, useDocumentDownload, useProviderDocuments, useUploadDocument, type DocumentContentType, type DocumentKind, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { pickDocument, type PickedImage } from "../platform/pick-document";
import { ActionButton, ConfirmDialog, EmptyState, FilterSelect, Notice, OverflowMenu, PageIntro, useStyles } from "../host/ui";
import { DocumentDrop } from "../host/media/document-drop";
import { PortalErrorNotice as ErrorNotice, PortalErrorState } from "./errors";
import { PortalScreen, usePortalHeader } from "./frame";
import { RowsSkeleton } from "./parts";
import { useSingleMutation } from "../platform/single-flight";

const KINDS: readonly DocumentKind[] = ["IDENTITY", "BUSINESS_REGISTRATION", "TAX_ID", "ADDRESS_PROOF", "OTHER"];
const BYTES_PER_KB = 1024;

/** A kind added by a newer service (or one this build does not know) still shows, with its code, instead of a raw i18n key. */
export function documentKindLabel(t: (key: string, values?: Readonly<Record<string, string | number>>) => string, kind: string): string {
  return (DOCUMENT_KINDS as readonly string[]).includes(kind) ? t(`portal.documents.kinds.${kind}`) : t("portal.documents.kindUnknown", { kind });
}

const HEIC = /\.(heic|heif)$/i;

/**
 * Validates the chosen file before any request: type and size follow the contract (`DocumentInput`). Returns an i18n key or null.
 * HEIC (the iPhone photo format) is refused with its own message instead of the generic one: the verification store takes PDF, JPG,
 * PNG and WebP only, and a browser cannot turn HEIC into JPG here without shipping a converter, so the person is told how to send it
 * (documented choice, not a silent failure).
 */
export function documentProblem(file: (Pick<PickedImage, "type" | "size"> & { readonly name?: string }) | null): "portal.documents.none" | "portal.documents.badType" | "portal.documents.heic" | "portal.documents.tooBig" | null {
  if (!file) return "portal.documents.none";
  if (/^image\/(heic|heif)$/i.test(file.type) || (file.name !== undefined && HEIC.test(file.name))) return "portal.documents.heic";
  if (!DOCUMENT_TYPES.includes(file.type as DocumentContentType)) return "portal.documents.badType";
  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) return "portal.documents.tooBig";
  return null;
}

/** D4 · Verification documents: register, PUT to the presigned URL (no bearer, the headers the service returned), complete. Private by contract. */
function Documents({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const client = useApiClient();
  const list = useProviderDocuments(client, provider.id);
  const upload = useUploadDocument(client, provider.id);
  const uploadOnce = useSingleMutation(upload);
  const [kind, setKind] = useState<DocumentKind>("IDENTITY");
  const [file, setFile] = useState<PickedImage | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [putFailed, setPutFailed] = useState(false);
  const [done, setDone] = useState(false);
  const remove = useDeleteDocument(client, provider.id);
  const removeOnce = useSingleMutation(remove);
  const open = useDocumentDownload(client, provider.id);
  const openOnce = useSingleMutation(open);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const take = (picked: PickedImage): void => { setDone(false); setFile(picked); setProblem(null); };
  const choose = async (): Promise<void> => { const picked = await pickDocument(); if (picked) take(picked); };
  const send = (): void => {
    const issue = documentProblem(file);
    setDone(false); setPutFailed(false);
    if (issue || !file) { setProblem(t(issue ?? "portal.documents.none")); return; }
    setProblem(null);
    uploadOnce(
      { input: { kind, fileName: file.name.replace(/[\\/]/g, "_").slice(0, 160), contentType: file.type as DocumentContentType, sizeBytes: file.size },
        put: async ({ url, headers }) => {
          // The object store is another origin: a network failure (unreachable host, CORS) and a non-2xx are the same retryable error.
          const response = await fetch(url, { method: "PUT", headers: { ...headers }, body: file.file }).catch(() => null);
          if (!response?.ok) { setPutFailed(true); throw new Error(`PUT ${response?.status ?? "network"}`); }
        } },
      { onSuccess: () => { setDone(true); setFile(null); } }
    );
  };
  usePortalHeader({ icon: "upload", label: upload.isPending ? t("portal.documents.uploading") : t("portal.documents.upload"), busy: upload.isPending, disabled: upload.isPending, onPress: send, testID: "document-upload" });
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.documents.intro")}</PageIntro>
      <View style={{ gap: spacing[3] }}>
        <View style={{ gap: spacing[1], maxWidth: 360 }}><Text style={styles.label}>{t("portal.documents.kind")}</Text><FilterSelect<DocumentKind> label={t("portal.documents.kind")} value={kind} onChange={setKind} options={KINDS.map((value) => ({ value, label: t(`portal.documents.kinds.${value}`) }))} testID="document-kind" /></View>
        <DocumentDrop onPick={take} disabled={upload.isPending} testID="document-drop">
          <ActionButton variant="secondary" label={t("portal.documents.choose")} onPress={() => { void choose(); }} testID="document-choose" />
        </DocumentDrop>
        <View style={styles.row}>
          {file ? <Text style={styles.muted} testID="document-chosen">{file.name} · {t("portal.documents.size", { kb: Math.max(1, Math.round(file.size / BYTES_PER_KB)) })}</Text> : null}
        </View>
        {problem ? <Notice kind="error">{problem}</Notice> : null}
        {putFailed ? <Notice kind="error">{t("portal.documents.putFailed")}</Notice> : null}
        {upload.isError && !putFailed ? <ErrorNotice error={upload.error} onRetry={send} /> : null}
        {done ? <Notice kind="success">{t("portal.documents.uploaded")}</Notice> : null}
      </View>
      {removed ? <Notice kind="success">{t("portal.documents.deleted")}</Notice> : null}
      <ErrorNotice error={remove.error ?? open.error} onRetry={() => { if (remove.error && remove.variables) removeOnce(remove.variables); else if (open.variables) openOnce(open.variables); }} />
      <ConfirmDialog visible={deleting !== null} danger title={t("portal.documents.deleteTitle")} body={t("portal.documents.deleteBody")} confirmLabel={t("portal.documents.delete")} onCancel={() => setDeleting(null)} onConfirm={() => { const id = deleting; setDeleting(null); if (id) removeOnce(id, { onSuccess: () => setRemoved(true) }); }} />
      {list.isPending ? <RowsSkeleton count={2} minHeight={96} /> : list.isError ? <PortalErrorState error={list.error} onRetry={() => { void list.refetch(); }} /> : list.data.items.length === 0 ? <EmptyState illustration="provider" title={t("portal.documents.emptyTitle")} body={t("portal.documents.empty")} /> : (
        <View role="list">
          <Stagger>{list.data.items.map((item) => (
            <View key={item.id} role="listitem" testID={`document-${item.id}`} style={{ gap: spacing[1], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }}>
              <Text style={styles.subtitle}>{documentKindLabel(t, item.kind)} · {item.fileName}</Text>
              <Text style={styles.muted}>{t(`portal.documents.status.${item.status}`)} · {t("portal.documents.size", { kb: Math.max(1, Math.round(item.sizeBytes / BYTES_PER_KB)) })}</Text>
              <View style={[styles.row, { alignItems: "center" }]}>
                {item.status === "UPLOADED" ? <ActionButton variant="secondary" label={open.isPending && open.variables === item.id ? t("portal.documents.opening") : t("portal.documents.download")} busy={open.isPending && open.variables === item.id} disabled={open.isPending} onPress={() => openOnce(item.id, { onSuccess: (file) => { void Linking.openURL(file.download.url); } })} testID={`document-view-${item.id}`} /> : null}
                <OverflowMenu label={t("portal.documents.rowMenu", { name: item.fileName })} items={[{ key: "delete", label: t("portal.documents.delete"), destructive: true, disabled: remove.isPending, onPress: () => { setRemoved(false); remove.reset(); setDeleting(item.id); } }]} />
              </View>
            </View>
          ))}</Stagger>
        </View>
      )}
    </View>
  );
}

export function DocumentsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.documents.title")} current="documents">{(provider) => <Documents provider={provider} />}</PortalScreen>;
}
