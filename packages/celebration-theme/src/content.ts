import { MAIN_LOCATION_KEY, mainVenueLocation, osmPointUrl, readLocations, venueLocation, type Location } from "@rsvp/location";
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
  /** D-1 (celebration 1.4.0): true only when the host allowed search engines; absent or false means `noindex`. */
  readonly indexable?: boolean;
  readonly version: number;
}

/** One processed photo from GET /media/public/celebrations/{id}/assets. */
export interface GalleryImage {
  readonly id: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly isCover: boolean;
  readonly purpose?: string;
  readonly durationMs?: number | null;
  readonly variants: Readonly<Partial<Record<"thumb" | "medium" | "full" | "webp" | "thumb_avif" | "medium_avif" | "full_avif" | "svg" | "audio", string>>>;
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
  /** `content.locations`: the points marked for `"main"` or for a venue key. Read it through `shownVenues`, which decides which one applies. */
  readonly locations: Readonly<Record<string, Location>>;
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
    locations: readLocations(content["locations"]),
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
    // P22: the gifts button is always there, with or without gifts loaded yet; the gift page says what the list holds.
    gifts: true,
    rsvp: true
  };
  return checks[section];
}

const REDIRECTOR = "/r/";

/** Every partner link goes through the redirector: it records the lead and adds attribution. */
export function partnerHref(listingId: string): string {
  return `${REDIRECTOR}${encodeURIComponent(listingId)}`;
}

/**
 * Hosts whose saved links are read. The link was typed or pasted by the host, so only `https` links of maps services are
 * accepted: never a script URL or an arbitrary site. A guest is never sent to it: only the point it carries is used.
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
const MAX_LAT = 90;
const MAX_LNG = 180;
const POINT = /(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/;

/** The OpenStreetMap link that stores a point marked on the map in the main venue's link field. */
export function pointUrl(point: MapPoint): string {
  return osmPointUrl(point);
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

/** A venue as a guest sees it in the venues section: listed or main, with its point when there is a confirmed one. */
export interface ShownVenue { readonly key: string; readonly kind: VenueKind; readonly name: string; readonly address?: string; readonly location?: Location }

/** A venue without a key of its own gets its position as key (`readContent`): a position is not a stable address for a point. */
const POSITION_KEY = /^\d+$/;

/**
 * The venues section in order. The main venue leads when it is the only one, and also when the host saved its exact place
 * and did not repeat it in the list; a listed venue with the main venue's name takes its point. Shared by both renderers.
 */
export function shownVenues(content: Pick<CelebrationContent, "venueName" | "venueMapUrl" | "venues"> & Partial<Pick<CelebrationContent, "locations">>): readonly ShownVenue[] {
  const stored = content.locations ?? {};
  const mainPoint = content.venueName ? mainVenueLocation(stored[MAIN_LOCATION_KEY], content.venueMapUrl, content.venueName) : undefined;
  const withPoint = (venue: Omit<ShownVenue, "location">, location: Location | undefined): ShownVenue => (location ? { ...venue, location } : venue);
  const main = withPoint({ key: MAIN_LOCATION_KEY, kind: VenueKind.Other, name: content.venueName }, mainPoint);
  const listed = content.venues.map((venue) => {
    const own = POSITION_KEY.test(venue.key) || venue.key === MAIN_LOCATION_KEY ? undefined : venueLocation(stored[venue.key], venue.name);
    return withPoint(venue, (venue.name === content.venueName ? mainPoint : undefined) ?? own);
  });
  const repeated = content.venues.some((venue) => venue.name === content.venueName);
  if (!content.venues.length) return [main];
  return content.venueMapUrl && content.venueName && !repeated ? [main, ...listed] : listed;
}

/** Path of each public section, in Spanish as the product's URLs are (REQ-F10-01). */
export const SECTION_PATHS: Readonly<Partial<Record<SectionId, string>>> = {
  story: "historia",
  schedule: "itinerario",
  venues: "lugares",
  gallery: "galeria",
  dressCode: "dress-code",
  faq: "faq",
  recommendations: "recomendaciones",
  /** Not a section page: the guest's gift list (`/c/{slug}/regalos` on the site, `(guest)/c/[slug]/regalos` in the app). */
  gifts: "regalos"
};

/**
 * The guest's gift list, the same address on the public site and in the app. It never carries the guest's personal link:
 * the gift page resolves the credential itself (from the session, or by asking for the link).
 */
export function giftsPath(slug: string): string {
  return `/c/${encodeURIComponent(slug)}/regalos`;
}

/**
 * What the public view will say about the gift list. Session rsvp-f1 adds `gifts.status` to GET /celebrations/public/{slug}
 * (final name in CONTRATOS.md); until it exists every invitation is treated as OPEN.
 */
export type GiftsStatus = "OPEN" | "EMPTY" | "CLOSED";

/**
 * The label of the gifts button for each status, in the renderer's own copy (`celebration.gifts.cta*`; the gift page's
 * `gifts.guest.cta.*` belongs to rsvp-f1 and is not used here). The button is always there and always goes to `/c/{slug}/regalos`:
 * only its words and its look (`data-gifts-status`) change. Callers pass `giftsStatus` once the public summary exists (BE #128);
 * until then every invitation is OPEN.
 */
export const GIFTS_CTA_KEYS: Readonly<Record<GiftsStatus, string>> = {
  OPEN: "celebration.gifts.cta",
  EMPTY: "celebration.gifts.ctaEmpty",
  CLOSED: "celebration.gifts.ctaClosed"
};

/** A section is titled by its name in the menu. The gifts block has its own copy (`celebration.gifts.*`), not the gift page's (rsvp-f1's). */
export function sectionTitleKey(section: SectionId): string {
  return `celebration.sections.${section}`;
}

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

/** The invitation on top of every guest screen (the app's `GuestFrame` and the site's guest sheet): title, who invites, when and where. */
export interface GuestCover { readonly heading: string; readonly lead?: string; /** Date and place, one line. */ readonly meta?: string }

/**
 * One reading of the cover for the app and the public site. Words come from the caller's translator (`rsvp.page.title` when the
 * hosts left the title empty, `rsvp.invite.hostedBy`), and the date from `formatDate` in the celebration's time zone, so the
 * same celebration shows the same cover on both surfaces. A date that cannot be formatted is simply left out.
 */
export function guestCover(view: Pick<PublicCelebrationView, "content" | "eventType">, options: { readonly locale: string; readonly t: (key: string, values?: Readonly<Record<string, string>>) => string; readonly formatDate: (iso: string) => string }): GuestCover {
  const content = readContent(view);
  const hosts = content.hosts.map((host) => host.name);
  let when = "";
  if (content.eventDate) {
    try { when = options.formatDate(content.eventDate); } catch { when = ""; }
  }
  const meta = [when, content.venueName].filter(Boolean).join(" · ");
  const lead = hosts.length ? options.t("rsvp.invite.hostedBy", { hosts: new Intl.ListFormat(options.locale, { style: "long", type: "conjunction" }).format(hosts) }) : "";
  return { heading: content.title || options.t("rsvp.page.title"), ...(lead ? { lead } : {}), ...(meta ? { meta } : {}) };
}
