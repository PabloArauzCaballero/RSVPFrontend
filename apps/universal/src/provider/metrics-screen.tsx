import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatNumber } from "@rsvp/i18n";
import { Stagger, useColors } from "@rsvp/ui";
import { useMetrics, type MetricTotals, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ChoiceGroup, DateInput, EmptyState, FilterSelect, Notice, PageIntro, useStyles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { PortalScreen, usePortalHeader } from "./frame";
import { RowsSkeleton } from "./parts";

const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const BAR = 8;

/** [today - days, today] as calendar dates in the PROVIDER's zone. */
export function lastDays(days: number, timeZone: string, now: Date = new Date()): { readonly from: string; readonly to: string } {
  const fmt = (date: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return { from: fmt(new Date(now.getTime() - days * DAY_MS)), to: fmt(now) };
}
export const validRange = (from: string, to: string): boolean => ISO.test(from) && ISO.test(to) && from <= to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to));

/** A rounded bar scaled to `ratio` (0..1). Decorative: the figure beside it says the same in text. Track and fill are palette roles, so dark mode keeps the contrast. */
function Bar({ ratio, color, height = BAR }: { readonly ratio: number; readonly color: string; readonly height?: number }): ReactNode {
  const palette = useColors();
  return (
    <View aria-hidden style={{ height, borderRadius: 999, backgroundColor: palette.primaryMuted, overflow: "hidden" }}>
      <View style={{ height, borderRadius: 999, width: `${Math.max(ratio > 0 ? 2 : 0, Math.round(ratio * 100))}%`, backgroundColor: color }} />
    </View>
  );
}

/** The period's totals as one list: label, figure and a bar scaled to the largest count (CTR is a ratio, so it has no bar). */
export function RangeTotals({ totals }: { readonly totals: MetricTotals }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
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
    <View style={{ maxWidth: 560 }} testID="metric-totals">
      {noData ? <Text style={[styles.muted, { paddingBottom: spacing[2] }]} testID="metrics-no-data">{t("portal.metrics.noData")}</Text> : null}
      <Stagger>
        {rows.map((row, index) => (
          <View key={row.label} accessible accessibilityLabel={`${row.label}: ${row.value}`} style={{ gap: spacing[2], paddingVertical: spacing[3], borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing[3] }}>
              <Text style={[styles.body, { flex: 1 }]}>{row.label}</Text>
              <Text style={[styles.subtitle, { fontVariant: ["tabular-nums"] }]}>{row.value}</Text>
            </View>
            {row.count !== undefined && !noData ? <Bar ratio={row.count / max} color={row.tone ?? palette.primary} /> : null}
          </View>
        ))}
      </Stagger>
    </View>
  );
}

const FIELDS: readonly string[] = ["day", "category", "destination", "impressions", "clicks", "validLeads", "invalidLeads", "leads"];
type Group = "day" | "category" | "destination";
type Period = "d7" | "d30" | "d90" | "custom";
const PERIOD_DAYS: Readonly<Record<Exclude<Period, "custom">, number>> = { d7: 7, d30: 30, d90: 90 };
const reachOf = (row: Record<string, unknown>): number => (typeof row["impressions"] === "number" ? row["impressions"] : typeof row["clicks"] === "number" ? row["clicks"] : 0);

/**
 * D13 · Lead metrics by period, grouped by day, category or destination.
 * The period is a selector (last 7 / 30 / 90 days or a custom range): presets apply at once; only «Personalizado» shows the two dates,
 * and then «Ver resultados» is the one primary action of the header.
 */
function Metrics({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const initial = lastDays(30, provider.timeZone);
  const [period, setPeriod] = useState<Period>("d30");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [custom, setCustom] = useState(initial);
  const [group, setGroup] = useState<Group>("day");
  const [error, setError] = useState<string | null>(null);
  const applied = period === "custom" ? custom : lastDays(PERIOD_DAYS[period], provider.timeZone);
  const metrics = useMetrics(client, provider.id, applied.from, applied.to, group);
  const apply = (): void => { if (!validRange(from, to)) return setError(t("portal.metrics.dateInvalid")); setError(null); setCustom({ from, to }); };
  usePortalHeader(period === "custom" ? { icon: "refresh", label: t("portal.metrics.apply"), onPress: apply, testID: "metrics-apply" } : undefined);
  const rows = (metrics.data?.groups ?? metrics.data?.rows ?? []) as readonly Record<string, unknown>[];
  const peak = Math.max(1, ...rows.map(reachOf));
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.metrics.intro")}</PageIntro>
      <View style={{ gap: spacing[1], maxWidth: 360 }}>
        <Text style={styles.label}>{t("portal.metrics.period")}</Text>
        <FilterSelect<Period> label={t("portal.metrics.period")} value={period} onChange={(next) => { setPeriod(next); setError(null); }} options={(["d7", "d30", "d90", "custom"] as const).map((value) => ({ value, label: t(`portal.metrics.periods.${value}`) }))} testID="metrics-period" />
      </View>
      {period === "custom" ? (
        <View style={styles.row}>
          <View style={{ flexGrow: 1, flexBasis: 160 }}><DateInput label={t("portal.metrics.from")} value={from} onChange={setFrom} testID="metrics-from" /></View>
          <View style={{ flexGrow: 1, flexBasis: 160 }}><DateInput label={t("portal.metrics.to")} value={to} onChange={setTo} testID="metrics-to" /></View>
        </View>
      ) : null}
      <ChoiceGroup<Group> label={t("portal.metrics.groupBy")} value={group} onChange={setGroup} choices={(["day", "category", "destination"] as const).map((value) => ({ value, label: t(`portal.metrics.group.${value}`) }))} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {metrics.isPending ? <RowsSkeleton count={4} minHeight={52} trailing={false} /> : null}
      <ErrorNotice error={metrics.error} onReload={() => { void metrics.refetch(); }} />
      {metrics.data ? (
        <>
          <RangeTotals totals={metrics.data.totals} />
          <View>
            <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.metrics.groupsTitle", { group: t(`portal.metrics.group.${group}`).toLowerCase() })}</Text>
            {rows.length === 0 ? <EmptyState illustration="emptySearch" title={t("portal.metrics.emptyTitle")} body={t("portal.metrics.empty")} /> : (
              <Stagger>
                {rows.map((row, index) => {
                  const title = String(row[group] ?? Object.values(row).find((value) => typeof value === "string") ?? "");
                  const figures = Object.entries(row).filter(([key, value]) => key !== group && value !== title).map(([key, value]) => `${FIELDS.includes(key) ? t(`portal.metrics.field.${key}`) : key}: ${typeof value === "number" ? formatNumber(value, locale) : String(value)}`);
                  return (
                    <View key={`${title}-${index}`} style={{ gap: spacing[1], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }} testID="metric-row">
                      <Text style={styles.label}>{title}</Text>
                      {figures.length ? <Text style={styles.muted}>{figures.join(" · ")}</Text> : null}
                      {reachOf(row) > 0 ? <Bar ratio={reachOf(row) / peak} color={palette.primary} height={6} /> : null}
                    </View>
                  );
                })}
              </Stagger>
            )}
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
