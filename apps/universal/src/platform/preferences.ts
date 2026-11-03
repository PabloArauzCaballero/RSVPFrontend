import * as SecureStore from "expo-secure-store";

/** Non-secret user preferences (language). Native: the same keystore wrapper keeps the code to one adapter. */
const LOCALE_KEY = "rsvp.locale";

export async function readLocalePreference(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(LOCALE_KEY); } catch { return null; }
}
export async function writeLocalePreference(locale: string): Promise<void> {
  try { await SecureStore.setItemAsync(LOCALE_KEY, locale); } catch { /* the choice still applies for this run */ }
}
