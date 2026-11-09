import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatMinor } from "@rsvp/i18n";
import { problemCode, useAddGift, useGiftList, useListingSearch, type ListingHit } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { alreadyListed } from "./money";
import { Hint, Row, RowList } from "./offer-row";
import { GiftErrorNotice } from "./gift-errors";
import { SkeletonList, Stagger } from "@rsvp/ui";
import { ActionButton, Field, Notice, useStyles } from "../ui";
import { RetryNotice } from "../guests/parts";
import { useSingleFlightGate } from "../../platform/single-flight";

/** C27 · «Del catálogo»: search listings (GET /listings?q=), then add the chosen product as a CATALOGED gift. */
export function CatalogPanel({ celebrationId, currency, onSeeList }: { readonly celebrationId: string; readonly currency: string; readonly onSeeList: () => void }): ReactNode {
  const styles = useStyles();
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
  const run = (): void => { setCommitted(query.trim()); };

  const choose = (hit: ListingHit): void => {
    setAdded(null);
    if (!flight.begin()) return;
    add.mutate({ source: "CATALOGED", title: hit.title, price: { amountMinor: hit.priceFromMinor ?? 0, currency: hit.currency ?? currency }, productListingId: hit.id }, { onSuccess: () => setAdded(hit.title), onSettled: flight.end });
  };
  const items = search.data?.items ?? [];
  return (
    <View style={{ gap: spacing[4] }}>
      <Field label={t("gifts.host.catalog.searchLabel")} value={query} onChange={setQuery} onSubmit={run} placeholder={t("gifts.host.catalog.searchPlaceholder")} testID="catalog-query" />
      <ActionButton icon="search" label={t("gifts.host.catalog.search")} onPress={run} testID="catalog-search" />
      {added ? <Notice kind="success"><Text style={styles.body}>{t("gifts.host.catalog.added", { title: added })}</Text><ActionButton icon="plus" variant="secondary" label={t("gifts.host.add.seeList")} onPress={onSeeList} testID="see-list" /></Notice> : null}
      {unavailable ? <Notice kind="error">{t("gifts.host.catalog.unavailableBody")}</Notice> : <GiftErrorNotice error={add.error} />}
      {!search.data && !search.isFetching && !search.isError ? <Hint>{t("gifts.host.catalog.prompt")}</Hint> : null}
      {search.isFetching && !search.data ? <SkeletonList count={3} row={{ minHeight: 120, avatar: false, trailing: false }} label={t("host.common.loading")} /> : null}
      {search.isError ? <RetryNotice error={search.error} onRetry={() => { void search.refetch(); }} /> : null}
      {search.data?.viaFallback ? <Notice>{t("gifts.host.catalog.fallbackNote")}</Notice> : null}
      {search.data && items.length === 0 ? <Hint>{t("gifts.host.catalog.none")}</Hint> : null}
      {items.length ? (
        <RowList>
          <Stagger>{items.map((hit, index) => {
            const listed = alreadyListed(list.data?.items ?? [], hit.id);
            const adding = add.isPending && add.variables?.source === "CATALOGED" && add.variables.productListingId === hit.id;
            return (
              <Row key={hit.id} first={index === 0} testID={`hit-${hit.id}`}>
                <Text style={styles.itemTitle}>{hit.title}</Text>
                {hit.priceFromMinor !== undefined ? <Text style={styles.body}>{t("gifts.host.catalog.priceFrom", { price: formatMinor(hit.priceFromMinor, hit.currency ?? currency, locale) })}</Text> : null}
                {listed ? <Text style={styles.muted} testID={`listed-${hit.id}`}>{t("gifts.host.catalog.alreadyListed")}</Text> : null}
                <View style={styles.row}><ActionButton variant="secondary" label={adding ? t("gifts.host.catalog.adding") : t("gifts.host.catalog.add")} busy={adding} disabled={add.isPending || listed} onPress={() => choose(hit)} testID={`add-${hit.id}`} /></View>
              </Row>
            );
          })}</Stagger>
        </RowList>
      ) : null}
    </View>
  );
}
