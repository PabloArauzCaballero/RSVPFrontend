import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatNumber } from "@rsvp/i18n";
import { Chip, Stagger, depth, useColors, useTheme } from "@rsvp/ui";
import { INVALID_REASONS, LEAD_DESTINATIONS, type InvalidLeadCounts, type LeadReportProvider, type LeadReportRow } from "@rsvp/query-hooks";
import { useLocale, useT } from "../platform/providers";
import { useStyles } from "../host/ui";

/**
 * R6b · the monthly lead report as the portal and the admin panel show it (provider-catalog 3.10.0, D-10 #33 and #34).
 * Figures only: ids, names of providers and products and counters (PF-1). `billableLeads` is null when the provider is not billed per click.
 */

/** Namespaces that render the report; both must define every key in `REPORT_KEYS` (checked by `tsc` in `test/lead-reports.test.tsx`, so a missing one never shows as a raw key). */
export type ReportNs = "portal.leadReport" | "admin.leadReport";
export const REPORT_KEYS = ["valid", "invalid", "billable", "notPerClick", "cap", "noCap", "row", "rowFigures", "unknownProduct"] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];
const rk = (ns: ReportNs, key: ReportKey): string => `${ns}.${key}`;

const MONTH = /^(\d{4})-(\d{2})$/;
const MONTHS_BACK = 12;

/** `Intl` throws a RangeError for a time zone it does not know: the report then counts the month in La Paz (the platform's own zone) instead of failing the render. */
const FALLBACK_ZONE = "America/La_Paz";
function monthParts(timeZone: string, now: Date): Intl.DateTimeFormatPart[] {
  const format = (zone: string): Intl.DateTimeFormatPart[] => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit" }).formatToParts(now);
  try { return format(timeZone); } catch { return format(FALLBACK_ZONE); }
}

/** The calendar month (YYYY-MM) of `now` in `timeZone`: the one the backend closes a provider's month in. */
export function currentMonth(timeZone: string, now: Date = new Date()): string {
  const parts = monthParts(timeZone, now);
  const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}`;
}

/** The last `count` months, newest first, ending at the current month of `timeZone`. */
export function recentMonths(timeZone: string, count: number = MONTHS_BACK, now: Date = new Date()): readonly string[] {
  const match = MONTH.exec(currentMonth(timeZone, now));
  if (!match) return [];
  const year = Number(match[1]);
  const month = Number(match[2]);
  return Array.from({ length: count }, (_, back) => {
    const index = year * 12 + (month - 1) - back;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

/** «hora de Bolivia» instead of «America/La_Paz»; the raw IANA name only when the platform cannot name the zone. */
export function zoneName(timeZone: string, locale: string): string {
  try {
    const name = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "long" }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;
    return name ?? timeZone;
  } catch { return timeZone; }
}

export function monthLabel(value: string, locale: string): string {
  const match = MONTH.exec(value);
  if (!match) return value;
  const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** «Bot: 2 · Duplicado: 1»: only the reasons that happened. */
export function InvalidBreakdown({ counts, ns, testID }: { readonly counts: InvalidLeadCounts; readonly ns: ReportNs; readonly testID?: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const present = INVALID_REASONS.filter((reason) => counts[reason] > 0);
  if (present.length === 0) return null;
  return <Text style={styles.muted} testID={testID}>{present.map((reason) => `${t(ns === "admin.leadReport" ? `admin.leadReport.invalidReason.${reason}` : `portal.leads.invalid.${reason}`)}: ${formatNumber(counts[reason], locale)}`).join(" · ")}</Text>;
}

/** The words for a button code (a code this build does not know is shown as received). */
export function useDestinationLabel(): (destination: string) => string {
  const t = useT();
  return (destination) => (LEAD_DESTINATIONS as readonly string[]).includes(destination) ? t(`portal.destinations.destination.${destination}`) : destination;
}

const BILLING_KEYS = ["CPC", "CPA", "FLAT", "COMMISSION"] as const;

/** One provider's totals for the month: valid, not valid by reason, and the billable total (or why there is none). */
export function ProviderTotals({ provider, ns, testID }: { readonly provider: LeadReportProvider; readonly ns: ReportNs; readonly testID?: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const { scheme } = useTheme();
  const model = BILLING_KEYS.includes(provider.billingModel) ? t(`${ns}.billingModel.${provider.billingModel}`) : provider.billingModel;
  return (
    <View style={{ gap: spacing[2], padding: spacing[5], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, ...depth(scheme) }} testID={testID}>
      {ns === "admin.leadReport" ? <Text accessibilityRole="header" style={styles.subtitle}>{provider.providerName}</Text> : null}
      <View style={[styles.row, { gap: spacing[2] }]}>
        <Chip tone="yes">{`${t(rk(ns, "valid"))}: ${formatNumber(provider.validLeads, locale)}`}</Chip>
        <Chip tone="no">{`${t(rk(ns, "invalid"))}: ${formatNumber(provider.invalidLeads, locale)}`}</Chip>
      </View>
      <InvalidBreakdown counts={provider.invalidByReason} ns={ns} />
      <Text style={styles.label}>{provider.billableLeads === null ? t(rk(ns, "notPerClick"), { model }) : `${t(rk(ns, "billable"))}: ${formatNumber(provider.billableLeads, locale)}`}</Text>
      <Text style={styles.muted}>{provider.monthlyCap > 0 ? t(rk(ns, "cap"), { cap: formatNumber(provider.monthlyCap, locale) }) : t(rk(ns, "noCap"))}</Text>
    </View>
  );
}

/** One row per product and button. */
export function ReportRows({ rows, ns }: { readonly rows: readonly LeadReportRow[]; readonly ns: ReportNs }): ReactNode {
  const t = useT();
  const buttonLabel = useDestinationLabel();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  return (
    <Stagger>
      {rows.map((row) => (
        <View key={`${row.providerId}-${row.listingId}-${row.destination}`} style={{ gap: spacing[1], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }} testID="report-row">
          <Text style={styles.label}>{t(rk(ns, "row"), { product: row.listingTitle ?? t(rk(ns, "unknownProduct")), button: buttonLabel(row.destination) })}</Text>
          {ns === "admin.leadReport" ? <Text style={styles.muted}>{row.providerName}</Text> : null}
          <Text style={styles.body}>{t(rk(ns, "rowFigures"), { valid: formatNumber(row.validLeads, locale), invalid: formatNumber(row.invalidLeads, locale) })}</Text>
          <InvalidBreakdown counts={row.invalidByReason} ns={ns} />
          {row.billableLeads !== null ? <Text style={styles.muted}>{`${t(rk(ns, "billable"))}: ${formatNumber(row.billableLeads, locale)}`}</Text> : null}
        </View>
      ))}
    </Stagger>
  );
}
