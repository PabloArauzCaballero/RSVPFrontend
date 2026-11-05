import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { useOwnListings, type OwnListing, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ErrorNotice, Loading, Notice, styles } from "../host/ui";
import { PortalScreen } from "./frame";

/** D8 row: the delivery conditions exactly as guests and hosts read them on the offer (responsible, coverage, transport, lead time). */
function DeliveryRow({ listing, currency }: { readonly listing: OwnListing; readonly currency: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const f = listing.fulfillment;
  return (
    <View style={[styles.card, { gap: spacing[1] }]} testID={`delivery-${listing.id}`}>
      <Text accessibilityRole="header" style={styles.subtitle}>{listing.title}</Text>
      <Text style={styles.muted}>{t(`portal.services.type.${listing.type === "SERVICE" ? "SERVICE" : "PRODUCT"}`)} · {listing.published ? t("portal.services.published") : t("portal.services.draft")}</Text>
      {f ? (
        <>
          <Text style={styles.body}>{t("portal.delivery.responsible", { who: f.responsible === "PROVIDER" ? t("portal.services.new.responsibleProvider") : t("portal.services.new.responsibleCustomer") })}</Text>
          <Text style={styles.body}>{t("portal.delivery.coverage", { zones: f.coverageZones.join(", ") || "-" })}</Text>
          <Text style={styles.body}>{t("portal.delivery.transport", { price: f.transportCostMinor === undefined ? t("portal.delivery.noTransport") : formatMinor(f.transportCostMinor, currency, locale) })}</Text>
          <Text style={styles.body}>{t("portal.delivery.lead", { days: f.leadTimeDays })}</Text>
          {f.conditions ? <Text style={styles.muted}>{f.conditions}</Text> : null}
        </>
      ) : <Notice kind="error">{t("portal.delivery.missing")}</Notice>}
    </View>
  );
}

function Delivery({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const listings = useOwnListings(client, provider.id, locale);
  if (listings.isPending) return <Loading />;
  if (listings.isError) return <ErrorNotice error={listings.error} onReload={() => { void listings.refetch(); }} />;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.delivery.intro")}</Text>
      <Notice>{t("portal.delivery.editNote")}</Notice>
      {listings.data.items.length === 0 ? <Notice>{t("portal.delivery.empty")}</Notice> : listings.data.items.map((listing) => <DeliveryRow key={listing.id} listing={listing} currency={provider.currency} />)}
    </View>
  );
}

export function DeliveryScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.delivery.title")} current="delivery">{(provider) => <Delivery provider={provider} />}</PortalScreen>;
}
