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
  /** The exact place of the main venue: a link to a maps service the host marked or pasted; absent when there is none or it is not a maps link. */
  readonly venueMapUrl?: string;
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
    ...(mapUrl(content["venueMapUrl"]) ? { venueMapUrl: mapUrl(content["venueMapUrl"]) as string } : {}),
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

/**
 * Hosts whose links a guest may be sent to as "how to get there". The link is typed or pasted by the host and ends up in an
 * `href` of the public page, so only `https` links of maps services are accepted: never a script URL or an arbitrary site.
 */
const MAP_HOSTS: readonly { readonly host: RegExp; readonly path?: RegExp }[] = [
  { host: /^(www\.|maps\.)?google\.[a-z.]{2,6}$/, path: /^\/maps(\/|$)/ },
  { host: /^maps\.google\.[a-z.]{2,6}$/ },
  { host: /^maps\.app\.goo\.gl$/ },
  { host: /^goo\.gl$/, path: /^\/maps\// },
  { host: /^g\.co$/, path: /^\/kgs\// },
  { host: /^maps\.apple\.com$/ },
  { host: /^(www\.|ul\.)?waze\.com$/ },
  { host: /^(www\.)?openstreetmap\.org$/ },
  { host: /^osm\.org$/ }
];
const MAP_URL_MAX = 500;

/** The link when it is an `https` link of a maps service, trimmed; undefined for anything else. */
export function mapUrl(value: unknown): string | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.length > MAP_URL_MAX) return undefined;
  let url: URL;
  try { url = new URL(raw); } catch { return undefined; }
  if (url.protocol !== "https:" || url.username || url.password) return undefined;
  const host = url.hostname.toLowerCase();
  return MAP_HOSTS.some((rule) => rule.host.test(host) && (!rule.path || rule.path.test(url.pathname))) ? url.toString() : undefined;
}

export interface MapPoint { readonly lat: number; readonly lng: number }
const COORDINATE_DIGITS = 6;
const MAX_LAT = 90;
const MAX_LNG = 180;
const POINT = /(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/;

/** A maps link that opens exactly on a point marked on the map. */
export function pointUrl({ lat, lng }: MapPoint): string {
  return `${MAPS_SEARCH}${lat.toFixed(COORDINATE_DIGITS)}%2C${lng.toFixed(COORDINATE_DIGITS)}`;
}

/** The point a maps link carries in sight (`query=lat,lng`, `q=lat,lng`, `@lat,lng`, `ll=lat,lng`); null when it has none, as short links do. */
export function pointOf(link: string): MapPoint | null {
  const safe = mapUrl(link);
  if (!safe) return null;
  const url = new URL(safe);
  const candidates = [url.searchParams.get("query"), url.searchParams.get("q"), url.searchParams.get("ll"), url.searchParams.get("mlat") && `${url.searchParams.get("mlat")},${url.searchParams.get("mlon")}`, /@(-?\d[^/?]*)/.exec(url.pathname)?.[1]];
  for (const candidate of candidates) {
    const match = candidate ? POINT.exec(candidate) : null;
    if (!match || match.index !== 0) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Math.abs(lat) <= MAX_LAT && Math.abs(lng) <= MAX_LNG) return { lat, lng };
  }
  return null;
}

/** Navigation to a venue (not a partner): the place the host marked when there is one, otherwise a maps search for its name and address. */
export function navigationHref(venue: Pick<Venue, "name" | "address"> & { readonly mapUrl?: string }): string {
  const marked = mapUrl(venue.mapUrl);
  if (marked) return marked;
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
