import { LOCATIONS_KEY, MAIN_LOCATION, legacyLink, withLocation, type CelebrationLocation } from "@rsvp/celebration-theme/model";
import type { Celebration } from "@rsvp/query-hooks";

/**
 * Editing helpers. Instants are edited as the wall clock of the celebration (the API returns
 * `localTimes` and accepts YYYY-MM-DDTHH:mm in the celebration zone), and the API stores them as UTC.
 */

export interface WallClock { readonly date: string; readonly time: string }

// Calendar date. Matches "2026-12-19"; rejects "19/12/2026".
// https://regex101.com/?flavor=javascript&regex=%5E%5Cd%7B4%7D-%5Cd%7B2%7D-%5Cd%7B2%7D%24&flags=gm&testString=2026-12-19%0A19%2F12%2F2026
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// 24-hour time. Matches "19:00"; rejects "7pm".
// https://regex101.com/?flavor=javascript&regex=%5E(%5B01%5D%5Cd%7C2%5B0-3%5D)%3A%5B0-5%5D%5Cd%24&flags=gm&testString=19%3A00%0A7pm
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMPTY: WallClock = { date: "", time: "" };

export function wallClockAt(celebration: Pick<Celebration, "localTimes">, path: string): WallClock {
  const local = celebration.localTimes?.[path];
  return local ? { date: local.date, time: local.time } : EMPTY;
}

/** YYYY-MM-DD that exists in the calendar (rejects 2027-13-45 and 2027-02-30). */
export function isCalendarDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export type WallClockResult = { readonly ok: true; readonly value: string | null } | { readonly ok: false };

/** Both empty → no value; both valid → YYYY-MM-DDTHH:mm; anything else is invalid. */
export function toWallClock({ date, time }: WallClock): WallClockResult {
  if (!date.trim() && !time.trim()) return { ok: true, value: null };
  return isCalendarDate(date.trim()) && TIME.test(time.trim()) ? { ok: true, value: `${date.trim()}T${time.trim()}` } : { ok: false };
}

/** JSON with object keys in alphabetical order: the API stores content with sorted keys, so key order is never a change. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, item: unknown) => (typeof item === "object" && item !== null && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([first], [second]) => first.localeCompare(second))) : item));
}

/** Top-level keys whose value changed; removed keys map to null (the API deletes them). */
export function contentPatch(original: Readonly<Record<string, unknown>>, draft: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const keys = new Set([...Object.keys(original), ...Object.keys(draft)]);
  return Object.fromEntries([...keys]
    .filter((key) => canonicalJson(original[key]) !== canonicalJson(draft[key]))
    .map((key) => [key, draft[key] === undefined || draft[key] === "" ? null : draft[key]]));
}

type Unknown = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Unknown => typeof value === "object" && value !== null && !Array.isArray(value);
export const asText = (value: unknown): string => (typeof value === "string" ? value : "");
export const asRecords = (value: unknown): Unknown[] => (Array.isArray(value) ? value.filter(isRecord) : []);
export const asRecord = (value: unknown): Unknown => (isRecord(value) ? value : {});

export interface ScheduleDraft { readonly id: string; readonly title: string; readonly description: string; readonly date: string; readonly time: string; /** `key` of a venue of the list; empty when the item has no place. Kept as the API stores it so editing the programme never drops it. */ readonly venueKey: string }

export function scheduleDraft(celebration: Pick<Celebration, "content" | "localTimes">): ScheduleDraft[] {
  return asRecords(celebration.content["schedule"]).map((item, index) => ({
    id: asText(item["id"]) || `item-${index}`,
    title: asText(item["title"]),
    description: asText(item["description"]),
    venueKey: asText(item["venueKey"]),
    ...wallClockAt(celebration, `schedule.${index}.startsAt`)
  }));
}

/** Schedule items as the API stores them; an item with an invalid date or time stops the save. */
export function scheduleContent(items: readonly ScheduleDraft[]): { readonly ok: true; readonly value: Unknown[] } | { readonly ok: false; readonly index: number } {
  const converted = items.map((item) => toWallClock(item));
  const invalid = converted.findIndex((result, index) => !result.ok || (result.ok && !result.value && Boolean(items[index]?.title)));
  if (invalid >= 0) return { ok: false, index: invalid };
  return {
    ok: true,
    value: items.filter((item) => item.title.trim()).map((item, index) => {
      const result = converted[index];
      return { id: item.id, title: item.title.trim(), ...(item.description.trim() ? { description: item.description.trim() } : {}), ...(item.venueKey ? { venueKey: item.venueKey } : {}), startsAt: result?.ok ? result.value : null };
    })
  };
}

let counter = 0;
/** Locally unique id for new list items (schedule entries are matched to their translations by it). */
export function newItemId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

const SLUG_SEPARATOR = "-";
// Runs of characters that are not lowercase letters or digits. "Ana & Luis 2026" → "ana-luis-2026".
// https://regex101.com/?flavor=javascript&regex=%5B%5Ea-z0-9%5D%2B&flags=g&testString=ana%20%26%20luis%202026
const NOT_SLUG = /[^a-z0-9]+/g;
const MAX_SLUG = 60;
// Combining accents left by NFKD. "Quinceañera" (decomposed) → "Quinceanera".
// https://regex101.com/?flavor=javascript&regex=%5Cp%7BDiacritic%7D&flags=gu&testString=Quincen%CC%83era
const DIACRITICS = /\p{Diacritic}/gu;
// Hyphens at either end. "-ana-luis-" → "ana-luis"; "ana-luis" is unchanged.
// https://regex101.com/?flavor=javascript&regex=%5E-%2B%7C-%2B%24&flags=g&testString=-ana-luis-
const EDGE_HYPHENS = /^-+|-+$/g;

/** Proposes a slug from the celebration name: "Ana & Luis" → "ana-luis". */
export function slugify(title: string): string {
  return title.normalize("NFKD").replace(DIACRITICS, "").toLowerCase().replace(NOT_SLUG, SLUG_SEPARATOR).replace(EDGE_HYPHENS, "").slice(0, MAX_SLUG);
}

/** Keys of the venues of a draft (`content.venues[].key`): the only places, besides the main one, that may hold a point. */
export function venueKeys(draft: Readonly<Record<string, unknown>>): string[] {
  return asRecords(draft["venues"]).map((venue) => asText(venue["key"])).filter(Boolean);
}

/**
 * The draft with one place's point set or removed (`content.locations[key]`, a top-level key so apps that do not know it keep it
 * when they save something else). The main venue also mirrors its point as an OpenStreetMap link in `venueMapUrl`, so apps that
 * only know the old field keep a pin until they update; removing the point removes the mirror. Never writes a Google link.
 */
export function withPlaceLocation(draft: Readonly<Record<string, unknown>>, key: string, location: CelebrationLocation | null): Record<string, unknown> {
  const locations = withLocation(draft[LOCATIONS_KEY], key, location, venueKeys(draft));
  const next: Record<string, unknown> = { ...draft };
  if (locations) next[LOCATIONS_KEY] = locations; else delete next[LOCATIONS_KEY];
  if (key === MAIN_LOCATION) { if (location) next["venueMapUrl"] = legacyLink(location); else delete next["venueMapUrl"]; }
  return next;
}

/** The draft without points of venues that no longer exist (a removed row must not leave its point behind). */
export function prunedLocations(draft: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const raw = draft[LOCATIONS_KEY];
  if (!isRecord(raw)) return { ...draft };
  const allowed = new Set([MAIN_LOCATION, ...venueKeys(draft)]);
  const kept = Object.fromEntries(Object.entries(raw).filter(([key]) => allowed.has(key)));
  const next: Record<string, unknown> = { ...draft };
  if (Object.keys(kept).length) next[LOCATIONS_KEY] = kept; else delete next[LOCATIONS_KEY];
  return next;
}
