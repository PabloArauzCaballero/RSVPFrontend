import { headers } from "next/headers";
import { createTranslator, defaultLocale, type AppLocale, type Translate } from "@rsvp/i18n/server";
import { isSupported, SITE_LOCALE_HEADER, SITE_PATH_HEADER } from "./locale-negotiation";

/** Interface language and translator of the current request (server components, metadata). */
export async function siteI18n(): Promise<{ readonly locale: AppLocale; readonly t: Translate }> {
  const value = (await headers()).get(SITE_LOCALE_HEADER);
  const locale: AppLocale = isSupported(value) ? value : defaultLocale;
  return { locale, t: createTranslator(locale) };
}

/** Path and query of the request without `?lang=`, so the language switcher keeps filters and pagination. Always starts with "/". */
export async function siteRequestPath(): Promise<string> {
  const value = (await headers()).get(SITE_PATH_HEADER) ?? "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
