import { useState, type ReactNode } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatMinor } from "@rsvp/i18n";
import { problemCode, useAddGift, useProviderDiscovery, type ProviderCard } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { partnerRedirectUrl } from "../../platform/partner-link";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { ActionButton, ErrorNotice, Field, Loading, Notice, styles } from "../ui";
import { RetryNotice } from "../guests/parts";

const CATEGORIES = ["VENUE", "CATERING", "PHOTOGRAPHY", "MUSIC", "DECORATION", "MAKEUP", "TRANSPORT", "INVITATIONS", "WEDDING_PLANNER", "ACCOMMODATION", "HONEYMOON"] as const;
const PAGE_SIZE = 6;
const CENTS = 100;

/** REQ-F23-05 · Extended card: the offer, the business behind it, how it is delivered, where it is and when it opens. */
function ProviderOffer({ card, celebrationId, adding, onAdd }: { readonly card: ProviderCard; readonly celebrationId: string; readonly adding: boolean; readonly onAdd: (card: ProviderCard) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const fulfillment = card.fulfillment;
  const open = (destination: string): void => { void Linking.openURL(partnerRedirectUrl(card.listingId, { destination, surface: "APP", celebrationId })); };
  return (
    <View testID={`provider-${card.listingId}`} style={[styles.card, { gap: spacing[1] }]}>
      <Text accessibilityRole="header" style={styles.subtitle}>{card.name}</Text>
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
      {card.address ? <Text style={styles.muted}>{t("gifts.host.providers.address", { address: [card.address.line, card.address.reference].filter(Boolean).join(" · ") })}</Text> : null}
      {card.hours?.weekly.length ? <Text style={styles.muted}>{t("gifts.host.providers.hours", { hours: card.hours.weekly.map((slot) => `${slot.opens}-${slot.closes}`).join(", ") })}{card.hours.note ? ` · ${card.hours.note}` : ""}</Text> : null}
      <Text style={styles.muted}>{t("gifts.host.providers.disclaimer")}</Text>
      <View style={styles.row}>
        <ActionButton label={adding ? t("gifts.host.catalog.adding") : t("gifts.host.catalog.add")} busy={adding} disabled={adding} onPress={() => onAdd(card)} testID={`add-provider-${card.listingId}`} />
        {card.destinations.slice(0, 3).map((destination) => (
          <ActionButton key={destination} variant="secondary" label={t(`partner.destination.${destination}`, { name: card.providerName })} onPress={() => open(destination)} testID={`dest-${card.listingId}-${destination}`} />
        ))}
      </View>
    </View>
  );
}

function ProvidersBody({ celebrationId, currency }: { readonly celebrationId: string; readonly currency: string }): ReactNode {
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
  const unavailable = add.error instanceof ApiError && problemCode(add.error) === "CATALOG_PRODUCT_UNAVAILABLE";
  const apply = (): void => {
    const price = Number(maxPrice.replace(",", "."));
    setPage(1);
    setCommitted({ ...(city.trim() ? { city: city.trim().toLowerCase().replace(/\s+/g, "-") } : {}), ...(maxPrice.trim() && Number.isFinite(price) ? { maxPriceMinor: Math.round(price * CENTS) } : {}) });
  };
  const choose = (card: ProviderCard): void => {
    setAdded(null);
    add.mutate({ source: "CATALOGED", title: card.name, price: { amountMinor: card.priceFrom?.amountMinor ?? 0, currency: card.priceFrom?.currency ?? currency }, productListingId: card.listingId }, { onSuccess: () => setAdded(card.name) });
  };
  const total = discovery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("gifts.host.providers.intro")}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("gifts.host.providers.category")} style={[styles.row, { flexWrap: "wrap" }]}>
        {[undefined, ...CATEGORIES].map((code) => (
          <Pressable key={code ?? "all"} accessibilityRole="radio" aria-checked={category === code} accessibilityLabel={code ? t(`directory.category.${code}`) : t("gifts.host.providers.allCategories")} testID={`category-${code ?? "all"}`}
            onPress={() => { setCategory(code); setPage(1); }} style={[styles.option, category === code ? styles.optionSelected : null, { minHeight: 44, justifyContent: "center" }]}>
            <Text style={styles.body}>{code ? t(`directory.category.${code}`) : t("gifts.host.providers.allCategories")}</Text>
          </Pressable>
        ))}
      </View>
      <Field label={t("gifts.host.providers.city")} value={city} onChange={setCity} help={t("gifts.host.providers.cityHelp")} testID="providers-city" />
      <Field label={t("gifts.host.providers.maxPrice")} value={maxPrice} onChange={setMaxPrice} keyboardType="decimal-pad" testID="providers-max-price" />
      <ActionButton label={t("gifts.host.providers.search")} onPress={apply} testID="providers-search" />
      {added ? <Notice kind="success">{t("gifts.host.catalog.added", { title: added })}</Notice> : null}
      {unavailable ? <Notice kind="error">{t("gifts.host.catalog.unavailableBody")}</Notice> : <ErrorNotice error={add.error} />}
      {discovery.isPending ? <Loading /> : null}
      {discovery.isError ? <RetryNotice error={discovery.error} onRetry={() => { void discovery.refetch(); }} /> : null}
      {discovery.data && discovery.data.items.length === 0 ? <Notice>{t("gifts.host.providers.none")}</Notice> : null}
      {discovery.data ? <Text style={styles.muted} accessibilityLiveRegion="polite">{t("gifts.host.providers.count", { count: total })}</Text> : null}
      {discovery.data?.items.map((card) => <ProviderOffer key={card.listingId} card={card} celebrationId={celebrationId} adding={add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === card.listingId} onAdd={choose} />)}
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

export function ProvidersScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.providers.title")}>{({ celebration }) => <ProvidersBody celebrationId={celebration.id} currency={celebration.currency} />}</CelebrationScreen>;
}
