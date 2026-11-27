import { useState, type ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Chip, fonts, useColors } from "@rsvp/ui";
import { radius, spacing } from "@rsvp/design-tokens";
import { isOrderable, type RecommendedProductCard } from "@rsvp/query-hooks";
import { formatBs } from "./money";
import { useLocale, useT } from "../../../platform/providers";
import { useStyles } from "../../ui";

const PHOTO = 96;
const TOUCH = 44;

/** The cover (`card` WebP, 480 px). A photo that fails to load shows a quiet box with words, never a broken image. */
export function ProductPhoto({ product, size = PHOTO }: { readonly product: RecommendedProductCard; readonly size?: number }): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const t = useT();
  const [failed, setFailed] = useState(false);
  const photo = product.photo;
  const box = { width: size, height: size, borderRadius: radius.md };
  if (!photo || failed) return <View style={[box, { backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center", padding: spacing[1] }]}><Text style={[styles.muted, { textAlign: "center" }]}>{t("gifts.host.wizard.products.noPhoto")}</Text></View>;
  return <Image source={{ uri: photo.card }} accessible accessibilityRole="image" accessibilityLabel={photo.altText ?? t("gifts.host.wizard.products.photo", { title: product.title })} onError={() => setFailed(true)} resizeMode="cover" style={box} />;
}

/** «Entrega en 3 días», «Entrega el mismo día». */
export function leadLabel(t: ReturnType<typeof useT>, days: number): string {
  return days === 0 ? t("gifts.host.wizard.products.leadSameDay") : t("gifts.host.wizard.products.lead", { count: days });
}

/**
 * One product to choose for an idea (D-10 §5.6): photo, title, price in Bs, stock, provider, delivery to the city (only when a city was chosen:
 * with none, «otra ciudad» would be false for every product) and lead time. The whole tile is one radio of the idea's group; a sold-out product
 * is shown but cannot be chosen.
 */
export function ProductTile({ product, selected, showDelivery, problem, onChoose }: { readonly product: RecommendedProductCard; readonly selected: boolean; readonly showDelivery: boolean; /** Words for a 422 on this product, kept until the host changes it. */ readonly problem?: string; readonly onChoose: () => void }): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const orderable = isOrderable(product.stock);
  const price = formatBs(product.price.amountMinor, locale);
  const shipping = product.shippingCostMinor === 0 ? t("gifts.host.wizard.products.shippingFree") : t("gifts.host.wizard.products.shipping", { price: formatBs(product.shippingCostMinor, locale) });
  const delivery = showDelivery ? (product.deliversToCity ? t("gifts.host.wizard.products.deliveryHere") : t("gifts.host.wizard.products.deliveryOther")) : null;
  const facts = [delivery, leadLabel(t, product.leadTimeDays), shipping].filter((fact): fact is string => fact !== null);
  // A sold-out product is set apart by the muted text token (it passes AA on the card, see design-tokens/contrast.test) and by its «Agotado» chip, not by fading the whole tile with opacity, which would pull the text below AA.
  const label = `${t("gifts.host.wizard.products.choose", { title: product.title, price })}. ${t(`gifts.host.wizard.products.stock.${product.stock}`)}. ${facts.join(". ")}`;
  return (
    <View testID={`product-${product.listingId}`} style={{ gap: spacing[2] }}>
      <Pressable role="radio" accessibilityRole="radio" aria-checked={selected} aria-disabled={!orderable} disabled={!orderable} accessibilityLabel={label} onPress={onChoose} testID={`choose-${product.listingId}`}
        style={[styles.option, { minHeight: TOUCH + 4 }, selected && styles.optionSelected, problem ? styles.inputError : null]}>
        <View style={{ flexDirection: "row", gap: spacing[3], alignItems: "flex-start" }}>
          <ProductPhoto product={product} />
          <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
            <Text style={[styles.itemTitle, orderable ? null : { color: palette.textMuted }]} numberOfLines={2}>{product.title}</Text>
            <Text style={{ color: orderable ? palette.text : palette.textMuted, fontSize: 20, lineHeight: 24, fontWeight: "500", fontFamily: fonts.display, fontVariant: ["tabular-nums"] }}>{price}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2], alignItems: "center" }}>
              <Chip tone={orderable ? (product.stock === "AVAILABLE" ? "yes" : "maybe") : "no"}>{t(`gifts.host.wizard.products.stock.${product.stock}`)}</Chip>
              {product.featured ? <Chip tone="wait">{t("gifts.host.wizard.products.sponsored")}</Chip> : null}
              {selected ? <Chip tone="yes">{t("gifts.host.wizard.products.chosen")}</Chip> : null}
            </View>
            <Text style={styles.muted}>{t("gifts.host.wizard.products.provider", { name: product.provider.name })}</Text>
            {facts.map((fact) => <Text key={fact} style={styles.muted}>{fact}</Text>)}
          </View>
        </View>
      </Pressable>
      {problem ? <Text accessibilityRole="alert" role="alert" style={[styles.body, { color: palette.danger }]} testID={`product-problem-${product.listingId}`}>{problem}</Text> : null}
    </View>
  );
}
