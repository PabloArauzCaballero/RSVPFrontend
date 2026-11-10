import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { buildCateringCsv, buildRsvpReportCsv, hostGuestsApi, CATERING_COLUMNS, RSVP_REPORT_COLUMNS, useGuestList, useHostRsvps, type RsvpStatus } from "@rsvp/query-hooks";
import { saveTextFile } from "../../platform/files";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { guestDetailPath, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, styles } from "../ui";
import { FreshnessLine, RetryNotice, StatusBadge } from "./parts";

/** C24 · RSVP report (companions, diets, messages) and its safe CSV export for the venue and the caterer (REQ-F17-02/05). */

const PAGE = 50;
const FILTERS: readonly (RsvpStatus | "ALL")[] = ["ALL", "CONFIRMED", "PENDING", "DECLINED"];

function exportDate(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: "year" | "month" | "day") => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function ReportBody({ celebrationId, timeZone, slug, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly slug: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [status, setStatus] = useState<RsvpStatus | "ALL">("ALL");
  const [offset, setOffset] = useState(0);
  const list = useGuestList(client, celebrationId, { limit: PAGE, offset, ...(status === "ALL" ? {} : { status }) });
  const rsvps = useHostRsvps(client, celebrationId);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const answers = rsvps.isError ? undefined : rsvps.data;
  const byGuest = useMemo(() => new Map(answers?.map((item) => [item.guestId, item])), [answers]);

  const exportCsv = async (kind: "full" | "catering" = "full"): Promise<void> => {
    setExporting(true); setExportMessage(null);
    try {
      if (kind === "catering") {
        const header = CATERING_COLUMNS.map((column) => t(`guests.report.columns.${{ guestKey: "guestKey", group: "group", status: "status", partySize: "partySize", dietaryNotes: "dietary", message: "message" }[column]}`));
        const csv = await buildCateringCsv(hostGuestsApi(client), celebrationId, header, { withNotesOnly: false, includeMessage: false });
        const name = `catering-${slug}-${exportDate(timeZone)}.csv`;
        const outcome = await saveTextFile(name, csv);
        setExportMessage(outcome === "failed" ? { kind: "error", text: t("guests.report.exportFailed") } : { kind: "success", text: t("guests.report.exported", { name }) });
        return;
      }
      const header = RSVP_REPORT_COLUMNS.map((column) => t(`guests.report.columns.${{ name: "name", email: "email", phone: "phone", status: "status", allowedCompanions: "allowed", requestedCompanions: "requested", approvedCompanions: "approved", dietaryNotes: "dietary", message: "message" }[column]}`));
      const csv = await buildRsvpReportCsv(hostGuestsApi(client), celebrationId, header, status === "ALL" ? undefined : status);
      const name = `rsvp-${slug}-${exportDate(timeZone)}.csv`;
      const outcome = await saveTextFile(name, csv);
      setExportMessage(outcome === "failed" ? { kind: "error", text: t("guests.report.exportFailed") } : { kind: "success", text: t("guests.report.exported", { name }) });
    } catch { setExportMessage({ kind: "error", text: t("guests.report.exportFailed") }); } finally { setExporting(false); }
  };

  const data = list.data;
  const loadingAnswers = Boolean(data?.items.length) && rsvps.isPending;
  const to = data ? data.offset + data.items.length : 0;
  const paged = Math.max(0, (data?.total ?? 0) - PAGE) !== 0;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("guests.report.intro")}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("guests.report.filterLabel")} style={styles.row}>
        {FILTERS.map((value) => (
          <Pressable key={value} accessibilityRole="radio" aria-checked={status === value} accessibilityLabel={value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`)} onPress={() => { setStatus(value); setOffset(0); }} style={[styles.navItem, status === value && styles.navItemCurrent]}>
            <Text style={styles.label}>{value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <ActionButton label={exporting ? t("guests.report.exporting") : t("guests.report.export")} busy={exporting} onPress={() => { void exportCsv(); }} testID="export-csv" />
        <ActionButton variant="secondary" label={t("guests.report.exportCatering")} disabled={exporting} onPress={() => { void exportCsv("catering"); }} testID="export-catering" />
      </View>
      <Text style={styles.muted}>{t("guests.report.exportCateringNote")}</Text>
      {exportMessage ? <Notice kind={exportMessage.kind}>{exportMessage.text}</Notice> : null}
      {list.isPending ? <Loading /> : null}
      {list.isError ? <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} /> : null}
      {data && !list.isError ? (
        <View style={{ gap: spacing[3] }}>
          {loadingAnswers ? <Notice>{t("guests.report.loadingAnswers")}</Notice> : null}
          {rsvps.isError ? (
            <>
              <Notice kind="error">{t("guests.report.answersUnavailable")}</Notice>
              <RetryNotice error={rsvps.error} onRetry={() => { void rsvps.refetch(); }} />
            </>
          ) : null}
          {data.items.length === 0 ? <Notice>{t("guests.report.empty")}</Notice> : data.items.map((guest) => {
            const answer = byGuest.get(guest.guestId);
            return (
              <Pressable key={guest.guestId} accessibilityRole="button" accessibilityLabel={t("guests.list.open", { name: guest.name })} onPress={() => onNavigate(withCelebration(guestDetailPath(guest.guestId), celebrationId))} style={[styles.card, { gap: spacing[1] }]}>
                <Text style={styles.subtitle}>{guest.name}</Text>
                <StatusBadge status={guest.status} />
                {guest.status === "CONFIRMED" ? <Text style={styles.muted}>{t("guests.report.requested", { requested: guest.requestedCompanions, approved: guest.approvedCompanions })}</Text> : null}
                {answer?.dietaryNotes ? <Text style={styles.body}>{t("guests.report.dietary", { value: answer.dietaryNotes })}</Text> : null}
                {answer?.message ? <Text style={styles.body}>{t("guests.report.message", { value: answer.message })}</Text> : null}
              </Pressable>
            );
          })}
          {paged ? (
            <View style={styles.row}>
              <ActionButton variant="secondary" label={t("guests.list.prev")} disabled={list.isPlaceholderData || data.offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE))} />
              <Text style={styles.muted}>{t("guests.list.page", { from: data.offset + 1, to, total: data.total })}</Text>
              <ActionButton variant="secondary" label={t("guests.list.next")} disabled={list.isPlaceholderData || to >= data.total} onPress={() => setOffset(offset + PAGE)} />
            </View>
          ) : null}
          <FreshnessLine freshness={data.freshness} timeZone={timeZone} onRefresh={() => { void list.refetch(); void rsvps.refetch(); }} />
        </View>
      ) : null}
    </View>
  );
}

export function ReportScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="report" title={t("guests.report.title")}>{({ celebration }) => <ReportBody key={celebration.id} celebrationId={celebration.id} timeZone={celebration.timeZone} slug={celebration.slug} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
