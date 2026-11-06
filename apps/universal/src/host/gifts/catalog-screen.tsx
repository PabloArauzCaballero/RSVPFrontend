import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatMinor } from "@rsvp/i18n";
import { problemCode, useAddGift, useGiftList, useListingSearch, type ListingHit } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { alreadyListed } from "./money";
import { ActionButton, ErrorNotice, Field, Loading, Notice, styles } from "../ui";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";

/** C27 · Build the list from the partner catalog: search listings (GET /listings?q=), then add the chosen product as a CATALOGED gift. */
function CatalogBody({ celebrationId, currency }: { readonly celebrationId: string; readonly currency: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const search = useListingSearch(client, committed);
  const add = useAddGift(client, celebrationId);
  const list = useGiftList(client, celebrationId);
  const flight = useSingleFlightGate();
  const [added, setAdded] = useState<string | null>(null);
  const unavailable = add.error instanceof ApiError && problemCode(add.error) === "CATALOG_PRODUCT_UNAVAILABLE";

  const choose = (hit: ListingHit): void => {
    setAdded(null);
    if (!flight.begin()) return;
    add.mutate({ source: "CATALOGED", title: hit.title, price: { amountMinor: hit.priceFromMinor ?? 0, currency: hit.currency ?? currency }, productListingId: hit.id }, { onSuccess: () => setAdded(hit.title), onSettled: flight.end });
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("gifts.host.catalog.intro")}</Text>
      <Field label={t("gifts.host.catalog.search")} value={query} onChange={setQuery} placeholder={t("gifts.host.catalog.searchPlaceholder")} testID="catalog-query" />
      <ActionButton label={t("gifts.host.catalog.search")} onPress={() => setCommitted(query.trim())} testID="catalog-search" />
      {added ? <Notice kind="success">{t("gifts.host.catalog.added", { title: added })}</Notice> : null}
      {unavailable ? <Notice kind="error">{t("gifts.host.catalog.unavailableBody")}</Notice> : <ErrorNotice error={add.error} />}
      {search.isFetching && !search.data ? <Loading /> : null}
      {search.isError ? <RetryNotice error={search.error} onRetry={() => { void search.refetch(); }} /> : null}
      {search.data?.viaFallback ? <Notice>{t("gifts.host.catalog.fallbackNote")}</Notice> : null}
      {search.data && search.data.items.length === 0 ? <Notice>{t("gifts.host.catalog.none")}</Notice> : null}
      {search.data?.items.map((hit) => (
        <View key={hit.id} testID={`hit-${hit.id}`} style={[styles.card, { gap: spacing[1] }]}>
          <Text style={styles.subtitle}>{hit.title}</Text>
          {hit.priceFromMinor !== undefined ? <Text style={styles.body}>{t("gifts.host.catalog.priceFrom", { price: formatMinor(hit.priceFromMinor, hit.currency ?? currency, locale) })}</Text> : null}
          {alreadyListed(list.data?.items ?? [], hit.id) ? <Text style={styles.muted} testID={`listed-${hit.id}`}>{t("gifts.host.catalog.alreadyListed")}</Text> : null}
          <ActionButton label={add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === hit.id ? t("gifts.host.catalog.adding") : t("gifts.host.catalog.add")} busy={add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === hit.id} disabled={add.isPending || alreadyListed(list.data?.items ?? [], hit.id)} onPress={() => choose(hit)} testID={`add-${hit.id}`} />
        </View>
      ))}
    </View>
  );
}

export function CatalogScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.catalog.title")}>{({ celebration }) => <CatalogBody celebrationId={celebration.id} currency={celebration.currency} />}</CelebrationScreen>;
}
