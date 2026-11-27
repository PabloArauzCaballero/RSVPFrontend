import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatNumber } from "@rsvp/i18n";
import { Chip, Stagger, depth, useColors, useTheme } from "@rsvp/ui";
import { INVALID_REASONS, LEAD_DESTINATIONS, type InvalidLeadCounts, type LeadReportProvider, type LeadReportRow } from "@rsvp/query-hooks";
import { useLocale, useT } from "../platform/providers";
import { useStyles } from "../host/ui";

/**
 * R6b · the monthly lead report as the portal and the admin panel show it (provider-catalog 3.9.0, D-10 #33 and #34).
 * Figures only: ids, names of providers and products and counters (PF-1). `billableLeads` is null when the provider is not billed per click.
 */

const MONTH = /^(\d{4})-(\d{2})$/;
const MONTHS_BACK = 12;

/** The calendar month (YYYY-MM) of `now` in `timeZone`: the one the backend closes a provider's month in. */
export function currentMonth(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
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

export function monthLabel(value: string, locale: string): string {
  const match = MONTH.exec(value);
  if (!match) return value;
  const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** «Bot: 2 · Duplicado: 1»: only the reasons that happened. */
export function InvalidBreakdown({ counts, testID }: { readonly counts: InvalidLeadCounts; readonly testID?: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const present = INVALID_REASONS.filter((reason) => counts[reason] > 0);
  if (present.length === 0) return null;
  return <Text style={styles.muted} testID={testID}>{present.map((reason) => `${t(`portal.leads.invalid.${reason}`)}: ${formatNumber(counts[reason], locale)}`).join(" · ")}</Text>;
}

/** The words for a button code (a code this build does not know is shown as received). */
export function useDestinationLabel(): (destination: string) => string {
  const t = useT();
  return (destination) => (LEAD_DESTINATIONS as readonly string[]).includes(destination) ? t(`portal.destinations.destination.${destination}`) : destination;
}

const BILLING_KEYS = ["CPC", "CPA", "FLAT", "COMMISSION"] as const;

/** One provider's totals for the month: valid, not valid by reason, and the billable total (or why there is none). */
export function ProviderTotals({ provider, ns, testID }: { readonly provider: LeadReportProvider; readonly ns: "portal.leadReport" | "admin.leadReport"; readonly testID?: string }): ReactNode {
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
        <Chip tone="yes">{`${t(`${ns}.valid`)}: ${formatNumber(provider.validLeads, locale)}`}</Chip>
        <Chip tone="no">{`${t(`${ns}.invalid`)}: ${formatNumber(provider.invalidLeads, locale)}`}</Chip>
      </View>
      <InvalidBreakdown counts={provider.invalidByReason} />
      <Text style={styles.label}>{provider.billableLeads === null ? t(`${ns}.notPerClick`, { model }) : `${t(`${ns}.billable`)}: ${formatNumber(provider.billableLeads, locale)}`}</Text>
      <Text style={styles.muted}>{provider.monthlyCap > 0 ? t(`${ns}.cap`, { cap: formatNumber(provider.monthlyCap, locale) }) : t(`${ns}.noCap`)}</Text>
    </View>
  );
}

/** One row per product and button. */
export function ReportRows({ rows, ns }: { readonly rows: readonly LeadReportRow[]; readonly ns: "portal.leadReport" | "admin.leadReport" }): ReactNode {
  const t = useT();
  const buttonLabel = useDestinationLabel();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  return (
    <Stagger>
      {rows.map((row) => (
        <View key={`${row.providerId}-${row.listingId}-${row.destination}`} style={{ gap: spacing[1], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }} testID="report-row">
          <Text style={styles.label}>{t(`${ns}.row`, { product: row.listingTitle ?? t(`${ns}.unknownProduct`), button: buttonLabel(row.destination) })}</Text>
          {ns === "admin.leadReport" ? <Text style={styles.muted}>{row.providerName}</Text> : null}
          <Text style={styles.body}>{t(`${ns}.rowFigures`, { valid: formatNumber(row.validLeads, locale), invalid: formatNumber(row.invalidLeads, locale) })}</Text>
          <InvalidBreakdown counts={row.invalidByReason} />
          {row.billableLeads !== null ? <Text style={styles.muted}>{`${t(`${ns}.billable`)}: ${formatNumber(row.billableLeads, locale)}`}</Text> : null}
        </View>
      ))}
    </Stagger>
  );
}
