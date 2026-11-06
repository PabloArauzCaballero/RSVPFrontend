import type { Translate } from "@rsvp/i18n/server";
import { localBusinessJsonLd, jsonLdScript } from "../lib/json-ld";
import { siteUrl } from "../lib/metadata";
import { PartnerLink, type PartnerDestination } from "@rsvp/ui-web";
import type { Partner } from "../lib/partner";
import { Breadcrumbs } from "./provider-directory";

const MINOR_UNIT_DIGITS = 2;

function money(amountMinor: number, currency: string, locale: string): string {
  const digits = Math.abs(amountMinor).toString().padStart(MINOR_UNIT_DIGITS + 1, "0");
  const decimal = `${amountMinor < 0 ? "-" : ""}${digits.slice(0, -MINOR_UNIT_DIGITS)}.${digits.slice(-MINOR_UNIT_DIGITS)}`;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(decimal as unknown as number);
}

/** B5 · Partner microsite. The platform disclaimer is rendered before the contact buttons (REQ-F25-05). */
export function PartnerMicrosite({ partner, t, locale }: { readonly partner: Partner; readonly t: Translate; readonly locale: string }) {
  const category = t(`directory.category.${partner.category}`);
  const jsonLd = {
    ...localBusinessJsonLd({ name: partner.name, url: `${siteUrl()}/p/${encodeURIComponent(partner.slug)}`, category }),
    ...(partner.imageUrl ? { image: partner.imageUrl } : {}),
    ...(partner.summary ? { description: partner.summary } : {}),
    address: { "@type": "PostalAddress", ...(partner.address ? { streetAddress: partner.address } : {}), addressLocality: partner.city, addressRegion: partner.department, addressCountry: "BO" },
    ...(partner.hours.length ? { openingHours: partner.hours } : {}),
    ...(partner.coverage.length ? { areaServed: partner.coverage.map((name) => ({ "@type": "City", name })) } : {})
  };
  return (
    <main className="directory partner">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <Breadcrumbs t={t} items={[{ label: partner.name }]} />
      <header className="partner-hero">
        {partner.imageUrl ? <img src={partner.imageUrl} alt="" width={960} height={540} decoding="async" fetchPriority="high" /> : null}
        <div>
          <h1>{partner.name}</h1>
          <p className="partner-eyebrow">{category} · {partner.city}</p>
          <p className="directory-verified">{t("directory.verified")}</p>
        </div>
      </header>

      <section aria-labelledby="partner-about">
        <h2 id="partner-about">{t("partner.about")}</h2>
        <p>{partner.summary ?? t("partner.noSummary")}</p>
      </section>

      <section aria-labelledby="partner-coverage">
        <h2 id="partner-coverage">{t("partner.coverage")}</h2>
        {partner.coverage.length ? <ul className="directory-links">{partner.coverage.map((area) => <li key={area}><span>{area}</span></li>)}</ul> : <p>{t("partner.noCoverage", { city: partner.city })}</p>}
        {partner.address ? <p>{partner.address}</p> : null}
        {partner.hours.length ? <ul className="partner-hours">{partner.hours.map((line) => <li key={line}>{line}</li>)}</ul> : null}
      </section>

      <section aria-labelledby="partner-services">
        <h2 id="partner-services">{t("partner.services")}</h2>
        {partner.listings.length ? (
          <ul className="directory-results">
            {partner.listings.map((listing) => (
              <li key={listing.listingId}>
                <h3>{listing.name}</h3>
                {listing.priceFrom ? <p>{t("directory.priceFrom", { price: money(listing.priceFrom.amountMinor, listing.priceFrom.currency, locale) })}</p> : null}
                {listing.summary ? <p>{listing.summary}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p role="status" className="directory-status">{t("partner.noServices")}</p>}
      </section>

      <section aria-labelledby="partner-contact" className="partner-contact">
        <h2 id="partner-contact">{t("partner.contact")}</h2>
        <p className="partner-disclaimer" data-testid="partner-disclaimer">{t("partner.disclaimer", { name: partner.name })}</p>
        {partner.destinations.length ? (
          <ul className="partner-actions">
            {partner.destinations.map((destination) => (
              <li key={destination}><PartnerLink listingId={partner.primaryListingId} destination={destination as PartnerDestination} surface="PUBLIC_SITE" disclaimer={false}>{t(`partner.destination.${destination}`, { name: partner.name })}</PartnerLink></li>
            ))}
          </ul>
        ) : <p role="status" className="directory-status">{t("partner.noContact")}</p>}
        <ul className="partner-actions">
          <li><a className="rsvp-button" href={`/p/${encodeURIComponent(partner.slug)}/cotizar`}>{t("detail.quote")}</a></li>
          <li><a className="rsvp-button rsvp-button--secondary" href={`/p/${encodeURIComponent(partner.slug)}/agenda`}>{t("detail.agenda")}</a></li>
          <li><a className="rsvp-button rsvp-button--secondary" href={`/p/${encodeURIComponent(partner.slug)}/catalogo`}>{t("catalog.open")}</a></li>
        </ul>
      </section>
    </main>
  );
}

export function PartnerUnavailable({ t }: { readonly t: Translate }) {
  return (
    <main className="directory partner">
      <h1>{t("partner.unavailable.title")}</h1>
      <p role="status" className="directory-status">{t("partner.unavailable.body")}</p>
      <a className="rsvp-button" href="/proveedores">{t("partner.backToDirectory")}</a>
    </main>
  );
}
