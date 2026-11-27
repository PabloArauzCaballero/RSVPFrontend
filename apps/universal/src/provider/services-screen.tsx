import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { Chip, Enter, Stagger, fonts, useColors } from "@rsvp/ui";
import { useCreateOwnListing, useOfferCategories, useOwnListings, useProviderGeo, usePublishListing, type CreateListingInput, type OwnListing, type Provider, type ProviderGeoCity } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, EmptyState, Field, FilterSelect, Illustration, Notice, OverflowMenu, PageIntro, Section, SuccessNote, ToggleChip, useStyles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice, PortalErrorState } from "./errors";
import { parseMinor } from "../host/gifts/money";
import { PortalScreen, usePortalHeader, type PortalRoute } from "./frame";
import { useSingleMutation } from "../platform/single-flight";
import { MoreToggle, RowsSkeleton, StickyActions } from "./parts";

const MAX_TITLE = 120;
const MAX_IMAGE_URL = 500;
const HTTPS = /^https:\/\/[^\s]+$/i;
type Kind = CreateListingInput["type"];
const DEFAULT_CITY = "la-paz";

/** People read "Santa Cruz de la Sierra"; the catalogue stores "santa-cruz". Unknown slugs (a city retired later) stay as they are. */
const cityName = (cities: readonly ProviderGeoCity[] | undefined, slug: string): string => cities?.find((city) => city.slug === slug)?.name ?? slug;
const cityLabel = (city: ProviderGeoCity): string => (city.name === city.department ? city.name : `${city.name} (${city.department})`);

function isPhotoUrl(value: string): boolean {
  if (!HTTPS.test(value) || value.length > MAX_IMAGE_URL) return false;
  try {
    const url = new URL(value);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** One offer as a row: the name, its state and ONE line of delivery terms. "Publicar" lives in the row's "⋯" menu (a draft without terms shows it off, with the reason under the terms). */
function OfferRow({ provider, listing, cities, publishing, onPublish }: { readonly provider: Provider; readonly listing: OwnListing; readonly cities: readonly ProviderGeoCity[] | undefined; readonly publishing: boolean; readonly onPublish: () => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const f = listing.fulfillment;
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
        {listing.published || hidden ? null : <OverflowMenu label={t("portal.services.rowMenu", { title: listing.title })} items={[{ key: "publish", label: publishing ? t("portal.services.publishing") : t("portal.services.publish"), disabled: !listing.fulfillment || publishing, onPress: onPublish }]} />}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: spacing[3] }}>
        {listing.priceFromMinor !== undefined ? <Text style={{ color: palette.text, fontSize: 26, lineHeight: 30, fontWeight: "500", letterSpacing: -0.6, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }}>{formatMinor(listing.priceFromMinor, provider.currency, locale)}</Text> : null}
        <Text style={styles.muted}>{t(`portal.services.type.${listing.type === "SERVICE" ? "SERVICE" : "PRODUCT"}`)}</Text>
      </View>
      <View style={{ gap: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }} testID={`delivery-${listing.id}`}>
        {terms ? <><Text style={styles.muted}>{terms}</Text>{f?.conditions ? <Text style={styles.body}>{f.conditions}</Text> : null}</> : listing.published ? <Notice kind="error">{t("portal.delivery.missing")}</Notice> : null}
      </View>
      {hidden ? <Notice kind="error"><Text style={styles.body} testID={`listing-hidden-${listing.id}`}>{t("portal.services.hidden.CATEGORY_TYPE_MISMATCH")}</Text></Notice> : null}
      {!listing.published && !listing.fulfillment && !hidden ? <Text style={styles.muted} testID={`publish-blocked-${listing.id}`}>{t("portal.services.needsTerms")}</Text> : null}
    </View>
  );
}

/** Coverage as the catalogue's cities, by name (GET /providers/geo): no slugs to type, nothing the server will reject as unknown. */
function CoveragePicker({ cities, value, onChange }: { readonly cities: readonly ProviderGeoCity[] | undefined; readonly value: readonly string[]; readonly onChange: (next: readonly string[]) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const toggle = (slug: string): void => onChange(value.includes(slug) ? value.filter((zone) => zone !== slug) : [...value, slug]);
  return (
    <View role="group" aria-label={t("portal.services.new.coverage")} style={{ gap: spacing[2] }}>
      <Text style={styles.label}>{t("portal.services.new.coverage")}</Text>
      <Text style={styles.muted}>{t("portal.services.new.coverageHelp")}</Text>
      {cities ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {cities.map((city) => <ToggleChip key={city.slug} label={city.name} on={value.includes(city.slug)} onPress={() => toggle(city.slug)} testID={`coverage-${city.slug}`} />)}
        </View>
      ) : <RowsSkeleton count={1} minHeight={44} />}
    </View>
  );
}

/** Short form with progressive disclosure: what you offer, how they reach you, how you deliver. City, a second contact and transport hide behind "More options". */
function NewOffer({ providerId, onClose, onCreated }: { readonly providerId: string; readonly onClose: () => void; readonly onCreated: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const create = useCreateOwnListing(client, providerId, locale);
  const categories = useOfferCategories(client, locale);
  const geo = useProviderGeo(client);
  const cities = geo.data?.items;
  const createOnce = useSingleMutation(create);
  const [kind, setKind] = useState<Kind>("SERVICE");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryByKind, setCategoryByKind] = useState<Partial<Record<Kind, string>>>({ SERVICE: "DECORATION" });
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
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
    const photo = isProduct ? imageUrl.trim().replace(/^https:/i, "https:") : "";
    const invalidPhoto = Boolean(photo) && !isPhotoUrl(photo);
    setImageError(invalidPhoto);
    if (!name.trim()) found.push(t("portal.services.errors.name"));
    else if (name.trim().length > MAX_TITLE) found.push(t("portal.services.errors.nameLong"));
    if (Object.keys(destinations).length === 0) found.push(t("portal.services.errors.destination"));
    else if (Object.values(destinations).some((url) => !HTTPS.test(url))) found.push(t("portal.services.errors.url"));
    if (zones.length === 0) found.push(t("portal.services.errors.coverage"));
    if (priceMinor === null || transportMinor === null) found.push(t("portal.services.errors.price"));
    if (!conditions.trim()) found.push(t("portal.services.errors.conditions"));
    if (lead.trim() === "" || !Number.isInteger(leadDays) || leadDays < 0) found.push(t("portal.services.errors.lead"));
    setErrors(found);
    if (found.length || invalidPhoto) return;
    const body: CreateListingInput = {
      type: kind, category, city, titles: { [locale]: name.trim() }, destinations,
      fulfillment: { responsible, coverageZones: zones, ...(typeof transportMinor === "number" ? { transportCostMinor: transportMinor } : {}), leadTimeDays: leadDays, conditions: { [locale]: conditions.trim() } },
      ...(typeof priceMinor === "number" ? { priceFromMinor: priceMinor } : {}),
      ...(photo ? { imageUrl: photo } : {})
    };
    createOnce(body, { onSuccess: () => { setName(""); setPrice(""); onCreated(); } });
  };
  return (
    <Section title={t("portal.services.new.title")}>
      <ChoiceGroup<Kind> label={t("portal.services.new.kind")} value={kind} onChange={setKind} disabled={create.isPending} choices={[{ value: "SERVICE", label: t("portal.services.type.SERVICE") }, { value: "PRODUCT", label: t("portal.services.type.PRODUCT") }]} />
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
      {isProduct ? <Field label={t("portal.services.new.imageUrl")} value={imageUrl} onChange={(value) => { setImageUrl(value); setImageError(false); }} help={t("portal.services.new.imageHelp")} error={imageError ? t("portal.services.errors.imageUrl") : undefined} keyboardType="url" testID="listing-image-url" /> : null}
      <Field label={t("portal.services.new.whatsapp")} value={whatsapp} onChange={setWhatsapp} help={t("portal.services.new.destinationsHelp")} keyboardType="url" testID="listing-whatsapp" />
      <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.services.new.fulfillmentTitle")}</Text>
      <CoveragePicker cities={cities} value={coverage} onChange={setCoverage} />
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
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(false);
  const items = listings.data?.items ?? [];
  const open = (): void => { setCreated(false); setAdding(true); };
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
          <Stagger>{items.map((listing) => <OfferRow key={listing.id} provider={provider} listing={listing} cities={geo.data?.items} publishing={publish.isPending && publish.variables === listing.id} onPublish={() => publishOnce(listing.id)} />)}</Stagger>
          <Text style={[styles.muted, { paddingTop: spacing[3] }]}>{t("portal.delivery.fixedNote")}</Text>
        </View>
      )}
      <ErrorNotice error={publish.error} onRetry={() => { if (publish.variables) publishOnce(publish.variables); }} />
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
