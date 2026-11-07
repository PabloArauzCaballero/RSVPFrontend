import type { Translate } from "@rsvp/i18n/server";
import { localBusinessJsonLd, jsonLdScript } from "../lib/json-ld";
import { siteUrl } from "../lib/metadata";
import { PartnerLink, type PartnerDestination } from "@rsvp/ui-web";
import type { Partner } from "../lib/partner";
import { CheckMark } from "./brand/check-mark";
import { DOutline, OfflineArt } from "./brand/illustrations";
import { Breadcrumbs } from "./provider-directory";

const MINOR_UNIT_DIGITS = 2;

function money(amountMinor: number, currency: string, locale: string): string {
  const digits = Math.abs(amountMinor).toString().padStart(MINOR_UNIT_DIGITS + 1, "0");
  const decimal = `${amountMinor < 0 ? "-" : ""}${digits.slice(0, -MINOR_UNIT_DIGITS)}.${digits.slice(-MINOR_UNIT_DIGITS)}`;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(decimal as unknown as number);
}

/**
 * B5 · Partner microsite. Order is the order of a decision: who they are and the one action (ask for a quote), what they offer
 * and for how much, where they work, and last the contact buttons after the platform disclaimer (REQ-F25-05).
 */
export function PartnerMicrosite({ partner, t, locale }: { readonly partner: Partner; readonly t: Translate; readonly locale: string }) {
  const category = t(`directory.category.${partner.category}`);
  const base = `/p/${encodeURIComponent(partner.slug)}`;
  const jsonLd = {
    ...localBusinessJsonLd({ name: partner.name, url: `${siteUrl()}${base}`, category, offers: partner.listings.map((listing) => ({ name: listing.name, description: listing.summary, priceFrom: listing.priceFrom })) }),
    ...(partner.imageUrl ? { image: partner.imageUrl } : {}),
    ...(partner.summary ? { description: partner.summary } : {}),
    address: { "@type": "PostalAddress", ...(partner.address ? { streetAddress: partner.address } : {}), addressLocality: partner.city, addressRegion: partner.department, addressCountry: "BO" },
    ...(partner.hours.length ? { openingHours: partner.hours } : {}),
    ...(partner.coverage.length ? { areaServed: partner.coverage.map((name) => ({ "@type": "City", name })) } : {})
  };
  return (
    <main className="partner-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <header className="top partner-top">
        <div className="top__inner">
          <Breadcrumbs t={t} items={[{ label: partner.name }]} />
          <div className="partner-hero">
            <div className="partner-hero__media">{partner.imageUrl ? <img src={partner.imageUrl} alt="" width={960} height={540} decoding="async" fetchPriority="high" /> : <DOutline />}</div>
            <div className="partner-hero__text">
              <h1>{partner.name}</h1>
              <p className="partner-eyebrow">{category} · {partner.city}</p>
              <p className="directory-verified directory-verified--onblue" title={t("partner.verifiedHint")}><CheckMark size={16} />{t("directory.verified")}</p>
              <div className="partner-cta">
                <a className="btn btn--accent" href={`${base}/cotizar`}>{t("detail.quote")}</a>
                <a className="textlink textlink--onblue" href={`${base}/agenda`}>{t("detail.agenda")}</a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="partner-body">
        <section aria-labelledby="partner-services" className="partner-section">
          <h2 id="partner-services">{t("partner.services")}</h2>
          {partner.listings.length ? (
            <>
              <ul className="directory-results">
                {partner.listings.map((listing) => (
                  <li key={listing.listingId}>
                    <div className="result__body">
                      <h3><a href={`${base}/catalogo/${encodeURIComponent(listing.listingId)}`}>{listing.name}</a></h3>
                      {listing.summary ? <p className="result__summary">{listing.summary}</p> : null}
                    </div>
                    <div className="result__side">
                      {listing.priceFrom ? <p className="result__price">{t("directory.priceFrom", { price: money(listing.priceFrom.amountMinor, listing.priceFrom.currency, locale) })}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <a className="textlink" href={`${base}/catalogo`}>{t("partner.catalogLink")}</a>
            </>
          ) : (
            <div role="status" className="directory-status state">
              <OfflineArt className="state__art" />
              <p>{t("partner.noServices")}</p>
            </div>
          )}
        </section>

        <div className="partner-twin">
          <section aria-labelledby="partner-about" className="partner-section">
            <h2 id="partner-about">{t("partner.about")}</h2>
            <p>{partner.summary ?? t("partner.noSummary")}</p>
          </section>

          <section aria-labelledby="partner-coverage" className="partner-section">
            <h2 id="partner-coverage">{t("partner.coverage")}</h2>
            {partner.coverage.length ? <ul className="directory-links directory-links--cities">{partner.coverage.map((area) => <li key={area}><span>{area}</span></li>)}</ul> : <p>{t("partner.noCoverage", { city: partner.city })}</p>}
            {partner.address ? <p>{partner.address}</p> : null}
            {partner.hours.length ? <ul className="partner-hours">{partner.hours.map((line) => <li key={line}>{line}</li>)}</ul> : null}
          </section>
        </div>

        <section aria-labelledby="partner-contact" className="partner-section partner-contact">
          <h2 id="partner-contact">{t("partner.contact")}</h2>
          <p className="partner-disclaimer" data-testid="partner-disclaimer"><strong>{t("partner.fineprint")}.</strong> {t("partner.disclaimer", { name: partner.name })}</p>
          {partner.destinations.length ? (
            <ul className="partner-actions">
              {partner.destinations.map((destination) => (
                <li key={destination}><PartnerLink listingId={partner.primaryListingId} destination={destination as PartnerDestination} surface="PUBLIC_SITE" disclaimer={false}>{t(`partner.destination.${destination}`, { name: partner.name })}</PartnerLink></li>
              ))}
            </ul>
          ) : <p role="status" className="directory-status">{t("partner.noContact")}</p>}
        </section>
      </div>
    </main>
  );
}

export function PartnerUnavailable({ t }: { readonly t: Translate }) {
  return (
    <main className="directory partner state-page">
      <OfflineArt className="state__art" />
      <h1>{t("partner.unavailable.title")}</h1>
      <p role="status" className="directory-status">{t("partner.unavailable.body")}</p>
      <a className="rsvp-button" href="/proveedores">{t("partner.backToDirectory")}</a>
    </main>
  );
}
