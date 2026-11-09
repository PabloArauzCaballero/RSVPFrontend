import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { Chip, Enter, Stagger, fonts, useColors } from "@rsvp/ui";
import { useCreateOwnListing, useOwnListings, usePublishListing, type CreateListingInput, type OwnListing, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, EmptyState, Field, FilterSelect, Illustration, Notice, OverflowMenu, PageIntro, Section, SuccessNote, useStyles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice, PortalErrorState } from "./errors";
import { parseMinor } from "../host/gifts/money";
import { PortalScreen, usePortalHeader, type PortalRoute } from "./frame";
import { useSingleMutation } from "../platform/single-flight";
import { MoreToggle, RowsSkeleton, StickyActions } from "./parts";

const CATEGORIES = ["VENUE", "CATERING", "PHOTOGRAPHY", "MUSIC", "DECORATION", "MAKEUP", "TRANSPORT", "INVITATIONS", "WEDDING_PLANNER", "ACCOMMODATION", "HONEYMOON"] as const;
const MAX_TITLE = 120;
const HTTPS = /^https:\/\/[^\s]+$/i;
type Kind = "SERVICE" | "PRODUCT";

/** One offer as a row: the name, its state and ONE line of delivery terms. "Publicar" lives in the row's "⋯" menu (a draft without terms shows it off, with the reason under the terms). */
function OfferRow({ provider, listing, publishing, onPublish }: { readonly provider: Provider; readonly listing: OwnListing; readonly publishing: boolean; readonly onPublish: () => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const f = listing.fulfillment;
  const terms = f ? [
    t("portal.delivery.responsible", { who: f.responsible === "PROVIDER" ? t("portal.services.new.responsibleProvider") : t("portal.services.new.responsibleCustomer") }),
    t("portal.delivery.coverage", { zones: f.coverageZones.join(", ") || "-" }),
    t("portal.delivery.transport", { price: f.transportCostMinor === undefined ? t("portal.delivery.noTransport") : formatMinor(f.transportCostMinor, provider.currency, locale) }),
    t("portal.delivery.lead", { days: f.leadTimeDays })
  ].join(" · ") : null;
  return (
    <View style={{ gap: spacing[3], padding: spacing[6], marginBottom: spacing[4], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg }} testID={`listing-${listing.id}`}>
      <View style={[styles.row, { justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap" }]}>
        <Text accessibilityRole="header" style={[styles.subtitle, { flex: 1 }]}>{listing.title}</Text>
        <View testID={`listing-state-${listing.id}`}><Chip tone={listing.published ? "yes" : "wait"}>{listing.published ? t("portal.services.published") : t("portal.services.draft")}</Chip></View>
        {listing.published ? null : <OverflowMenu label={t("portal.services.rowMenu", { title: listing.title })} items={[{ key: "publish", label: publishing ? t("portal.services.publishing") : t("portal.services.publish"), disabled: !listing.fulfillment || publishing, onPress: onPublish }]} />}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: spacing[3] }}>
        {listing.priceFromMinor !== undefined ? <Text style={{ color: palette.text, fontSize: 26, lineHeight: 30, fontWeight: "500", letterSpacing: -0.6, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }}>{formatMinor(listing.priceFromMinor, provider.currency, locale)}</Text> : null}
        <Text style={styles.muted}>{t(`portal.services.type.${listing.type === "SERVICE" ? "SERVICE" : "PRODUCT"}`)}</Text>
      </View>
      <View style={{ gap: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: palette.border }} testID={`delivery-${listing.id}`}>
        {terms ? <><Text style={styles.muted}>{terms}</Text>{f?.conditions ? <Text style={styles.body}>{f.conditions}</Text> : null}</> : listing.published ? <Notice kind="error">{t("portal.delivery.missing")}</Notice> : null}
      </View>
      {!listing.published && !listing.fulfillment ? <Text style={styles.muted} testID={`publish-blocked-${listing.id}`}>{t("portal.services.needsTerms")}</Text> : null}
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
  const createOnce = useSingleMutation(create);
  const [kind, setKind] = useState<Kind>("SERVICE");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("DECORATION");
  const [city, setCity] = useState("la-paz");
  const [whatsapp, setWhatsapp] = useState("");
  const [site, setSite] = useState("");
  const [responsible, setResponsible] = useState<"PROVIDER" | "CUSTOMER">("PROVIDER");
  const [coverage, setCoverage] = useState("");
  const [transport, setTransport] = useState("");
  const [lead, setLead] = useState("");
  const [conditions, setConditions] = useState("");
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const submit = (): void => {
    const found: string[] = [];
    const destinations: Record<string, string> = {};
    if (whatsapp.trim()) destinations["WHATSAPP"] = whatsapp.trim();
    if (site.trim()) destinations["OFFICIAL_SITE"] = site.trim();
    const zones = coverage.split(",").map((zone) => zone.trim()).filter(Boolean);
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
      type: kind, category, city: city.trim() || "la-paz", titles: { [locale]: name.trim() }, destinations,
      fulfillment: { responsible, coverageZones: zones, ...(typeof transportMinor === "number" ? { transportCostMinor: transportMinor } : {}), leadTimeDays: leadDays, conditions: { [locale]: conditions.trim() } },
      ...(typeof priceMinor === "number" ? { priceFromMinor: priceMinor } : {})
    };
    createOnce(body, { onSuccess: () => { setName(""); setPrice(""); onCreated(); } });
  };
  return (
    <Section title={t("portal.services.new.title")}>
      <ChoiceGroup<Kind> label={t("portal.services.new.kind")} value={kind} onChange={setKind} choices={[{ value: "SERVICE", label: t("portal.services.type.SERVICE") }, { value: "PRODUCT", label: t("portal.services.type.PRODUCT") }]} />
      <Field label={t("portal.services.new.name")} value={name} onChange={setName} testID="listing-name" />
      <View style={{ gap: spacing[1] }}><Text style={styles.label}>{t("portal.services.new.category")}</Text><FilterSelect label={t("portal.services.new.category")} value={category} onChange={setCategory} options={CATEGORIES.map((value) => ({ value, label: t(`directory.category.${value}`) }))} testID="listing-category" /></View>
      <Field label={t("portal.services.new.price")} value={price} onChange={setPrice} help={t("portal.services.new.priceHelp")} keyboardType="decimal-pad" testID="listing-price" />
      <Field label={t("portal.services.new.whatsapp")} value={whatsapp} onChange={setWhatsapp} help={t("portal.services.new.destinationsHelp")} keyboardType="url" testID="listing-whatsapp" />
      <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.services.new.fulfillmentTitle")}</Text>
      <Field label={t("portal.services.new.coverage")} value={coverage} onChange={setCoverage} help={t("portal.services.new.coverageHelp")} testID="listing-coverage" />
      <Field label={t("portal.services.new.lead")} value={lead} onChange={setLead} keyboardType="number-pad" testID="listing-lead" />
      <Field label={t("portal.services.new.conditions")} value={conditions} onChange={setConditions} multiline testID="listing-conditions" />
      <MoreToggle label={t(more ? "portal.home.less" : "portal.home.more")} onPress={() => setMore((current) => !current)} testID="offer-more" />
      {more ? (
        <View style={{ gap: spacing[3] }}>
          <ChoiceGroup<"PROVIDER" | "CUSTOMER"> label={t("portal.services.new.responsible")} value={responsible} onChange={setResponsible} choices={[{ value: "PROVIDER", label: t("portal.services.new.responsibleProvider") }, { value: "CUSTOMER", label: t("portal.services.new.responsibleCustomer") }]} />
          <Field label={t("portal.services.new.city")} value={city} onChange={setCity} testID="listing-city" />
          <Field label={t("portal.services.new.site")} value={site} onChange={setSite} keyboardType="url" testID="listing-site" />
          <Field label={t("portal.services.new.transport")} value={transport} onChange={setTransport} keyboardType="decimal-pad" testID="listing-transport" />
        </View>
      ) : null}
      {errors.length ? <Notice kind="error">{errors.map((message) => <Text key={message} style={styles.body}>{message}</Text>)}</Notice> : null}
      <ErrorNotice error={create.error} onRetry={submit} />
      <StickyActions ground="surface">
        <ActionButton icon="plus" label={create.isPending ? t("portal.services.new.creating") : t("portal.services.new.submit")} busy={create.isPending} disabled={create.isPending} onPress={submit} testID="listing-submit" />
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
  const publish = usePublishListing(client, provider.id, locale);
  const publishOnce = useSingleMutation(publish);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(false);
  const items = listings.data?.items ?? [];
  const open = (): void => { setCreated(false); setAdding(true); };
  usePortalHeader(adding || !listings.data ? undefined : { label: t("portal.services.add"), onPress: open, testID: "offer-new" });
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
          <Stagger>{items.map((listing) => <OfferRow key={listing.id} provider={provider} listing={listing} publishing={publish.isPending && publish.variables === listing.id} onPublish={() => publishOnce(listing.id)} />)}</Stagger>
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
