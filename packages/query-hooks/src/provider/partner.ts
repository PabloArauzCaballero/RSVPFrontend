import { useQuery } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { cityBySlug, PAGE_SIZE, providerSearchPath, type DirectoryCard, type DirectoryPage } from "./directory.js";
import { retryTransient } from "../policy.js";
import type { Microsite } from "./types.js";

/**
 * Partner microsite data (F25), shared by the public site and the app: the partner is built from GET /providers?slug=
 * (verified, published listings only). An unknown, unverified or suspended partner has no listings and is a controlled
 * not-found that reveals nothing; a catalogue that cannot answer is a distinct "unavailable" state, never a not-found.
 */

const MAX_SLUG_PAGES = 20;
export const PARTNER_CONTACT_ORDER = ["WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "OFFICIAL_SITE"] as const;

export interface PartnerPicture { readonly url: string; readonly alt: string }
export interface Partner {
  readonly slug: string;
  readonly name: string;
  readonly category: string;
  readonly city: string;
  readonly department: string;
  readonly summary?: string;
  readonly imageUrl?: string;
  /** The provider's logo, uploaded as a file and chosen in its microsite (provider-catalog 3.13.0). */
  readonly logoUrl?: string;
  /** Photos of the published microsite, in the order the provider chose. `alt` may be empty: the provider did not describe it. */
  readonly gallery?: readonly PartnerPicture[];
  readonly address?: string;
  /** The exact point of the public address, when the partner marked it (`address.latitude/longitude` of the microsite); never a link. */
  readonly point?: { readonly lat: number; readonly lng: number };
  readonly hours: readonly string[];
  readonly coverage: readonly string[];
  /** Listing that carries the contact buttons; every destination is reached via /r/{listingId}. */
  readonly primaryListingId: string;
  readonly providerId?: string;
  readonly destinations: readonly string[];
  readonly listings: readonly DirectoryCard[];
}

export type PartnerLookup =
  | { readonly state: "ok"; readonly partner: Partner }
  | { readonly state: "not-found" }
  | { readonly state: "unavailable" };

/**
 * The catalogue sends the address either as a line of text or as an object `{ line, city, reference, latitude, longitude }`;
 * the page only ever prints text, so an object is reduced to its street line (never rendered as a React child).
 */
export function addressText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (value && typeof value === "object") {
    const { line, reference } = value as { line?: unknown; reference?: unknown };
    const parts = [line, reference].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
    return parts.length ? parts.join(", ") : undefined;
  }
  return undefined;
}

/** The point of an address object (`latitude`/`longitude`), only when both are valid coordinates. */
export function addressPoint(value: unknown): { readonly lat: number; readonly lng: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { latitude, longitude } = value as { latitude?: unknown; longitude?: unknown };
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { lat: latitude, lng: longitude } : undefined;
}

/**
 * Coverage zones come from every card and its fulfillment, typed by the provider: "Santa cruz de la sierra" and
 * "Santa Cruz de la Sierra " are one zone. Kept once (the first spelling), compared as shown (a city slug counts as its name) without case or extra spaces.
 */
export function uniqueZones(zones: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const zone of zones) {
    const shown = zone.trim().replace(/\s+/g, " ");
    // A known city slug ("la-paz") and its name ("La Paz") are the same place on screen.
    const key = zoneName(shown).toLocaleLowerCase("es");
    if (shown && !seen.has(key)) seen.set(key, shown);
  }
  return [...seen.values()];
}

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The lines of text of a provider's business hours. The catalogue sends the contract `BusinessHours` OBJECT
 * (`{ weekly: [{ weekdays: [1,2,3], opens: "09:00", closes: "18:00" }], note? }`), not a list: one line per row ("Lun, Mar, Mié 09:00-18:00")
 * and the note last. Anything else (absent, a list of lines from an older mock, malformed rows) never throws: it gives what can be read.
 */
export function hoursLines(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((line): line is string => typeof line === "string" && line.trim() !== "");
  if (!value || typeof value !== "object") return [];
  const { weekly, note } = value as { weekly?: unknown; note?: unknown };
  const rows = Array.isArray(weekly) ? weekly.flatMap((row): string[] => {
    if (!row || typeof row !== "object") return [];
    const { weekdays, opens, closes } = row as { weekdays?: unknown; opens?: unknown; closes?: unknown };
    if (typeof opens !== "string" || typeof closes !== "string" || !TIME.test(opens) || !TIME.test(closes) || !Array.isArray(weekdays)) return [];
    const days = [...new Set(weekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b).map((day) => DAYS_ES[day]);
    return days.length ? [`${days.join(", ")} ${opens}-${closes}`] : [];
  }) : [];
  return [...rows, ...(typeof note === "string" && note.trim() ? [note.trim()] : [])];
}

export function partnerFromListings(slug: string, cards: readonly DirectoryCard[]): Partner | null {
  const own = cards.filter((card) => card.providerSlug === slug && card.verified);
  const head = own[0];
  if (!head) return null;
  const known = PARTNER_CONTACT_ORDER.filter((destination) => own.some((card) => card.destinations?.includes(destination)));
  // The public card does not list its destinations: offer the default one and let the redirector answer if it is not enabled.
  const destinations = known.length ? known : (PARTNER_CONTACT_ORDER.slice(-1) as readonly string[]);
  const withContact = own.find((card) => card.destinations?.length) ?? head;
  return {
    slug,
    name: head.name,
    category: head.category,
    city: head.city,
    department: head.department,
    ...(head.summary ? { summary: head.summary } : {}),
    ...(head.imageUrl ? { imageUrl: head.imageUrl } : {}),
    ...(own.find((card) => card.logoUrl)?.logoUrl ? { logoUrl: own.find((card) => card.logoUrl)?.logoUrl as string } : {}),
    ...(addressText(head.address) ? { address: addressText(head.address) } : {}),
    ...(addressPoint(head.address) ? { point: addressPoint(head.address) as { lat: number; lng: number } } : {}),
    hours: hoursLines(head.hours),
    coverage: uniqueZones(own.flatMap((card) => [...(card.coverage ?? []), ...(card.fulfillment?.coverageZones ?? [])])),
    ...(own.find((card) => card.providerId)?.providerId ? { providerId: own.find((card) => card.providerId)?.providerId as string } : {}),
    primaryListingId: withContact.listingId,
    destinations,
    listings: own
  };
}

/** Coverage zones arrive as city slugs ("la-paz"); known cities are shown by name. */
export const zoneName = (zone: string): string => cityBySlug(zone)?.name ?? zone;

/** Today's calendar date (YYYY-MM-DD) and month (YYYY-MM) in an IANA zone (the provider's, never the device's). */
export function todayIn(timeZone: string, now: Date = new Date()): { readonly date: string; readonly month: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return { date: parts, month: parts.slice(0, 7) };
}

export function shiftMonth(month: string, delta: number): string {
  const [year = 0, mon = 1] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
export const dayState = <TDay extends { readonly available: boolean; readonly reason?: string | null }>(day: TDay): "free" | "blocked" | "full" => (day.available ? "free" : day.reason === "FULL" ? "full" : "blocked");

/**
 * Why a loaded month has nothing to pick, or null when it has a free day: the provider published no days for it
 * (an empty calendar: no availability configured) or every published day is blocked or full. Both surfaces say it the same way.
 */
export function agendaEmptiness<TDay extends { readonly available: boolean }>(days: readonly TDay[]): "unpublished" | "noneFree" | null {
  if (days.length === 0) return "unpublished";
  return days.some((day) => day.available) ? null : "noneFree";
}

/** One message per failure the quote path can answer: rate limits (with the wait), a failed captcha, a rejected (bot-like) request. */
export function quoteFailureMessage(status: number | undefined, code: string | undefined, retryAfter: number | undefined): { readonly key: string; readonly values?: Readonly<Record<string, number>> } {
  if (status === 429) {
    if (code === "QUOTE_LIMIT_REACHED") return { key: "quote.errors.limitContact" };
    return retryAfter ? { key: "quote.errors.rateLimitedWait", values: { minutes: Math.max(1, Math.ceil(retryAfter / 60)) } } : { key: "quote.errors.rateLimited" };
  }
  if (status === 403) return { key: code === "PROOF_FAILED" ? "quote.errors.proof" : "quote.errors.captcha" };
  if (status === 422) return { key: code === "QUOTE_REJECTED" ? "quote.errors.rejected" : "quote.errors.validation" };
  if (status === 404) return { key: "quote.errors.notFound" };
  return { key: "quote.errors.generic" };
}

/** The public profile the agenda and the quote need: the provider's own name, currency and time zone. */
export interface PartnerProfile { readonly id: string; readonly name: string; readonly currency: string; readonly timeZone: string; readonly status: string }
export type PartnerContext =
  | { readonly state: "ok"; readonly partner: Partner; readonly profile: PartnerProfile }
  | { readonly state: "not-found" }
  | { readonly state: "unavailable"; readonly partner?: Partner };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Collects the partner's cards across the directory pages (bounded): Provider Catalog 2.0.0 ignores `?slug=`. */
async function partnerCards(client: ApiClient, slug: string, signal?: AbortSignal): Promise<{ readonly cards: readonly DirectoryCard[]; readonly reachable: boolean }> {
  const cards: DirectoryCard[] = [];
  for (let page = 1; page <= MAX_SLUG_PAGES; page += 1) {
    let result: DirectoryPage;
    try { result = await client.request<DirectoryPage>(providerSearchPath({ slug, page }), { auth: false, signal }); } catch { return { cards, reachable: cards.length > 0 }; }
    cards.push(...result.items.filter((card) => card.providerSlug === slug));
    if (page * (result.pageSize || PAGE_SIZE) >= result.total) break;
  }
  return { cards, reachable: true };
}

/** The provider id: on the card when the catalogue sends it, otherwise from the listing read (GET /listings/{id}). */
async function providerIdOf(client: ApiClient, partner: Partner): Promise<string | null> {
  if (partner.providerId) return partner.providerId;
  try {
    const listing = await client.request<{ readonly providerId?: unknown }>(`/listings/${encodeURIComponent(partner.primaryListingId)}`, { auth: false });
    return typeof listing.providerId === "string" && UUID.test(listing.providerId) ? listing.providerId : null;
  } catch { return null; }
}

/** The gallery and the logo of a microsite as a partner shows them; the alt text is the one in the reader's language, else Spanish, else any. */
export function micrositePictures(microsite: { readonly gallery?: readonly { readonly url: string; readonly alt?: Readonly<Record<string, string>> }[]; readonly logo?: { readonly url: string } | null }, locale = "es-BO"): Pick<Partner, "logoUrl" | "gallery"> {
  const alt = (value: Readonly<Record<string, string>> | undefined): string => value?.[locale] ?? value?.["es-BO"] ?? Object.values(value ?? {})[0] ?? "";
  const gallery = (microsite.gallery ?? []).filter((entry) => entry.url).map((entry) => ({ url: entry.url, alt: alt(entry.alt) }));
  return { ...(microsite.logo?.url ? { logoUrl: microsite.logo.url } : {}), ...(gallery.length ? { gallery } : {}) };
}

/** Adds the logo and gallery of the provider's published microsite. A microsite that cannot be read leaves the partner as it is. */
export async function withMicrositePictures(client: ApiClient, partner: Partner, providerId: string, locale = "es-BO", signal?: AbortSignal): Promise<Partner> {
  try {
    const microsite = await client.request<Pick<Microsite, "gallery" | "logo">>(`/providers/${providerId}/microsite`, { auth: false, ...(signal ? { signal } : {}) });
    return { ...partner, ...micrositePictures(microsite, locale) };
  } catch {
    return partner;
  }
}

/**
 * The microsite as the app reads it: partner + provider profile. A partner whose provider is not VERIFIED (or 404) is
 * not-found; a profile that cannot be read leaves the partner visible (its cards are public) but marks quote/agenda unavailable.
 */
export async function loadPartnerContext(client: ApiClient, slug: string, signal?: AbortSignal): Promise<PartnerContext> {
  const { cards, reachable } = await partnerCards(client, slug, signal);
  if (!reachable) return { state: "unavailable" };
  const found = partnerFromListings(slug, cards);
  if (!found) return { state: "not-found" };
  const providerId = await providerIdOf(client, found);
  if (!providerId) return { state: "unavailable", partner: found };
  try {
    const profile = await client.request<PartnerProfile>(`/providers/${providerId}`, { auth: false, signal });
    if (profile.status !== "VERIFIED") return { state: "not-found" };
    // The public card's `name` is the listing title; the business name is the provider's own.
    const named = { ...found, providerId, name: profile.name || found.name };
    return { state: "ok", partner: await withMicrositePictures(client, named, providerId, "es-BO", signal), profile };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { state: "not-found" };
    return { state: "unavailable", partner: found };
  }
}

export function usePartnerContext(client: ApiClient, slug: string) {
  return useQuery({ queryKey: ["providers", "partner", slug] as const, queryFn: ({ signal }) => loadPartnerContext(client, slug, signal), enabled: Boolean(slug), staleTime: 60_000, retry: retryTransient });
}
