import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Chip, Stagger, useColors } from "@rsvp/ui";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useInfiniteLeads, type Lead, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, EmptyState, Notice, PageIntro, useStyles } from "../host/ui";
import { PortalErrorNotice, PortalErrorState } from "./errors";
import { PortalScreen } from "./frame";
import { RowsSkeleton } from "./parts";

type Kind = "all" | "quote" | "click";
const KNOWN_DESTINATIONS: readonly string[] = ["OFFICIAL_SITE", "LANDING", "WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "PRODUCT_PAGE"];
const KNOWN_SURFACES: readonly string[] = ["SEARCH", "DIRECTORY", "MICROSITE", "PROFILE", "LISTING"];

function LeadRow({ lead, timeZone }: { readonly lead: Lead; readonly timeZone: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const context = lead.context ?? {};
  const surface = typeof context["surface"] === "string" ? context["surface"] : undefined;
  // Internal codes (QUOTE_FORM and the like) are not copy: only destinations and surfaces the couple would recognize are shown.
  const destination = lead.destination && KNOWN_DESTINATIONS.includes(lead.destination) ? lead.destination : undefined;
  const surfaceKnown = surface !== undefined && KNOWN_SURFACES.includes(surface);
  return (
    <View style={{ gap: spacing[1], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }} testID={`lead-${lead.id}`}>
      <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}><Text style={[styles.label, { flex: 1 }]}>{t(`portal.leads.kind.${lead.kind}`)}</Text><Chip tone={lead.valid ? "yes" : "no"}>{lead.valid ? t("portal.leads.valid") : t(`portal.leads.invalid.${lead.invalidReason ?? "bot"}`)}</Chip></View>
      <Text style={styles.muted}>{formatCelebrationDate(lead.occurredAt, { locale, timeZone })}</Text>
      {destination ? <Text style={styles.body}>{t("portal.leads.destination", { destination: t(`portal.destinations.destination.${destination}`) })}</Text> : null}
      {surfaceKnown ? <Text style={styles.body}>{t("portal.leads.surface", { surface: t(`portal.leads.surfaces.${surface}`) })}</Text> : null}
      {lead.kind === "FORM" && typeof context["eventDate"] === "string" ? <Text style={styles.body}>{t("portal.leads.event", { date: context["eventDate"] })}</Text> : null}
      {lead.kind === "FORM" && typeof context["guestCount"] === "number" ? <Text style={styles.body}>{t("portal.leads.guests", { count: context["guestCount"] })}</Text> : null}
      {lead.billable ? <Text style={styles.label}>{t("portal.leads.billable")}</Text> : null}
    </View>
  );
}

/** D12/D13 · Leads received: clicks on the contacts and quote requests (FORM leads), each in its own list. */
function Leads({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const styles = useStyles();
  const leads = useInfiniteLeads(client, provider.id);
  const [kind, setKind] = useState<Kind>("all");
  if (leads.isPending) return <View style={{ gap: spacing[4] }}><PageIntro>{t("portal.leads.intro")}</PageIntro><RowsSkeleton count={4} minHeight={92} /></View>;
  if (leads.isError && !leads.data) return <PortalErrorState error={leads.error} onRetry={() => { void leads.refetch(); }} />;
  const items = leads.data?.pages.flatMap((page) => page.items) ?? [];
  const total = leads.data?.pages[0]?.total ?? items.length;
  const quotes = items.filter((lead) => lead.kind === "FORM");
  const shown = kind === "all" ? items : kind === "quote" ? quotes : items.filter((lead) => lead.kind !== "FORM");
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.leads.intro")}</PageIntro>
      {items.length === 0 ? <EmptyState illustration="emptySearch" title={t("portal.leads.emptyTitle")} body={t("portal.leads.empty")} /> : (
        <View style={{ maxWidth: 720, gap: spacing[2] }}>
          <ChoiceGroup<Kind> label={t("portal.leads.filter")} value={kind} onChange={setKind} choices={[{ value: "all", label: t("portal.leads.filters.all") }, { value: "quote", label: t("portal.leads.filters.quote") }, { value: "click", label: t("portal.leads.filters.click") }]} />
          {shown.length === 0 ? <Notice>{t(kind === "quote" ? "portal.leads.quotesEmpty" : "portal.leads.clicksEmpty")}</Notice> : <Stagger>{shown.map((lead) => <LeadRow key={lead.id} lead={lead} timeZone={provider.timeZone} />)}</Stagger>}
        </View>
      )}
      {items.length > 0 ? <Text style={styles.muted} testID="leads-shown">{t("portal.leads.shown", { shown: items.length, total })}</Text> : null}
      {leads.isFetchNextPageError ? <PortalErrorNotice error={leads.error} onRetry={() => { void leads.fetchNextPage(); }} /> : null}
      {leads.hasNextPage ? <ActionButton variant="secondary" label={t("portal.leads.more")} busy={leads.isFetchingNextPage} disabled={leads.isFetchingNextPage} onPress={() => { void leads.fetchNextPage(); }} testID="leads-more" /> : null}
    </View>
  );
}

export function LeadsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.leads.title")} current="leads">{(provider) => <Leads provider={provider} />}</PortalScreen>;
}
