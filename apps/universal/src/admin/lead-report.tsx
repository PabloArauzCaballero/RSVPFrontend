import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { isReportMonth, useAdminLeadReport, useDownloadLeadReportCsv } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { saveTextFile } from "../platform/files";
import { ActionButton, FilterSelect, Notice, useStyles } from "../host/ui";
import { ProviderTotals, ReportRows, monthLabel, recentMonths } from "../provider/lead-report-view";
import { QueryBoundary } from "./shared";

/** Provider-catalog groups a provider's month by its own time zone; the panel's «current month» is the market's (Bolivia). */
const PANEL_TIME_ZONE = "America/La_Paz";
const ALL = "__all__";

/**
 * R6b · D-10 #33 · the billable lead report for the administrator: month, optional provider, valid and not valid leads by reason, the billable
 * total by billing model, and the CSV of the same rows. Ids, names and counters only (PF-1).
 */
export function AdminLeadReportSection(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const client = useApiClient();
  const months = recentMonths(PANEL_TIME_ZONE);
  const [month, setMonth] = useState(months[0] ?? "");
  const [providerId, setProviderId] = useState(ALL);
  const [message, setMessage] = useState<{ readonly kind: "success" | "error"; readonly text: string } | null>(null);
  const report = useAdminLeadReport(client, month);
  const csv = useDownloadLeadReportCsv(client);
  const providers = report.data?.providers ?? [];
  const selected = providerId === ALL || providers.some((provider) => provider.providerId === providerId) ? providerId : ALL;
  const download = (): void => {
    setMessage(null);
    csv.mutate({ month, ...(selected === ALL ? {} : { providerId: selected }) }, {
      onSuccess: async (text) => {
        const name = t("admin.leadReport.fileName", { month });
        const outcome = await saveTextFile(name, text);
        setMessage(outcome === "failed" ? { kind: "error", text: t("admin.leadReport.downloadFailed") } : { kind: "success", text: t(outcome === "shared" ? "admin.leadReport.shared" : "admin.leadReport.downloaded", { name }) });
      },
      onError: () => setMessage({ kind: "error", text: t("admin.leadReport.downloadFailed") })
    });
  };
  return (
    <View style={{ gap: spacing[4], maxWidth: 720 }} testID="admin-lead-report">
      <View style={{ gap: spacing[1] }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("admin.leadReport.title")}</Text>
        <Text style={styles.muted}>{t("admin.leadReport.intro")}</Text>
      </View>
      <View style={[styles.row, { alignItems: "flex-end", gap: spacing[3] }]}>
        <View style={{ flexGrow: 1, flexBasis: 180, gap: spacing[1] }}>
          <Text style={styles.label}>{t("admin.leadReport.month")}</Text>
          <FilterSelect<string> label={t("admin.leadReport.month")} value={month} onChange={(next) => { setMonth(next); setMessage(null); }} options={months.map((value) => ({ value, label: monthLabel(value, locale) }))} testID="admin-lead-month" />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 180, gap: spacing[1] }}>
          <Text style={styles.label}>{t("admin.leadReport.provider")}</Text>
          <FilterSelect<string> label={t("admin.leadReport.provider")} value={selected} onChange={(next) => { setProviderId(next); setMessage(null); }} options={[{ value: ALL, label: t("admin.leadReport.allProviders") }, ...providers.map((provider) => ({ value: provider.providerId, label: provider.providerName }))]} testID="admin-lead-provider" />
        </View>
        <ActionButton icon="arrow" variant="secondary" label={csv.isPending ? t("admin.leadReport.downloading") : t("admin.leadReport.download")} busy={csv.isPending} disabled={csv.isPending || !isReportMonth(month)} onPress={download} testID="admin-lead-csv" />
      </View>
      <Text style={styles.muted}>{t("admin.leadReport.tz")}</Text>
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
      <QueryBoundary query={{ isPending: report.isPending, error: report.error, refetch: report.refetch, data: report.data ? { items: report.data.rows, report: report.data } : undefined }} empty={t("admin.leadReport.empty")} emptyTitle={t("admin.leadReport.emptyTitle")}>
        {({ report: data }) => {
          const rows = selected === ALL ? data.rows : data.rows.filter((row) => row.providerId === selected);
          const shownProviders = selected === ALL ? data.providers : data.providers.filter((provider) => provider.providerId === selected);
          return (
            <View style={{ gap: spacing[4] }}>
              {shownProviders.map((provider) => <ProviderTotals key={provider.providerId} provider={provider} ns="admin.leadReport" testID={`admin-lead-totals-${provider.providerId}`} />)}
              <View>
                <Text accessibilityRole="header" style={styles.subtitle}>{t("admin.leadReport.rowsTitle")}</Text>
                <ReportRows rows={rows} ns="admin.leadReport" />
              </View>
            </View>
          );
        }}
      </QueryBoundary>
    </View>
  );
}
