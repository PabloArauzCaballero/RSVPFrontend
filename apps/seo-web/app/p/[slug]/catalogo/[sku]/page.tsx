import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatMinor } from "@rsvp/i18n/server";
import { siteI18n } from "../../../../../lib/site-locale";
import { Breadcrumbs } from "../../../../../components/provider-directory";
import { FulfillmentNotice } from "../../../../../components/provider/fulfillment-notice";
import "../../../../../components/provider/provider.css";
import { contactHref, loadPartner } from "../../../../../lib/partner";

/** B7 · Offer detail: fulfillment (who is responsible, coverage, transport, lead time) and the platform disclaimer come BEFORE the contact buttons. */
export const revalidate = 300;
interface Props { readonly params: Promise<{ readonly slug: string; readonly sku: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await siteI18n();
  const { slug, sku } = await params;
  const lookup = await loadPartner(slug);
  const listing = lookup.state === "ok" ? lookup.partner.listings.find((item) => item.listingId === sku) : undefined;
  if (!listing) return { title: t("detail.notFound"), robots: { index: false, follow: false } };
  return { title: `${listing.summary ?? listing.name} · ${listing.name}`, alternates: { canonical: `/p/${slug}/catalogo/${sku}` } };
}

export default async function OfferPage({ params }: Props) {
  const { t, locale } = await siteI18n();
  const { slug, sku } = await params;
  const lookup = await loadPartner(slug);
  if (lookup.state === "not-found") notFound();
  if (lookup.state === "unavailable") return <main className="directory partner"><h1>{t("partner.unavailable.title")}</h1><p role="status">{t("partner.unavailable.body")}</p></main>;
  const { partner } = lookup;
  const listing = partner.listings.find((item) => item.listingId === sku);
  if (!listing) notFound();
  const destinations = listing.destinations?.length ? listing.destinations : ["OFFICIAL_SITE"];
  return (
    <main className="directory partner">
      <Breadcrumbs t={t} items={[{ label: partner.name, href: `/p/${encodeURIComponent(slug)}` }, { label: t("partner.services"), href: `/p/${encodeURIComponent(slug)}/catalogo` }, { label: listing.summary ?? listing.name }]} />
      <h1>{listing.summary ?? listing.name}</h1>
      <p className="partner-eyebrow">{listing.name}</p>
      {listing.priceFrom ? <p><strong>{t("detail.priceFrom", { price: formatMinor(listing.priceFrom.amountMinor, listing.priceFrom.currency, locale) })}</strong></p> : null}
      <FulfillmentNotice fulfillment={listing.fulfillment} currency={listing.priceFrom?.currency ?? "BOB"} t={t} locale={locale} />
      <section aria-labelledby="offer-contact" className="partner-contact">
        <h2 id="offer-contact">{t("partner.contact")}</h2>
        <p className="partner-disclaimer" data-testid="partner-disclaimer">{t("partner.disclaimer", { name: partner.name })}</p>
        <ul className="partner-actions">
          <li><a className="rsvp-button" href={`/p/${encodeURIComponent(slug)}/cotizar?l=${listing.listingId}`}>{t("detail.quote")}</a></li>
          <li><a className="rsvp-button rsvp-button--secondary" href={`/p/${encodeURIComponent(slug)}/agenda`}>{t("detail.agenda")}</a></li>
          {destinations.map((destination) => (
            <li key={destination}><a className="rsvp-button rsvp-button--secondary" href={contactHref(listing.listingId, destination)} rel="sponsored nofollow">{t(`partner.destination.${destination}`, { name: partner.name })}</a></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
