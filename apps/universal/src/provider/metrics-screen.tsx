import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatNumber } from "@rsvp/i18n";
import { useMetrics, type MetricTotals, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, EmptyState, Field, Loading, Notice, PageIntro, styles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { PortalScreen } from "./frame";
import { livePalette } from "../platform/theme";

const palette = livePalette;
const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** [today - days, today] as calendar dates in the PROVIDER's zone. */
export function lastDays(days: number, timeZone: string, now: Date = new Date()): { readonly from: string; readonly to: string } {
  const fmt = (date: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return { from: fmt(new Date(now.getTime() - days * DAY_MS)), to: fmt(now) };
}
export const validRange = (from: string, to: string): boolean => ISO.test(from) && ISO.test(to) && from <= to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to));

/** The period's totals as one list: label, figure and a bar scaled to the largest count (CTR is a ratio, so it has no bar). */
/** `bare` drops the container when the list already sits inside a section (no card in a card). */
export function RangeTotals({ totals, bare = false }: { readonly totals: MetricTotals; readonly bare?: boolean }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const rows: readonly { readonly label: string; readonly value: string; readonly count?: number; readonly tone?: string }[] = [
    { label: t("portal.metrics.impressions"), value: formatNumber(totals.impressions, locale), count: totals.impressions },
    { label: t("portal.metrics.clicks"), value: formatNumber(totals.clicks, locale), count: totals.clicks },
    { label: t("portal.metrics.ctr"), value: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(totals.ctr) },
    { label: t("portal.metrics.validLeads"), value: formatNumber(totals.validLeads, locale), count: totals.validLeads, tone: palette.success },
    { label: t("portal.metrics.invalidLeads"), value: formatNumber(totals.invalidLeads, locale), count: totals.invalidLeads, tone: palette.textMuted }
  ];
  const max = Math.max(1, ...rows.map((row) => row.count ?? 0));
  const noData = totals.impressions + totals.clicks + totals.validLeads + totals.invalidLeads === 0;
  return (
    <View style={bare ? { maxWidth: 560 } : [{ maxWidth: 560 }]} testID="metric-totals">
      {noData ? <Text style={[styles.muted, { paddingBottom: spacing[2] }]} testID="metrics-no-data">{t("portal.metrics.noData")}</Text> : null}
      {rows.map((row, index) => (
        <View key={row.label} accessible accessibilityLabel={`${row.label}: ${row.value}`} style={{ gap: spacing[1], paddingVertical: spacing[3], borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing[3] }}>
            <Text style={styles.body}>{row.label}</Text>
            <Text style={[styles.subtitle, { fontVariant: ["tabular-nums"] }]}>{row.value}</Text>
          </View>
          {row.count !== undefined ? <View style={{ height: 6, borderRadius: 999, backgroundColor: palette.primaryMuted, overflow: "hidden" }}><View style={{ height: 6, width: `${Math.max(row.count > 0 ? 2 : 0, Math.round((row.count / max) * 100))}%`, backgroundColor: row.tone ?? palette.primary }} /></View> : null}
        </View>
      ))}
    </View>
  );
}

const FIELDS: readonly string[] = ["day", "category", "destination", "impressions", "clicks", "validLeads", "invalidLeads", "leads"];
type Group = "day" | "category" | "destination";

/** D13 · Lead metrics by period, grouped by day, category or destination. */
function Metrics({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const initial = lastDays(30, provider.timeZone);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);
  const [group, setGroup] = useState<Group>("day");
  const [error, setError] = useState<string | null>(null);
  const metrics = useMetrics(client, provider.id, applied.from, applied.to, group);
  const apply = (): void => { if (!validRange(from, to)) return setError(t("portal.metrics.dateInvalid")); setError(null); setApplied({ from, to }); };
  const rows = (metrics.data?.groups ?? metrics.data?.rows ?? []) as readonly Record<string, unknown>[];
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.metrics.intro")}</PageIntro>
      <View style={styles.row}>
        <Field label={t("portal.metrics.from")} value={from} onChange={setFrom} testID="metrics-from" />
        <Field label={t("portal.metrics.to")} value={to} onChange={setTo} testID="metrics-to" />
      </View>
      <ChoiceGroup<Group> label={t("portal.metrics.groupBy")} value={group} onChange={setGroup} choices={(["day", "category", "destination"] as const).map((value) => ({ value, label: t(`portal.metrics.group.${value}`) }))} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <ActionButton label={t("portal.metrics.apply")} onPress={apply} testID="metrics-apply" />
      {metrics.isPending ? <Loading /> : null}
      <ErrorNotice error={metrics.error} onReload={() => { void metrics.refetch(); }} />
      {metrics.data ? (
        <>
          <RangeTotals totals={metrics.data.totals} />
          <View style={{ maxWidth: 720 }}>
            <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.metrics.groupsTitle", { group: t(`portal.metrics.group.${group}`).toLowerCase() })}</Text>
            {rows.length === 0 ? <EmptyState illustration="emptySearch" title={t("portal.metrics.emptyTitle")} body={t("portal.metrics.empty")} /> : rows.map((row, index) => (
              <Text key={index} style={[styles.body, { paddingVertical: spacing[2], borderTopWidth: 1, borderTopColor: palette.border }]} testID="metric-row">{Object.entries(row).map(([key, value]) => `${FIELDS.includes(key) ? t(`portal.metrics.field.${key}`) : key}: ${typeof value === "number" ? formatNumber(value, locale) : String(value)}`).join(" · ")}</Text>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export function MetricsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.metrics.title")} current="metrics">{(provider) => <Metrics provider={provider} />}</PortalScreen>;
}
