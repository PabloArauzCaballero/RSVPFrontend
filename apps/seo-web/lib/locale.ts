import { resolveLocale, supportedLocales, type AppLocale } from "@rsvp/i18n/server";

/** `?lang=` (from the language switcher) wins over the browser's Accept-Language. */
export function requestedLanguage(lang: string | string[] | undefined, acceptLanguage: string | null): string {
  const explicit = Array.isArray(lang) ? lang[0] : lang;
  return explicit && (supportedLocales as readonly string[]).includes(explicit) ? explicit : acceptLanguage ?? "";
}

/** Interface copy is available in es-BO and en-US; a celebration may support more for its content. */
export function uiLocale(contentLocale: string): AppLocale {
  return resolveLocale(contentLocale, []);
}
