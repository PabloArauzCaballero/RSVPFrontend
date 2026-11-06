import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { colors, spacing } from "@rsvp/design-tokens";
import { formatNumber } from "@rsvp/i18n";
import { useMetrics, type MetricTotals, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Loading, Notice, Section, styles } from "../host/ui";
import { PortalScreen } from "./frame";

const palette = colors.light;
const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** [today - days, today] as calendar dates in the PROVIDER's zone. */
export function lastDays(days: number, timeZone: string, now: Date = new Date()): { readonly from: string; readonly to: string } {
  const fmt = (date: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return { from: fmt(new Date(now.getTime() - days * DAY_MS)), to: fmt(now) };
}
export const validRange = (from: string, to: string): boolean => ISO.test(from) && ISO.test(to) && from <= to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to));

/** The period's totals as one list: the label on the left, the figure on the right, a hairline between rows. */
/** `bare` drops the container when the list already sits inside a section (no card in a card). */
export function RangeTotals({ totals, bare = false }: { readonly totals: MetricTotals; readonly bare?: boolean }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const rows: readonly [string, string][] = [
    [t("portal.metrics.impressions"), formatNumber(totals.impressions, locale)],
    [t("portal.metrics.clicks"), formatNumber(totals.clicks, locale)],
    [t("portal.metrics.ctr"), new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(totals.ctr)],
    [t("portal.metrics.validLeads"), formatNumber(totals.validLeads, locale)],
    [t("portal.metrics.invalidLeads"), formatNumber(totals.invalidLeads, locale)]
  ];
  return (
    <View style={[bare ? { maxWidth: 560 } : [styles.card, { gap: 0, paddingVertical: spacing[2], maxWidth: 560 }]]} testID="metric-totals">
      {rows.map(([label, value], index) => (
        <View key={label} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing[3], paddingVertical: spacing[3], borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border }}>
          <Text style={styles.body}>{label}</Text>
          <Text style={[styles.subtitle, { fontVariant: ["tabular-nums"] }]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

type Group = "day" | "category" | "destination";

/** D13 · Lead metrics by period, grouped by day, category or destination. */
function Metrics({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const client = useApiClient();
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
      <Text style={styles.body}>{t("portal.metrics.intro")}</Text>
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
          <Section title={t("portal.metrics.groupsTitle", { group: t(`portal.metrics.group.${group}`) })}>
            {rows.length === 0 ? <Notice>{t("portal.metrics.empty")}</Notice> : rows.map((row, index) => (
              <Text key={index} style={styles.body} testID="metric-row">{Object.entries(row).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</Text>
            ))}
          </Section>
        </>
      ) : null}
    </View>
  );
}

export function MetricsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.metrics.title")} current="metrics">{(provider) => <Metrics provider={provider} />}</PortalScreen>;
}
