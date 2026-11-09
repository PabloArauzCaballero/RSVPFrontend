import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatMinor } from "@rsvp/i18n/server";
import { siteI18n } from "../../../../lib/site-locale";
import { Breadcrumbs } from "../../../../components/provider-directory";
import "../../../../components/provider/provider.css";
import { loadPartner } from "../../../../lib/partner";

/** B6 · Catalog of services and products with the price in the partner's currency. */
export const revalidate = 300;
interface Props { readonly params: Promise<{ readonly slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await siteI18n();
  const { slug } = await params;
  const lookup = await loadPartner(slug);
  if (lookup.state !== "ok") return { title: t("partner.notFound.title"), robots: { index: false, follow: false } };
  return { title: t("catalog.title", { name: lookup.partner.name }), description: t("catalog.meta", { name: lookup.partner.name }), alternates: { canonical: `/p/${slug}/catalogo` } };
}

export default async function CatalogPage({ params }: Props) {
  const { t, locale } = await siteI18n();
  const { slug } = await params;
  const lookup = await loadPartner(slug);
  if (lookup.state === "not-found") notFound();
  if (lookup.state === "unavailable") return <main className="directory partner"><h1>{t("partner.unavailable.title")}</h1><p role="status">{t("partner.unavailable.body")}</p></main>;
  const { partner } = lookup;
  return (
    <main className="directory partner">
      <Breadcrumbs t={t} items={[{ label: partner.name, href: `/p/${encodeURIComponent(slug)}` }, { label: t("partner.services") }]} />
      <h1>{t("catalog.title", { name: partner.name })}</h1>
      <p>{t("catalog.intro")}</p>
      {partner.listings.length === 0 ? <p role="status" className="directory-status">{t("catalog.empty")}</p> : (
        <ul className="directory-results">
          {partner.listings.map((listing) => (
            <li key={listing.listingId}>
              <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{listing.summary ?? listing.name}</h2>
              {listing.priceFrom ? <p><strong>{t("detail.priceFrom", { price: formatMinor(listing.priceFrom.amountMinor, listing.priceFrom.currency, locale) })}</strong></p> : null}
              {listing.fulfillment ? <p>{t(`fulfillment.responsibleValue.${listing.fulfillment.responsible === "CUSTOMER" ? "CUSTOMER" : "PROVIDER"}`)} · {listing.fulfillment.coverageZones.join(", ")}</p> : null}
              <a className="rsvp-button rsvp-button--secondary" href={`/p/${encodeURIComponent(slug)}/catalogo/${listing.listingId}`}>{t("catalog.open")}</a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
