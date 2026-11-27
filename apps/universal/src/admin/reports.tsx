import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Image, Linking, Platform, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Chip, Stagger } from "@rsvp/ui";
import { MUSIC_ELEMENT, previewFailure, REPORT_QUEUE_LIMIT, useAdminReport, useAdminReports, useHiddenAssetPreview, useMediaAssets, REPORT_STATUSES, type AdminReport, type ElementRef, type ReportDetail, type ReportStatus } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, Notice, PageIntro, useStyles } from "../host/ui";
import { RowsSkeleton } from "../provider/parts";
import { useSingleMutation } from "../platform/single-flight";
import { moveFocus } from "../platform/move-focus";
import { AdminScreen, adminOnly } from "./admin-screen";
import { AdminListError, QueryBoundary, Stack, useStamp } from "./shared";

/**
 * F7 · «Denuncias»: the queue of public reports, one report with its decisions and history, and the hidden files of that celebration, each
 * with a link to look at it that works ONCE (Template/Media 1.9.0, ADMIN only). The reporter's comment is plain text from a stranger: it
 * is rendered as `<Text>`, never as markup. The link is held in component state only and never written anywhere (it burns on first use).
 * No view change drops the focus: opening a report takes it to the new heading, going back returns it to the button that opened it.
 */
const PAGE = 10;
type Nav = { readonly onNavigate: (href: string) => void };

const isMusic = (element: ElementRef | null | undefined): boolean => element?.kind === MUSIC_ELEMENT.kind && element.id === MUSIC_ELEMENT.id;
const tone = (status: ReportStatus): "yes" | "maybe" | "no" => (status === "OPEN" ? "maybe" : status === "ACTIONED" ? "yes" : "no");

/** What a report or a decision is about, in words. */
function useTarget(): (element: ElementRef | null | undefined) => string {
  const t = useT();
  return (element) => (!element ? t("moderation.admin.target.page") : isMusic(element) ? t("moderation.admin.target.music") : t(`moderation.admin.target.kinds.${element.kind}`));
}

/** The element's own id, as secondary data: it tells two photos apart. The page and the music need none. */
function ElementReference({ element }: { readonly element: ElementRef | null | undefined }): ReactNode {
  const t = useT();
  const styles = useStyles();
  if (!element || isMusic(element)) return null;
  return <Text style={[styles.muted, { overflowWrap: "anywhere" } as object]}>{t("moderation.admin.reference", { id: element.id })}</Text>;
}

/** `celebration.status` is an open string in the contract, and the trail can carry an action the vendored enum does not list yet. */
const CELEBRATION_STATUSES: readonly string[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const AUDIT_ACTIONS: readonly string[] = ["REPORT_RECEIVED", "REPORT_DISMISSED", "ELEMENT_HIDDEN", "PAGE_HIDDEN", "APPEAL_FILED", "APPEAL_ACCEPTED", "APPEAL_REJECTED", "CONTENT_RESTORED"];
const known = (values: readonly string[], value: string): string => (values.includes(value) ? value : "unknown");

function ReportRow({ report, onOpen, takeFocus, onFocused }: { readonly report: AdminReport; readonly onOpen: () => void; /** True for the report the administrator is coming back from. */ readonly takeFocus: boolean; readonly onFocused: () => void }): ReactNode {
  const t = useT();
  const stamp = useStamp();
  const styles = useStyles();
  const target = useTarget();
  const button = useRef<View>(null);
  useEffect(() => { if (takeFocus) { moveFocus(button.current); onFocused(); } }, [takeFocus, onFocused]);
  return (
    <View style={{ gap: spacing[3], paddingVertical: spacing[6] }} accessibilityLabel={report.slug}>
      <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}>
        <Text accessibilityRole="header" style={[styles.subtitle, { flex: 1, flexShrink: 1, overflowWrap: "anywhere" } as object]}>{report.slug}</Text>
        <Chip tone={tone(report.status)}>{t(`moderation.admin.state.${report.status}`)}</Chip>
      </View>
      <Text style={styles.muted}>{t("moderation.admin.row", { target: target(report.element), reason: t(`moderation.reasons.${report.reason}`), when: stamp(report.createdAt) })}</Text>
      <ElementReference element={report.element} />
      <ActionButton buttonRef={button} variant="secondary" label={t("moderation.admin.open", { slug: report.slug })} onPress={onOpen} testID={`report-open-${report.id}`} />
    </View>
  );
}

/** One hidden file and its single-use preview. Nothing is requested until the administrator asks, and each ask is a new link. */
function HiddenFile({ assetId, name, music }: { readonly assetId: string; readonly name: string; readonly music: boolean }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const issue = useHiddenAssetPreview(client);
  const ask = useSingleMutation(issue);
  const [broken, setBroken] = useState(false);
  const link = issue.data;
  const failure = issue.error ? t(`moderation.admin.preview.errors.${previewFailure(issue.error)}`) : null;
  const request = (): void => { setBroken(false); ask(assetId); };
  return (
    <View style={{ gap: spacing[3], paddingVertical: spacing[3] }} testID={`hidden-file-${assetId}`}>
      <Text style={styles.body}>{t("moderation.admin.files.fileLine", { name, kind: t(music ? "moderation.admin.files.music" : "moderation.admin.files.photo") })}</Text>
      {link && !broken ? (
        <View style={{ gap: spacing[3] }}>
          <Notice>{t("moderation.admin.preview.notice")}</Notice>
          {music ? (
            Platform.OS === "web"
              ? createElement("audio", { controls: true, src: link.url, preload: "auto", "aria-label": t("moderation.admin.preview.audioLabel", { name }), onError: () => setBroken(true), "data-testid": `preview-audio-${assetId}` })
              : <ActionButton variant="secondary" label={t("moderation.admin.preview.cta")} onPress={() => { void Linking.openURL(link.url); }} testID={`preview-open-${assetId}`} />
          ) : (
            Platform.OS === "web"
              // A real <img> with its alt and a DOM error event: a used or expired link answers 404, and that is how the page learns the picture did not open.
              ? createElement("img", { src: link.url, alt: t("moderation.admin.preview.imageAlt", { name }), referrerPolicy: "no-referrer", onError: () => setBroken(true), style: { width: "100%", maxHeight: 360, objectFit: "contain" }, "data-testid": `preview-image-${assetId}` })
              : <Image source={{ uri: link.url }} accessibilityLabel={t("moderation.admin.preview.imageAlt", { name })} resizeMode="contain" style={{ width: "100%", height: 260 }} onError={() => setBroken(true)} testID={`preview-image-${assetId}`} />
          )}
        </View>
      ) : null}
      {broken ? <Notice kind="error">{t("moderation.admin.preview.brokenOrUsed")}</Notice> : null}
      {failure ? <Notice kind="error">{failure}</Notice> : null}
      {/* Never `busy`: a loading button is disabled, and a disabled button drops the focus. The label says it is asking and `useSingleMutation` ignores a second press. */}
      <ActionButton variant="secondary" icon={link ? "refresh" : undefined} label={issue.isPending ? t("moderation.admin.preview.loading") : link || broken ? t("moderation.admin.preview.again") : t("moderation.admin.preview.cta")} onPress={request} testID={`preview-ask-${assetId}`} />
    </View>
  );
}

/** The hidden files of the reported celebration: the media service lists them (`hidden: true`, no variant URLs) to an administrator, who manages every celebration. */
function HiddenFiles({ celebrationId }: { readonly celebrationId: string }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const assets = useMediaAssets(client, celebrationId);
  const hidden = assets.data?.items.filter((asset) => asset.hidden === true) ?? [];
  return (
    <View style={{ gap: spacing[3] }}>
      <Text accessibilityRole="header" style={styles.subtitle}>{t("moderation.admin.files.title")}</Text>
      <Text style={styles.muted}>{t("moderation.admin.files.help")}</Text>
      {assets.isPending ? <RowsSkeleton count={2} minHeight={64} trailing={false} /> : null}
      {assets.error ? <Notice kind="error"><Text style={styles.body}>{t("moderation.admin.files.loadFailed")}</Text><ActionButton icon="refresh" variant="secondary" label={t("host.common.retry")} onPress={() => { void assets.refetch(); }} testID="files-retry" /></Notice> : null}
      {!assets.isPending && !assets.error && hidden.length === 0 ? <Text style={styles.muted} testID="files-none">{t("moderation.admin.files.none")}</Text> : null}
      {hidden.map((asset) => <HiddenFile key={asset.id} assetId={asset.id} name={asset.filename} music={asset.purpose === "music"} />)}
    </View>
  );
}

function ReportBody({ detail }: { readonly detail: ReportDetail }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const stamp = useStamp();
  const target = useTarget();
  const { report, celebration, takedowns, audit } = detail;
  return (
    <>
      <View style={{ gap: spacing[3] }}>
        <View style={[styles.row, { flexWrap: "nowrap", justifyContent: "space-between" }]}>
          <Text style={[styles.subtitle, { flex: 1 }]}>{`${target(report.element)} · ${t(`moderation.reasons.${report.reason}`)}`}</Text>
          <Chip tone={tone(report.status)}>{t(`moderation.admin.state.${report.status}`)}</Chip>
        </View>
        <ElementReference element={report.element} />
        <Text style={styles.muted}>{stamp(report.createdAt)}</Text>
        <Text style={styles.body} testID="report-comment">{report.comment ?? t("moderation.admin.noComment")}</Text>
        <Text style={styles.muted}>{t("moderation.admin.reporter", { ref: report.reporterRef })}</Text>
        <Text style={styles.muted}>{t("moderation.admin.counts", { open: detail.openReportsForCelebration, reporters: detail.distinctReportersForCelebration })}</Text>
        <Text style={styles.muted}>{t("moderation.admin.celebrationStatus", { status: t(`moderation.admin.celebrationStatuses.${known(CELEBRATION_STATUSES, celebration.status)}`) })}</Text>
      </View>
      <View style={{ gap: spacing[3] }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("moderation.admin.takedowns")}</Text>
        {takedowns.length === 0 ? <Text style={styles.muted}>{t("moderation.admin.noTakedowns")}</Text> : takedowns.map((takedown) => (
          <View key={takedown.id}>
            <Text style={styles.body}>{t("moderation.admin.takedownLine", { scope: target(takedown.scope === "PAGE" ? null : takedown.element), when: stamp(takedown.hiddenAt), state: t(takedown.restoredAt ? "moderation.admin.lifted" : "moderation.admin.active") })}</Text>
            <ElementReference element={takedown.scope === "PAGE" ? null : takedown.element} />
          </View>
        ))}
      </View>
      <HiddenFiles celebrationId={celebration.id} />
      <View style={{ gap: spacing[3] }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("moderation.admin.audit")}</Text>
        {audit.map((entry) => <Text key={entry.id} style={styles.muted}>{t("moderation.admin.auditLine", { action: t(`moderation.admin.auditActions.${known(AUDIT_ACTIONS, entry.action)}`), when: stamp(entry.at) })}</Text>)}
      </View>
    </>
  );
}

/** The heading is there from the first frame (the queue already knows the slug), so it can take the focus before the report arrives. */
function ReportDetailView({ reportId, slug, onBack }: { readonly reportId: string; readonly slug: string; readonly onBack: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const detail = useAdminReport(client, reportId);
  const heading = useRef<Text>(null);
  useEffect(() => { moveFocus(heading.current); }, []);
  return (
    <Stack>
      <ActionButton variant="secondary" label={t("moderation.admin.back")} onPress={onBack} testID="report-back" />
      <Text ref={heading} accessibilityRole="header" style={[styles.title, { overflowWrap: "anywhere" } as object]}>{t("moderation.admin.detailTitle", { slug })}</Text>
      {detail.isPending ? <RowsSkeleton count={3} minHeight={88} />
        : detail.error || !detail.data ? <AdminListError error={detail.error} onRetry={() => { void detail.refetch(); }} retryTestID="report-retry" />
          : <ReportBody detail={detail.data} />}
    </Stack>
  );
}

function ReportsScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<AdminReport | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const focused = useCallback(() => setReturnTo(null), []);
  const intro = useRef<View>(null);
  const queue = useAdminReports(client, status);
  // The report may have left the queue while it was open (decided elsewhere): once the list is read again, the focus goes to its introduction.
  const gone = !open && returnTo !== null && !queue.isFetching && queue.data !== undefined && !queue.data.items.slice(0, shown).some((report) => report.id === returnTo);
  useEffect(() => { if (gone) { moveFocus(intro.current); focused(); } }, [gone, focused]);
  return (
    <AdminScreen title={t("moderation.admin.title")} current="reports" onNavigate={onNavigate}>
      {open ? <ReportDetailView reportId={open.id} slug={open.slug} onBack={() => { setReturnTo(open.id); setOpen(null); }} /> : (
        <Stack>
          <View ref={intro}><PageIntro>{t("moderation.admin.intro")}</PageIntro></View>
          <ChoiceGroup label={t("admin.common.filter")} value={status} onChange={(next) => { setShown(PAGE); setReturnTo(null); setStatus(next); }} choices={REPORT_STATUSES.map((value) => ({ value, label: t(`moderation.admin.statuses.${value}`) }))} />
          <QueryBoundary query={queue} illustration={status === "OPEN" ? "nothingPending" : "emptySearch"} {...(status === "OPEN" ? { emptyTitle: t("admin.common.allClearTitle") } : {})} empty={t("moderation.admin.empty", { status: t(`moderation.admin.statuses.${status}`).toLowerCase() })}>
            {(data) => <>
              {data.items.length >= REPORT_QUEUE_LIMIT ? <Text style={styles.muted} testID="reports-truncated">{t("moderation.admin.truncated", { count: REPORT_QUEUE_LIMIT })}</Text> : null}
              <Stagger>{data.items.slice(0, shown).map((report) => <ReportRow key={report.id} report={report} takeFocus={returnTo === report.id} onFocused={focused} onOpen={() => setOpen(report)} />)}</Stagger>
              {data.items.length > shown ? <ActionButton variant="secondary" label={t("admin.dashboard.showMore", { count: data.items.length - shown })} onPress={() => setShown((current) => current + PAGE)} testID="admin-show-more" /> : null}
            </>}
          </QueryBoundary>
        </Stack>
      )}
    </AdminScreen>
  );
}

export const ReportsScreen = adminOnly(ReportsScreenContent);
