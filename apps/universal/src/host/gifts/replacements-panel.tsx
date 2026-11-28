import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Pressable, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { fonts, useColors } from "@rsvp/ui";
import { formatMinor } from "@rsvp/i18n";
import { replacementsFailure, replacementsRetryable, swapEntry, mayHaveBeenApplied, swapFailureCode, useGiftReplacements, useProviderGeo, type GiftItem, type GiftReplacement, type useAddGiftBatch } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { useSingleFlightGate } from "../../platform/single-flight";
import { ActionButton, Notice, useStyles } from "../ui";
import { celebrationCityHint } from "./assistant/city";
import { GiftErrorNotice } from "./gift-errors";

/**
 * R7 (gift-list 1.19.0) · the «3 reemplazos de la misma idea» of a gift its provider no longer offers. They are read (`listGiftReplacements`, MANAGE only)
 * and the swap is ONE touch: the contract's multiple add (`addGiftItemsBatch`) with the chosen product, the same idea and the same quantity.
 * The panel only exists while it is open, so nothing is requested for a gift the host never looks into.
 */
const TOUCH = 44;
const FAILURE_KEY = { forbidden: "forbidden", notFound: "notFound", unavailable: "unavailable", offline: "offline", unknown: "unknown" } as const;

/** The batch mutation lives in the screen (not here) so its Idempotency-Key per body survives closing and reopening the panel. */
export type SwapMutation = ReturnType<typeof useAddGiftBatch>;

export function ReplacementsPanel({ celebrationId, item, eventType, content, add, onSwapped, onStore, onGone, owner, onOwner }: {
  readonly add: SwapMutation; readonly owner: string | null; readonly onOwner: (itemId: string) => void; readonly celebrationId: string; readonly item: GiftItem; readonly eventType: string; readonly content: Readonly<Record<string, unknown>>;
  readonly onSwapped: (oldTitle: string, newTitle: string) => void; readonly onStore: () => void; readonly onGone: () => void;
}): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const flight = useSingleFlightGate();
  const [picked, setPicked] = useState<string | null>(null);
  // The city only orders the replacements (the ones that deliver there first): a geo catalog that fails just leaves it out.
  const geo = useProviderGeo(client);
  // It never holds the read back: once the catalog answered, failed or is retrying, the replacements load with or without the city.
  const geoSettled = geo.data !== undefined || geo.isError || geo.failureCount > 0;
  const city = geo.data ? celebrationCityHint(content, geo.data.items) : "";
  const replacements = useGiftReplacements(client, celebrationId, item.id, { eventType, city: city || undefined }, geoSettled);
  const ideaCode = replacements.data?.giftIdeaCode ?? item.giftIdeaCode ?? null;

  // 404: the gift is no longer on the list (another device removed it): the list is read again, which drops the row and this panel with it.
  const gone = replacements.isError && replacementsFailure(replacements.error) === "notFound";
  const reported = useRef(false);
  useEffect(() => { if (gone && !reported.current) { reported.current = true; onGone(); } }, [gone, onGone]);

  // The mutation is shared by every panel of the screen: its error and busy state belong only to the row that started the last swap.
  const mine = owner === item.id;

  const swap = (replacement: GiftReplacement): void => {
    if (!ideaCode || !flight.begin()) return;
    setPicked(replacement.listingId);
    onOwner(item.id);
    add.mutate({ items: [swapEntry(item, replacement, ideaCode)] }, {
      onSuccess: () => onSwapped(item.title, replacement.title),
      onSettled: flight.end
    });
  };

  const body = (): ReactNode => {
    if (replacements.isPending) return <Text style={styles.muted} role="status" accessibilityLiveRegion="polite" testID={`replacements-loading-${item.id}`}>{t("gifts.host.replacements.loading")}</Text>;
    if (replacements.isError) {
      const failure = replacementsFailure(replacements.error);
      return (
        <Notice kind="error">
          <Text style={styles.body} testID={`replacements-error-${item.id}`}>{t(`gifts.host.replacements.error.${FAILURE_KEY[failure]}`)}</Text>
          {replacementsRetryable(failure) ? <ActionButton icon="refresh" variant="secondary" label={t("gifts.host.replacements.error.retry")} busy={replacements.isFetching} onPress={() => { void replacements.refetch(); }} testID={`replacements-retry-${item.id}`} /> : null}
        </Notice>
      );
    }
    const options = replacements.data.items;
    if (!ideaCode) return <Text style={styles.muted} testID={`replacements-noidea-${item.id}`}>{t("gifts.host.replacements.noIdea")}</Text>;
    if (options.length === 0) {
      return (
        <View style={{ gap: spacing[2], alignItems: "flex-start" }} testID={`replacements-empty-${item.id}`}>
          <Text style={styles.itemTitle}>{t("gifts.host.replacements.empty")}</Text>
          <Text style={styles.muted}>{t("gifts.host.replacements.emptyHint")}</Text>
          <ActionButton icon="arrow" variant="secondary" label={t("gifts.host.replacements.emptyAction")} onPress={onStore} testID={`replacements-store-${item.id}`} />
        </View>
      );
    }
    return (
      <View style={{ gap: spacing[3] }}>
        {mine && add.isError ? <SwapError error={add.error} id={item.id} /> : null}
        {options.map((option) => {
          const busy = mine && add.isPending && picked === option.listingId;
          return (
            <View key={option.listingId} testID={`replacement-${item.id}-${option.listingId}`} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[3], padding: spacing[3], borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface }}>
              <View style={{ flex: 1, minWidth: 160, gap: spacing[1] }}>
                <Text style={styles.itemTitle} numberOfLines={2}>{option.title}</Text>
                <Text style={[styles.muted, { fontVariant: ["tabular-nums"] }]}>{t("gifts.host.replacements.price", { price: formatMinor(option.priceMinor, option.currency, locale) })}</Text>
              </View>
              <ActionButton icon="check" variant="secondary" label={busy ? t("gifts.host.replacements.swapping") : t("gifts.host.replacements.swap")} {...(busy ? {} : { accessibilityLabel: t("gifts.host.replacements.swapLabel", { old: item.title, new: option.title }) })} busy={busy} disabled={add.isPending && !busy}
                onPress={() => swap(option)} testID={`swap-${item.id}-${option.listingId}`} />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View role="region" accessibilityLabel={t("gifts.host.replacements.title")} testID={`replacements-${item.id}`} style={{ gap: spacing[3], paddingTop: spacing[2] }}>
      <Text accessibilityRole="header" aria-level={3} style={{ color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: "600", fontFamily: fonts.sans }}>{t("gifts.host.replacements.title")}</Text>
      <Text style={styles.muted}>{t("gifts.host.replacements.intro")}</Text>
      {body()}
    </View>
  );
}

/** One error branch for the swap: a write that may have been applied says so (a retry replays the same key); a known 422 has its text; anything else uses the shared notice. */
function SwapError({ error, id }: { readonly error: unknown; readonly id: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  if (mayHaveBeenApplied(error)) return <Notice kind="error"><Text style={styles.body} testID={`replacements-swap-error-${id}`}>{t("gifts.host.replacements.error.swap.maybeApplied")}</Text></Notice>;
  const code = swapFailureCode(error);
  if (code) return <Notice kind="error"><Text style={styles.body} testID={`replacements-swap-error-${id}`}>{t(`gifts.host.replacements.error.swap.${code}`)}</Text></Notice>;
  return <GiftErrorNotice error={error} />;
}

/** The one control that opens or closes the panel: a labelled button that says whether it is expanded (a drawn state would be color only). */
export function ReplacementsToggle({ item, open, onToggle, toggleRef }: { readonly toggleRef?: Ref<View>; readonly item: GiftItem; readonly open: boolean; readonly onToggle: () => void }): ReactNode {
  const palette = useColors();
  const t = useT();
  return (
    <Pressable ref={toggleRef} role="button" accessibilityRole="button" aria-expanded={open} accessibilityState={{ expanded: open }}
      accessibilityLabel={t(open ? "gifts.host.replacements.closeLabel" : "gifts.host.replacements.openLabel", { title: item.title })}
      onPress={onToggle} testID={`replacements-toggle-${item.id}`} style={{ minHeight: TOUCH, justifyContent: "center", alignSelf: "flex-start" }}>
      <Text style={{ color: palette.primary, fontWeight: "600", fontSize: 14, lineHeight: 20, textDecorationLine: "underline", fontFamily: fonts.sans }}>{t(open ? "gifts.host.replacements.close" : "gifts.host.replacements.open")}</Text>
    </Pressable>
  );
}
