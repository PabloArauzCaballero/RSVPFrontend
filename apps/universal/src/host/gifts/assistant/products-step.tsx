import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Chip, SwitchRow, useColors } from "@rsvp/ui";
import { radius, spacing } from "@rsvp/design-tokens";
import { GROUP_GIFT_SUGGESTED_MINOR, MAX_GIFT_QUANTITY, isOrderable, suggestGroupGift, unitPriceOf, type GiftRecommendation, type RecommendedProductCard } from "@rsvp/query-hooks";
import { giftQuantityEnabled } from "../../../platform/gift-flags";
import { formatBs } from "./money";
import { useLocale, useT } from "../../../platform/providers";
import { useStyles } from "../../ui";
import { ProductTile } from "./product-card";

const TOUCH = 44;

/** What the host chose for one idea. `groupTouched` stops the price suggestion from overriding a switch the host moved. */
export interface Pick {
  readonly listingId: string;
  readonly variantId: string | null;
  readonly quantity: number;
  readonly group: boolean;
  readonly groupTouched: boolean;
}

function Stepper({ value, onChange, idea }: { readonly value: number; readonly onChange: (next: number) => void; readonly idea: string }): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const t = useT();
  // The sign is drawn (a bar, or two crossed bars), not typed: it is a mark, not text, and it keeps the same weight in every font.
  const sign = (plus: boolean): ReactNode => (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: 14, height: 2, borderRadius: 1, backgroundColor: palette.text }} />
      {plus ? <View style={{ position: "absolute", width: 2, height: 14, borderRadius: 1, backgroundColor: palette.text }} /> : null}
    </View>
  );
  const button = (label: string, next: number, disabled: boolean, testID: string, plus: boolean): ReactNode => (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${label} · ${idea}`} aria-disabled={disabled} disabled={disabled} onPress={() => onChange(next)} testID={testID}
      style={[styles.choice, { minWidth: TOUCH, minHeight: TOUCH, alignItems: "center" }, disabled && styles.buttonDisabled]}>
      {sign(plus)}
    </Pressable>
  );
  return (
    <View style={{ gap: spacing[1] }}>
      <Text style={styles.label}>{t("gifts.host.wizard.products.quantity")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        {button(t("gifts.host.wizard.products.quantityLess"), value - 1, value <= 1, `quantity-less-${idea}`, false)}
        <Text aria-live="polite" accessibilityLiveRegion="polite" accessibilityLabel={t("gifts.host.wizard.products.quantityValue", { count: value })} style={[styles.itemTitle, { minWidth: 32, textAlign: "center" }]} testID={`quantity-${idea}`}>{value}</Text>
        {button(t("gifts.host.wizard.products.quantityMore"), value + 1, value >= MAX_GIFT_QUANTITY, `quantity-more-${idea}`, true)}
      </View>
      <Text style={styles.muted}>{t("gifts.host.wizard.products.quantityHelp", { max: MAX_GIFT_QUANTITY })}</Text>
    </View>
  );
}

/** Version radios (a sold-out version is listed and cannot be chosen), quantity (behind the build flag) and the coordinated-gift switch. */
function Options({ idea, product, pick, onChange }: { readonly idea: string; readonly product: RecommendedProductCard; readonly pick: Pick; readonly onChange: (next: Pick) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const unit = unitPriceOf(product, pick.variantId);
  const suggested = suggestGroupGift(unit, pick.quantity);
  // Until the host touches the switch it follows the price (§5.6: on when the price times the quantity passes Bs 1 000).
  const apply = (next: Pick): void => onChange(next.groupTouched ? next : { ...next, group: suggestGroupGift(unitPriceOf(product, next.variantId), next.quantity) });
  return (
    <View style={{ gap: spacing[4], paddingLeft: spacing[2] }} testID={`options-${idea}`}>
      {product.variants.length > 0 ? (
        <View role="radiogroup" accessibilityRole="radiogroup" accessibilityLabel={`${t("gifts.host.wizard.products.version")} · ${product.title}`} style={{ gap: spacing[2] }}>
          <Text style={styles.label}>{t("gifts.host.wizard.products.version")}</Text>
          <View style={styles.row}>
            {product.variants.map((variant) => {
              const on = variant.id === pick.variantId;
              const ok = isOrderable(variant.stock);
              const text = ok ? t("gifts.host.wizard.products.versionOption", { label: variant.label, price: formatBs(variant.price.amountMinor, locale) }) : t("gifts.host.wizard.products.versionOut", { label: variant.label });
              return (
                <Pressable key={variant.id} role="radio" accessibilityRole="radio" aria-checked={on} aria-disabled={!ok} disabled={!ok} accessibilityLabel={text} onPress={() => apply({ ...pick, variantId: variant.id })} testID={`variant-${variant.id}`}
                  style={[styles.choice, { borderRadius: radius.md }, on && styles.choiceSelected, !ok && styles.buttonDisabled]}>
                  <Text style={[styles.body, on && { fontWeight: "600" }]}>{text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {giftQuantityEnabled() ? <Stepper idea={idea} value={pick.quantity} onChange={(quantity) => apply({ ...pick, quantity })} /> : null}
      <View style={{ gap: spacing[1] }}>
        <SwitchRow label={t("gifts.host.wizard.products.group")} hint={t("gifts.host.wizard.products.groupHelp", { price: formatBs(GROUP_GIFT_SUGGESTED_MINOR, locale) })} value={pick.group} onChange={(group) => onChange({ ...pick, group, groupTouched: true })} testID={`group-${idea}`} />
        {suggested && pick.group && !pick.groupTouched ? <View style={{ alignSelf: "flex-start" }}><Chip tone="wait">{t("gifts.host.wizard.products.groupSuggested")}</Chip></View> : null}
      </View>
    </View>
  );
}

/**
 * Step 2 (D-10 §5.6): for every ticked idea, its products (a group of radios: ONE product per idea, decision 5) and, under the chosen one, its
 * version, quantity and coordinated-gift switch. `problems` carries the 422 words of the batch by idea, shown on the product that failed.
 */
export function ProductsStep({ ideas, picks, showDelivery, problems, onPick, onChange }: {
  readonly ideas: readonly GiftRecommendation[];
  readonly picks: Readonly<Record<string, Pick>>;
  readonly showDelivery: boolean;
  readonly problems: Readonly<Record<string, string>>;
  readonly onPick: (ideaCode: string, product: RecommendedProductCard) => void;
  readonly onChange: (ideaCode: string, next: Pick) => void;
}): ReactNode {
  const styles = useStyles();
  const t = useT();
  return (
    <View style={{ gap: spacing[6] }}>
      {ideas.map((entry) => {
        const code = entry.idea.code;
        const pick = picks[code];
        const chosen = pick ? entry.products.find((product) => product.listingId === pick.listingId) : undefined;
        const available = entry.products.some((product) => isOrderable(product.stock));
        return (
          <View key={code} role="radiogroup" accessibilityRole="radiogroup" accessibilityLabel={t("gifts.host.wizard.products.ideaGroup", { idea: entry.idea.name })} testID={`idea-products-${code}`} style={{ gap: spacing[3] }}>
            <Text accessibilityRole="header" aria-level={3} style={styles.itemTitle}>{entry.idea.name}</Text>
            {entry.productCount > entry.products.length ? <Text style={styles.muted}>{t("gifts.host.wizard.products.shown", { shown: entry.products.length, total: entry.productCount })}</Text> : null}
            {available ? null : <Text style={styles.body} testID={`idea-empty-${code}`}>{t("gifts.host.wizard.products.emptyIdea")}</Text>}
            {entry.products.map((product) => (
              <View key={product.listingId} style={{ gap: spacing[3] }}>
                <ProductTile product={product} selected={pick?.listingId === product.listingId} showDelivery={showDelivery} {...(pick?.listingId === product.listingId && problems[code] ? { problem: problems[code] } : {})} onChoose={() => onPick(code, product)} />
                {chosen && pick && pick.listingId === product.listingId ? <Options idea={code} product={chosen} pick={pick} onChange={(next) => onChange(code, next)} /> : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
