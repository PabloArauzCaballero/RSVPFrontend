import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { Chip, Enter, Stagger, useColors } from "@rsvp/ui";
import { useCreateOwnListing, useOwnListings, usePublishListing, type CreateListingInput, type OwnListing, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, EmptyState, Field, Illustration, Notice, PageIntro, Section, SuccessNote, useStyles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice, PortalErrorState } from "./errors";
import { parseMinor } from "../host/gifts/money";
import { PortalScreen, type PortalRoute } from "./frame";
import { useSingleMutation } from "../platform/single-flight";
import { MoreToggle, RowsSkeleton, StickyActions } from "./parts";

const CATEGORIES = ["VENUE", "CATERING", "PHOTOGRAPHY", "MUSIC", "DECORATION", "MAKEUP", "TRANSPORT", "INVITATIONS", "WEDDING_PLANNER", "ACCOMMODATION", "HONEYMOON"] as const;
const MAX_TITLE = 120;
const HTTPS = /^https:\/\/[^\s]+$/i;
type Kind = "SERVICE" | "PRODUCT";

/** One offer as a row: the name, its state, and the delivery terms the guests will read, all in one place (no separate screen). */
function OfferRow({ provider, listing, publishing, onPublish }: { readonly provider: Provider; readonly listing: OwnListing; readonly publishing: boolean; readonly onPublish: () => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const styles = useStyles();
  const palette = useColors();
  const f = listing.fulfillment;
  return (
    <View style={{ gap: spacing[2], paddingVertical: spacing[4], borderTopWidth: 1, borderTopColor: palette.border }} testID={`listing-${listing.id}`}>
      <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}>
        <Text accessibilityRole="header" style={[styles.subtitle, { flex: 1 }]}>{listing.title}</Text>
        <View testID={`listing-state-${listing.id}`}><Chip tone={listing.published ? "yes" : "wait"}>{listing.published ? t("portal.services.published") : t("portal.services.draft")}</Chip></View>
      </View>
      <Text style={styles.muted}>{t(`portal.services.type.${listing.type === "SERVICE" ? "SERVICE" : "PRODUCT"}`)}{listing.priceFromMinor !== undefined ? ` · ${formatMinor(listing.priceFromMinor, provider.currency, locale)}` : ""}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: spacing[4], rowGap: spacing[1] }} testID={`delivery-${listing.id}`}>
        {f ? (
          <>
            <Text style={styles.muted}>{t("portal.delivery.responsible", { who: f.responsible === "PROVIDER" ? t("portal.services.new.responsibleProvider") : t("portal.services.new.responsibleCustomer") })}</Text>
            <Text style={styles.muted}>{t("portal.delivery.coverage", { zones: f.coverageZones.join(", ") || "-" })}</Text>
            <Text style={styles.muted}>{t("portal.delivery.transport", { price: f.transportCostMinor === undefined ? t("portal.delivery.noTransport") : formatMinor(f.transportCostMinor, provider.currency, locale) })}</Text>
            <Text style={styles.muted}>{t("portal.delivery.lead", { days: f.leadTimeDays })}</Text>
            {f.conditions ? <Text style={[styles.body, { width: "100%" }]}>{f.conditions}</Text> : null}
          </>
        ) : <Notice kind="error">{t("portal.delivery.missing")}</Notice>}
      </View>
      {!listing.published && !listing.fulfillment ? <Text style={styles.muted} testID={`publish-blocked-${listing.id}`}>{t("portal.services.needsTerms")}</Text> : null}
      {!listing.published ? <View style={styles.row}><ActionButton variant="secondary" label={publishing ? t("portal.services.publishing") : t("portal.services.publish")} busy={publishing} disabled={!listing.fulfillment || publishing} onPress={onPublish} testID={`publish-${listing.id}`} /></View> : null}
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
      <ChoiceGroup<string> label={t("portal.services.new.category")} value={category} onChange={setCategory} choices={CATEGORIES.map((value) => ({ value, label: t(`directory.category.${value}`) }))} />
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
        <ActionButton label={create.isPending ? t("portal.services.new.creating") : t("portal.services.new.submit")} busy={create.isPending} disabled={create.isPending} onPress={submit} testID="listing-submit" />
        <ActionButton variant="secondary" label={t("portal.services.new.cancel")} disabled={create.isPending} onPress={onClose} testID="offer-new-close" />
      </StickyActions>
    </Section>
  );
}

/**
 * D5/D6/D8 · Offers: services, products and their delivery terms as ONE list with a state (draft / published).
 * The backend has no edit, archive or delete of an offer (provider-catalog), so the row offers only "Publish".
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
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.services.intro")}</PageIntro>
      {created ? <SuccessNote message={t("portal.services.new.created")} /> : null}
      {adding ? <NewOffer providerId={provider.id} onClose={() => setAdding(false)} onCreated={() => { setCreated(true); setAdding(false); }} /> : null}
      {listings.isPending ? <RowsSkeleton count={3} minHeight={132} /> : listings.isError ? <PortalErrorState error={listings.error} onRetry={() => { void listings.refetch(); }} /> : items.length === 0 ? (
        adding ? null : <EmptyState illustration="noOffers" title={t("portal.services.emptyTitle")} body={t("portal.services.empty")} action={<ActionButton label={t("portal.services.emptyAction")} onPress={() => { setCreated(false); setAdding(true); }} testID="offer-new" />} />
      ) : (
        <View style={{ maxWidth: 720 }}>
          <View style={[styles.row, { justifyContent: "space-between", paddingBottom: spacing[2] }]}>
            <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.services.listTitle", { count: items.length })}</Text>
            {adding ? null : <ActionButton label={t("portal.services.add")} onPress={() => { setCreated(false); setAdding(true); }} testID="offer-new" />}
          </View>
          {publish.isSuccess ? <Enter key={String(publish.submittedAt)} from="down"><View style={[styles.row, { flexWrap: "nowrap", paddingBottom: spacing[3] }]} testID="offer-published"><Illustration name="offerPublished" tone="auto" size="sm" /><View style={{ flex: 1 }}><SuccessNote message={t("portal.services.publishedNote")} detail={t("portal.services.publishedDetail")} /></View></View></Enter> : null}
          <Stagger>{items.map((listing) => <OfferRow key={listing.id} provider={provider} listing={listing} publishing={publish.isPending && publish.variables === listing.id} onPublish={() => publishOnce(listing.id)} />)}</Stagger>
          <Notice>{t("portal.delivery.fixedNote")}</Notice>
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
