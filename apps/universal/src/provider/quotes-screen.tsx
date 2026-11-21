import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Chip, Stagger, depth, useColors, useTheme } from "@rsvp/ui";
import { formatCelebrationDate, formatMinor } from "@rsvp/i18n";
import { useInfiniteProviderQuotes, useProviderQuote, type Provider, type ProviderQuoteSummary } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, EmptyState, PageIntro, useStyles } from "../host/ui";
import { PortalErrorNotice, PortalErrorState } from "./errors";
import { PortalScreen } from "./frame";
import { RowsSkeleton } from "./parts";

/** A calendar date (YYYY-MM-DD) shown as written: formatted at noon UTC so no time zone moves it to another day. */
const calendarDate = (date: string, locale: ReturnType<typeof useLocale>): string => formatCelebrationDate(`${date}T12:00:00Z`, { locale, timeZone: "UTC" }, { dateStyle: "long" });

/** The contact is read only when the provider opens the request (the list never carries e-mail or phone). */
function QuoteContact({ providerId, quoteId }: { readonly providerId: string; readonly quoteId: string }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const styles = useStyles();
  const detail = useProviderQuote(client, providerId, quoteId);
  if (detail.isPending) return <Text style={styles.muted}>{t("portal.quotes.loadingContact")}</Text>;
  if (detail.isError) return <PortalErrorNotice error={detail.error} onRetry={() => { void detail.refetch(); }} />;
  const { contact, message } = detail.data;
  return (
    <View style={{ gap: spacing[2] }} testID={`quote-contact-${quoteId}`}>
      <Text style={styles.label} accessibilityRole="header">{t("portal.quotes.contactTitle", { name: contact.name })}</Text>
      <Text style={styles.body}>{`${t("portal.quotes.email")}: ${contact.email}`}</Text>
      <Text style={styles.body}>{contact.phone ? `${t("portal.quotes.phone")}: ${contact.phone}` : t("portal.quotes.noPhone")}</Text>
      {message ? <View style={{ gap: spacing[1] }}><Text style={styles.label}>{t("portal.quotes.message")}</Text><Text style={styles.body} testID={`quote-message-${quoteId}`}>{message}</Text></View> : null}
      <View style={[styles.row, { gap: spacing[2] }]}>
        <ActionButton icon="arrow" variant="secondary" label={t("portal.quotes.writeEmail", { email: contact.email })} onPress={() => { void Linking.openURL(`mailto:${encodeURIComponent(contact.email)}`); }} testID={`quote-email-${quoteId}`} />
        {contact.phone ? <ActionButton icon="arrow" variant="secondary" label={t("portal.quotes.call", { phone: contact.phone })} onPress={() => { void Linking.openURL(`tel:${contact.phone?.replace(/[^+0-9]/g, "") ?? ""}`); }} testID={`quote-call-${quoteId}`} /> : null}
      </View>
    </View>
  );
}

function QuoteRow({ quote, provider }: { readonly quote: ProviderQuoteSummary; readonly provider: Provider }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const { scheme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: spacing[2], padding: spacing[5], marginBottom: spacing[3], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, ...depth(scheme) }} testID={`quote-${quote.id}`}>
      <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}>
        <Text style={[styles.label, { flex: 1 }]}>{quote.contactName}</Text>
        <Chip tone="yes">{t(`portal.quotes.status.${quote.status}`)}</Chip>
      </View>
      <Text style={styles.muted}>{t("portal.quotes.received", { date: formatCelebrationDate(quote.createdAt, { locale, timeZone: provider.timeZone }) })}</Text>
      <Text style={styles.body}>{t("portal.quotes.event", { date: calendarDate(quote.eventDate, locale) })}</Text>
      <Text style={styles.body}>{t("portal.quotes.guests", { count: quote.guestCount })}</Text>
      <Text style={styles.body}>{quote.budget ? t("portal.quotes.budget", { amount: formatMinor(quote.budget.amountMinor, quote.budget.currency, locale) }) : t("portal.quotes.noBudget")}</Text>
      {quote.eventCity ? <Text style={styles.body}>{t("portal.quotes.city", { city: quote.eventCity })}</Text> : null}
      {quote.hasMessage ? <Text style={styles.muted}>{t("portal.quotes.withMessage")}</Text> : null}
      <ActionButton icon="arrow" variant={open ? "secondary" : "primary"} label={t(open ? "portal.quotes.close" : "portal.quotes.open")} onPress={() => { setOpen((value) => !value); }} testID={`quote-toggle-${quote.id}`} />
      {open ? <QuoteContact providerId={provider.id} quoteId={quote.id} /> : null}
    </View>
  );
}

/** B11 · The quote inbox: every request a visitor sent from the listing, with the contact to answer it. */
function Quotes({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const styles = useStyles();
  const quotes = useInfiniteProviderQuotes(client, provider.id);
  if (quotes.isPending) return <View style={{ gap: spacing[4] }}><PageIntro>{t("portal.quotes.intro")}</PageIntro><RowsSkeleton count={3} minHeight={160} /></View>;
  if (quotes.isError && !quotes.data) return <PortalErrorState error={quotes.error} onRetry={() => { void quotes.refetch(); }} />;
  const items = quotes.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.quotes.intro")}</PageIntro>
      {items.length === 0
        ? <EmptyState illustration="emptySearch" title={t("portal.quotes.emptyTitle")} body={t("portal.quotes.empty")} />
        : <Stagger>{items.map((quote) => <QuoteRow key={quote.id} quote={quote} provider={provider} />)}</Stagger>}
      {items.length > 0 ? <Text style={styles.muted} testID="quotes-shown">{t("portal.quotes.shown", { shown: items.length })}</Text> : null}
      {quotes.isFetchNextPageError ? <PortalErrorNotice error={quotes.error} onRetry={() => { void quotes.fetchNextPage(); }} /> : null}
      {quotes.hasNextPage ? <ActionButton icon="arrow" variant="secondary" label={t("portal.quotes.more")} busy={quotes.isFetchingNextPage} disabled={quotes.isFetchingNextPage} onPress={() => { void quotes.fetchNextPage(); }} testID="quotes-more" /> : null}
    </View>
  );
}

export function QuotesScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.quotes.title")} current="quotes">{(provider) => <Quotes provider={provider} />}</PortalScreen>;
}
