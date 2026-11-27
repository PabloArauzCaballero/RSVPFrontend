import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Chip, SkeletonList, Stagger, useColors } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import { BALANCE_BANDS, ideaOverlapsBand, type BalanceBandId, type GiftRecommendation, type ProviderGeoCity } from "@rsvp/query-hooks";
import { formatBs } from "./money";
import { useLocale, useT } from "../../../platform/providers";
import { ActionButton, FilterSelect, Notice, useStyles } from "../../ui";
import { ProductPhoto } from "./product-card";

const ANY_CITY = "";
const TOUCH = 44;

/** «Bs 150 – Bs 900», or one price when both ends meet. */
export function rangeText(t: ReturnType<typeof useT>, locale: ReturnType<typeof useLocale>, range: { readonly minMinor: number; readonly maxMinor: number; readonly currency: string }): string {
  const min = formatBs(range.minMinor, locale);
  const max = formatBs(range.maxMinor, locale);
  return range.minMinor === range.maxMinor ? t("gifts.host.wizard.ideas.rangeSingle", { price: min }) : t("gifts.host.wizard.ideas.range", { min, max });
}

/** The band as a phrase: «Hasta Bs 200», «De Bs 200 a Bs 500», «Más de Bs 1.000». */
export function bandText(t: ReturnType<typeof useT>, locale: ReturnType<typeof useLocale>, band: BalanceBandId): string {
  const found = BALANCE_BANDS.find((item) => item.id === band) ?? BALANCE_BANDS[0];
  const min = formatBs(found.minMinor === 0 ? 0 : found.minMinor - 1, locale);
  const max = Number.isFinite(found.maxMinor) ? formatBs(found.maxMinor, locale) : "";
  return t(`gifts.host.wizard.summary.balance.${band}`, { min, max });
}

/**
 * Step 1 (D-10 §5.6): the ideas that have products for this celebration's event type and delivery city. An idea that already has a gift on the list says so and
 * cannot be ticked again (the backend would answer DUPLICATE_GIFT_IDEA). Ideas without products never arrive (decision 3), so none is hidden here.
 */
export function IdeasStep({ ideas, ticked, listed, headline, cities, city, onCity, band, onClearBand, onToggle, onStore, loading, error, offline, onRetry, onSeeList }: {
  readonly ideas: readonly GiftRecommendation[] | undefined;
  readonly ticked: readonly string[];
  readonly listed: ReadonlySet<string>;
  readonly headline: string;
  readonly cities: readonly ProviderGeoCity[];
  readonly city: string;
  readonly onCity: (slug: string) => void;
  readonly band: BalanceBandId | null;
  readonly onClearBand: () => void;
  readonly onToggle: (code: string) => void;
  readonly onStore: () => void;
  readonly loading: boolean;
  readonly error: boolean;
  readonly offline: boolean;
  readonly onRetry: () => void;
  readonly onSeeList: () => void;
}): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const shown = (ideas ?? []).filter((entry) => band === null || ideaOverlapsBand(entry.priceRange, band));
  const fresh = (ideas ?? []).filter((entry) => !listed.has(entry.idea.code));
  const hasIdeas = (ideas?.length ?? 0) > 0;
  const nothingNew = hasIdeas && fresh.length === 0;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("gifts.host.wizard.ideas.intro")}</Text>
      {cities.length > 0 ? (
        <FilterSelect label={t("gifts.host.wizard.ideas.cityLabel")} value={city} testID="wizard-city" onChange={onCity}
          options={[{ value: ANY_CITY, label: t("gifts.host.wizard.ideas.cityAny") }, ...cities.map((item) => ({ value: item.slug, label: item.name }))]} />
      ) : null}
      <Text style={styles.muted}>{t("gifts.host.wizard.ideas.cityHelp")}</Text>
      {error ? (
        <View testID="wizard-ideas-error">
          <Notice kind="error"><Text style={styles.body}>{t(offline ? "gifts.host.wizard.ideas.offline" : "gifts.host.wizard.ideas.error")}</Text><ActionButton icon="refresh" variant="secondary" label={t("gifts.host.errors.retry")} onPress={onRetry} testID="wizard-ideas-retry" /></Notice>
        </View>
      ) : null}
      {loading ? <SkeletonList count={3} row={{ minHeight: 120, avatar: false, trailing: false }} label={t("gifts.host.wizard.ideas.loading")} /> : null}
      {ideas && ideas.length === 0 ? (
        <View testID="wizard-ideas-empty" style={{ gap: spacing[3] }}>
          <Text accessibilityRole="header" aria-level={3} style={styles.itemTitle}>{t("gifts.host.wizard.ideas.emptyTitle")}</Text>
          <Text style={styles.body}>{t("gifts.host.wizard.ideas.emptyBody")}</Text>
          <View style={styles.row}><ActionButton variant="secondary" label={t("gifts.host.wizard.ideas.emptyStore")} onPress={onStore} testID="wizard-empty-store" /></View>
        </View>
      ) : null}
      {hasIdeas ? <Text accessibilityRole="header" aria-level={3} style={styles.itemTitle} testID="wizard-headline">{headline}</Text> : null}
      {nothingNew ? (
        <Notice kind="info"><Text style={styles.body}>{t("gifts.host.wizard.ideas.allListed")}</Text><ActionButton variant="secondary" label={t("gifts.host.wizard.summary.seeList")} onPress={onSeeList} testID="wizard-all-listed-see" /></Notice>
      ) : null}
      {band !== null ? (
        <View style={styles.row} testID="wizard-band-filter">
          <Chip tone="wait">{t("gifts.host.wizard.ideas.filterRange", { range: bandText(t, locale, band) })}</Chip>
          <ActionButton variant="secondary" label={t("gifts.host.wizard.ideas.clearFilter")} onPress={onClearBand} testID="wizard-band-clear" />
        </View>
      ) : null}
      {band !== null && hasIdeas && shown.length === 0 ? <Text style={styles.body} testID="wizard-band-none">{t("gifts.host.wizard.ideas.filterNone")}</Text> : null}
      <View role="group" accessibilityRole="none" accessibilityLabel={headline} style={{ gap: spacing[3] }}>
        <Stagger>{shown.map((entry) => {
          const code = entry.idea.code;
          const isListed = listed.has(code);
          const on = ticked.includes(code);
          const cover = entry.products[0];
          const count = t("gifts.host.wizard.ideas.count", { count: entry.productCount, range: rangeText(t, locale, entry.priceRange) });
          const name = isListed ? t("gifts.host.wizard.ideas.chooseListed", { name: entry.idea.name }) : t("gifts.host.wizard.ideas.choose", { name: entry.idea.name });
          return (
            <Pressable key={code} role="checkbox" accessibilityRole="checkbox" aria-checked={on} aria-disabled={isListed} disabled={isListed} accessibilityLabel={`${name}. ${count}`} accessibilityState={{ checked: on, disabled: isListed }} onPress={() => onToggle(code)} testID={`idea-${code}`}
              style={[styles.option, { minHeight: TOUCH + 4 }, on && styles.optionSelected, isListed && styles.buttonDisabled]}>
              <View style={{ flexDirection: "row", gap: spacing[3], alignItems: "center" }}>
                {cover ? <ProductPhoto product={cover} size={64} /> : null}
                <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
                  <Text style={styles.itemTitle}>{entry.idea.name}</Text>
                  <Text style={styles.muted}>{count}</Text>
                  {isListed ? <Text style={[styles.muted, { color: palette.textMuted }]} testID={`idea-listed-${code}`}>{t("gifts.host.wizard.ideas.alreadyListed")}</Text> : null}
                </View>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? palette.primary : palette.fieldBorder, backgroundColor: on ? palette.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on ? <View style={{ width: 6, height: 11, marginTop: -2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: palette.onPrimary, transform: [{ rotate: "45deg" }] }} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}</Stagger>
      </View>
    </View>
  );
}
