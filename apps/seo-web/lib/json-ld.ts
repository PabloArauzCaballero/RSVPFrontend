import { readContent, type GalleryImage, type LocalDateTime, type PublicCelebrationView } from "@rsvp/celebration-theme";

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

/** `LocalBusiness` for a partner microsite (lane F25). */
export function localBusinessJsonLd(input: { readonly name: string; readonly url: string; readonly category: string }): Readonly<Record<string, unknown>> {
  return { "@context": CONTEXT, "@type": "LocalBusiness", name: input.name, url: input.url, additionalType: input.category };
}

/** Serialises JSON-LD for a <script> tag, escaping `<` so content can never close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
