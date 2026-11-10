import { useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { parseHostGiftPrice } from "@rsvp/forms";
import { formatMinor } from "@rsvp/i18n";
import { problemCode, useAddGift, useProviderDiscovery, type GiftItemStatus, type ProviderCard } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, styles } from "../ui";
import { GiftCategory } from "./controls";
import { GiftFailure, GiftField, PublicationLine } from "./parts";
import { GiftPartnerLink } from "./partner-link";

const CATEGORIES = ["VENUE", "CATERING", "PHOTOGRAPHY", "MUSIC", "DECORATION", "MAKEUP", "TRANSPORT", "INVITATIONS", "WEDDING_PLANNER", "ACCOMMODATION", "HONEYMOON"] as const;
const PAGE_SIZE = 6;

function ProviderOffer({ card, celebrationId, currency, adding, disabled, onAdd, agreed, onPrice, invalidPrice }: {
  readonly card: ProviderCard; readonly celebrationId: string; readonly currency: string; readonly adding: boolean; readonly disabled: boolean;
  readonly onAdd: (card: ProviderCard) => void; readonly agreed: string; readonly onPrice: (value: string) => void; readonly invalidPrice: boolean;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const fulfillment = card.fulfillment;
  return <View testID={`provider-${card.listingId}`} style={[styles.card, { gap: spacing[2] }]}>
    <Text accessibilityRole="header" style={styles.subtitle}>{card.name}</Text>
    <Text style={styles.label}>{t("gifts.host.providers.by", { name: card.providerName })}</Text>
    <Text style={styles.body}>{t(`directory.category.${card.category}`)} · {card.city}{card.department && card.department !== card.city ? `, ${card.department}` : ""}</Text>
    {card.priceFrom ? <Text style={styles.body}>{t("gifts.host.catalog.priceFrom", { price: formatMinor(card.priceFrom.amountMinor, card.priceFrom.currency, locale) })}</Text> : <GiftField label={t("hostGifts.agreedPrice", { currency })} value={agreed} onChange={onPrice} help={t("hostGifts.priceNeeded")} error={invalidPrice ? t("hostGifts.invalidMoney") : undefined} keyboardType="decimal-pad" testID={`provider-price-${card.listingId}`} />}
    {card.summary ? <Text style={styles.muted}>{card.summary}</Text> : null}
    {fulfillment ? <View testID={`fulfillment-${card.listingId}`}>
      <Text style={styles.muted}>{t("gifts.host.providers.leadTime", { days: fulfillment.leadTimeDays })}{fulfillment.coverageZones.length ? ` · ${t("gifts.host.providers.coverage", { zones: fulfillment.coverageZones.join(", ") })}` : ""}</Text>
      {fulfillment.transportCostMinor !== undefined && card.priceFrom ? <Text style={styles.muted}>{t("gifts.host.providers.transport", { price: formatMinor(fulfillment.transportCostMinor, card.priceFrom.currency, locale) })}</Text> : null}
    </View> : null}
    {card.address ? <Text style={styles.muted}>{t("gifts.host.providers.address", { address: [card.address.line, card.address.reference].filter(Boolean).join(" · ") })}</Text> : null}
    {card.hours?.weekly.length ? <Text style={styles.muted}>{t("gifts.host.providers.hours", { hours: card.hours.weekly.map((slot) => `${slot.opens}-${slot.closes}`).join(", ") })}{card.hours.note ? ` · ${card.hours.note}` : ""}</Text> : null}
    <Text style={styles.muted}>{t("gifts.host.providers.disclaimer")}</Text>
    <View style={styles.row}>
      <ActionButton label={adding ? t("gifts.host.catalog.adding") : t("gifts.host.catalog.add")} busy={adding} disabled={disabled || !card.verified} onPress={() => onAdd(card)} testID={`add-provider-${card.listingId}`} />
      {card.destinations.slice(0, 3).map((destination) => <GiftPartnerLink key={destination} listingId={card.listingId} destination={destination} celebrationId={celebrationId} label={destination === "PRODUCT_PAGE" || destination === "LANDING" ? t(`hostGifts.destination.${destination}`) : t(`partner.destination.${destination}`, { name: card.providerName })} />)}
    </View>
  </View>;
}

function ProvidersBody({ celebrationId, currency, onNavigate }: { readonly celebrationId: string; readonly currency: string; readonly onNavigate: (path: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [city, setCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [committed, setCommitted] = useState<{ city?: string; maxPriceMinor?: number }>({});
  const [page, setPage] = useState(1);
  const [added, setAdded] = useState<{ title: string; status: GiftItemStatus } | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState<Record<string, string>>({});
  const [invalidPrice, setInvalidPrice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const discovery = useProviderDiscovery(client, { ...(category ? { category } : {}), ...committed, page, pageSize: PAGE_SIZE }, locale);
  const add = useAddGift(client, celebrationId);
  const unavailable = add.error instanceof ApiError && problemCode(add.error) === "CATALOG_PRODUCT_UNAVAILABLE";
  const apply = (): void => {
    const minor = maxPrice.trim() ? parseHostGiftPrice(maxPrice) : null;
    if (maxPrice.trim() && minor === null) { setFilterError(t("hostGifts.invalidMoney")); return; }
    setFilterError(null); setPage(1);
    setCommitted({ ...(city.trim() ? { city: city.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, "-") } : {}), ...(minor !== null ? { maxPriceMinor: minor } : {}) });
  };
  const choose = (card: ProviderCard): void => {
    if (inFlight.current) return;
    const minor = card.priceFrom?.amountMinor ?? parseHostGiftPrice(agreed[card.listingId] ?? "");
    if (minor === null || !Number.isSafeInteger(minor) || minor < 0) { setInvalidPrice(card.listingId); return; }
    inFlight.current = true; setAdded(null); setInvalidPrice(null);
    add.mutate({ source: "CATALOGED", title: card.name, price: { amountMinor: minor, currency: card.priceFrom?.currency ?? currency }, productListingId: card.listingId }, {
      onSuccess: (item) => setAdded({ title: card.name, status: item.status }), onSettled: () => { inFlight.current = false; }
    });
  };
  const total = discovery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownPage = discovery.data?.page ?? page;
  return <View style={{ gap: spacing[4] }}>
    <Text style={styles.body}>{t("gifts.host.providers.intro")}</Text>
    <GiftCategory label={t("gifts.host.providers.category")} value={category ?? "all"} onChange={(value) => { setCategory(value === "all" ? undefined : value); setPage(1); }} prefix="category"
      choices={[{ value: "all", label: t("gifts.host.providers.allCategories") }, ...CATEGORIES.map((value) => ({ value, label: t(`directory.category.${value}`) }))]} />
    <GiftField label={t("gifts.host.providers.city")} value={city} onChange={setCity} help={t("gifts.host.providers.cityHelp")} testID="providers-city" />
    <GiftField label={t("gifts.host.providers.maxPrice")} value={maxPrice} onChange={setMaxPrice} keyboardType="decimal-pad" error={filterError ?? undefined} testID="providers-max-price" />
    <ActionButton label={t("gifts.host.providers.search")} onPress={apply} testID="providers-search" busy={discovery.isFetching} />
    {added ? <Notice kind="success"><Text style={styles.body}>{t("gifts.host.catalog.added", { title: added.title })}</Text><PublicationLine status={added.status} /></Notice> : null}
    {unavailable ? <Notice kind="error">{t("gifts.host.catalog.unavailableBody")}</Notice> : <GiftFailure error={add.error} />}
    <ActionButton variant="secondary" label={t("hostGifts.reviewList")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.gifts, celebrationId))} />
    {discovery.isPending ? <Loading /> : null}
    {discovery.isFetching && discovery.data ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{t("hostGifts.refreshing")}</Text> : null}
    {discovery.isError ? <GiftFailure error={discovery.error} onRetry={() => { void discovery.refetch(); }} /> : null}
    {discovery.data && discovery.data.items.length === 0 ? <Notice>{t("gifts.host.providers.none")}</Notice> : null}
    {discovery.data ? <Text style={styles.muted} accessibilityLiveRegion="polite">{t("gifts.host.providers.count", { count: total })}</Text> : null}
    {discovery.data?.items.map((card) => <ProviderOffer key={card.listingId} card={card} celebrationId={celebrationId} currency={currency} adding={add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === card.listingId}
      disabled={add.isPending || discovery.isError || discovery.isFetching} onAdd={choose} agreed={agreed[card.listingId] ?? ""} onPrice={(value) => setAgreed((current) => ({ ...current, [card.listingId]: value }))} invalidPrice={invalidPrice === card.listingId} />)}
    {pages > 1 ? <View style={styles.row}>
      <ActionButton variant="secondary" label={t("directory.pagination.previous")} disabled={page <= 1 || discovery.isFetching} onPress={() => setPage((current) => current - 1)} testID="providers-prev" />
      <Text style={styles.muted}>{t("gifts.host.providers.page", { page: shownPage, pages })}</Text>
      <ActionButton variant="secondary" label={t("directory.pagination.next")} disabled={page >= pages || discovery.isFetching} onPress={() => setPage((current) => current + 1)} testID="providers-next" />
    </View> : null}
  </View>;
}

export function ProvidersScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.providers.title")}>{({ celebration }) => <ProvidersBody key={celebration.id} celebrationId={celebration.id} currency={celebration.currency} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
