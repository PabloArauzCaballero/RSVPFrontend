import { useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { Chip, Enter, Stagger, fonts, useColors } from "@rsvp/ui";
import { useRouter, type Href } from "expo-router";
import { newIdempotencyKey, useCreateOwnListing, useDuplicateListing, useListingSheet, useOfferCategories, useOwnListings, usePatchListing, useProviderGeo, usePublishListing, type CreateListingInput, type OwnListing, type Provider, type ProviderGeoCity } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, EmptyState, Field, FilterSelect, Illustration, Notice, OverflowMenu, PageIntro, Section, SuccessNote, useStyles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice, PortalErrorState } from "./errors";
import { parseMinor } from "../host/gifts/money";
import { PortalScreen, usePortalHeader, type PortalRoute } from "./frame";
import { PRODUCT_NEW_ROUTE } from "./routes";
import { useSingleMutation } from "../platform/single-flight";
import { MoreToggle, RowsSkeleton, StickyActions } from "./parts";
import { CoveragePicker, cityLabel, cityName } from "./coverage-picker";
import { CompletenessChip, productHref } from "./product-editor/product-editor-screen";
import { missingShort, MissingList } from "./product-editor/missing-list";
import { MISSING_STEP } from "./product-editor/model";
import { SheetErrorNotice } from "./product-editor/sheet-errors";
import { PhotoUploader } from "./product-editor/photo-uploader";
import type { AppLocale } from "@rsvp/i18n/server";

const MAX_TITLE = 120;
const HTTPS = /^https:\/\/[^\s]+$/i;
type Kind = CreateListingInput["type"];
const DEFAULT_CITY = "la-paz";

/**
 * Photos of a SERVICE (provider-catalog 3.13.0): the same uploader as a product's (up to 5, drag and drop or the device's gallery and camera),
 * never a link. The first READY photo is the cover the directory shows; «Usar como portada» reorders through the PATCH with the loaded version.
 */
function ServicePhotos({ providerId, listingId }: { readonly providerId: string; readonly listingId: string }): ReactNode {
  const client = useApiClient();
  const locale = useLocale() as AppLocale;
  const sheet = useListingSheet(client, providerId, listingId, locale);
  const patch = usePatchListing(client, providerId, listingId, locale);
  if (sheet.isPending) return <RowsSkeleton count={1} minHeight={80} trailing={false} />;
  if (sheet.isError) return <ErrorNotice error={sheet.error} onRetry={() => { void sheet.refetch(); }} />;
  return (
    <View testID={`service-photos-${listingId}`} style={{ gap: spacing[3] }}>
      <PhotoUploader kind="service" sheet={sheet.data} providerId={providerId} locale={locale} reordering={patch.isPending}
        onReorder={(order) => { if (sheet.data.version !== undefined) patch.mutate({ version: sheet.data.version, input: { photoOrder: [...order] } }); }} />
      <SheetErrorNotice error={patch.error} />
    </View>
  );
}

/** One offer as a row: the name, its state and ONE line of delivery terms. "Publicar" lives in the row's "⋯" menu (a draft without terms shows it off, with the reason under the terms). */
function OfferRow({ provider, listing, cities, publishing, duplicating, onPublish, onDuplicate }: { readonly provider: Provider; readonly listing: OwnListing; readonly cities: readonly ProviderGeoCity[] | undefined; readonly publishing: boolean; readonly duplicating: boolean; readonly onPublish: () => void; readonly onDuplicate: () => void }): ReactNode {
  const router = useRouter();
  const sheet = listing.type === "PRODUCT" && listing.completeness !== undefined && listing.completeness !== null;
  const missing = listing.missing ?? [];
  // R2: a product of the own gift catalog has no sheet yet (`missing` comes empty): it is not editable and is not offered as a gift.
  const noSheet = listing.incompleteReason === "OWN_CATALOG_NO_SHEET";
  // R2: a product publishes only when its sheet is COMPLETE (the catalog answers 422 LISTING_INCOMPLETE otherwise).
  const publishBlocked = sheet ? listing.completeness !== "COMPLETE" : !listing.fulfillment;
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const f = listing.fulfillment;
  const [photosOpen, setPhotosOpen] = useState(false);
  // The platform hid it (type and category disagree): it cannot be published until the provider creates it again.
  const hidden = listing.hiddenReason === "CATEGORY_TYPE_MISMATCH";
  const terms = f ? [
    t("portal.delivery.responsible", { who: f.responsible === "PROVIDER" ? t("portal.services.new.responsibleProvider") : t("portal.services.new.responsibleCustomer") }),
    t("portal.delivery.coverage", { zones: f.coverageZones.map((zone) => cityName(cities, zone)).join(", ") || "-" }),
    t("portal.delivery.transport", { price: f.transportCostMinor === undefined ? t("portal.delivery.noTransport") : formatMinor(f.transportCostMinor, provider.currency, locale) }),
    t("portal.delivery.lead", { days: f.leadTimeDays })
  ].join(" · ") : null;
  return (
    <View style={{ gap: spacing[3], padding: spacing[6], marginBottom: spacing[4], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg }} testID={`listing-${listing.id}`}>
      <View style={[styles.row, { justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap" }]}>
        <Text accessibilityRole="header" style={[styles.subtitle, { flex: 1 }]}>{listing.title}</Text>
        <View testID={`listing-state-${listing.id}`}><Chip tone={hidden ? "no" : listing.published ? "yes" : "wait"}>{hidden ? t("portal.services.hiddenChip") : listing.published ? t("portal.services.published") : t("portal.services.draft")}</Chip></View>
        {sheet && !hidden ? <View testID={`listing-completeness-${listing.id}`}><CompletenessChip state={listing.completeness ?? null} /></View> : null}
        {hidden || (sheet && noSheet) ? null : sheet ? (
          <OverflowMenu label={t("portal.product.actions.rowMenu", { title: listing.title })} items={[
            { key: "duplicate", label: duplicating ? t("portal.product.actions.duplicating") : t("portal.product.actions.duplicate"), disabled: duplicating || listing.completeness === "HIDDEN_BY_ADMIN", onPress: onDuplicate },
            ...(listing.published ? [] : [{ key: "publish", label: publishing ? t("portal.product.actions.publishing") : t("portal.product.actions.publish"), disabled: publishBlocked || publishing, onPress: onPublish }])
          ]} />
        ) : listing.published ? null : <OverflowMenu label={t("portal.services.rowMenu", { title: listing.title })} items={[{ key: "publish", label: publishing ? t("portal.services.publishing") : t("portal.services.publish"), disabled: publishBlocked || publishing, onPress: onPublish }]} />}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: spacing[3] }}>
        {listing.priceFromMinor !== undefined ? <Text style={{ color: palette.text, fontSize: 26, lineHeight: 30, fontWeight: "500", letterSpacing: -0.6, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }}>{formatMinor(listing.priceFromMinor, provider.currency, locale)}</Text> : null}
        <Text style={styles.muted}>{t(`portal.services.type.${listing.type === "SERVICE" ? "SERVICE" : "PRODUCT"}`)}</Text>
      </View>
      <View style={{ gap: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }} testID={`delivery-${listing.id}`}>
        {terms ? <><Text style={styles.muted}>{terms}</Text>{f?.conditions ? <Text style={styles.body}>{f.conditions}</Text> : null}</> : listing.published ? <Notice kind="error">{t("portal.delivery.missing")}</Notice> : null}
      </View>
      {hidden ? <Notice kind="error"><Text style={styles.body} testID={`listing-hidden-${listing.id}`}>{t("portal.services.hidden.CATEGORY_TYPE_MISMATCH")}</Text></Notice> : null}
      {!sheet && !hidden && !listing.published && !listing.fulfillment ? <Text style={styles.muted} testID={`publish-blocked-${listing.id}`}>{t("portal.services.needsTerms")}</Text> : null}
      {sheet && !hidden && missing.length ? <Text style={styles.muted} testID={`listing-missing-${listing.id}`}>{missingShort(missing, t)}</Text> : null}
      {sheet && !hidden && (noSheet || listing.completeness === "INCOMPLETE") ? <Text style={styles.muted} testID={`listing-not-gift-${listing.id}`}>{t("portal.product.notGift")}</Text> : null}
      {listing.type === "SERVICE" && !hidden ? (
        <View style={{ gap: spacing[3] }}>
          <View style={{ alignSelf: "flex-start" }}>
            <ActionButton variant="secondary" icon="upload" label={t(photosOpen ? "portal.services.photos.hide" : "portal.services.photos.show")} onPress={() => setPhotosOpen((current) => !current)} testID={`listing-photos-${listing.id}`} />
          </View>
          {photosOpen ? <ServicePhotos providerId={provider.id} listingId={listing.id} /> : null}
        </View>
      ) : null}
      {sheet && !hidden && !noSheet ? (
        <View style={{ alignSelf: "flex-start" }}>
          <ActionButton variant="secondary" icon="arrow" label={t("portal.product.actions.edit")} onPress={() => router.push(productHref(listing.id, missing[0] ? MISSING_STEP[missing[0]] : "summary") as Href)} testID={`listing-edit-${listing.id}`} />
        </View>
      ) : null}
    </View>
  );
}

/** Short form with progressive disclosure: what you offer, how they reach you, how you deliver. City, a second contact and transport hide behind "More options". */
function NewOffer({ providerId, onClose, onCreated }: { readonly providerId: string; readonly onClose: () => void; readonly onCreated: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const router = useRouter();
  const create = useCreateOwnListing(client, providerId, locale);
  const categories = useOfferCategories(client, locale);
  const geo = useProviderGeo(client);
  const cities = geo.data?.items;
  const createOnce = useSingleMutation(create);
  const [kind, setKind] = useState<Kind>("SERVICE");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryByKind, setCategoryByKind] = useState<Partial<Record<Kind, string>>>({ SERVICE: "DECORATION" });
  const [city, setCity] = useState(DEFAULT_CITY);
  const [whatsapp, setWhatsapp] = useState("");
  const [site, setSite] = useState("");
  const [responsible, setResponsible] = useState<"PROVIDER" | "CUSTOMER">("PROVIDER");
  const [coverage, setCoverage] = useState<readonly string[]>([]);
  const [transport, setTransport] = useState("");
  const [lead, setLead] = useState("");
  const [conditions, setConditions] = useState("");
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const isProduct = kind === "PRODUCT";
  const categoryLabel = t(isProduct ? "portal.services.new.productCategory" : "portal.services.new.category");
  const categoryOptions = (categories.data?.items ?? [])
    .filter((item) => item.listingType === kind || item.listingType === null || (item.listingType === undefined && !isProduct))
    .map((item) => ({ value: item.code, label: item.name, listingType: item.listingType }));
  const category = categoryOptions.find((option) => option.value === categoryByKind[kind])?.value
    ?? categoryOptions.find((option) => option.listingType === kind)?.value
    ?? categoryOptions[0]?.value;

  const submit = (): void => {
    if (!category) return;
    const found: string[] = [];
    const destinations: Record<string, string> = {};
    if (whatsapp.trim()) destinations["WHATSAPP"] = whatsapp.trim();
    if (site.trim()) destinations["OFFICIAL_SITE"] = site.trim();
    const zones = [...coverage];
    const priceMinor = price.trim() ? parseMinor(price) : undefined;
    const transportMinor = transport.trim() ? parseMinor(transport) : undefined;
    const leadDays = Number(lead);
    if (!name.trim()) found.push(t("portal.services.errors.name"));
    else if (name.trim().length > MAX_TITLE) found.push(t("portal.services.errors.nameLong"));
    if (Object.keys(destinations).length === 0) found.push(t("portal.services.errors.destination"));
    else if (Object.values(destinations).some((url) => !HTTPS.test(url))) found.push(t("portal.services.errors.url"));
    if (zones.length === 0) found.push(t("portal.services.errors.coverage"));
    if (priceMinor === null || transportMinor === null) found.push(t("portal.services.errors.price"));
    if (!conditions.trim()) found.push(t("portal.services.errors.conditions"));
    if (lead.trim() === "" || !Number.isInteger(leadDays) || leadDays < 0) found.push(t("portal.services.errors.lead"));
    setErrors(found);
    if (found.length) return;
    const body: CreateListingInput = {
      type: kind, category, city, titles: { [locale]: name.trim() }, destinations,
      fulfillment: { responsible, coverageZones: zones, ...(typeof transportMinor === "number" ? { transportCostMinor: transportMinor } : {}), leadTimeDays: leadDays, conditions: { [locale]: conditions.trim() } },
      ...(typeof priceMinor === "number" ? { priceFromMinor: priceMinor } : {})
    };
    createOnce(body, { onSuccess: () => { setName(""); setPrice(""); onCreated(); } });
  };
  const kindChoice = <ChoiceGroup<Kind> label={t("portal.services.new.kind")} value={kind} onChange={setKind} disabled={create.isPending} choices={[{ value: "SERVICE", label: t("portal.services.type.SERVICE") }, { value: "PRODUCT", label: t("portal.services.type.PRODUCT"), testID: "kind-product" }]} />;
  // R2: a product is a whole sheet (photos, price, ideas, delivery), so it is created in its own step-by-step editor.
  if (isProduct) return (
    <Section title={t("portal.services.new.title")}>
      {kindChoice}
      <Text style={styles.body}>{t("portal.product.newOffer.productHint")}</Text>
      <StickyActions ground="surface">
        <ActionButton icon="arrow" label={t("portal.product.newOffer.productStart")} onPress={() => router.push(PRODUCT_NEW_ROUTE as Href)} testID="product-start" />
        <ActionButton icon="close" variant="secondary" label={t("portal.services.new.cancel")} onPress={onClose} testID="offer-new-close" />
      </StickyActions>
    </Section>
  );
  return (
    <Section title={t("portal.services.new.title")}>
      {kindChoice}
      <Field label={t(isProduct ? "portal.services.new.productName" : "portal.services.new.name")} value={name} onChange={setName} testID="listing-name" />
      <View style={{ gap: spacing[1] }}>
        <Text style={styles.label}>{categoryLabel}</Text>
        {category ? (
          <FilterSelect label={categoryLabel} value={category} onChange={(value) => setCategoryByKind((current) => ({ ...current, [kind]: value }))} options={categoryOptions} testID="listing-category" />
        ) : categories.isPending ? (
          <Text style={styles.muted} accessibilityLiveRegion="polite">{t("portal.services.new.loadingCategories")}</Text>
        ) : categories.isError ? (
          <ErrorNotice error={categories.error} onRetry={() => { void categories.refetch(); }} />
        ) : (
          <Text style={styles.muted} accessibilityLiveRegion="polite">{t("portal.services.new.emptyCategories")}</Text>
        )}
      </View>
      <Field label={t(isProduct ? "portal.services.new.productPrice" : "portal.services.new.price")} value={price} onChange={setPrice} help={t("portal.services.new.priceHelp")} keyboardType="decimal-pad" testID="listing-price" />
      <Field label={t("portal.services.new.whatsapp")} value={whatsapp} onChange={setWhatsapp} help={t("portal.services.new.destinationsHelp")} keyboardType="url" testID="listing-whatsapp" />
      <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.services.new.fulfillmentTitle")}</Text>
      <CoveragePicker cities={cities} value={coverage} onChange={setCoverage} label={t("portal.services.new.coverage")} help={t("portal.services.new.coverageHelp")} failed={geo.isError} />
      {geo.isError ? <ErrorNotice error={geo.error} onRetry={() => { void geo.refetch(); }} /> : null}
      <Field label={t("portal.services.new.lead")} value={lead} onChange={setLead} keyboardType="number-pad" testID="listing-lead" />
      <Field label={t("portal.services.new.conditions")} value={conditions} onChange={setConditions} multiline testID="listing-conditions" />
      <MoreToggle label={t(more ? "portal.home.less" : "portal.home.more")} onPress={() => setMore((current) => !current)} testID="offer-more" />
      {more ? (
        <View style={{ gap: spacing[3] }}>
          <ChoiceGroup<"PROVIDER" | "CUSTOMER"> label={t("portal.services.new.responsible")} value={responsible} onChange={setResponsible} choices={[{ value: "PROVIDER", label: t("portal.services.new.responsibleProvider") }, { value: "CUSTOMER", label: t("portal.services.new.responsibleCustomer") }]} />
          {cities?.length ? <View style={{ gap: spacing[1] }}><Text style={styles.label}>{t("portal.services.new.city")}</Text><FilterSelect label={t("portal.services.new.city")} value={city} onChange={setCity} options={cities.map((option) => ({ value: option.slug, label: cityLabel(option) }))} testID="listing-city" /></View> : null}
          <Field label={t("portal.services.new.site")} value={site} onChange={setSite} keyboardType="url" testID="listing-site" />
          <Field label={t("portal.services.new.transport")} value={transport} onChange={setTransport} keyboardType="decimal-pad" testID="listing-transport" />
        </View>
      ) : null}
      {errors.length ? <Notice kind="error">{errors.map((message) => <Text key={message} style={styles.body}>{message}</Text>)}</Notice> : null}
      <ErrorNotice error={create.error} onRetry={submit} />
      <StickyActions ground="surface">
        <ActionButton icon="plus" label={create.isPending ? t("portal.services.new.creating") : t("portal.services.new.submit")} busy={create.isPending} disabled={create.isPending || !category} onPress={submit} testID="listing-submit" />
        <ActionButton icon="close" variant="secondary" label={t("portal.services.new.cancel")} disabled={create.isPending} onPress={onClose} testID="offer-new-close" />
      </StickyActions>
    </Section>
  );
}

/**
 * D5/D6/D8 · Offers: services, products and their delivery terms as ONE list with a state (draft / published).
 * «Nueva oferta» is the single primary action (top right of the header, bottom bar on a phone) and hides while the form is open, which has its own bar.
 * The backend has no edit, archive or delete of an offer (provider-catalog), so the row offers only "Publish", inside its menu.
 */
function Offers({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const listings = useOwnListings(client, provider.id, locale);
  const geo = useProviderGeo(client);
  const publish = usePublishListing(client, provider.id, locale);
  const publishOnce = useSingleMutation(publish);
  const duplicate = useDuplicateListing(client, provider.id, locale);
  const duplicateKeys = useRef(new Map<string, string>());
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(false);
  const items = listings.data?.items ?? [];
  const open = (): void => { setCreated(false); setAdding(true); };
  /** One Idempotency-Key per source listing until it answers, so a double tap or a retry never makes two copies (PF-4). */
  const duplicateOnce = (listingId: string): void => {
    if (duplicate.isPending) return;
    let key = duplicateKeys.current.get(listingId);
    if (!key) { key = newIdempotencyKey(); duplicateKeys.current.set(listingId, key); }
    duplicate.mutate({ listingId, idempotencyKey: key }, { onSuccess: (copy) => { duplicateKeys.current.delete(listingId); router.push(productHref(copy.id, "photos", "&copia=1") as Href); } });
  };
  usePortalHeader(adding || !listings.data ? undefined : { icon: "plus", label: t("portal.services.add"), onPress: open, testID: "offer-new" });
  return (
    <View style={{ gap: spacing[6] }}>
      <PageIntro>{t("portal.services.intro")}</PageIntro>
      {created ? <SuccessNote message={t("portal.services.new.created")} /> : null}
      {adding ? <NewOffer providerId={provider.id} onClose={() => setAdding(false)} onCreated={() => { setCreated(true); setAdding(false); }} /> : null}
      {listings.isPending ? <RowsSkeleton count={3} minHeight={110} /> : listings.isError ? <PortalErrorState error={listings.error} onRetry={() => { void listings.refetch(); }} /> : items.length === 0 ? (
        adding ? null : <EmptyState illustration="noOffers" title={t("portal.services.emptyTitle")} body={t("portal.services.empty")} />
      ) : (
        <View>
          {publish.isSuccess ? <Enter key={String(publish.submittedAt)} from="down"><View style={[styles.row, { flexWrap: "nowrap", paddingBottom: spacing[3] }]} testID="offer-published"><Illustration name="offerPublished" tone="auto" size="sm" /><View style={{ flex: 1 }}><SuccessNote message={t("portal.services.publishedNote")} detail={t("portal.services.publishedDetail")} /></View></View></Enter> : null}
          <Stagger>{items.map((listing) => <OfferRow key={listing.id} provider={provider} listing={listing} cities={geo.data?.items} publishing={publish.isPending && publish.variables === listing.id} duplicating={duplicate.isPending && duplicate.variables?.listingId === listing.id} onPublish={() => publishOnce(listing.id)} onDuplicate={() => duplicateOnce(listing.id)} />)}</Stagger>
          {items.some((listing) => listing.type === "SERVICE") ? <Text style={[styles.muted, { paddingTop: spacing[3] }]}>{t("portal.delivery.fixedNote")}</Text> : null}
        </View>
      )}
      {/* R2: the catalog's own refusals (LISTING_INCOMPLETE with what is missing, CONTACT_IN_TEXT with the fragment…) are worded per code. */}
      <SheetErrorNotice error={publish.error} onRetry={() => { if (publish.variables) publishOnce(publish.variables); }}
        onMissing={(codes) => <MissingList missing={codes} title={false} onOpen={(step) => { if (publish.variables) router.push(productHref(publish.variables, step) as Href); }} />} />
      <SheetErrorNotice error={duplicate.error} onRetry={() => { if (duplicate.variables) duplicateOnce(duplicate.variables.listingId); }} />
    </View>
  );
}

const offersScreen = (current: PortalRoute) => function OffersScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t(current === "services" ? "portal.services.title" : `portal.nav.${current}`)} current={current}>{(provider) => <Offers provider={provider} />}</PortalScreen>;
};

/** The three old entries (services, products, delivery) open the same list; the routes stay so shared links keep working. */
export const ServicesScreen = offersScreen("services");
export const ProductsScreen = offersScreen("products");
export const DeliveryScreen = offersScreen("delivery");
