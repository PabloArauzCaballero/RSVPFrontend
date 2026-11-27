import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { EmptyState, Notice, useStyles } from "../host/ui";
import { useProviderLeadReport, type LeadFilters, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { PortalErrorState } from "./errors";
import { RowsSkeleton } from "./parts";
import { LeadFilterBar } from "./lead-filters";
import { ProviderTotals, ReportRows, currentMonth, zoneName } from "./lead-report-view";

/**
 * R6b · «Reporte mensual de solicitudes» (D-10 #33): the provider's own month, per product and button, with the filters of the contract
 * (month, product, button). The same figures the administrator bills from; the provider never sees who clicked (PF-1).
 */
export function LeadReportSection({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const styles = useStyles();
  const [filters, setFilters] = useState<LeadFilters & { readonly month: string }>({ month: currentMonth(provider.timeZone) });
  const report = useProviderLeadReport(client, provider.id, filters);
  const own = report.data?.providers.find((row) => row.providerId === provider.id) ?? report.data?.providers[0];
  return (
    <View style={{ gap: spacing[4] }} testID="report-leads">
      <View style={{ gap: spacing[1] }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.leadReport.title")}</Text>
        <Text style={styles.muted}>{t("portal.leadReport.intro")}</Text>
      </View>
      <LeadFilterBar provider={provider} value={filters} onChange={(next) => setFilters({ ...next, month: next.month || filters.month })} ns="portal.leadReport" />
      <Text style={styles.muted}>{t("portal.leadReport.tz", { zone: zoneName(provider.timeZone, locale) })}</Text>
      {report.isPending ? <RowsSkeleton count={3} minHeight={64} trailing={false} /> : null}
      {report.isError && !report.data ? <PortalErrorState error={report.error} onRetry={() => { void report.refetch(); }} /> : null}
      {report.data ? (
        report.data.rows.length === 0 ? <EmptyState illustration="emptySearch" title={t("portal.leadReport.emptyTitle")} body={t("portal.leadReport.empty")} /> : (
          <View style={{ gap: spacing[4] }}>
            {own ? <ProviderTotals provider={own} ns="portal.leadReport" testID="report-totals" /> : null}
            <View>
              <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.leadReport.rowsTitle")}</Text>
              <ReportRows rows={report.data.rows} ns="portal.leadReport" />
            </View>
            <Notice>{t("portal.leadReport.dedupeNote")}</Notice>
          </View>
        )
      ) : null}
    </View>
  );
}
