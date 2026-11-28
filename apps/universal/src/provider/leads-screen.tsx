import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Chip, Stagger, depth, useColors, useTheme } from "@rsvp/ui";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useInfiniteLeads, useProviderGeo, type Lead, type LeadFilters, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, EmptyState, Notice, PageIntro, useStyles } from "../host/ui";
import { PortalErrorNotice, PortalErrorState } from "./errors";
import { PortalScreen } from "./frame";
import { RowsSkeleton } from "./parts";
import { cityName } from "./coverage-picker";
import { LeadFilterBar } from "./lead-filters";
import { useDestinationLabel } from "./lead-report-view";

type Kind = "all" | "quote" | "click";
const NO_FILTERS = { month: "" } as const;

/** The celebration type of a click as a word; a code this build does not know is shown as received (never a celebration name: PF-1). */
/** The event types the app has words for (`portal.leads.eventTypes`); a code this build does not know is shown as received. */
export const KNOWN_EVENT_TYPES = ["WEDDING", "QUINCEANERA", "BAUTIZO", "ANNIVERSARY", "BIRTHDAY", "CORPORATE", "ADULT_BIRTHDAY", "PATRONAL_FEAST", "OPENING", "ENGAGEMENT", "BACHELOR_PARTY", "GOLDEN_WEDDING", "SILVER_WEDDING", "REUNION", "THEMED_PARTY", "NEW_YEAR", "OTHER", "GRADUATION", "BABY_SHOWER", "FIRST_COMMUNION"] as const;
function eventTypeLabel(t: ReturnType<typeof useT>, code: string): string {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(code) ? t(`portal.leads.eventTypes.${code}`) : code;
}

/** D-10 #34 · what the provider sees of a click: product, button, date, event type and city. Never the celebration, the guest or the referrer (PF-1). */
function LeadRow({ lead, timeZone, cities }: { readonly lead: Lead; readonly timeZone: string; readonly cities: Parameters<typeof cityName>[0] }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const { scheme } = useTheme();
  const destinationLabel = useDestinationLabel();
  const eventType = lead.eventType ?? lead.context?.eventType ?? null;
  const city = lead.city ?? lead.context?.city ?? null;
  return (
    <View style={{ gap: spacing[1], padding: spacing[5], marginBottom: spacing[3], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, ...depth(scheme) }} testID={`lead-${lead.id}`}>
      <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}><Text style={[styles.label, { flex: 1 }]}>{t(`portal.leads.kind.${lead.kind}`)}</Text><Chip tone={lead.valid ? "yes" : "no"}>{lead.valid ? t("portal.leads.valid") : t(`portal.leads.invalid.${lead.invalidReason ?? "OTHER"}`)}</Chip></View>
      <Text style={styles.muted}>{formatCelebrationDate(lead.occurredAt, { locale, timeZone })}</Text>
      <Text style={styles.body} testID={`product-of-${lead.id}`}>{t("portal.leads.product", { title: lead.listingTitle ?? t("portal.leads.productUnknown") })}</Text>
      {lead.destination ? <Text style={styles.body}>{t("portal.leads.destination", { destination: destinationLabel(lead.destination) })}</Text> : null}
      {eventType ? <Text style={styles.body}>{t("portal.leads.eventType", { type: eventTypeLabel(t, eventType) })}</Text> : null}
      {city ? <Text style={styles.body}>{t("portal.leads.city", { city: cityName(cities, city) })}</Text> : null}
      {lead.billable ? <Text style={styles.label}>{t("portal.leads.billable")}</Text> : null}
    </View>
  );
}

/** D12/D13 · Leads received: clicks on the contacts and quote requests (FORM leads), each in its own list. */
function Leads({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const styles = useStyles();
  const [filters, setFilters] = useState<LeadFilters & { readonly month: string }>(NO_FILTERS);
  const leads = useInfiniteLeads(client, provider.id, { ...filters, locale });
  const geo = useProviderGeo(client);
  const [kind, setKind] = useState<Kind>("all");
  const filtered = Boolean(filters.month || filters.listingId || filters.destination);
  const items = leads.data?.pages.flatMap((page) => page.items) ?? [];
  const total = leads.data?.pages[0]?.total ?? items.length;
  const quotes = items.filter((lead) => lead.kind === "FORM");
  const shown = kind === "all" ? items : kind === "quote" ? quotes : items.filter((lead) => lead.kind !== "FORM");
  const failed = leads.isError && !leads.data;
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.leads.intro")}</PageIntro>
      <LeadFilterBar provider={provider} value={filters} onChange={setFilters} allMonths ns="portal.leads" />
      {leads.isPending ? <RowsSkeleton count={4} minHeight={92} /> : failed ? <PortalErrorState error={leads.error} onRetry={() => { void leads.refetch(); }} /> : (
        <View style={{ gap: spacing[4], opacity: leads.isPlaceholderData ? 0.5 : 1 }} aria-busy={leads.isPlaceholderData} testID="leads-body">
          {items.length === 0 && filtered ? <Notice>{t("portal.leads.filteredEmpty")}</Notice> : items.length === 0 ? <EmptyState illustration="emptySearch" title={t("portal.leads.emptyTitle")} body={t("portal.leads.empty")} /> : (
            <View style={{ gap: spacing[2] }}>
              <ChoiceGroup<Kind> label={t("portal.leads.filter")} value={kind} onChange={setKind} choices={[{ value: "all", label: t("portal.leads.filters.all") }, { value: "quote", label: t("portal.leads.filters.quote") }, { value: "click", label: t("portal.leads.filters.click") }]} />
              {shown.length === 0 ? <Notice>{t(kind === "quote" ? "portal.leads.quotesEmpty" : "portal.leads.clicksEmpty")}</Notice> : <Stagger>{shown.map((lead) => <LeadRow key={lead.id} lead={lead} timeZone={provider.timeZone} cities={geo.data?.items} />)}</Stagger>}
            </View>
          )}
          {items.length > 0 ? <Text style={styles.muted} testID="leads-shown">{t("portal.leads.shown", { shown: items.length, total })}</Text> : null}
          {leads.isFetchNextPageError ? <PortalErrorNotice error={leads.error} onRetry={() => { void leads.fetchNextPage(); }} /> : null}
          {leads.hasNextPage ? <ActionButton icon="arrow" variant="secondary" label={t("portal.leads.more")} busy={leads.isFetchingNextPage} disabled={leads.isFetchingNextPage} onPress={() => { void leads.fetchNextPage(); }} testID="leads-more" /> : null}
        </View>
      )}
    </View>
  );
}

export function LeadsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.leads.title")} current="leads">{(provider) => <Leads provider={provider} />}</PortalScreen>;
}
