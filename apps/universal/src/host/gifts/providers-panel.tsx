import { useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatMinor } from "@rsvp/i18n";
import { problemCode, useAddGift, useProviderDiscovery, type ProviderCard } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { partnerRedirectUrl } from "../../platform/partner-link";
import { MoreOptions } from "../more-options";
import { Hint, Row, RowList } from "./offer-row";
import { GiftErrorNotice } from "./gift-errors";
import { SkeletonList, Stagger } from "@rsvp/ui";
import { ActionButton, Field, Notice, useStyles } from "../ui";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";

const CATEGORIES = ["VENUE", "CATERING", "PHOTOGRAPHY", "MUSIC", "DECORATION", "MAKEUP", "TRANSPORT", "INVITATIONS", "WEDDING_PLANNER", "ACCOMMODATION", "HONEYMOON"] as const;
const PAGE_SIZE = 6;
const CENTS = 100;
const MIN_TOUCH = 44;

/** REQ-F23-05 · One offer: what it is, who sells it, what it costs and how long it takes; address, hours and the provider's own links stay behind «Ver detalles». */
function ProviderOffer({ card, celebrationId, adding, first, onAdd }: { readonly card: ProviderCard; readonly celebrationId: string; readonly adding: boolean; readonly first: boolean; readonly onAdd: (card: ProviderCard) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const fulfillment = card.fulfillment;
  const open = (destination: string): void => { void Linking.openURL(partnerRedirectUrl(card.listingId, { destination, surface: "APP", celebrationId })); };
  const hasDetails = Boolean(card.address) || Boolean(card.hours?.weekly.length) || card.destinations.length > 0;
  return (
    <Row first={first} testID={`provider-${card.listingId}`}>
      <Text accessibilityRole="header" aria-level={3} style={styles.subtitle}>{card.name}</Text>
      <Text style={styles.label}>{t("gifts.host.providers.by", { name: card.providerName })}</Text>
      <Text style={styles.body}>{t(`directory.category.${card.category}`)} · {card.city}{card.department && card.department !== card.city ? `, ${card.department}` : ""}</Text>
      {card.priceFrom ? <Text style={styles.body}>{t("gifts.host.catalog.priceFrom", { price: formatMinor(card.priceFrom.amountMinor, card.priceFrom.currency, locale) })}</Text> : null}
      {card.summary ? <Text style={styles.muted}>{card.summary}</Text> : null}
      {fulfillment ? (
        <View testID={`fulfillment-${card.listingId}`}>
          <Text style={styles.muted}>{t("gifts.host.providers.leadTime", { days: fulfillment.leadTimeDays })}{fulfillment.coverageZones.length ? ` · ${t("gifts.host.providers.coverage", { zones: fulfillment.coverageZones.join(", ") })}` : ""}</Text>
          {fulfillment.transportCostMinor !== undefined && card.priceFrom ? <Text style={styles.muted}>{t("gifts.host.providers.transport", { price: formatMinor(fulfillment.transportCostMinor, card.priceFrom.currency, locale) })}</Text> : null}
        </View>
      ) : null}
      {hasDetails ? (
        <MoreOptions label={t("gifts.host.providers.details")} testID={`details-${card.listingId}`}>
          {card.address ? <Text style={styles.muted}>{t("gifts.host.providers.address", { address: [card.address.line, card.address.reference].filter(Boolean).join(" · ") })}</Text> : null}
          {card.hours?.weekly.length ? <Text style={styles.muted}>{t("gifts.host.providers.hours", { hours: card.hours.weekly.map((slot) => `${slot.opens}-${slot.closes}`).join(", ") })}{card.hours.note ? ` · ${card.hours.note}` : ""}</Text> : null}
          <View style={styles.row}>
            {card.destinations.slice(0, 3).map((destination) => (
              <ActionButton key={destination} variant="secondary" label={t(`partner.destination.${destination}`, { name: card.providerName })} onPress={() => open(destination)} testID={`dest-${card.listingId}-${destination}`} />
            ))}
          </View>
        </MoreOptions>
      ) : null}
      <View style={styles.row}><ActionButton variant="secondary" label={adding ? t("gifts.host.catalog.adding") : t("gifts.host.catalog.add")} busy={adding} disabled={adding} onPress={() => onAdd(card)} testID={`add-provider-${card.listingId}`} /></View>
    </Row>
  );
}

/** «De un proveedor»: browse verified providers by category, city and price, and add one of their offers as a CATALOGED gift. */
export function ProvidersPanel({ celebrationId, currency, onSeeList }: { readonly celebrationId: string; readonly currency: string; readonly onSeeList: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [city, setCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [committed, setCommitted] = useState<{ city?: string; maxPriceMinor?: number }>({});
  const [page, setPage] = useState(1);
  const [added, setAdded] = useState<string | null>(null);
  const discovery = useProviderDiscovery(client, { ...(category ? { category } : {}), ...(committed.city ? { city: committed.city } : {}), ...(committed.maxPriceMinor !== undefined ? { maxPriceMinor: committed.maxPriceMinor } : {}), page, pageSize: PAGE_SIZE });
  const add = useAddGift(client, celebrationId);
  const flight = useSingleFlightGate();
  const unavailable = add.error instanceof ApiError && problemCode(add.error) === "CATALOG_PRODUCT_UNAVAILABLE";
  const apply = (): void => {
    const price = Number(maxPrice.replace(",", "."));
    setPage(1);
    setCommitted({ ...(city.trim() ? { city: city.trim().toLowerCase().replace(/\s+/g, "-") } : {}), ...(maxPrice.trim() && Number.isFinite(price) ? { maxPriceMinor: Math.round(price * CENTS) } : {}) });
  };
  const choose = (card: ProviderCard): void => {
    setAdded(null);
    if (!flight.begin()) return;
    add.mutate({ source: "CATALOGED", title: card.name, price: { amountMinor: card.priceFrom?.amountMinor ?? 0, currency: card.priceFrom?.currency ?? currency }, productListingId: card.listingId }, { onSuccess: () => setAdded(card.name), onSettled: flight.end });
  };
  const total = discovery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <View style={{ gap: spacing[4] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], paddingRight: spacing[4] }}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("gifts.host.providers.category")} style={[styles.row, { flexWrap: "nowrap" }]}>
        {[undefined, ...CATEGORIES].map((code) => (
          <Pressable key={code ?? "all"} accessibilityRole="radio" aria-checked={category === code} accessibilityLabel={code ? t(`directory.category.${code}`) : t("gifts.host.providers.allCategories")} testID={`category-${code ?? "all"}`}
            onPress={() => { setCategory(code); setPage(1); }} style={[styles.choice, category === code ? styles.choiceSelected : null, { minHeight: MIN_TOUCH }]}>
            <Text style={[styles.body, category === code && { fontWeight: "700" }]}>{code ? t(`directory.category.${code}`) : t("gifts.host.providers.allCategories")}</Text>
          </Pressable>
        ))}
      </View>
      </ScrollView>
      <MoreOptions label={t("gifts.host.providers.moreFilters")} testID="more-provider-filters">
        <Field label={t("gifts.host.providers.city")} value={city} onChange={setCity} help={t("gifts.host.providers.cityHelp")} onSubmit={apply} testID="providers-city" />
        <Field label={t("gifts.host.providers.maxPrice")} value={maxPrice} onChange={setMaxPrice} keyboardType="decimal-pad" onSubmit={apply} testID="providers-max-price" />
        <ActionButton variant="secondary" label={t("gifts.host.providers.search")} onPress={apply} testID="providers-search" />
      </MoreOptions>
      <Text style={styles.muted}>{t("gifts.host.providers.disclaimer")}</Text>
      {added ? <Notice kind="success"><Text style={styles.body}>{t("gifts.host.catalog.added", { title: added })}</Text><ActionButton variant="secondary" label={t("gifts.host.add.seeList")} onPress={onSeeList} testID="see-list" /></Notice> : null}
      {unavailable ? <Notice kind="error">{t("gifts.host.catalog.unavailableBody")}</Notice> : <GiftErrorNotice error={add.error} />}
      {discovery.isPending ? <SkeletonList count={3} row={{ minHeight: 150, avatar: false, trailing: false }} label={t("host.common.loading")} /> : null}
      {discovery.isError ? <RetryNotice error={discovery.error} onRetry={() => { void discovery.refetch(); }} /> : null}
      {discovery.data && discovery.data.items.length === 0 ? <Hint illustration="emptySearch">{t("gifts.host.providers.none")}</Hint> : null}
      {discovery.data ? <Text style={styles.muted} accessibilityLiveRegion="polite">{t("gifts.host.providers.count", { count: total })}</Text> : null}
      {discovery.data?.items.length ? (
        <RowList>
          <Stagger>{discovery.data.items.map((card, index) => <ProviderOffer key={card.listingId} first={index === 0} card={card} celebrationId={celebrationId} adding={add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === card.listingId} onAdd={choose} />)}</Stagger>
        </RowList>
      ) : null}
      {pages > 1 ? (
        <View style={styles.row}>
          <ActionButton variant="secondary" label={t("directory.pagination.previous")} disabled={page <= 1} onPress={() => setPage(page - 1)} testID="providers-prev" />
          <Text style={styles.muted}>{t("gifts.host.providers.page", { page, pages })}</Text>
          <ActionButton variant="secondary" label={t("directory.pagination.next")} disabled={page >= pages} onPress={() => setPage(page + 1)} testID="providers-next" />
        </View>
      ) : null}
    </View>
  );
}
