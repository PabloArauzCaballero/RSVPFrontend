import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, radius, spacing } from "@rsvp/design-tokens";
import { Avatar } from "@rsvp/ui";
import { buildCateringCsv, buildRsvpReportCsv, hostGuestsApi, CATERING_COLUMNS, RSVP_REPORT_COLUMNS, useGuestList, useGuestSummary, useHostRsvps, type RsvpStatus } from "@rsvp/query-hooks";
import { saveTextFile } from "../../platform/files";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { guestDetailPath, HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, Loading, Notice, styles } from "../ui";
import { FreshnessLine, MoreOptions, RetryNotice, StatusBadge, TextAction } from "./parts";

const palette = colors.light;
import { useSingleFlightGate } from "../../platform/single-flight";
import { lastPageOffset } from "./paging";

/** C24 · RSVP report (companions, diets, messages) and its safe CSV export for the venue and the caterer (REQ-F17-02/05). */

const PAGE = 50;
const FILTERS: readonly (RsvpStatus | "ALL")[] = ["ALL", "CONFIRMED", "PENDING", "DECLINED"];

function ReportBody({ celebrationId, timeZone, slug, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly slug: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [status, setStatus] = useState<RsvpStatus | "ALL">("ALL");
  const [offset, setOffset] = useState(0);
  const list = useGuestList(client, celebrationId, { limit: PAGE, offset, ...(status === "ALL" ? {} : { status }) });
  const rsvps = useHostRsvps(client, celebrationId);
  const open = useGuestSummary(client, celebrationId).data?.openCompanionRequests ?? 0;
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const byGuest = new Map((rsvps.data?.items ?? []).map((item) => [item.guestId, item]));

  const flight = useSingleFlightGate();
  const exportCsv = async (kind: "full" | "catering" = "full"): Promise<void> => {
    if (!flight.begin()) return;
    setExporting(true); setExportMessage(null);
    try {
      if (kind === "catering") {
        const header = CATERING_COLUMNS.map((column) => t(`guests.report.columns.${{ guestKey: "guestKey", group: "group", status: "status", partySize: "partySize", dietaryNotes: "dietary", message: "message" }[column]}`));
        const csv = await buildCateringCsv(hostGuestsApi(client), celebrationId, header, { withNotesOnly: false, includeMessage: false });
        const name = `catering-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
        const outcome = await saveTextFile(name, csv);
        setExportMessage(outcome === "failed" ? { kind: "error", text: t("guests.report.exportFailed") } : { kind: "success", text: t("guests.report.exported", { name }) });
        return;
      }
      const header = RSVP_REPORT_COLUMNS.map((column) => t(`guests.report.columns.${{ name: "name", email: "email", phone: "phone", status: "status", allowedCompanions: "allowed", requestedCompanions: "requested", approvedCompanions: "approved", dietaryNotes: "dietary", message: "message" }[column]}`));
      const csv = await buildRsvpReportCsv(hostGuestsApi(client), celebrationId, header, status === "ALL" ? undefined : status);
      const name = `rsvp-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
      const outcome = await saveTextFile(name, csv);
      setExportMessage(outcome === "failed" ? { kind: "error", text: t("guests.report.exportFailed") } : { kind: "success", text: t("guests.report.exported", { name }) });
    } catch { setExportMessage({ kind: "error", text: t("guests.report.exportFailed") }); } finally { setExporting(false); flight.end(); }
  };

  const data = list.data;
  const to = data ? data.offset + data.items.length : 0;
  useEffect(() => {
    if (list.data && !list.isFetching && list.data.items.length === 0 && offset > 0) setOffset(lastPageOffset(list.data.total, PAGE));
  }, [list.data, list.isFetching, offset]);
  const paged = Math.max(0, (data?.total ?? 0) - PAGE) !== 0 || offset !== 0;
  const filtered = status !== "ALL";
  return (
    <View style={{ gap: spacing[4] }}>
      {open > 0 ? (
        <View style={[styles.row, { gap: spacing[3] }]}>
          <Text testID="requests-link" style={styles.body}>{t("guests.report.requestsLink", { count: open })}</Text>
          <TextAction label={t("guests.report.requestsAction")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.requests, celebrationId))} />
        </View>
      ) : null}
      <View style={{ gap: spacing[2] }}>
        <View style={{ alignItems: "flex-start" }}><ActionButton label={exporting ? t("guests.report.exporting") : t("guests.report.export")} busy={exporting} onPress={() => { void exportCsv(); }} testID="export-csv" /></View>
        <MoreOptions label={t("guests.more")} testID="report-more">
          <View style={{ gap: spacing[2], alignItems: "flex-start" }}>
            <ActionButton variant="secondary" label={t("guests.report.exportCatering")} disabled={exporting} onPress={() => { void exportCsv("catering"); }} testID="export-catering" />
            <Text style={styles.muted}>{t("guests.report.exportCateringNote")}</Text>
          </View>
        </MoreOptions>
        {exportMessage ? <Notice kind={exportMessage.kind}>{exportMessage.text}</Notice> : null}
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("guests.report.filterLabel")} style={styles.row}>
        {FILTERS.map((value) => (
          <Pressable key={value} accessibilityRole="radio" aria-checked={status === value} accessibilityLabel={value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`)} onPress={() => { setStatus(value); setOffset(0); }} style={[styles.navItem, status === value && styles.navItemCurrent]}>
            <Text style={styles.label}>{value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`)}</Text>
          </Pressable>
        ))}
      </View>
      {list.isPending ? <Loading /> : null}
      {list.isError ? <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} /> : null}
      {data && !list.isError ? (
        <View style={{ gap: spacing[3] }}>
          {data.items.length === 0 ? <EmptyState illustration="invitation" title={filtered ? t("guests.list.emptyFilteredTitle") : t("guests.report.emptyTitle")} body={filtered ? t("guests.report.emptyFiltered") : t("guests.report.empty")} /> : (
            <View role="list" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, overflow: "hidden" }}>
              {data.items.map((guest, index) => {
                const answer = byGuest.get(guest.guestId);
                return (
                  <View key={guest.guestId} role="listitem" style={index > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("guests.list.open", { name: guest.name })} onPress={() => onNavigate(withCelebration(guestDetailPath(guest.guestId), celebrationId))} style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[3], minHeight: 68, paddingVertical: spacing[3], paddingHorizontal: spacing[4] }}>
                      <Avatar name={guest.name} size={44} />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={styles.subtitle} numberOfLines={2}>{guest.name}</Text>
                        {guest.status === "CONFIRMED" && guest.requestedCompanions > 0 ? <Text style={styles.muted}>{t("guests.report.requested", { requested: guest.requestedCompanions, approved: guest.approvedCompanions })}</Text> : null}
                        {answer?.dietaryNotes ? <Text style={styles.body}>{t("guests.report.dietary", { value: answer.dietaryNotes })}</Text> : null}
                        {answer?.message ? <Text style={styles.body}>{t("guests.report.message", { value: answer.message })}</Text> : null}
                      </View>
                      <StatusBadge status={guest.status} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          {paged ? (
            <View style={styles.row}>
              <ActionButton variant="secondary" label={t("guests.list.prev")} disabled={data.offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE))} />
              <Text style={styles.muted}>{t("guests.list.page", { from: data.offset + 1, to, total: data.total })}</Text>
              <ActionButton variant="secondary" label={t("guests.list.next")} disabled={to >= data.total} onPress={() => setOffset(offset + PAGE)} />
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
  return <CelebrationScreen {...props} current="report" title={t("guests.report.title")} intro={t("guests.report.intro")}>{({ celebration }) => <ReportBody celebrationId={celebration.id} timeZone={celebration.timeZone} slug={celebration.slug} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
