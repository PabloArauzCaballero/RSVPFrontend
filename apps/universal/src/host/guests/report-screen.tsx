import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Stagger, useColors } from "@rsvp/ui";
import { buildCateringCsv, buildRsvpReportCsv, hostGuestsApi, CATERING_COLUMNS, RSVP_REPORT_COLUMNS, useGuestList, useGuestSummary, useHostRsvps, type RsvpStatus } from "@rsvp/query-hooks";
import { saveTextFile } from "../../platform/files";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { guestDetailPath, HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, FilterSelect, Notice, OverflowMenu, useStyles } from "../ui";
import { FreshnessLine, GuestListSkeleton, GuestRow, RetryNotice, TextAction } from "./parts";

import { useSingleFlightGate } from "../../platform/single-flight";
import { lastPageOffset } from "./paging";

/** C24 · RSVP report (companions, diets, messages) and its safe CSV export for the venue and the caterer (REQ-F17-02/05). */

const PAGE = 50;
const FILTERS: readonly (RsvpStatus | "ALL")[] = ["ALL", "CONFIRMED", "PENDING", "DECLINED"];

type ExportKind = "full" | "catering";
type ExportMessage = { kind: "success" | "error"; text: string } | null;

/** The CSV export, shared by the header action ("Exportar CSV"), the menu ("Exportar para catering") and the notice in the body. One run at a time. */
function useReportExport(celebrationId: string | undefined, status: RsvpStatus | "ALL") {
  const t = useT();
  const client = useApiClient();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<ExportMessage>(null);
  const flight = useSingleFlightGate();
  const run = async (kind: ExportKind, slug: string): Promise<void> => {
    if (!celebrationId || !flight.begin()) return;
    setExporting(true); setMessage(null);
    const done = (name: string, outcome: Awaited<ReturnType<typeof saveTextFile>>, note = ""): void => setMessage(outcome === "failed" ? { kind: "error", text: t("guests.report.exportFailed") } : { kind: "success", text: `${t("guests.report.exported", { name })}${note ? ` ${note}` : ""}` });
    try {
      if (kind === "catering") {
        const header = CATERING_COLUMNS.map((column) => t(`guests.report.columns.${{ guestKey: "guestKey", group: "group", status: "status", partySize: "partySize", dietaryNotes: "dietary", message: "message" }[column]}`));
        const csv = await buildCateringCsv(hostGuestsApi(client), celebrationId, header, { withNotesOnly: false, includeMessage: false });
        const name = `catering-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
        done(name, await saveTextFile(name, csv), t("guests.report.exportCateringNote"));
        return;
      }
      const header = RSVP_REPORT_COLUMNS.map((column) => t(`guests.report.columns.${{ name: "name", email: "email", phone: "phone", status: "status", allowedCompanions: "allowed", requestedCompanions: "requested", approvedCompanions: "approved", dietaryNotes: "dietary", message: "message" }[column]}`));
      const csv = await buildRsvpReportCsv(hostGuestsApi(client), celebrationId, header, status === "ALL" ? undefined : status);
      const name = `rsvp-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
      done(name, await saveTextFile(name, csv));
    } catch { setMessage({ kind: "error", text: t("guests.report.exportFailed") }); } finally { setExporting(false); flight.end(); }
  };
  return { exporting, message, run };
}

function ReportBody({ celebrationId, timeZone, status, onStatus, exportMessage, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly status: RsvpStatus | "ALL"; readonly onStatus: (value: RsvpStatus | "ALL") => void; readonly exportMessage: ExportMessage; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const t = useT();
  const client = useApiClient();
  const [offset, setOffset] = useState(0);
  const list = useGuestList(client, celebrationId, { limit: PAGE, offset, ...(status === "ALL" ? {} : { status }) });
  const rsvps = useHostRsvps(client, celebrationId);
  const open = useGuestSummary(client, celebrationId).data?.openCompanionRequests ?? 0;
  const byGuest = new Map((rsvps.data?.items ?? []).map((item) => [item.guestId, item]));

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
      {exportMessage ? <Notice kind={exportMessage.kind}>{exportMessage.text}</Notice> : null}
      <FilterSelect testID="status-filter" label={t("guests.report.filterLabel")} value={status} onChange={(value) => { onStatus(value as RsvpStatus | "ALL"); setOffset(0); }} options={FILTERS.map((value) => ({ value, label: value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`) }))} />
      {list.isPending ? <GuestListSkeleton /> : null}
      {list.isError ? <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} /> : null}
      {data && !list.isError ? (
        <View style={{ gap: spacing[3] }}>
          {data.items.length === 0 ? <EmptyState illustration={filtered ? "emptySearch" : "table"} title={filtered ? t("guests.list.emptyFilteredTitle") : t("guests.report.emptyTitle")} body={filtered ? t("guests.report.emptyFiltered") : t("guests.report.empty")} /> : (
            <View role="list" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, overflow: "hidden" }}>
              <Stagger>
                {data.items.map((guest, index) => {
                  const answer = byGuest.get(guest.guestId);
                  const extra = (
                    <>
                      {guest.status === "CONFIRMED" && guest.requestedCompanions > 0 ? <Text style={styles.muted}>{t("guests.report.requested", { requested: guest.requestedCompanions, approved: guest.approvedCompanions })}</Text> : null}
                      {answer?.dietaryNotes ? <Text style={styles.body}>{t("guests.report.dietary", { value: answer.dietaryNotes })}</Text> : null}
                      {answer?.message ? <Text style={styles.body}>{t("guests.report.message", { value: answer.message })}</Text> : null}
                    </>
                  );
                  return (
                    <View key={guest.guestId} role="listitem" style={index > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
                      <GuestRow name={guest.name} status={guest.status} label={t("guests.list.open", { name: guest.name })} onPress={() => onNavigate(withCelebration(guestDetailPath(guest.guestId), celebrationId))} extra={extra} />
                    </View>
                  );
                })}
              </Stagger>
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
  const [status, setStatus] = useState<RsvpStatus | "ALL">("ALL");
  const exporter = useReportExport(props.celebrationId, status);
  return (
    <CelebrationScreen {...props} current="report" title={t("guests.report.title")} intro={t("guests.report.intro")}
      actions={({ celebration }) => <ActionButton label={exporter.exporting ? t("guests.report.exporting") : t("guests.report.export")} busy={exporter.exporting} onPress={() => { void exporter.run("full", celebration.slug); }} testID="export-csv" />}
      menu={({ celebration }) => <OverflowMenu label={t("guests.more")} testID="report-more" items={[{ key: "catering", label: t("guests.report.exportCatering"), testID: "export-catering", disabled: exporter.exporting, onPress: () => { void exporter.run("catering", celebration.slug); } }]} />}>
      {({ celebration }) => <ReportBody celebrationId={celebration.id} timeZone={celebration.timeZone} status={status} onStatus={setStatus} exportMessage={exporter.message} onNavigate={props.onNavigate} />}
    </CelebrationScreen>
  );
}
