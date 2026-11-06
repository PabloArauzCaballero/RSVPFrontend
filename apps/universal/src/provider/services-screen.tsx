import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { useCreateOwnListing, useOwnListings, usePublishListing, type CreateListingInput, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, Field, Loading, Notice, Section, styles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { parseMinor } from "../host/gifts/money";
import { PortalScreen } from "./frame";
import { useSingleMutation } from "../platform/single-flight";

const CATEGORIES = ["VENUE", "CATERING", "PHOTOGRAPHY", "MUSIC", "DECORATION", "MAKEUP", "TRANSPORT", "INVITATIONS", "WEDDING_PLANNER", "ACCOMMODATION", "HONEYMOON"] as const;
const MAX_TITLE = 120;
const HTTPS = /^https:\/\/[^\s]+$/i;
type Kind = "SERVICE" | "PRODUCT";

/** D5/D6 · Services and products: create (with delivery conditions, D8) and publish. */
function Listings({ provider, kind }: { readonly provider: Provider; readonly kind: Kind }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const listings = useOwnListings(client, provider.id, locale);
  const create = useCreateOwnListing(client, provider.id, locale);
  const createOnce = useSingleMutation(create);
  const publish = usePublishListing(client, provider.id, locale);
  const publishOnce = useSingleMutation(publish);
  const visible = (listings.data?.items ?? []).filter((listing) => listing.type === kind);
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
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [created, setCreated] = useState(false);
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
    setCreated(false);
    createOnce(body, { onSuccess: () => { setCreated(true); setName(""); setPrice(""); } });
  };

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t(kind === "PRODUCT" ? "portal.products.intro" : "portal.services.intro")}</Text>
      {listings.isPending ? <Loading /> : listings.isError ? <ErrorNotice error={listings.error} onReload={() => { void listings.refetch(); }} /> : visible.length === 0 ? <Notice>{t(kind === "PRODUCT" ? "portal.products.empty" : "portal.services.empty")}</Notice> : visible.map((listing) => (
        <View key={listing.id} style={[styles.card, { gap: spacing[1] }]} testID={`listing-${listing.id}`}>
          <Text style={styles.subtitle}>{listing.title}</Text>
          <Text style={styles.body}>{t(`portal.services.type.${listing.type === "SERVICE" ? "SERVICE" : "PRODUCT"}`)}{listing.priceFromMinor !== undefined ? ` · ${formatMinor(listing.priceFromMinor, provider.currency, locale)}` : ""}</Text>
          <Text style={styles.label} testID={`listing-state-${listing.id}`}>{listing.published ? t("portal.services.published") : t("portal.services.draft")}</Text>
          {!listing.published && !listing.fulfillment ? <Text style={styles.muted} testID={`publish-blocked-${listing.id}`}>{t("portal.services.needsTerms")}</Text> : null}
          {!listing.published ? <ActionButton label={publish.isPending && publish.variables === listing.id ? t("portal.services.publishing") : t("portal.services.publish")} busy={publish.isPending && publish.variables === listing.id} disabled={publish.isPending || !listing.fulfillment} onPress={() => publishOnce(listing.id)} testID={`publish-${listing.id}`} /> : null}
        </View>
      ))}
      <ErrorNotice error={publish.error} onRetry={() => { if (publish.variables) publishOnce(publish.variables); }} />
      <Section title={t("portal.services.new.title")}>
        <Field label={t("portal.services.new.name")} value={name} onChange={setName} testID="listing-name" />
        <ChoiceGroup<string> label={t("portal.services.new.category")} value={category} onChange={setCategory} choices={CATEGORIES.map((value) => ({ value, label: t(`directory.category.${value}`) }))} />
        <Field label={t("portal.services.new.city")} value={city} onChange={setCity} />
        <Field label={t("portal.services.new.price")} value={price} onChange={setPrice} help={t("portal.services.new.priceHelp")} keyboardType="decimal-pad" testID="listing-price" />
        <Text style={styles.label}>{t("portal.services.new.destinationsHelp")}</Text>
        <Field label={t("portal.services.new.whatsapp")} value={whatsapp} onChange={setWhatsapp} keyboardType="url" testID="listing-whatsapp" />
        <Field label={t("portal.services.new.site")} value={site} onChange={setSite} keyboardType="url" testID="listing-site" />
        <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.services.new.fulfillmentTitle")}</Text>
        <ChoiceGroup<"PROVIDER" | "CUSTOMER"> label={t("portal.services.new.responsible")} value={responsible} onChange={setResponsible} choices={[{ value: "PROVIDER", label: t("portal.services.new.responsibleProvider") }, { value: "CUSTOMER", label: t("portal.services.new.responsibleCustomer") }]} />
        <Field label={t("portal.services.new.coverage")} value={coverage} onChange={setCoverage} help={t("portal.services.new.coverageHelp")} testID="listing-coverage" />
        <Field label={t("portal.services.new.transport")} value={transport} onChange={setTransport} keyboardType="decimal-pad" testID="listing-transport" />
        <Field label={t("portal.services.new.lead")} value={lead} onChange={setLead} keyboardType="number-pad" testID="listing-lead" />
        <Field label={t("portal.services.new.conditions")} value={conditions} onChange={setConditions} multiline testID="listing-conditions" />
        {errors.length ? <Notice kind="error">{errors.map((message) => <Text key={message} style={styles.body}>{message}</Text>)}</Notice> : null}
        {created ? <Notice kind="success">{t("portal.services.new.created")}</Notice> : null}
        <ErrorNotice error={create.error} onRetry={submit} />
        <ActionButton label={create.isPending ? t("portal.services.new.creating") : t("portal.services.new.submit")} busy={create.isPending} disabled={create.isPending} onPress={submit} testID="listing-submit" />
      </Section>
    </View>
  );
}

export function ServicesScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.services.title")} current="services">{(provider) => <Listings provider={provider} kind="SERVICE" />}</PortalScreen>;
}

/** D6 · Products (the offers a host can add to a gift list). */
export function ProductsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.products.title")} current="products">{(provider) => <Listings provider={provider} kind="PRODUCT" />}</PortalScreen>;
}
