import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { LEAD_DESTINATIONS, useOwnListings, type LeadDestination, type LeadFilters, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { FilterSelect, useStyles } from "../host/ui";
import { monthLabel, recentMonths, useDestinationLabel } from "./lead-report-view";

/** The «all» choice of a filter. Select values cannot be empty, so it has its own token. */
const ALL = "__all__";

/**
 * R6b · month, product and button filters of the lead list and report (D-10 #33, #34). The month is in the provider's time zone; `allMonths`
 * adds «Todos los meses» (the list, not the report: the report is always one month). Selecting «all» clears the filter.
 */
export function LeadFilterBar({ provider, value, onChange, allMonths = false, ns }: {
  readonly provider: Provider; readonly value: LeadFilters & { readonly month: string }; readonly onChange: (next: LeadFilters & { readonly month: string }) => void;
  readonly allMonths?: boolean; readonly ns: "portal.leads" | "portal.leadReport";
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const client = useApiClient();
  const destinationLabel = useDestinationLabel();
  const listings = useOwnListings(client, provider.id, locale);
  const months = recentMonths(provider.timeZone);
  const shownMonths = value.month && !months.includes(value.month) ? [value.month, ...months] : months;
  const monthOptions = [...(allMonths ? [{ value: ALL, label: t("portal.leads.allMonths") }] : []), ...shownMonths.map((month) => ({ value: month, label: monthLabel(month, locale) }))];
  const own = listings.data?.items ?? [];
  // A product without a title in this language still has to be choosable, and the one that is filtered stays an option while the list loads or fails.
  const products = [
    { value: ALL, label: t(`${ns}.allProducts`) },
    ...own.map((item) => ({ value: item.id, label: item.title?.trim() ? item.title : t("portal.leads.productUnknown") })),
    ...(value.listingId && !own.some((item) => item.id === value.listingId) ? [{ value: value.listingId, label: t("portal.leads.productUnknown") }] : [])
  ];
  const buttons = [{ value: ALL, label: t(`${ns}.allDestinations`) }, ...LEAD_DESTINATIONS.map((destination) => ({ value: destination, label: destinationLabel(destination) }))];
  const monthKey = ns === "portal.leads" ? "filterMonth" : "month";
  const productKey = ns === "portal.leads" ? "filterProduct" : "product";
  const buttonKey = ns === "portal.leads" ? "filterDestination" : "destination";
  return (
    <View style={[styles.row, { alignItems: "flex-end", gap: spacing[3] }]} testID="filters-bar">
      <View style={{ flexGrow: 1, flexBasis: 160, gap: spacing[1] }}>
        <Text style={styles.label}>{t(`${ns}.${monthKey}`)}</Text>
        <FilterSelect<string> label={t(`${ns}.${monthKey}`)} value={value.month || ALL} onChange={(next) => onChange({ ...value, month: next === ALL ? "" : next })} options={monthOptions} testID="filter-month" />
      </View>
      <View style={{ flexGrow: 1, flexBasis: 160, gap: spacing[1] }}>
        <Text style={styles.label}>{t(`${ns}.${productKey}`)}</Text>
        <FilterSelect<string> label={t(`${ns}.${productKey}`)} value={value.listingId || ALL} onChange={(next) => onChange({ ...value, listingId: next === ALL ? "" : next })} options={products} testID="filter-product" />
      </View>
      <View style={{ flexGrow: 1, flexBasis: 160, gap: spacing[1] }}>
        <Text style={styles.label}>{t(`${ns}.${buttonKey}`)}</Text>
        <FilterSelect<string> label={t(`${ns}.${buttonKey}`)} value={value.destination || ALL} onChange={(next) => onChange({ ...value, destination: next === ALL ? "" : (next as LeadDestination) })} options={buttons} testID="filter-destination" />
      </View>
    </View>
  );
}
