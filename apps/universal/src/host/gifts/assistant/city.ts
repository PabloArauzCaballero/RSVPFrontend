import type { ProviderGeoCity } from "@rsvp/query-hooks";

const fold = (text: string): string => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
/** The keys of `celebration.content` a host may have used for the city; the contract has no city field yet (open decision in the PR). */
const CITY_KEYS = ["citySlug", "city", "venueCity"] as const;

/**
 * The delivery city the assistant starts with: a city of the catalog named by the celebration's content (by slug or by name, ignoring accents and the
 * «de la Sierra» tail of «Santa Cruz de la Sierra»), or none. Never guessed from free text such as the venue name.
 */
export function celebrationCityHint(content: Readonly<Record<string, unknown>>, cities: readonly ProviderGeoCity[]): string {
  for (const key of CITY_KEYS) {
    const raw = content[key];
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const wanted = fold(raw);
    const found = cities.find((city) => city.slug === wanted || fold(city.name) === wanted || fold(city.name).startsWith(`${wanted} `));
    if (found) return found.slug;
  }
  return "";
}
