import { useState, type ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import type { AppLocale } from "@rsvp/i18n/server";
import { fonts, useColors } from "@rsvp/ui";
import type { ProductSheet, ProviderGeoCity } from "@rsvp/query-hooks";
import { useLocale, useT } from "../../platform/providers";
import { ActionButton, useStyles } from "../../host/ui";
import { cityName } from "../coverage-picker";

const CURRENCY = "BOB";

/** The cover the guest sees: the card rendition of the first READY photo (photos are already in their order). */
export const coverOf = (sheet: ProductSheet): { readonly url: string; readonly alt: string | null } | null => {
  const ready = (sheet.photos ?? []).find((photo) => photo.status === "READY" && photo.renditions);
  return ready?.renditions ? { url: ready.renditions.card.url, alt: ready.altText } : null;
};

/** «Bs 350» or, with versions at different prices, «Desde Bs 290». */
export function priceLine(sheet: ProductSheet, locale: AppLocale, t: ReturnType<typeof useT>): string | null {
  const prices = (sheet.variants ?? []).map((variant) => variant.priceMinor);
  if (prices.length > 1 && new Set(prices).size > 1) return t("portal.product.summary.from", { price: formatMinor(Math.min(...prices), CURRENCY, locale) });
  const price = sheet.priceMinor ?? prices[0];
  return typeof price === "number" ? formatMinor(price, CURRENCY, locale) : null;
}

/** «Entrega en La Paz y 2 ciudades más · En 3 días · Envío gratis». */
export function deliveryLine(sheet: ProductSheet, cities: readonly ProviderGeoCity[] | undefined, locale: AppLocale, t: ReturnType<typeof useT>): string | null {
  const delivery = sheet.delivery;
  if (!delivery || delivery.coverageCities.length === 0) return null;
  const [first = "", ...rest] = delivery.coverageCities.map((slug) => cityName(cities, slug));
  const where = rest.length === 0 ? first : rest.length === 1 ? `${first}, ${rest[0] ?? ""}` : t("portal.product.summary.moreCities", { first, count: rest.length });
  const parts = [t("portal.product.summary.deliversIn", { cities: where })];
  if (typeof delivery.leadTimeDays === "number") parts.push(delivery.leadTimeDays === 0 ? t("portal.product.summary.leadToday") : t("portal.product.summary.leadDays", { count: delivery.leadTimeDays }));
  if (typeof delivery.shippingCostMinor === "number") parts.push(delivery.shippingCostMinor === 0 ? t("portal.product.summary.freeShipping") : t("portal.product.summary.shipping", { price: formatMinor(delivery.shippingCostMinor, CURRENCY, locale) }));
  if (delivery.pickupAvailable) parts.push(t("portal.product.summary.pickup"));
  return parts.join(" · ");
}

/** The two buttons of the guest's card and the destination each one opens through `/r/{listingId}`. */
export type PreviewDestination = "PRODUCT_PAGE" | "WHATSAPP";
/**
 * What the card needs to open its buttons for real (R6b, M-2): `preparing` while the portal asks for the preview's ctx, `ready` once it has it, `unavailable`
 * when it could not (the buttons stay off so a click is never billed by mistake). `onOpen` is the only way out: the ctx never reaches an `href`.
 */
export interface PreviewLinks {
  readonly status: "preparing" | "ready" | "unavailable";
  readonly onOpen: (destination: PreviewDestination) => void;
  readonly onRetry: () => void;
}

/**
 * The product as a guest will meet it on the gift list (R5): cover, name, provider, price and delivery, and the two ways out.
 * With `links` (R6b) the two buttons open the real destination through the redirector with the preview's ctx: the click is recorded as an invalid
 * `PREVIEW` lead and never bills. Without it they are labels. The whole block is one labelled group for screen readers.
 */
export function PreviewCard({ sheet, providerName, cities, links }: { readonly sheet: ProductSheet; readonly providerName: string; readonly cities: readonly ProviderGeoCity[] | undefined; readonly links?: PreviewLinks }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const cover = coverOf(sheet);
  const [failed, setFailed] = useState<string | null>(null);
  const price = priceLine(sheet, locale, t);
  const delivery = deliveryLine(sheet, cities, locale, t);
  const destinations = sheet.destinations ?? [];
  const ctas: readonly { readonly destination: PreviewDestination; readonly label: string }[] = [
    ...(destinations.includes("PRODUCT_PAGE") ? [{ destination: "PRODUCT_PAGE" as const, label: t("portal.product.summary.ctaStore") }] : []),
    ...(destinations.includes("WHATSAPP") ? [{ destination: "WHATSAPP" as const, label: t("portal.product.summary.ctaWhatsapp") }] : [])
  ];
  const live = links?.status === "ready";
  return (
    <View style={{ gap: spacing[3], maxWidth: 360, width: "100%" }}>
      <View role="group" aria-label={t("portal.product.summary.previewLabel")} style={{ width: "100%", backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, padding: spacing[4], gap: spacing[3] }} testID="preview-card">
        {cover && cover.url !== failed ? (
          <Image source={{ uri: cover.url }} accessibilityLabel={cover.alt ?? sheet.title} onError={() => setFailed(cover.url)} style={{ width: "100%", aspectRatio: 3 / 2, borderRadius: radius.md }} resizeMode="cover" accessibilityIgnoresInvertColors testID="preview-cover" />
        ) : (
          <View style={{ width: "100%", aspectRatio: 3 / 2, borderRadius: radius.md, backgroundColor: palette.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
            <Text style={styles.muted}>{t("portal.product.summary.noPhoto")}</Text>
          </View>
        )}
        <View style={{ gap: spacing[1] }}>
          <Text style={{ color: palette.text, fontFamily: fonts.display, fontSize: 20, lineHeight: 24, fontWeight: "500", letterSpacing: -0.4 }}>{sheet.title}</Text>
          <Text style={styles.muted}>{providerName}</Text>
        </View>
        {price ? <Text style={{ color: palette.text, fontFamily: fonts.sans, fontSize: 18, fontWeight: "600", fontVariant: ["tabular-nums"] }} testID="preview-price">{price}</Text> : null}
        {delivery ? <Text style={styles.muted} testID="preview-delivery">{delivery}</Text> : null}
        {ctas.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {ctas.map(({ destination, label }, index) => {
              const look = { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing[3], borderRadius: radius.button, borderWidth: 1, borderColor: index === 0 ? palette.primary : palette.fieldBorder, backgroundColor: index === 0 ? palette.primary : "transparent" } as const;
              const text = <Text style={{ color: index === 0 ? palette.onPrimary : palette.text, fontFamily: fonts.sans, fontWeight: "600" }}>{label}</Text>;
              return links ? (
                <Pressable key={destination} accessibilityRole="link" accessibilityLabel={t("portal.product.summary.previewOpen", { label })} accessibilityState={{ disabled: !live }} disabled={!live} onPress={() => links.onOpen(destination)} style={[look, live ? null : { opacity: 0.5 }]} testID={`preview-open-${destination}`}>{text}</Pressable>
              ) : <View key={destination} style={look}>{text}</View>;
            })}
          </View>
        ) : null}
      </View>
      {links && ctas.length ? (
        links.status === "unavailable" ? (
          <View style={{ gap: spacing[2] }} testID="preview-unavailable"><Text style={styles.muted}>{t("portal.product.summary.previewUnavailable")}</Text><ActionButton icon="refresh" variant="secondary" label={t("portal.errors.retry")} onPress={links.onRetry} testID="preview-retry" /></View>
        ) : <Text style={styles.muted} testID="preview-note">{links.status === "preparing" ? t("portal.product.summary.previewPreparing") : t("portal.product.summary.previewNote")}</Text>
      ) : null}
    </View>
  );
}
