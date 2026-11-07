import { readContent, type GalleryImage, type LocalDateTime, type PublicCelebrationView } from "@rsvp/celebration-theme";
import { siteUrl } from "./metadata";

/** schema.org structured data. Validated against the schema by tests/seo.test.ts. */

const CONTEXT = "https://schema.org";

/** ISO-8601 with the celebration's own offset, e.g. 2026-12-19T19:00:00-04:00 (what search engines expect for Event). */
export function zonedIso(local: LocalDateTime): string {
  return `${local.date}T${local.time}:00${local.utcOffset}`;
}

export interface EventJsonLd {
  readonly "@context": typeof CONTEXT;
  readonly "@type": "Event";
  readonly name: string;
  readonly startDate: string;
  readonly eventStatus: string;
  readonly eventAttendanceMode: string;
  readonly location: { readonly "@type": "Place"; readonly name: string; readonly address?: string };
  readonly url: string;
  readonly inLanguage: string;
  readonly image?: readonly string[];
  readonly description?: string;
  readonly organizer?: readonly { readonly "@type": "Person"; readonly name: string }[];
}

export function eventJsonLd(view: PublicCelebrationView, gallery: readonly GalleryImage[], url: string): EventJsonLd | null {
  const content = readContent(view);
  const start = view.localTimes["eventDate"];
  if (!start || !content.title) return null;
  const venue = content.venues[0];
  const cover = gallery.find((image) => image.isCover)?.variants.full;
  return {
    "@context": CONTEXT,
    "@type": "Event",
    name: content.title,
    startDate: zonedIso(start),
    eventStatus: `${CONTEXT}/EventScheduled`,
    eventAttendanceMode: `${CONTEXT}/OfflineEventAttendanceMode`,
    location: { "@type": "Place", name: venue?.name ?? content.venueName, ...(venue?.address ? { address: venue.address } : {}) },
    url,
    inLanguage: view.locale,
    ...(cover ? { image: [cover] } : {}),
    ...(content.story ? { description: content.story.slice(0, 300) } : {}),
    ...(content.hosts.length ? { organizer: content.hosts.map((host) => ({ "@type": "Person" as const, name: host.name })) } : {})
  };
}

export interface ListItem { readonly name: string; readonly url: string }

/** `ItemList` for the provider listings (F24). */
export function itemListJsonLd(items: readonly ListItem[], url: string): Readonly<Record<string, unknown>> {
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: item.url }))
  };
}

const MINOR_UNIT_DIGITS = 2;

/** 125000 BOB cents → "1250.00": a decimal string, never a float, as schema.org prices expect. */
export function minorToDecimal(amountMinor: number): string {
  const digits = Math.abs(amountMinor).toString().padStart(MINOR_UNIT_DIGITS + 1, "0");
  return `${amountMinor < 0 ? "-" : ""}${digits.slice(0, -MINOR_UNIT_DIGITS)}.${digits.slice(-MINOR_UNIT_DIGITS)}`;
}

export interface OfferInput { readonly name: string; readonly description?: string | null | undefined; readonly priceFrom?: { readonly amountMinor: number; readonly currency: string } | null | undefined }

/**
 * `LocalBusiness` for a partner microsite (lane F25). Its offers are `Service`s inside an `OfferCatalog`; the price is a minimum
 * (`PriceSpecification.minPrice`) because the site only knows the "from" price. No rating is ever emitted: there are no reviews.
 */
export function localBusinessJsonLd(input: { readonly name: string; readonly url: string; readonly category: string; readonly offers?: readonly OfferInput[] }): Readonly<Record<string, unknown>> {
  const offers = input.offers ?? [];
  return {
    "@context": CONTEXT,
    "@type": "LocalBusiness",
    name: input.name,
    url: input.url,
    ...(offers.length ? {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: input.category,
        itemListElement: offers.map((offer) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: offer.name, serviceType: input.category, ...(offer.description ? { description: offer.description } : {}) },
          ...(offer.priceFrom ? { priceSpecification: { "@type": "PriceSpecification", minPrice: minorToDecimal(offer.priceFrom.amountMinor), priceCurrency: offer.priceFrom.currency } } : {})
        }))
      }
    } : {})
  };
}

/** Organization and WebSite of the whole site, linked by `@id`, for the home page. No search box markup: Google retired it. */
export function siteGraphJsonLd(input: { readonly description: string; readonly locale: string }): Readonly<Record<string, unknown>> {
  const base = siteUrl();
  return {
    "@context": CONTEXT,
    "@graph": [
      { "@type": "Organization", "@id": `${base}/#organization`, name: "DOne", url: `${base}/`, logo: `${base}/apple-icon.png`, description: input.description },
      { "@type": "WebSite", "@id": `${base}/#website`, name: "DOne", url: `${base}/`, inLanguage: input.locale, publisher: { "@id": `${base}/#organization` } }
    ]
  };
}

/** Marks up the visible questions and answers of the home page (semantic only: Google no longer shows FAQ rich results). */
export function faqJsonLd(items: readonly { readonly question: string; readonly answer: string }[]): Readonly<Record<string, unknown>> {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } }))
  };
}

export interface Crumb { readonly name: string; readonly url?: string | undefined }

/** `BreadcrumbList` mirroring the visible breadcrumbs; the current page (last) carries no `item`, as Google allows. */
export function breadcrumbJsonLd(crumbs: readonly Crumb[]): Readonly<Record<string, unknown>> {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, ...(crumb.url ? { item: crumb.url } : {}) }))
  };
}

/** Serialises JSON-LD for a <script> tag, escaping `<` so content can never close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
