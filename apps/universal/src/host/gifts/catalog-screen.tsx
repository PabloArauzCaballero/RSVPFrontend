import { useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { hostGiftSearchSchema, parseHostGiftPrice } from "@rsvp/forms";
import { formatMinor } from "@rsvp/i18n";
import { problemCode, useAddGift, useHostGiftCatalog, type GiftItemStatus, type ListingHit } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, styles } from "../ui";
import { GiftCategory } from "./controls";
import { GiftFailure, GiftField, PublicationLine } from "./parts";

interface Props extends ScreenProps { readonly initialQuery?: string }

function CatalogBody({ celebrationId, currency, initialQuery = "", onNavigate }: Props & { readonly celebrationId: string; readonly currency: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const initial = hostGiftSearchSchema.safeParse(initialQuery);
  const [query, setQuery] = useState(initial.success ? initial.data : "");
  const [committed, setCommitted] = useState(query);
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [ceiling, setCeiling] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ query?: string; price?: string; agreed?: string }>({});
  const [agreed, setAgreed] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<{ title: string; status: GiftItemStatus } | null>(null);
  const inFlight = useRef(false);
  const search = useHostGiftCatalog(client, committed, locale);
  const add = useAddGift(client, celebrationId);
  const unavailable = add.error instanceof ApiError && problemCode(add.error) === "CATALOG_PRODUCT_UNAVAILABLE";
  const categories = [...new Set(search.data?.items.flatMap((hit) => hit.category ? [hit.category] : []) ?? [])];
  const items = search.data?.items.filter((hit) => (category === "all" || hit.category === category) && (ceiling === null || (hit.currency ?? currency) === currency && hit.priceFromMinor !== undefined && hit.priceFromMinor <= ceiling)) ?? [];

  const apply = (): void => {
    const parsed = hostGiftSearchSchema.safeParse(query);
    const minor = maxPrice.trim() ? parseHostGiftPrice(maxPrice) : null;
    if (!parsed.success || maxPrice.trim() && minor === null) {
      setErrors({ ...(!parsed.success ? { query: t("hostGifts.invalidQuery") } : {}), ...(maxPrice.trim() && minor === null ? { price: t("hostGifts.invalidMoney") } : {}) }); return;
    }
    setErrors({}); setCeiling(minor); setAdded(null);
    if (committed === parsed.data) { void search.refetch(); } else { setCommitted(parsed.data); setCategory("all"); }
  };

  const choose = (hit: ListingHit): void => {
    if (inFlight.current) return;
    const amountMinor = hit.priceFromMinor ?? parseHostGiftPrice(agreed[hit.id] ?? "");
    if (amountMinor === null || !Number.isSafeInteger(amountMinor) || amountMinor < 0) { setErrors({ agreed: hit.id }); return; }
    inFlight.current = true; setAdded(null); setErrors({});
    add.mutate({ source: "CATALOGED", title: hit.title, price: { amountMinor, currency: hit.currency ?? currency }, productListingId: hit.id }, {
      onSuccess: (item) => setAdded({ title: hit.title, status: item.status }),
      onSettled: () => { inFlight.current = false; }
    });
  };

  return <View style={{ gap: spacing[4] }}>
    <Text style={styles.body}>{t("gifts.host.catalog.intro")}</Text>
    <GiftField label={t("gifts.host.catalog.search")} value={query} onChange={setQuery} error={errors.query} placeholder={t("gifts.host.catalog.searchPlaceholder")} testID="catalog-query" />
    <GiftCategory label={t("hostGifts.category")} value={category} onChange={setCategory} prefix="catalog-category" choices={[
      { value: "all", label: t("hostGifts.allCategories") }, ...categories.map((code) => ({ value: code, label: t(`directory.category.${code}`) === `directory.category.${code}` ? t("hostGifts.otherCategory") : t(`directory.category.${code}`) }))
    ]} />
    <GiftField label={t("hostGifts.maxPrice")} value={maxPrice} onChange={setMaxPrice} error={errors.price} keyboardType="decimal-pad" help={t("hostGifts.priceCurrency", { currency })} testID="catalog-max-price" />
    <View style={styles.row}>
      <ActionButton label={t("gifts.host.catalog.search")} onPress={apply} busy={search.isFetching} testID="catalog-search" />
      <ActionButton variant="secondary" label={t("hostGifts.reset")} onPress={() => { setCategory("all"); setMaxPrice(""); setCeiling(null); setErrors({}); }} />
    </View>
    <Text style={styles.muted}>{t("hostGifts.resultWindow")}</Text>
    {added ? <Notice kind="success"><Text style={styles.body}>{t("gifts.host.catalog.added", { title: added.title })}</Text><PublicationLine status={added.status} /></Notice> : null}
    {unavailable ? <Notice kind="error">{t("gifts.host.catalog.unavailableBody")}</Notice> : <GiftFailure error={add.error} />}
    <ActionButton variant="secondary" label={t("hostGifts.reviewList")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.gifts, celebrationId))} />
    {search.isPending ? <Loading /> : null}
    {search.isError ? <GiftFailure error={search.error} onRetry={() => { void search.refetch(); }} /> : null}
    {search.data?.viaFallback ? <Notice>{t("gifts.host.catalog.fallbackNote")}</Notice> : null}
    {search.data ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{t("hostGifts.count", { count: items.length })}</Text> : null}
    {search.data && !items.length ? <Notice>{t("gifts.host.catalog.none")}</Notice> : null}
    {items.map((hit) => <View key={hit.id} testID={`hit-${hit.id}`} style={[styles.card, { gap: spacing[2] }]}>
      <Text accessibilityRole="header" style={styles.subtitle}>{hit.title}</Text>
      {hit.priceFromMinor !== undefined ? <Text style={styles.body}>{t("gifts.host.catalog.priceFrom", { price: formatMinor(hit.priceFromMinor, hit.currency ?? currency, locale) })}</Text> : <GiftField label={t("hostGifts.agreedPrice", { currency: hit.currency ?? currency })} help={t("hostGifts.priceNeeded")} value={agreed[hit.id] ?? ""} onChange={(value) => setAgreed((current) => ({ ...current, [hit.id]: value }))} keyboardType="decimal-pad" error={errors.agreed === hit.id ? t("hostGifts.invalidMoney") : undefined} testID={`catalog-price-${hit.id}`} />}
      <ActionButton label={add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === hit.id ? t("gifts.host.catalog.adding") : t("gifts.host.catalog.add")}
        busy={add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === hit.id} disabled={add.isPending || hit.type === "SERVICE" || hit.published === false || hit.providerStatus !== undefined && hit.providerStatus !== "VERIFIED"}
        onPress={() => choose(hit)} testID={`add-${hit.id}`} />
    </View>)}
  </View>;
}

export function CatalogScreen(props: Props): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.catalog.title")}>{({ celebration }) => <CatalogBody key={celebration.id} {...props} celebrationId={celebration.id} currency={celebration.currency} />}</CelebrationScreen>;
}