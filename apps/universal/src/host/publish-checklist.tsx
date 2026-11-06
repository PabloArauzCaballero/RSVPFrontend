import { useState, type ReactNode } from "react";
import { Image, Platform, Share, Text, View } from "react-native";
import { missingFieldsOf, useMediaAssets, usePublicationAction, usePublishCheck, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import type { Translate } from "@rsvp/i18n";
import { formatDate } from "@rsvp/celebration-theme";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { asText } from "./content-draft";
import { fieldLabel } from "./content-editor";
import { publicUrl } from "./device-preview";
import { editorPath, withCelebration, type EditorSection } from "./routes";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LIMITS, overLimit } from "./limits";
import { ActionButton, ConfirmDialog, Field, Loading, Notice, Section, styles } from "./ui";

/** C16 · What is still missing (from the event type, via the API), publish and unpublish with confirmation, share. */

const HOSTS_PREFIX = "hosts.";
const SECTION_OF_FIELD: Readonly<Record<string, EditorSection>> = { story: "historia", dressCode: "secciones", faq: "secciones", schedule: "itinerario", venues: "lugares" };
const OG_WIDTH = 320;
const OG_HEIGHT = 168;

export interface Task { readonly field: string; readonly label: string; readonly section: EditorSection }

/** A missing field as a task the host understands, and the editor section where it is completed. */
export function taskFor(field: string, eventType: TranslatedEventType | undefined, t: Translate): Task {
  if (field.startsWith(HOSTS_PREFIX)) {
    const role = field.slice(HOSTS_PREFIX.length);
    const label = eventType?.hostRoles.find((item) => item.role === role)?.label ?? role;
    return { field, label: t("host.publish.fields.host", { role: label }), section: "anfitriones" };
  }
  return { field, label: fieldLabel(t, field, "host.publish.fields.other"), section: SECTION_OF_FIELD[field] ?? "general" };
}

type Dialog = "publish" | "unpublish" | "archive" | null;

function Checklist({ celebration, eventType, onNavigate, refetch }: { readonly celebration: Celebration; readonly eventType: TranslatedEventType | undefined; readonly onNavigate: (href: string) => void; readonly refetch: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const check = usePublishCheck(client, celebration.id);
  const action = usePublicationAction(client, celebration.id);
  const media = useMediaAssets(client, celebration.id);
  const once = useSingleFlight();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);
  const fromError = missingFieldsOf(action.error);
  const missing = fromError.length ? fromError : check.data?.missingFields ?? [];
  const url = publicUrl(celebration.slug);
  const title = asText(celebration.content["title"]);
  const eventDate = asText(celebration.content["eventDate"]);
  const description = [eventType?.name, eventDate ? formatDate(eventDate, celebration.timeZone, celebration.defaultLocale) : "", asText(celebration.content["venueName"])].filter(Boolean).join(" · ");
  const cover = media.data?.items.find((asset) => asset.isCover)?.variants.medium;

  const reasonExcess = overLimit(reason, LIMITS.reason);
  const run = (kind: Exclude<Dialog, null>): void => {
    if (kind === "unpublish" && reasonExcess !== null) return;
    setDialog(null);
    const actions = { publish: { kind: "publish" as const }, unpublish: { kind: "unpublish" as const, reason: reason.trim() || null }, archive: { kind: "archive" as const } };
    once((release) => action.mutate({ target: celebration, action: actions[kind] }, { onSettled: release }));
  };
  const share = async (): Promise<void> => {
    const clipboard = Platform.OS === "web" ? globalThis.navigator?.clipboard : undefined;
    if (clipboard) { await clipboard.writeText(url); setCopied(true); return; }
    await Share.share({ message: `${title} ${url}`, url });
  };

  return (
    <View style={{ gap: 16 }}>
      <Notice kind={celebration.status === "PUBLISHED" ? "success" : "info"}>{t(`host.publish.status.${celebration.status}`)}</Notice>
      {check.isPending ? <Loading /> : null}
      {celebration.status === "DRAFT" ? (
        <Section title={missing.length ? t("host.publish.missing") : check.isSuccess ? t("host.publish.ready") : t("host.publish.title")}>
          {check.isError && !fromError.length ? <><CelebrationErrorNotice error={check.error} /><ActionButton variant="secondary" label={t("host.common.retry")} onPress={() => { void check.refetch(); }} testID="retry-check" /></> : null}
          {missing.map((field) => {
            const task = taskFor(field, eventType, t);
            return (
              <View key={field} style={[styles.row, { justifyContent: "space-between" }]} accessibilityRole="summary">
                <Text style={[styles.body, { flex: 1 }]}>{task.label}</Text>
                <ActionButton variant="secondary" label={t("host.publish.goTo")} onPress={() => onNavigate(withCelebration(editorPath(task.section), celebration.id))} />
              </View>
            );
          })}
          <ActionButton label={t("host.publish.publish")} disabled={Boolean(missing.length) || !check.isSuccess} busy={action.isPending} onPress={() => setDialog("publish")} testID="publish" />
        </Section>
      ) : null}
      <CelebrationErrorNotice error={fromError.length ? null : action.error} onReload={() => { void check.refetch(); refetch(); }} />
      {celebration.status !== "ARCHIVED" ? (
        <Section title={t("host.publish.share")}>
          <Text selectable style={styles.body} accessibilityLabel={t("host.publish.link")}>{url}</Text>
          <ActionButton variant="secondary" label={t("host.publish.copy")} onPress={() => { void share(); }} />
          {copied ? <Notice kind="success">{t("host.publish.copied")}</Notice> : null}
          <Text style={styles.label}>{t("host.publish.whatsappPreview")}</Text>
          <View style={[styles.card, { maxWidth: OG_WIDTH, padding: 0, overflow: "hidden" }]} testID="whatsapp-card">
            {cover ? <Image source={{ uri: cover }} style={{ width: OG_WIDTH, height: OG_HEIGHT }} accessibilityIgnoresInvertColors /> : null}
            <View style={{ padding: 12, gap: 4 }}>
              <Text style={styles.label}>{title}</Text>
              <Text style={styles.muted}>{description}</Text>
              <Text style={styles.muted}>{url}</Text>
            </View>
          </View>
        </Section>
      ) : null}
      <View style={styles.row}>
        {celebration.status === "PUBLISHED" ? <ActionButton variant="secondary" busy={action.isPending} label={t("host.publish.unpublish")} onPress={() => setDialog("unpublish")} testID="unpublish" /> : null}
        {celebration.status !== "ARCHIVED" ? <ActionButton variant="danger" busy={action.isPending} label={t("host.publish.archive")} onPress={() => setDialog("archive")} testID="archive" /> : null}
      </View>
      <ConfirmDialog visible={dialog === "publish"} title={t("host.publish.publish")} body={t("host.publish.publishConfirm")} confirmLabel={t("host.publish.publish")} onConfirm={() => run("publish")} onCancel={() => setDialog(null)} />
      <ConfirmDialog visible={dialog === "unpublish"} title={t("host.publish.unpublish")} body={t("host.publish.unpublishConfirm")} confirmLabel={t("host.publish.unpublish")} onConfirm={() => run("unpublish")} onCancel={() => setDialog(null)}>
        <Field label={t("host.publish.reasonLabel")} value={reason} onChange={setReason} {...(reasonExcess !== null ? { error: t("host.limits.tooLong", { count: reasonExcess, max: LIMITS.reason }) } : {})} />
      </ConfirmDialog>
      <ConfirmDialog visible={dialog === "archive"} danger title={t("host.publish.archive")} body={t("host.publish.archiveConfirm")} confirmLabel={t("host.publish.archive")} onConfirm={() => run("archive")} onCancel={() => setDialog(null)} />
    </View>
  );
}

export function PublishScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="publish" title={t("host.publish.title")}>
      {({ celebration, eventType, refetch }) => <Checklist celebration={celebration} eventType={eventType} onNavigate={onNavigate} refetch={refetch} />}
    </CelebrationScreen>
  );
}
