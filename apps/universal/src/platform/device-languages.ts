import { getLocales } from "expo-localization";

/**
 * The person's preferred languages, most preferred first, as the operating system orders them (Settings → Language).
 *
 * Not `Intl…resolvedOptions().locale`: on iOS that is the language the *bundle* was launched in, chosen among the
 * localizations the app declares. Expo Go declares only English and a build without `CFBundleLocalizations` declares none,
 * so a phone set to Spanish reported `en-US` and the app opened in English. `getLocales()` reads the user's own list.
 * The `Intl` value stays as the last resort for a platform where the module answers nothing.
 */
export function deviceLanguages(): readonly string[] {
  let preferred: readonly string[] = [];
  try { preferred = getLocales().map((locale) => locale.languageTag).filter(Boolean); } catch { preferred = []; }
  return preferred.length ? preferred : [Intl.DateTimeFormat().resolvedOptions().locale];
}
