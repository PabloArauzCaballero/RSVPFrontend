import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { useColors } from "@rsvp/ui";
import {
  DESCRIPTION_MAX, MAX_GIFT_IDEAS, MAX_VARIANTS, STOCK_VALUES,
  type GiftIdea, type OfferCategory, type ProductStock, type ProviderGeoCity
} from "@rsvp/query-hooks";
import { useT } from "../../platform/providers";
import { ActionButton, ChoiceGroup, Field, FilterSelect, ToggleChip, useStyles } from "../../host/ui";
import { CoveragePicker, cityLabel } from "../coverage-picker";
import { MoreToggle, RowsSkeleton } from "../parts";
import type { LocalProblem, SheetDraft, VariantDraft } from "./model";

/** What every step receives: the draft, a setter, the local problems to show next to their fields, and whether a save is running. */
export interface StepProps {
  readonly draft: SheetDraft;
  readonly set: (patch: Partial<SheetDraft>) => void;
  readonly problems: readonly LocalProblem[];
  readonly disabled: boolean;
}
type T = ReturnType<typeof useT>;
const problem = (t: T, problems: readonly LocalProblem[], ...keys: LocalProblem[]): string | undefined => {
  const found = keys.find((key) => problems.includes(key));
  return found ? t(`portal.product.errors.local.${found}`) : undefined;
};
const errorProp = (message: string | undefined): { error?: string } => (message ? { error: message } : {});

function InlineError({ message }: { readonly message: string | undefined }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  return message ? <Text role="alert" style={[styles.muted, { color: palette.danger }]}>{message}</Text> : null;
}

/** Básico: name, category, description and the optional details. A new draft also asks the WhatsApp the catalog needs to create it. */
export function BasicStep({ draft, set, problems, disabled, creating, categories, cities }: StepProps & {
  readonly creating: boolean;
  readonly categories: { readonly items: readonly OfferCategory[] | undefined; readonly pending: boolean; readonly error: ReactNode };
  readonly cities: readonly ProviderGeoCity[] | undefined;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [more, setMore] = useState(Boolean(draft.dimensions || draft.weight || draft.care || draft.warranty || draft.personalizable));
  const options = (categories.items ?? []).map((item) => ({ value: item.code, label: item.name }));
  const categoryLabel = t("portal.product.basic.category");
  return (
    <View style={{ gap: spacing[4] }}>
      <Field label={t("portal.product.basic.title")} value={draft.title} onChange={(title) => set({ title })} help={t("portal.product.basic.titleHelp")} maxLength={120} editable={!disabled} {...errorProp(problem(t, problems, "title"))} testID="product-title" />
      <View style={{ gap: spacing[1] }}>
        <Text style={styles.label}>{categoryLabel}</Text>
        {options.length ? (
          <FilterSelect label={categoryLabel} value={draft.category || (options[0]?.value ?? "")} onChange={(category) => set({ category })} options={options} testID="product-category" />
        ) : categories.pending ? <Text style={styles.muted} accessibilityLiveRegion="polite">{t("portal.product.basic.loadingCategories")}</Text>
          : categories.error ?? <Text style={styles.muted}>{t("portal.product.basic.emptyCategories")}</Text>}
        <InlineError message={problem(t, problems, "category")} />
      </View>
      <Field label={t("portal.product.basic.description")} value={draft.description} onChange={(description) => set({ description })} multiline maxLength={DESCRIPTION_MAX} help={t("portal.product.basic.descriptionHelp")} editable={!disabled} {...errorProp(problem(t, problems, "description"))} testID="product-description" />
      <Text style={styles.muted}>{t("portal.product.basic.count", { count: draft.description.trim().length, max: DESCRIPTION_MAX })}</Text>
      {cities?.length ? (
        <View style={{ gap: spacing[1] }}>
          <Text style={styles.label}>{t("portal.product.basic.city")}</Text>
          <FilterSelect label={t("portal.product.basic.city")} value={draft.city} onChange={(city) => set({ city })} options={cities.map((city) => ({ value: city.slug, label: cityLabel(city) }))} testID="product-city" />
        </View>
      ) : null}
      {creating ? <Field label={t("portal.product.basic.whatsapp")} value={draft.whatsapp} onChange={(whatsapp) => set({ whatsapp })} keyboardType="phone-pad" help={t("portal.product.basic.whatsappHelp")} editable={!disabled} {...errorProp(problem(t, problems, "whatsapp"))} testID="product-whatsapp-new" /> : null}
      <MoreToggle label={t(more ? "portal.product.basic.less" : "portal.product.basic.more")} onPress={() => setMore((current) => !current)} testID="product-more" />
      {more ? (
        <View style={{ gap: spacing[3] }}>
          <Field label={t("portal.product.basic.dimensions")} value={draft.dimensions} onChange={(dimensions) => set({ dimensions })} help={t("portal.product.basic.dimensionsHelp")} maxLength={60} editable={!disabled} testID="product-dimensions" />
          <Field label={t("portal.product.basic.weight")} value={draft.weight} onChange={(weight) => set({ weight })} help={t("portal.product.basic.weightHelp")} maxLength={60} editable={!disabled} testID="product-weight" />
          <Field label={t("portal.product.basic.care")} value={draft.care} onChange={(care) => set({ care })} maxLength={300} multiline editable={!disabled} testID="product-care" />
          <Field label={t("portal.product.basic.warranty")} value={draft.warranty} onChange={(warranty) => set({ warranty })} maxLength={300} multiline editable={!disabled} testID="product-warranty" />
          <ToggleChip label={t("portal.product.basic.personalizable")} on={draft.personalizable} disabled={disabled} onPress={() => set({ personalizable: !draft.personalizable })} testID="product-personalizable" />
          {draft.personalizable ? <Field label={t("portal.product.basic.personalizationNote")} value={draft.personalizationNote} onChange={(personalizationNote) => set({ personalizationNote })} help={t("portal.product.basic.personalizationHelp")} maxLength={300} editable={!disabled} testID="product-personalization" /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Ideas: the ideas of the category (§5.4) as on/off options, up to 10. A category without ideas says why the product cannot be recommended. */
export function IdeasStep({ draft, set, problems, disabled, ideas }: StepProps & { readonly ideas: { readonly items: readonly GiftIdea[] | undefined; readonly pending: boolean; readonly error: ReactNode } }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const toggle = (code: string): void => set({ giftIdeas: draft.giftIdeas.includes(code) ? draft.giftIdeas.filter((item) => item !== code) : [...draft.giftIdeas, code] });
  if (!draft.category) return <Text style={styles.body}>{t("portal.product.ideas.pickCategory")}</Text>;
  return (
    <View style={{ gap: spacing[3] }}>
      <Text style={styles.body}>{t("portal.product.ideas.intro")}</Text>
      {ideas.pending ? <RowsSkeleton count={2} minHeight={44} /> : ideas.error ? ideas.error : (ideas.items ?? []).length === 0 ? (
        <Text style={styles.body} testID="ideas-empty">{t("portal.product.ideas.empty")}</Text>
      ) : (
        <>
          <View role="group" aria-label={t("portal.product.ideas.group")} style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {(ideas.items ?? []).map((idea) => {
              const on = draft.giftIdeas.includes(idea.code);
              return <ToggleChip key={idea.code} label={idea.name} on={on} disabled={disabled || (!on && draft.giftIdeas.length >= MAX_GIFT_IDEAS)} onPress={() => toggle(idea.code)} testID={`idea-${idea.code}`} />;
            })}
          </View>
          <Text style={styles.muted} accessibilityLiveRegion="polite">{t("portal.product.ideas.count", { count: draft.giftIdeas.length, max: MAX_GIFT_IDEAS })}</Text>
        </>
      )}
      <InlineError message={problem(t, problems, "ideas", "ideasMax")} />
    </View>
  );
}

function StockChoice({ value, onChange, disabled, label }: { readonly value: ProductStock | null; readonly onChange: (stock: ProductStock) => void; readonly disabled: boolean; readonly label: string }): ReactNode {
  const t = useT();
  return <ChoiceGroup<ProductStock> label={label} value={value} onChange={onChange} disabled={disabled} choices={STOCK_VALUES.map((stock) => ({ value: stock, label: t(`portal.product.stock.${stock}`), testID: `stock-${stock}` }))} />;
}

/** Precio y versiones: one exact price, or versions (size, colour, flavour) each with its price and availability; one is shown first. */
export function PriceStep({ draft, set, problems, disabled }: StepProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const update = (index: number, patch: Partial<VariantDraft>): void => set({ variants: draft.variants.map((variant, at) => (at === index ? { ...variant, ...patch } : variant)) });
  const markDefault = (index: number): void => set({ variants: draft.variants.map((variant, at) => ({ ...variant, isDefault: at === index })) });
  const add = (): void => set({ variants: [...draft.variants, { id: null, label: "", price: draft.price, stock: draft.stock ?? "AVAILABLE", isDefault: draft.variants.length === 0 }] });
  const remove = (index: number): void => {
    const rest = draft.variants.filter((_, at) => at !== index);
    set({ variants: rest.some((variant) => variant.isDefault) ? rest : rest.map((variant, at) => ({ ...variant, isDefault: at === 0 })) });
  };
  const chooseMode = (mode: "single" | "variants"): void => {
    if (mode === "variants" && draft.variants.length === 0) set({ hasVariants: true, variants: [{ id: null, label: "", price: draft.price, stock: draft.stock ?? "AVAILABLE", isDefault: true }] });
    else set({ hasVariants: mode === "variants" });
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <ChoiceGroup<"single" | "variants"> label={t("portal.product.price.mode")} value={draft.hasVariants ? "variants" : "single"} onChange={chooseMode} disabled={disabled} choices={[{ value: "single", label: t("portal.product.price.single"), testID: "price-single" }, { value: "variants", label: t("portal.product.price.variants"), description: t("portal.product.price.modeHelp"), testID: "price-variants" }]} />
      {!draft.hasVariants ? (
        <>
          <Field label={t("portal.product.price.price")} value={draft.price} onChange={(price) => set({ price })} keyboardType="decimal-pad" help={t("portal.product.price.priceHelp")} editable={!disabled} {...errorProp(problem(t, problems, "price"))} testID="product-price" />
          <StockChoice label={t("portal.product.price.stock")} value={draft.stock} onChange={(stock) => set({ stock })} disabled={disabled} />
          <InlineError message={problem(t, problems, "stock")} />
        </>
      ) : (
        <View style={{ gap: spacing[3] }}>
          <View role="list" aria-label={t("portal.product.price.variantsList")} style={{ gap: spacing[3] }}>
            {draft.variants.map((variant, index) => (
              <View key={variant.id ?? `new-${index}`} role="listitem" style={{ gap: spacing[3], padding: spacing[4], borderWidth: 1, borderColor: palette.border, borderRadius: radius.md }} testID={`variant-${index}`}>
                <Text accessibilityRole="header" style={styles.itemTitle}>{t("portal.product.price.variant", { n: index + 1 })}</Text>
                <Field label={t("portal.product.price.variantLabel")} value={variant.label} onChange={(label) => update(index, { label })} help={t("portal.product.price.variantLabelHelp")} maxLength={60} editable={!disabled} testID={`variant-label-${index}`} />
                <Field label={t("portal.product.price.price")} value={variant.price} onChange={(price) => update(index, { price })} keyboardType="decimal-pad" editable={!disabled} testID={`variant-price-${index}`} />
                <StockChoice label={t("portal.product.price.stock")} value={variant.stock} onChange={(stock) => update(index, { stock })} disabled={disabled} />
                <ToggleChip label={t("portal.product.price.variantDefault")} on={variant.isDefault} disabled={disabled} onPress={() => markDefault(index)} testID={`variant-default-${index}`} />
                {draft.variants.length > 1 ? <View style={{ alignSelf: "flex-start" }}><ActionButton variant="secondary" icon="trash" label={t("portal.product.price.removeVariant", { n: index + 1 })} disabled={disabled} onPress={() => remove(index)} testID={`variant-remove-${index}`} /></View> : null}
              </View>
            ))}
          </View>
          <InlineError message={problem(t, problems, "variantLabel", "variantPrice", "variantsMax")} />
          <Text style={styles.muted} testID="variant-photos-hint">{t("portal.product.price.variantPhotosHint")}</Text>
          {draft.variants.length < MAX_VARIANTS ? <View style={{ alignSelf: "flex-start" }}><ActionButton variant="secondary" icon="plus" label={t("portal.product.price.addVariant")} disabled={disabled} onPress={add} testID="variant-add" /></View> : <Text style={styles.muted}>{t("portal.product.price.maxVariants")}</Text>}
        </View>
      )}
    </View>
  );
}

/** Entrega: catalogue cities (slugs, L23), lead time, shipping cost (0 = free), pickup and optional conditions. */
export function DeliveryStep({ draft, set, problems, disabled, cities, citiesError }: StepProps & { readonly cities: readonly ProviderGeoCity[] | undefined; readonly citiesError: ReactNode }): ReactNode {
  const t = useT();
  return (
    <View style={{ gap: spacing[4] }}>
      <CoveragePicker cities={cities} value={draft.coverage} onChange={(coverage) => set({ coverage })} label={t("portal.product.delivery.coverage")} help={t("portal.product.delivery.coverageHelp")} error={problem(t, problems, "coverage")} disabled={disabled} failed={Boolean(citiesError)} />
      {citiesError}
      <Field label={t("portal.product.delivery.lead")} value={draft.leadDays} onChange={(leadDays) => set({ leadDays })} keyboardType="number-pad" help={t("portal.product.delivery.leadHelp")} editable={!disabled} {...errorProp(problem(t, problems, "lead"))} testID="product-lead" />
      <Field label={t("portal.product.delivery.shipping")} value={draft.shipping} onChange={(shipping) => set({ shipping })} keyboardType="decimal-pad" help={t("portal.product.delivery.shippingHelp")} editable={!disabled} {...errorProp(problem(t, problems, "shipping"))} testID="product-shipping" />
      <ToggleChip label={t("portal.product.delivery.pickup")} on={draft.pickup} disabled={disabled} onPress={() => set({ pickup: !draft.pickup })} testID="product-pickup" />
      <Field label={t("portal.product.delivery.conditions")} value={draft.conditions} onChange={(conditions) => set({ conditions })} multiline maxLength={500} help={t("portal.product.delivery.conditionsHelp")} editable={!disabled} {...errorProp(problem(t, problems, "conditions"))} testID="product-conditions" />
    </View>
  );
}

/** Contacto: the two destinations (§5.1) and the WhatsApp message. Saved destinations are named, since the catalog never returns their URLs. */
export function ContactStep({ draft, set, problems, disabled, saved, template }: StepProps & { readonly saved: readonly string[]; readonly template: ReactNode }): ReactNode {
  const t = useT();
  const styles = useStyles();
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.product.contact.intro")}</Text>
      {saved.length ? <Text style={styles.muted} testID="contact-saved">{t("portal.product.contact.saved", { list: saved.join(" · ") })} {t("portal.product.contact.replaceNote")}</Text> : null}
      <Field label={t("portal.product.contact.whatsapp")} value={draft.whatsapp} onChange={(whatsapp) => set({ whatsapp })} keyboardType="phone-pad" help={t("portal.product.contact.whatsappHelp")} editable={!disabled} {...errorProp(problem(t, problems, "whatsapp"))} testID="product-whatsapp" />
      <Field label={t("portal.product.contact.productPage")} value={draft.productPage} onChange={(productPage) => set({ productPage })} keyboardType="url" help={t("portal.product.contact.productPageHelp")} editable={!disabled} {...errorProp(problem(t, problems, "productPage"))} testID="product-page" />
      <InlineError message={problem(t, problems, "destination")} />
      {template}
    </View>
  );
}
