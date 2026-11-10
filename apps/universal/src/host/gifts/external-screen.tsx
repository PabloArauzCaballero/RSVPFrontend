import { useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Text, View, type TextInput } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { hostExternalGiftSchema, parseHostGiftPrice } from "@rsvp/forms";
import { partnerSuggestionsOf, problemCode, useAddGift, useUpdateSettings, type ApprovalMode, type Celebration, type GiftItemStatus, type PartnerSuggestion } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Notice, Section, styles } from "../ui";
import { GiftChoices, GiftConsent } from "./controls";
import { GiftFailure, GiftField, GiftFormSummary, PublicationLine } from "./parts";

type Errors = Partial<Record<"title" | "url" | "price", string>>;

/** C28: explicit review precedes external creation; only the server grants publication. */
function ExternalBody({ celebration, refetch, onNavigate }: { readonly celebration: Celebration; readonly refetch: () => void; readonly onNavigate: (path: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const settings = useUpdateSettings(client, celebration.id);
  const add = useAddGift(client, celebration.id);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [reviewError, setReviewError] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [suggestions, setSuggestions] = useState<readonly PartnerSuggestion[]>([]);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [done, setDone] = useState<GiftItemStatus | null>(null);
  const inFlight = useRef(false), changingSettings = useRef(false);
  const titleInput = useRef<TextInput>(null), urlInput = useRef<TextInput>(null), priceInput = useRef<TextInput>(null);
  const suggestionBlock = useRef<View>(null);
  const fingerprint = JSON.stringify({ title: title.trim(), url: url.trim(), price: price.trim() });
  const partnerFirst = challenge === fingerprint && add.error instanceof ApiError && add.error.status === 409 && problemCode(add.error) === "PARTNER_CATALOG_FIRST";
  const busy = add.isPending || settings.isPending;
  useEffect(() => { if (partnerFirst && Platform.OS === "web") suggestionBlock.current?.focus(); }, [partnerFirst]);

  const edit = (setter: (value: string) => void) => (value: string): void => {
    setter(value); setErrors({}); setReviewError(false); setReviewed(false); setDone(null); setChallenge(null); setSuggestions([]); add.reset();
  };
  const browse = (query = title): void => onNavigate(`${withCelebration(HOST_ROUTES.giftCatalog, celebration.id)}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`);
  const send = (): void => {
    if (inFlight.current || changingSettings.current) return;
    setDone(null); setReviewError(!reviewed);
    const parsed = hostExternalGiftSchema.safeParse({ title, url, price });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) { const key = issue.path[0]; if (key === "title" || key === "url" || key === "price") next[key] = t(`hostGifts.${issue.message}`); }
      setErrors(next); return;
    }
    if (!reviewed) return;
    const minor = parseHostGiftPrice(parsed.data.price);
    if (minor === null) return;
    inFlight.current = true; setErrors({});
    add.mutate({ source: "EXTERNAL", title: parsed.data.title, price: { amountMinor: minor, currency: celebration.currency }, url: parsed.data.url, ...(partnerFirst ? { partnerSuggestionsAcknowledged: true } : {}) }, {
      onSuccess: (item) => { setSuggestions([]); setChallenge(null); setTitle(""); setUrl(""); setPrice(""); setReviewed(false); setDone(item.status); },
      onError: (failure) => { if (failure instanceof ApiError && failure.status === 409 && problemCode(failure) === "PARTNER_CATALOG_FIRST") { setChallenge(fingerprint); setSuggestions(partnerSuggestionsOf(failure)); } },
      onSettled: () => { inFlight.current = false; }
    });
  };
  const changeSettings = (patch: { externalGiftMode?: ApprovalMode; partnerPriorityEnabled?: boolean }): void => {
    if (changingSettings.current || inFlight.current) return;
    changingSettings.current = true;
    settings.mutate({ target: celebration, patch }, { onSuccess: () => { setChallenge(null); setSuggestions([]); add.reset(); refetch(); }, onSettled: () => { changingSettings.current = false; } });
  };

  return <View style={{ gap: spacing[4] }}>
    <Section title={t("gifts.host.external.modeLabel")}>
      <GiftChoices label={t("gifts.host.external.modeLabel")} value={celebration.settings.externalGiftMode} disabled={busy}
        onChange={(value) => { if (value === "AUTO_ACCEPT" || value === "RESTRICTED") changeSettings({ externalGiftMode: value }); }}
        choices={[{ value: "AUTO_ACCEPT", label: t("gifts.host.external.modeAuto") }, { value: "RESTRICTED", label: t("gifts.host.external.modeRestricted") }]} />
      <GiftChoices label={t("gifts.host.external.priorityLabel")} value={celebration.settings.partnerPriorityEnabled ? "on" : "off"} disabled={busy}
        onChange={(value) => changeSettings({ partnerPriorityEnabled: value === "on" })}
        choices={[{ value: "on", label: t("gifts.host.external.priorityLabel"), description: t("gifts.host.external.priorityHelp") }, { value: "off", label: t("hostGifts.priorityOff") }]} />
      <GiftFailure error={settings.error} onRetry={refetch} />
      {settings.isSuccess ? <Notice kind="success">{t("gifts.host.external.modeSaved")}</Notice> : null}
    </Section>
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.subtitle}>{t("hostGifts.beforeExternal")}</Text>
      <Text style={styles.body}>{t("gifts.host.external.intro")}</Text>
      <ActionButton variant="secondary" label={t("hostGifts.browsePartners")} disabled={busy} onPress={() => browse()} testID="external-browse-partners" />
      <GiftConsent label={t("hostGifts.preferExternal")} value={reviewed} onChange={(value) => { setReviewed(value); setReviewError(false); }} disabled={busy} />
      {reviewError ? <Notice kind="error">{t("hostGifts.externalReviewRequired")}</Notice> : null}
    </View>
    <Section title={t("gifts.host.external.title")}>
      <GiftFormSummary fields={[
        { label: t("gifts.host.external.name"), error: errors.title, onFocus: () => titleInput.current?.focus() },
        { label: t("gifts.host.external.url"), error: errors.url, onFocus: () => urlInput.current?.focus() },
        { label: t("gifts.host.external.price"), error: errors.price, onFocus: () => priceInput.current?.focus() }
      ]} />
      <GiftField inputRef={titleInput} label={t("gifts.host.external.name")} value={title} onChange={edit(setTitle)} error={errors.title} state={busy ? "disabled" : "default"} testID="external-title" />
      <GiftField inputRef={urlInput} label={t("gifts.host.external.url")} value={url} onChange={edit(setUrl)} error={errors.url} state={busy ? "disabled" : "default"} keyboardType="url" autoCapitalize="none" testID="external-url" />
      <GiftField inputRef={priceInput} label={t("gifts.host.external.price")} value={price} onChange={edit(setPrice)} error={errors.price} state={busy ? "disabled" : "default"} help={t("hostGifts.priceCurrency", { currency: celebration.currency })} keyboardType="decimal-pad" testID="external-price" />
      {done ? <Notice kind="success"><Text style={styles.body}>{t(done === "PROPOSED" ? "gifts.host.external.proposed" : "gifts.host.external.added")}</Text><PublicationLine status={done} /></Notice> : null}
      {partnerFirst ? <View ref={suggestionBlock} tabIndex={-1} accessibilityLiveRegion="polite" testID="external-suggestions"><Notice>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.host.external.suggestionsTitle")}</Text>
        <Text style={styles.body}>{t("gifts.host.external.suggestionsBody")}</Text>
        {!suggestions.length ? <Text style={styles.body}>{t("hostGifts.emptySuggestions")}</Text> : null}
        {suggestions.map((suggestion) => <View key={suggestion.productListingId} style={{ gap: spacing[2] }} testID={`suggestion-${suggestion.productListingId}`}>
          <Text style={styles.body}>{suggestion.title}</Text><ActionButton variant="secondary" label={t("hostGifts.reviewSuggestion")} onPress={() => browse(suggestion.title)} disabled={busy} testID={`review-suggestion-${suggestion.productListingId}`} />
        </View>)}
      </Notice></View> : <GiftFailure error={add.error} />}
      <ActionButton label={partnerFirst ? t("gifts.host.external.submitAnyway") : t("gifts.host.external.submit")} variant={partnerFirst ? "secondary" : "primary"} busy={add.isPending} disabled={busy} onPress={send} testID="external-submit" />
      <ActionButton variant="secondary" label={t("hostGifts.reviewList")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.gifts, celebration.id))} testID="external-review-list" />
    </Section>
  </View>;
}

export function ExternalScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="gifts" title={t("gifts.host.external.title")}>{({ celebration, refetch }) => <ExternalBody key={celebration.id} celebration={celebration} refetch={refetch} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
