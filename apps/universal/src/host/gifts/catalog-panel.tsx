import { useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatMinor } from "@rsvp/i18n";
import { problemCode, useAddGift, useGiftList, useListingSearch, useProductCategories, type ListingHit } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { alreadyListed } from "./money";
import { Hint, Row, RowList } from "./offer-row";
import { GiftErrorNotice } from "./gift-errors";
import { SkeletonList, Stagger } from "@rsvp/ui";
import { ActionButton, Field, FilterSelect, Notice, useStyles } from "../ui";
import { useSingleFlightGate } from "../../platform/single-flight";

function ProductPhoto({ url, label }: { readonly url: string; readonly label: string }): ReactNode {
  const [failed, setFailed] = useState(false);
  return failed ? null : (
    <Image source={{ uri: url }} accessible accessibilityRole="image" accessibilityLabel={label}
      onError={() => setFailed(true)} resizeMode="cover"
      style={{ width: spacing[16], height: spacing[16], borderRadius: radius.md }} />
  );
}

const ALL = "ALL";

/**
 * C27 · «Del catálogo»: search the products of verified providers (GET /listings?q=&type=PRODUCT), narrow them by a
 * product category read from the catalog (M23), then add the chosen product as a CATALOGED gift. `GET /listings` is the
 * only source (A27): a failure shows the error with «Reintentar», and no result shows an honest empty state.
 */
export function CatalogPanel({ celebrationId, currency, onSeeList }: { readonly celebrationId: string; readonly currency: string; readonly onSeeList: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const [category, setCategory] = useState(ALL);
  const search = useListingSearch(client, committed, locale);
  const categories = useProductCategories(client, locale);
  const add = useAddGift(client, celebrationId);
  const list = useGiftList(client, celebrationId);
  const flight = useSingleFlightGate();
  const [added, setAdded] = useState<string | null>(null);
  const unavailable = add.error instanceof ApiError && problemCode(add.error) === "CATALOG_PRODUCT_UNAVAILABLE";
  const run = (): void => { setCommitted(query.trim()); };

  const choose = (hit: ListingHit): void => {
    setAdded(null);
    if (!flight.begin()) return;
    add.mutate({ source: "CATALOGED", title: hit.title, price: { amountMinor: hit.priceFromMinor ?? 0, currency: hit.currency ?? currency }, productListingId: hit.id }, { onSuccess: () => setAdded(hit.title), onSettled: flight.end });
  };
  const items = (search.data?.items ?? []).filter((hit) => category === ALL || hit.category === category);
  const narrowed = committed !== "" || category !== ALL;
  return (
    <View style={{ gap: spacing[4] }}>
      <Field label={t("gifts.host.catalog.searchLabel")} value={query} onChange={setQuery} onSubmit={run} placeholder={t("gifts.host.catalog.searchPlaceholder")} testID="catalog-query" />
      <ActionButton icon="search" label={t("gifts.host.catalog.search")} onPress={run} testID="catalog-search" />
      {categories.data?.items.length ? (
        <FilterSelect label={t("gifts.host.catalog.category")} value={category} testID="catalog-category"
          options={[{ value: ALL, label: t("gifts.host.catalog.allCategories") }, ...categories.data.items.map((item) => ({ value: item.code, label: item.name }))]}
          onChange={setCategory} />
      ) : null}
      {categories.isError ? (
        // One message and one retry: the generic notice would repeat both.
        <View testID="catalog-categories-error">
          <Notice kind="error"><Text style={styles.body}>{t("gifts.host.catalog.categoriesError")}</Text><ActionButton icon="refresh" variant="secondary" label={t("gifts.host.errors.retry")} onPress={() => { void categories.refetch(); }} testID="catalog-categories-retry" /></Notice>
        </View>
      ) : null}
      <Text style={styles.muted}>{t("gifts.host.catalog.disclaimer")}</Text>
      {added ? <Notice kind="success"><Text style={styles.body}>{t("gifts.host.catalog.added", { title: added })}</Text><ActionButton icon="plus" variant="secondary" label={t("gifts.host.add.seeList")} onPress={onSeeList} testID="see-list" /></Notice> : null}
      {unavailable ? <Notice kind="error">{t("gifts.host.catalog.unavailableBody")}</Notice> : <GiftErrorNotice error={add.error} />}
      {!search.data && !search.isFetching && !search.isError ? <Hint>{t("gifts.host.catalog.prompt")}</Hint> : null}
      {search.isFetching && !search.data ? <SkeletonList count={3} row={{ minHeight: 120, avatar: false, trailing: false }} label={t("host.common.loading")} /> : null}
      {search.isError ? (
        // One message and one retry: the generic notice would repeat both.
        <View testID="catalog-error">
          <Notice kind="error"><Text style={styles.body}>{t("gifts.host.catalog.error")}</Text><ActionButton icon="refresh" variant="secondary" label={t("gifts.host.errors.retry")} onPress={() => { void search.refetch(); }} testID="catalog-retry" /></Notice>
        </View>
      ) : null}
      {search.data && !search.isError && items.length === 0 ? <View testID="catalog-empty"><Hint>{t(narrowed ? "gifts.host.catalog.none" : "gifts.host.catalog.empty")}</Hint></View> : null}
      {items.length && !search.isError ? (
        <RowList>
          <Stagger>{items.map((hit, index) => {
            const listed = alreadyListed(list.data?.items ?? [], hit.id);
            const adding = add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === hit.id;
            return (
              <Row key={hit.id} first={index === 0} testID={`hit-${hit.id}`}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[3] }}>
                  {hit.imageUrl ? <ProductPhoto key={hit.imageUrl} url={hit.imageUrl} label={t("gifts.host.catalog.photo", { title: hit.title })} /> : null}
                  <View style={{ flex: 1, gap: spacing[1] }}>
                    <Text style={styles.itemTitle}>{hit.title}</Text>
                    {hit.priceFromMinor !== undefined ? <Text style={styles.body}>{t("gifts.host.catalog.priceFrom", { price: formatMinor(hit.priceFromMinor, hit.currency ?? currency, locale) })}</Text> : null}
                    {listed ? <Text style={styles.muted} testID={`listed-${hit.id}`}>{t("gifts.host.catalog.alreadyListed")}</Text> : null}
                  </View>
                </View>
                <View style={styles.row}><ActionButton variant="secondary" label={adding ? t("gifts.host.catalog.adding") : t("gifts.host.catalog.add")} busy={adding} disabled={add.isPending || listed} onPress={() => choose(hit)} testID={`add-${hit.id}`} /></View>
              </Row>
            );
          })}</Stagger>
        </RowList>
      ) : null}
    </View>
  );
}
