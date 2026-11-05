import type { LocalDateTime, SectionId } from "./types.js";

/**
 * The celebration content model shared by the host editor (writes it) and the public site
 * (reads it). Content arrives already localised by the Celebration API; instants come with
 * their wall clock in the celebration time zone (`localTimes`), so nothing here does
 * time-zone arithmetic.
 */

export const VenueKind = { Ceremony: "ceremony", Reception: "reception", Other: "other" } as const;
export type VenueKind = (typeof VenueKind)[keyof typeof VenueKind];
export const RecommendationKind = { Lodging: "lodging", Transport: "transport", Other: "other" } as const;
export type RecommendationKind = (typeof RecommendationKind)[keyof typeof RecommendationKind];

export interface ScheduleItem { readonly id: string; readonly title: string; readonly description?: string; readonly startsAt: string; readonly venueKey?: string }
export interface Venue { readonly key: string; readonly kind: VenueKind; readonly name: string; readonly address?: string }
export interface FaqItem { readonly question: string; readonly answer: string }
export interface Recommendation { readonly kind: RecommendationKind; readonly name: string; readonly description?: string; readonly listingId?: string }
export interface HostName { readonly role: string; readonly label: string; readonly name: string }

/** GET /celebrations/public/{slug}. */
export interface PublicCelebrationView {
  readonly celebrationId: string;
  readonly slug: string;
  readonly locale: string;
  readonly availableLocales: readonly string[];
  readonly eventType: { readonly code: string; readonly name: string; readonly hostRoles: readonly { readonly role: string; readonly label: string }[] };
  readonly enabledSections: readonly string[];
  readonly timeZone: string;
  readonly currency: string;
  readonly templateId: string | null;
  readonly content: Readonly<Record<string, unknown>>;
  readonly localTimes: Readonly<Record<string, LocalDateTime>>;
  readonly rsvpDeadline: string | null;
  readonly publishedAt: string | null;
  readonly version: number;
}

/** One processed photo from GET /media/public/celebrations/{id}/assets. */
export interface GalleryImage {
  readonly id: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly isCover: boolean;
  readonly variants: Readonly<Partial<Record<"thumb" | "medium" | "full" | "webp", string>>>;
}

export interface CelebrationContent {
  readonly title: string;
  readonly subtitle: string;
  readonly eventDate: string | null;
  readonly venueName: string;
  readonly hosts: readonly HostName[];
  readonly story: string;
  readonly dressCode: string;
  readonly schedule: readonly ScheduleItem[];
  readonly venues: readonly Venue[];
  readonly faq: readonly FaqItem[];
  readonly recommendations: readonly Recommendation[];
  /** `hostContact` the hosts agreed to publish (`consentPublic: true`); absent otherwise. This is who a guest writes to. */
  readonly hostContact?: HostContact;
}
export interface HostContact { readonly email?: string; readonly phone?: string }

type Unknown = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Unknown => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const optionalText = (value: unknown): string | undefined => text(value) || undefined;
const records = (value: unknown): Unknown[] => (Array.isArray(value) ? value.filter(isRecord) : []);
const oneOf = <TValue extends string>(value: unknown, allowed: readonly TValue[], fallback: TValue): TValue =>
  (allowed as readonly unknown[]).includes(value) ? (value as TValue) : fallback;

const SCHEDULE_LABELS = "scheduleLabels";
const venueKinds = Object.values(VenueKind);
const recommendationKinds = Object.values(RecommendationKind);

/** Parses the free-form content defensively: anything malformed is simply left out. */
export function readContent(view: Pick<PublicCelebrationView, "content" | "eventType">): CelebrationContent {
  const content = view.content;
  const labels = isRecord(content[SCHEDULE_LABELS]) ? content[SCHEDULE_LABELS] : {};
  const hosts = isRecord(content["hosts"]) ? content["hosts"] : {};
  return {
    title: text(content["title"]),
    subtitle: text(content["subtitle"]),
    eventDate: text(content["eventDate"]) || null,
    venueName: text(content["venueName"]),
    hosts: view.eventType.hostRoles.map((role) => ({ ...role, name: text(hosts[role.role]) })).filter((host) => host.name),
    story: text(content["story"]),
    dressCode: text(content["dressCode"]),
    schedule: records(content["schedule"])
      .map((item, index) => {
        const id = text(item["id"]) || String(index);
        const label = isRecord(labels[id]) ? labels[id] : {};
        return { id, title: text(label["title"]) || text(item["title"]), description: optionalText(label["description"]) ?? optionalText(item["description"]), startsAt: text(item["startsAt"]), venueKey: optionalText(item["venueKey"]) };
      })
      .filter((item) => item.title && item.startsAt),
    venues: records(content["venues"])
      .map((item, index) => ({ key: text(item["key"]) || String(index), kind: oneOf(item["kind"], venueKinds, VenueKind.Other), name: text(item["name"]), address: optionalText(item["address"]) }))
      .filter((venue) => venue.name),
    faq: records(content["faq"]).map((item) => ({ question: text(item["question"]), answer: text(item["answer"]) })).filter((item) => item.question && item.answer),
    recommendations: records(content["recommendations"])
      .map((item) => ({ kind: oneOf(item["kind"], recommendationKinds, RecommendationKind.Other), name: text(item["name"]), description: optionalText(item["description"]), listingId: optionalText(item["listingId"]) }))
      .filter((item) => item.name),
    hostContact: readHostContact(content["hostContact"])
  };
}

function readHostContact(value: unknown): HostContact | undefined {
  if (!isRecord(value) || value["consentPublic"] !== true) return undefined;
  const email = optionalText(value["email"]);
  const phone = optionalText(value["phone"]);
  return email || phone ? { ...(email ? { email } : {}), ...(phone ? { phone } : {}) } : undefined;
}

/** Whether a section has something to show; empty sections are never rendered (no gaps). */
export function hasSectionContent(section: SectionId, content: CelebrationContent, gallery: readonly GalleryImage[]): boolean {
  const checks: Readonly<Record<SectionId, boolean>> = {
    story: Boolean(content.story),
    schedule: Boolean(content.schedule.length),
    venues: Boolean(content.venues.length || content.venueName),
    gallery: Boolean(gallery.length),
    dressCode: Boolean(content.dressCode),
    faq: Boolean(content.faq.length),
    recommendations: Boolean(content.recommendations.length),
    gifts: false,
    rsvp: true
  };
  return checks[section];
}

const REDIRECTOR = "/r/";
const MAPS_SEARCH = "https://www.google.com/maps/search/?api=1&query=";

/** Every partner link goes through the redirector: it records the lead and adds attribution. */
export function partnerHref(listingId: string): string {
  return `${REDIRECTOR}${encodeURIComponent(listingId)}`;
}

/** Navigation to a venue (not a partner): a maps search for its name and address. */
export function navigationHref(venue: Pick<Venue, "name" | "address">): string {
  return `${MAPS_SEARCH}${encodeURIComponent([venue.name, venue.address].filter(Boolean).join(", "))}`;
}

/** Path of each public section, in Spanish as the product's URLs are (REQ-F10-01). */
export const SECTION_PATHS: Readonly<Partial<Record<SectionId, string>>> = {
  story: "historia",
  schedule: "itinerario",
  venues: "lugares",
  gallery: "galeria",
  dressCode: "dress-code",
  faq: "faq",
  recommendations: "recomendaciones"
};

export function sectionForPath(path: string): SectionId | undefined {
  const entry = Object.entries(SECTION_PATHS).find(([, value]) => value === path);
  // Keys of SECTION_PATHS are SectionIds by construction.
  return entry?.[0] as SectionId | undefined;
}

const MS_PER_DAY = 86_400_000;

/** Whole days from `now` to the event, never negative; computed from instants, not device time zones. */
export function daysUntil(eventDate: string | null, now: Date): number | null {
  if (!eventDate) return null;
  const target = Date.parse(eventDate);
  if (!Number.isFinite(target)) return null;
  return Math.max(0, Math.ceil((target - now.getTime()) / MS_PER_DAY));
}
