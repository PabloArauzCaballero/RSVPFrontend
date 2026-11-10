import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { ApiError } from "@rsvp/api-client";
import { useOwnListings, useUpdateFulfillment, type Fulfillment, type OwnListing, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Loading, Notice, styles } from "../host/ui";
import { parseMinor } from "../host/gifts/money";
import { PortalScreen } from "./frame";

const NOT_ROUTED = [404, 405, 501];

/**
 * D8 edit form, written against the EXPECTED `PUT /providers/{id}/listings/{listingId}/fulfillment` (provider-catalog 2.1.0 has no offer
 * edit). If the server does not route it we say so and keep the person's text; nothing is claimed as saved.
 */
function DeliveryEditor({ provider, listing, onDone }: { readonly provider: Provider; readonly listing: OwnListing; readonly onDone: () => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const update = useUpdateFulfillment(useApiClient(), provider.id, locale);
  const f = listing.fulfillment;
  const [responsible, setResponsible] = useState<"PROVIDER" | "CUSTOMER">(f?.responsible === "CUSTOMER" ? "CUSTOMER" : "PROVIDER");
  const [coverage, setCoverage] = useState(f?.coverageZones.join(", ") ?? "");
  const [transport, setTransport] = useState(f?.transportCostMinor === undefined ? "" : String(f.transportCostMinor / 100));
  const [lead, setLead] = useState(f ? String(f.leadTimeDays) : "");
  const [conditions, setConditions] = useState(f?.conditions ?? "");
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [saved, setSaved] = useState(false);
  const unsupported = update.error instanceof ApiError && NOT_ROUTED.includes(update.error.status);

  const submit = (): void => {
    const zones = coverage.split(",").map((zone) => zone.trim()).filter(Boolean);
    const transportMinor = transport.trim() ? parseMinor(transport) : undefined;
    const leadDays = Number(lead);
    const found: string[] = [];
    if (zones.length === 0) found.push(t("portal.services.errors.coverage"));
    if (transportMinor === null) found.push(t("portal.services.errors.price"));
    if (!conditions.trim()) found.push(t("portal.services.errors.conditions"));
    if (lead.trim() === "" || !Number.isInteger(leadDays) || leadDays < 0) found.push(t("portal.services.errors.lead"));
    setErrors(found);
    if (found.length) return;
    const fulfillment: Fulfillment = { responsible, coverageZones: zones, ...(typeof transportMinor === "number" ? { transportCostMinor: transportMinor } : {}), leadTimeDays: leadDays, conditions: { [locale]: conditions.trim() } };
    setSaved(false);
    update.mutate({ listingId: listing.id, fulfillment }, { onSuccess: () => setSaved(true) });
  };

  return (
    <View style={{ gap: spacing[2] }} testID={`delivery-editor-${listing.id}`}>
      <ChoiceGroup<"PROVIDER" | "CUSTOMER"> label={t("portal.services.new.responsible")} value={responsible} onChange={setResponsible} choices={[{ value: "PROVIDER", label: t("portal.services.new.responsibleProvider") }, { value: "CUSTOMER", label: t("portal.services.new.responsibleCustomer") }]} />
      <Field label={t("portal.services.new.coverage")} value={coverage} onChange={setCoverage} help={t("portal.services.new.coverageHelp")} testID={`delivery-coverage-${listing.id}`} />
      <Field label={t("portal.services.new.transport")} value={transport} onChange={setTransport} keyboardType="decimal-pad" testID={`delivery-transport-${listing.id}`} />
      <Field label={t("portal.services.new.lead")} value={lead} onChange={setLead} keyboardType="number-pad" testID={`delivery-lead-${listing.id}`} />
      <Field label={t("portal.services.new.conditions")} value={conditions} onChange={setConditions} multiline testID={`delivery-conditions-${listing.id}`} />
      {errors.length ? <Notice kind="error">{errors.map((message) => <Text key={message} style={styles.body}>{message}</Text>)}</Notice> : null}
      {unsupported ? <Notice kind="error">{t("portal.delivery.unsupported")}</Notice> : <ErrorNotice error={update.error} />}
      {saved ? <Notice kind="success">{t("portal.delivery.saved")}</Notice> : null}
      <View style={styles.row}>
        <ActionButton label={update.isPending ? t("portal.delivery.saving") : t("portal.delivery.save")} busy={update.isPending} disabled={update.isPending} onPress={submit} testID={`delivery-save-${listing.id}`} />
        <ActionButton variant="secondary" label={t("portal.delivery.cancel")} onPress={onDone} />
      </View>
    </View>
  );
}

/** D8 row: the delivery conditions exactly as guests and hosts read them on the offer (responsible, coverage, transport, lead time). */
function DeliveryRow({ provider, listing }: { readonly provider: Provider; readonly listing: OwnListing }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const currency = provider.currency;
  const [editing, setEditing] = useState(false);
  const f = listing.fulfillment;
  return (
    <View style={[styles.card, { gap: spacing[1] }]} testID={`delivery-${listing.id}`}>
      <Text accessibilityRole="header" style={styles.subtitle}>{listing.title}</Text>
      <Text style={styles.muted}>{t(`portal.services.type.${listing.type === "SERVICE" ? "SERVICE" : "PRODUCT"}`)} · {listing.published ? t("portal.services.published") : t("portal.services.draft")}</Text>
      {f ? (
        <>
          <Text style={styles.body}>{t("portal.delivery.responsible", { who: f.responsible === "PROVIDER" ? t("portal.services.new.responsibleProvider") : t("portal.services.new.responsibleCustomer") })}</Text>
          <Text style={styles.body}>{t("portal.delivery.coverage", { zones: f.coverageZones.join(", ") || "-" })}</Text>
          <Text style={styles.body}>{t("portal.delivery.transport", { price: f.transportCostMinor === undefined ? t("portal.delivery.noTransport") : formatMinor(f.transportCostMinor, currency, locale) })}</Text>
          <Text style={styles.body}>{t("portal.delivery.lead", { days: f.leadTimeDays })}</Text>
          {f.conditions ? <Text style={styles.muted}>{f.conditions}</Text> : null}
        </>
      ) : <Notice kind="error">{t("portal.delivery.missing")}</Notice>}
      {editing ? <DeliveryEditor provider={provider} listing={listing} onDone={() => setEditing(false)} /> : <ActionButton variant="secondary" label={t("portal.delivery.edit")} onPress={() => setEditing(true)} testID={`delivery-edit-${listing.id}`} />}
    </View>
  );
}

function Delivery({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const listings = useOwnListings(client, provider.id, locale);
  if (listings.isPending) return <Loading />;
  if (listings.isError) return <ErrorNotice error={listings.error} onReload={() => { void listings.refetch(); }} />;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.delivery.intro")}</Text>
      {listings.data.items.length === 0 ? <Notice>{t("portal.delivery.empty")}</Notice> : listings.data.items.map((listing) => <DeliveryRow key={listing.id} provider={provider} listing={listing} />)}
    </View>
  );
}

export function DeliveryScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.delivery.title")} current="delivery">{(provider) => <Delivery provider={provider} />}</PortalScreen>;
}
