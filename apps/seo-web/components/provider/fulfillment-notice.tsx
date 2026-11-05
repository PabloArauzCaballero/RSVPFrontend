import { formatMinor, type AppLocale, type Translate } from "@rsvp/i18n/server";
import type { ProviderCard } from "../../lib/providers";

/** B7 · Who is responsible, coverage, transport cost and lead time, always visible before any contact or quote button (REQ-F25-04). */
export function FulfillmentNotice({ fulfillment, currency, t, locale }: { readonly fulfillment: ProviderCard["fulfillment"]; readonly currency: string; readonly t: Translate; readonly locale: AppLocale }) {
  if (!fulfillment) return <p className="directory-status" role="status" data-testid="fulfillment">{t("fulfillment.missing")}</p>;
  const responsible = fulfillment.responsible === "CUSTOMER" ? "CUSTOMER" : "PROVIDER";
  return (
    <section className="fulfillment" aria-labelledby="fulfillment-title" data-testid="fulfillment">
      <h2 id="fulfillment-title">{t("fulfillment.title")}</h2>
      <dl>
        <div><dt>{t("fulfillment.responsible")}</dt><dd>{t(`fulfillment.responsibleValue.${responsible}`)}</dd></div>
        <div><dt>{t("fulfillment.coverage")}</dt><dd>{fulfillment.coverageZones.join(", ")}</dd></div>
        <div><dt>{t("fulfillment.transport")}</dt><dd>{fulfillment.transportCostMinor !== undefined ? formatMinor(fulfillment.transportCostMinor, currency, locale) : t("fulfillment.transportNone")}</dd></div>
        <div><dt>{t("fulfillment.leadTime")}</dt><dd>{t("fulfillment.leadTimeValue", { days: fulfillment.leadTimeDays })}</dd></div>
        <div><dt>{t("fulfillment.conditions")}</dt><dd>{fulfillment.conditions}</dd></div>
      </dl>
      <p className="partner-disclaimer">{fulfillment.disclaimer}</p>
    </section>
  );
}
