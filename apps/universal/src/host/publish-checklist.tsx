import { useEffect, useState, type ReactNode } from "react";
import { Image, Platform, Share, Text, View } from "react-native";
import { isGalleryAsset, isPublicPageInTransition, missingFieldsOf, useEditCelebration, useMediaAssets, usePublicationAction, usePublicPageStatus, usePublishCheck, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import type { Translate } from "@rsvp/i18n";
import { MAIN_LOCATION, formatDate, pointOf, readLocations, resolveLocation } from "@rsvp/celebration-theme/model";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, useScreenHeader, type ScreenProps } from "./gate";
import { asText } from "./content-draft";
import { fieldLabel } from "./content-editor";
import { publicUrl } from "./device-preview";
import { editorPath, withCelebration, type EditorSection } from "./routes";
import { useSingleFlight } from "../platform/single-flight";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LIMITS, overLimit } from "./limits";
import { radius, spacing } from "@rsvp/design-tokens";
import { Enter, SkeletonList, Stagger, SwitchRow, useColors } from "@rsvp/ui";
import { Row, RowList } from "./gifts/offer-row";
import { ActionButton, Celebrate, CheckMark, ConfirmDialog, Field, Notice, OverflowMenu, useStyles } from "./ui";

/** C16 · What is still missing (from the event type, via the API), publish and unpublish with confirmation, share. */

const HOSTS_PREFIX = "hosts.";
const SECTION_OF_FIELD: Readonly<Record<string, EditorSection>> = { story: "historia", dressCode: "secciones", faq: "secciones", schedule: "itinerario", venues: "lugares" };
const OG_WIDTH = 320;
const OG_HEIGHT = 168;
/** After this long without the page agreeing with the decision, the screen says it is slower than usual. */
const SLOW_PUBLIC_PAGE_MS = 30_000;

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
  const styles = useStyles();
  const palette = useColors();
  const t = useT();
  const client = useApiClient();
  const check = usePublishCheck(client, celebration.id);
  const action = usePublicationAction(client, celebration.id);
  const media = useMediaAssets(client, celebration.id);
  // D-1: search engines only when the host says so; the switch sends the version the host is looking at.
  const indexing = useEditCelebration(client, celebration.id);
  // A18: «publicada» only when the public page exists (LIVE), never just because the command answered 200.
  const page = usePublicPageStatus(client, celebration.id);
  const pageState = page.data?.state;
  const inTransition = isPublicPageInTransition(pageState);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!inTransition) return undefined;
    const timer = setTimeout(() => setSlow(true), SLOW_PUBLIC_PAGE_MS);
    return () => clearTimeout(timer);
  }, [inTransition]);
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
  // The card previews the shared link: the cover or, when it has no raster variant (SVG), the first gallery photo that has one.
  const photos = (media.data?.items ?? []).filter(isGalleryAsset);
  const cover = [...photos.filter((asset) => asset.isCover), ...photos].map((asset) => asset.variants.medium ?? asset.variants.full).find(Boolean);

  // Non-blocking notice (D3): the point is optional. With one, say who sees it; without one, say what the guests get instead.
  const venueName = asText(celebration.content["venueName"]);
  const marked = venueName ? resolveLocation({ saved: readLocations(celebration.content["locations"])[MAIN_LOCATION], name: venueName, legacy: pointOf(asText(celebration.content["venueMapUrl"])) }) !== null : null;

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

  const draft = celebration.status === "DRAFT";
  const ready = draft && check.isSuccess && !missing.length;
  const live = celebration.status === "PUBLISHED" && pageState === "LIVE";
  // F7: moderation hides the published page; it is not on its way, so never «Publicando…».
  const hiddenByModeration = celebration.status === "PUBLISHED" && pageState === "HIDDEN";
  const publishing = celebration.status === "PUBLISHED" && !live && !hiddenByModeration;
  const justPublished = live && action.isSuccess && action.variables?.action.kind === "publish";
  // One action per state, top right (a fixed bar on a phone): publish a draft, copy the link of a published page. The rest is in «⋯».
  const menuItems = [
    ...(celebration.status === "PUBLISHED" ? [{ key: "unpublish", label: t("host.publish.unpublish"), onPress: () => setDialog("unpublish"), disabled: action.isPending, testID: "unpublish" }] : []),
    { key: "archive", label: t("host.publish.archive"), onPress: () => setDialog("archive"), destructive: true, disabled: action.isPending, testID: "archive" }
  ];
  useScreenHeader({
    actions: draft
      ? <ActionButton icon="check" label={t("host.publish.publish")} disabled={Boolean(missing.length) || !check.isSuccess} busy={action.isPending} onPress={() => setDialog("publish")} testID="publish" />
      : live ? <ActionButton icon="copy" label={t("host.publish.copy")} onPress={() => { void share(); }} testID="copy-link" />
        : publishing ? <ActionButton icon="copy" label={t("host.publish.copy")} disabled busy={!page.isError} onPress={() => undefined} testID="copy-link" /> : null,
    menu: celebration.status !== "ARCHIVED" ? <OverflowMenu testID="more-publish" items={menuItems} /> : null
  });
  return (
    <View style={{ gap: spacing[6] }}>
      {check.isPending && draft ? <SkeletonList count={3} row={{ minHeight: 64, avatar: false, trailing: false }} label={t("host.common.loading")} /> : null}
      {justPublished ? (
        <Enter from="none">
          <View testID="published-moment" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, minHeight: 280, paddingHorizontal: spacing[8], paddingVertical: spacing[12], justifyContent: "center", alignItems: "center" }}>
            <Celebrate title={t("host.publish.done.title")} body={t("host.publish.done.body")} />
          </View>
        </Enter>
      ) : celebration.status !== "PUBLISHED" ? (
        <Notice kind="info">{t(`host.publish.status.${celebration.status}`)}</Notice>
      ) : null}
      {hiddenByModeration ? <View testID="public-page-hidden"><Notice kind="error">{t("host.publish.live.HIDDEN")}</Notice></View> : null}
      {(publishing && !page.isError) || pageState === "UNPUBLISHING" ? (
        <View testID="public-page-pending" accessibilityLiveRegion="polite" style={{ gap: spacing[2] }}>
          <Notice kind="info">{t(`host.publish.live.${pageState === "UNPUBLISHING" ? "UNPUBLISHING" : "PUBLISHING"}`)}</Notice>
          {slow ? <Text style={styles.muted}>{t("host.publish.live.slow")}</Text> : null}
        </View>
      ) : null}
      {page.isError && celebration.status === "PUBLISHED" ? (
        <View style={{ gap: spacing[2], maxWidth: 720 }}>
          <Notice kind="error">{t("host.publish.live.unknown")}</Notice>
          <ActionButton icon="refresh" variant="secondary" label={t("host.common.retry")} onPress={() => { void page.refetch(); }} testID="retry-public-page" />
        </View>
      ) : null}
      {draft ? (
        <View style={{ gap: spacing[3], maxWidth: 720 }}>
          {check.isError && !fromError.length ? <><CelebrationErrorNotice error={check.error} /><ActionButton icon="refresh" variant="secondary" label={t("host.common.retry")} onPress={() => { void check.refetch(); }} testID="retry-check" /></> : null}
          {missing.length ? (
            <>
              <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("host.publish.missing")}</Text>
              <Text style={styles.muted} accessibilityLiveRegion="polite">{t("host.publish.pending", { count: missing.length })}</Text>
              <RowList>
                <Stagger>{missing.map((field, index) => {
                  const task = taskFor(field, eventType, t);
                  return (
                    <Row key={field} first={index === 0}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing[2] }}>
                        <Text style={[styles.body, { flexGrow: 1, flexShrink: 1, flexBasis: 160 }]}>{task.label}</Text>
                        <ActionButton icon="arrow" variant="secondary" label={t("host.publish.goTo")} onPress={() => onNavigate(withCelebration(editorPath(task.section), celebration.id))} />
                      </View>
                    </Row>
                  );
                })}</Stagger>
              </RowList>
            </>
          ) : ready ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
              <CheckMark size={36} tone="success" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("host.publish.ready")}</Text>
                <Text style={styles.muted}>{t("host.publish.readyBody")}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {draft && marked !== null ? (
        <View testID="publish-place-notice" style={{ gap: spacing[2], maxWidth: 720 }}>
          <Notice kind="info">{t(marked ? "host.publish.place.withPoint" : "host.publish.place.withoutPoint")}</Notice>
          {marked ? null : <ActionButton icon="pin" variant="secondary" label={t("host.publish.place.mark")} onPress={() => onNavigate(withCelebration(editorPath("general"), celebration.id))} testID="publish-place-mark" />}
        </View>
      ) : null}
      <CelebrationErrorNotice error={fromError.length ? null : action.error} onReload={() => { void check.refetch(); refetch(); }} />
      {celebration.status !== "ARCHIVED" ? (
        <View style={{ gap: spacing[3], maxWidth: 720 }}>
          {live ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[4] }}>
              <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260, gap: spacing[2] }}>
                <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("host.publish.share")}</Text>
                {justPublished ? null : <Text style={styles.muted}>{t("host.publish.status.PUBLISHED")}</Text>}
                <Text selectable style={styles.body} accessibilityLabel={t("host.publish.link")}>{url}</Text>
                {copied ? <Notice kind="success">{t("host.publish.copied")}</Notice> : null}
              </View>
            </View>
          ) : null}
          <View testID="search-indexing" style={{ gap: spacing[2] }}>
            <SwitchRow
              label={t("host.publish.searchIndexing.label")}
              hint={t(celebration.searchIndexing === true ? "host.publish.searchIndexing.on" : "host.publish.searchIndexing.off")}
              value={celebration.searchIndexing === true}
              disabled={indexing.isPending || celebration.access === "READ"}
              testID="search-indexing-switch"
              onChange={(value) => once((release) => indexing.mutate({ target: celebration, patch: { searchIndexing: value } }, { onSettled: () => { release(); refetch(); } }))}
            />
            <CelebrationErrorNotice error={indexing.error} onReload={refetch} />
          </View>
          <Text style={styles.label}>{t("host.publish.whatsappPreview")}</Text>
          <View style={[styles.card, { maxWidth: OG_WIDTH, padding: 0, overflow: "hidden" }]} testID="whatsapp-card">
            {cover ? <Image source={{ uri: cover }} style={{ width: OG_WIDTH, height: OG_HEIGHT }} accessibilityIgnoresInvertColors /> : null}
            <View style={{ padding: 12, gap: 4 }}>
              <Text style={styles.label}>{title}</Text>
              <Text style={styles.muted}>{description}</Text>
              <Text style={styles.muted}>{url}</Text>
            </View>
          </View>
        </View>
      ) : null}
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
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="publish" title={t("host.publish.title")} intro={t("host.publish.intro")}>
      {({ celebration, eventType, refetch }) => <Checklist celebration={celebration} eventType={eventType} onNavigate={onNavigate} refetch={refetch} />}
    </CelebrationScreen>
  );
}
