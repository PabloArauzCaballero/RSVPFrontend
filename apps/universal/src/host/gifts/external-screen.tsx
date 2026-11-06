import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { partnerSuggestionsOf, problemCode, useAddGift, useUpdateSettings, type ApprovalMode, type Celebration, type PartnerSuggestion } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Notice, Section, styles } from "../ui";
import { useSingleFlightGate } from "../../platform/single-flight";
import { isHttpUrl, parseMinor, TITLE_MAX } from "./money";

/**
 * C28 · External gift with deliberate friction. With partner priority on, the first attempt answers 409 PARTNER_CATALOG_FIRST with
 * suggestions: the host sees them and must choose a partner product or confirm "add anyway" (resent with partnerSuggestionsAcknowledged).
 * Also the switch of the external mode and of partnerPriority (written to the celebration settings, If-Match through useUpdateSettings).
 */
function ExternalBody({ celebration, refetch }: { readonly celebration: Celebration; readonly refetch: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const settings = useUpdateSettings(client, celebration.id);
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
    if (!title.trim() || !url.trim() || !price.trim()) return setError(t("gifts.host.external.required"));
    if (title.trim().length > TITLE_MAX) return setError(t("gifts.host.external.titleTooLong", { max: TITLE_MAX }));
    if (!isHttpUrl(url)) return setError(t("gifts.host.external.invalidUrl"));
    if (minor === null) return setError(t("gifts.host.external.invalidMoney"));
    setError(null);
    if (!flight.begin()) return;
    add.mutate({ source: "EXTERNAL", title: title.trim(), price: { amountMinor: minor, currency: celebration.currency }, url: url.trim(), ...(acknowledged ? { partnerSuggestionsAcknowledged: true } : {}) }, {
      onSuccess: (item) => { setSuggestions([]); setTitle(""); setUrl(""); setPrice(""); setDone(item.status === "PROPOSED" ? t("gifts.host.external.proposed") : t("gifts.host.external.added")); },
      onSettled: flight.end,
      onError: (failure) => { if (failure instanceof ApiError && failure.status === 409 && problemCode(failure) === "PARTNER_CATALOG_FIRST") setSuggestions(partnerSuggestionsOf(failure)); }
    });
  };
  const partnerFirst = add.error instanceof ApiError && add.error.status === 409 && problemCode(add.error) === "PARTNER_CATALOG_FIRST";
  const mode = celebration.settings.externalGiftMode;
  const changeMode = (value: ApprovalMode): void => { if (value !== mode) settings.mutate({ target: celebration, patch: { externalGiftMode: value } }, { onSuccess: refetch }); };

  return (
    <View style={{ gap: spacing[4] }}>
      <Section title={t("gifts.host.external.modeLabel")}>
        <ChoiceGroup<ApprovalMode> label={t("gifts.host.external.modeLabel")} value={mode} onChange={changeMode} choices={[{ value: "AUTO_ACCEPT", label: t("gifts.host.external.modeAuto") }, { value: "RESTRICTED", label: t("gifts.host.external.modeRestricted") }]} />
        <ChoiceGroup<"on" | "off"> label={t("gifts.host.external.priorityLabel")} value={celebration.settings.partnerPriorityEnabled ? "on" : "off"} onChange={(value) => settings.mutate({ target: celebration, patch: { partnerPriorityEnabled: value === "on" } }, { onSuccess: refetch })}
          choices={[{ value: "on", label: t("gifts.host.external.priorityLabel"), description: t("gifts.host.external.priorityHelp") }, { value: "off", label: t("host.common.remove") }]} />
        <ErrorNotice error={settings.error} onReload={refetch} />
        {settings.isSuccess ? <Notice kind="success">{t("gifts.host.external.modeSaved")}</Notice> : null}
      </Section>
      <Section title={t("gifts.host.external.title")}>
        <Text style={styles.body}>{t("gifts.host.external.intro")}</Text>
        <Field label={t("gifts.host.external.name")} value={title} onChange={setTitle} testID="external-title" />
        <Field label={t("gifts.host.external.url")} value={url} onChange={setUrl} keyboardType="url" testID="external-url" />
        <Field label={t("gifts.host.external.price")} value={price} onChange={setPrice} help={t("gifts.host.external.priceHelp")} keyboardType="decimal-pad" testID="external-price" />
        {error ? <Notice kind="error">{error}</Notice> : null}
        {done ? <Notice kind="success">{done}</Notice> : null}
        {partnerFirst ? (
          <Notice kind="info">
            <Text style={styles.subtitle}>{t("gifts.host.external.suggestionsTitle")}</Text>
            <Text style={styles.body}>{t("gifts.host.external.suggestionsBody")}</Text>
            {suggestions.map((suggestion) => (
              <View key={suggestion.productListingId} style={styles.row} testID={`suggestion-${suggestion.productListingId}`}>
                <Text style={styles.body}>{suggestion.title}</Text>
                <ActionButton variant="secondary" label={t("gifts.host.external.useSuggestion")} onPress={() => { if (flight.begin()) add.mutate({ source: "CATALOGED", title: suggestion.title, price: { amountMinor: parseMinor(price) ?? 0, currency: celebration.currency }, productListingId: suggestion.productListingId }, { onSuccess: () => { setSuggestions([]); setDone(t("gifts.host.catalog.added", { title: suggestion.title })); }, onSettled: flight.end }); }} />
              </View>
            ))}
          </Notice>
        ) : <ErrorNotice error={add.error} onReload={refetch} />}
        <ActionButton label={partnerFirst ? t("gifts.host.external.submitAnyway") : t("gifts.host.external.submit")} variant={partnerFirst ? "secondary" : "primary"} busy={add.isPending} disabled={add.isPending} onPress={() => send(partnerFirst)} testID="external-submit" />
      </Section>
    </View>
  );
}

export function ExternalScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.external.title")}>{({ celebration, refetch }) => <ExternalBody celebration={celebration} refetch={refetch} />}</CelebrationScreen>;
}
