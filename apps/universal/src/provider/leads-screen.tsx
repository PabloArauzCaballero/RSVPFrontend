import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useLeads, type Lead, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ErrorNotice, Loading, Notice, Section, styles } from "../host/ui";
import { PortalScreen } from "./frame";

function LeadRow({ lead, timeZone }: { readonly lead: Lead; readonly timeZone: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const context = lead.context ?? {};
  const surface = typeof context["surface"] === "string" ? context["surface"] : undefined;
  return (
    <View style={[styles.card, { gap: spacing[1] }]} testID={`lead-${lead.id}`}>
      <Text style={styles.subtitle}>{t(`portal.leads.kind.${lead.kind}`)} · {lead.valid ? t("portal.leads.valid") : t(`portal.leads.invalid.${lead.invalidReason ?? "bot"}`)}</Text>
      <Text style={styles.muted}>{formatCelebrationDate(lead.occurredAt, { locale, timeZone })}</Text>
      {lead.destination ? <Text style={styles.body}>{t("portal.leads.destination", { destination: lead.destination })}</Text> : null}
      {surface ? <Text style={styles.body}>{t("portal.leads.surface", { surface })}</Text> : null}
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
  const leads = useLeads(client, provider.id);
  if (leads.isPending) return <Loading />;
  if (leads.isError) return <View style={{ gap: spacing[2] }}><ErrorNotice error={leads.error} /><ActionButton variant="secondary" label={t("portal.errors.retry")} onPress={() => { void leads.refetch(); }} /></View>;
  const items = leads.data.items;
  const quotes = items.filter((lead) => lead.kind === "FORM");
  const clicks = items.filter((lead) => lead.kind !== "FORM");
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.leads.intro")}</Text>
      {items.length === 0 ? <Notice>{t("portal.leads.empty")}</Notice> : null}
      <Section title={t("portal.leads.quotesTitle")}>{quotes.length === 0 ? <Notice>{t("portal.leads.quotesEmpty")}</Notice> : quotes.map((lead) => <LeadRow key={lead.id} lead={lead} timeZone={provider.timeZone} />)}</Section>
      <Section title={t("portal.leads.clicksTitle")}>{clicks.length === 0 ? <Notice>{t("portal.leads.empty")}</Notice> : clicks.map((lead) => <LeadRow key={lead.id} lead={lead} timeZone={provider.timeZone} />)}</Section>
    </View>
  );
}

export function LeadsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.leads.title")} current="leads">{(provider) => <Leads provider={provider} />}</PortalScreen>;
}
