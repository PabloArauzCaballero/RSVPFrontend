import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { partnerSuggestionsOf, problemCode, useAddGift, type Celebration, type PartnerSuggestion } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { useScreenHeader } from "../gate";
import { GiftErrorNotice } from "./gift-errors";
import { ActionButton, Field, Notice, OverflowMenu, useStyles } from "../ui";
import { useSingleFlightGate } from "../../platform/single-flight";
import { isHttpUrl, parseMinor, TITLE_MAX } from "./money";
import { Row, RowList } from "./offer-row";

/**
 * C28 · «De una tienda», with the partners-first rule made visible. With partner priority on, the first attempt answers 409
 * PARTNER_CATALOG_FIRST with suggestions: the host sees them and picks a partner product or confirms «Agregar de todos modos»
 * (resent with partnerSuggestionsAcknowledged). The two settings behind the rule live in Control modes (one place per setting);
 * here the panel says what they currently do and links there.
 */
export function StorePanel({ celebration, onSeeList, onChangeRule }: { readonly celebration: Celebration; readonly onSeeList: () => void; readonly onChangeRule: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const add = useAddGift(client, celebration.id);
  const flight = useSingleFlightGate();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<readonly PartnerSuggestion[]>([]);
  const [done, setDone] = useState<string | null>(null);

  const send = (acknowledged: boolean): void => {
    setDone(null);
    const minor = parseMinor(price);
    if (!title.trim() || !url.trim() || !price.trim()) return setError(t("gifts.host.store.required"));
    if (title.trim().length > TITLE_MAX) return setError(t("gifts.host.store.titleTooLong", { max: TITLE_MAX }));
    if (!isHttpUrl(url)) return setError(t("gifts.host.store.invalidUrl"));
    if (minor === null) return setError(t("gifts.host.store.invalidMoney"));
    setError(null);
    if (!flight.begin()) return;
    add.mutate({ source: "EXTERNAL", title: title.trim(), price: { amountMinor: minor, currency: celebration.currency }, url: url.trim(), ...(acknowledged ? { partnerSuggestionsAcknowledged: true } : {}) }, {
      onSuccess: (item) => { setSuggestions([]); setTitle(""); setUrl(""); setPrice(""); setDone(item.status === "PROPOSED" ? t("gifts.host.store.proposed") : t("gifts.host.store.added")); },
      onSettled: flight.end,
      onError: (failure) => { if (failure instanceof ApiError && failure.status === 409 && problemCode(failure) === "PARTNER_CATALOG_FIRST") setSuggestions(partnerSuggestionsOf(failure)); }
    });
  };
  const partnerFirst = add.error instanceof ApiError && add.error.status === 409 && problemCode(add.error) === "PARTNER_CATALOG_FIRST";
  const priority = celebration.settings.partnerPriorityEnabled;
  const mode = celebration.settings.externalGiftMode;

  // «Agregar regalo» is the screen's one action (top right; a fixed bar on a phone); the rule of partners-first is changed from «⋯».
  useScreenHeader({
    actions: <ActionButton label={partnerFirst ? t("gifts.host.store.submitAnyway") : t("gifts.host.store.submit")} variant={partnerFirst ? "secondary" : "primary"} busy={add.isPending} disabled={add.isPending} onPress={() => send(partnerFirst)} testID="external-submit" />,
    menu: <OverflowMenu items={[{ key: "rule", label: t("gifts.host.store.ruleChange"), onPress: onChangeRule, testID: "go-modes" }]} />
  });
  return (
    <View style={{ gap: spacing[4] }}>
      <Field label={t("gifts.host.store.name")} value={title} onChange={setTitle} testID="external-title" />
      <Field label={t("gifts.host.store.url")} value={url} onChange={setUrl} keyboardType="url" testID="external-url" />
      <Field label={t("gifts.host.store.price", { currency: celebration.currency })} value={price} onChange={setPrice} help={t("gifts.host.store.priceHelp")} keyboardType="decimal-pad" testID="external-price" />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {done ? <Notice kind="success"><Text style={styles.body}>{done}</Text><ActionButton icon="plus" variant="secondary" label={t("gifts.host.add.seeList")} onPress={onSeeList} testID="see-list" /></Notice> : null}
      {partnerFirst ? (
        <Notice kind="info">
          <Text accessibilityRole="header" aria-level={3} style={styles.subtitle}>{t("gifts.host.store.suggestionsTitle")}</Text>
          <Text style={styles.body}>{t("gifts.host.store.suggestionsBody")}</Text>
          <RowList>
            {suggestions.map((suggestion, index) => (
              <Row key={suggestion.productListingId} first={index === 0} testID={`suggestion-${suggestion.productListingId}`}>
                <Text style={styles.body}>{suggestion.title}</Text>
                <View style={styles.row}>
                  <ActionButton icon="check" variant="secondary" label={t("gifts.host.store.useSuggestion")} onPress={() => { if (flight.begin()) add.mutate({ source: "CATALOGED", title: suggestion.title, price: { amountMinor: parseMinor(price) ?? 0, currency: celebration.currency }, productListingId: suggestion.productListingId }, { onSuccess: () => { setSuggestions([]); setDone(t("gifts.host.catalog.added", { title: suggestion.title })); }, onSettled: flight.end }); }} />
                </View>
              </Row>
            ))}
          </RowList>
        </Notice>
      ) : <GiftErrorNotice error={add.error} />}
      <Text style={styles.muted}>{priority ? t("gifts.host.store.ruleOn") : t("gifts.host.store.ruleOff")} {t(`gifts.host.store.mode${mode}`)}</Text>
    </View>
  );
}
