/** Language is not sensitive: localStorage is the right home on web. Storage can throw (private mode, blocked site data). */
const LOCALE_KEY = "rsvp.locale";

export async function readLocalePreference(): Promise<string | null> {
  try { return globalThis.localStorage?.getItem(LOCALE_KEY) ?? null; } catch { return null; }
}
export async function writeLocalePreference(locale: string): Promise<void> {
  try { globalThis.localStorage?.setItem(LOCALE_KEY, locale); } catch { /* the choice still applies for this run */ }
}
