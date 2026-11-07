/** Edge-safe language negotiation (no i18n runtime): used by middleware.ts and lib/site-locale.ts. */
export type SiteLocale = "es-BO" | "en-US";
export const SITE_LOCALES: readonly SiteLocale[] = ["es-BO", "en-US"];
/** Request header set by middleware.ts: the interface language of this request. */
export const SITE_LOCALE_HEADER = "x-site-locale";
/** Remembers an explicit choice from the language switcher so internal links keep it. */
export const SITE_LOCALE_COOKIE = "rsvp-lang";

export function isSupported(value: string | null | undefined): value is SiteLocale {
  return Boolean(value) && (SITE_LOCALES as readonly string[]).includes(value as string);
}

/** First Accept-Language entry whose language we ship; es-BO when none. */
export function fromAcceptLanguage(header: string | null | undefined): SiteLocale {
  for (const part of (header ?? "").split(",")) {
    const language = (part.split(";")[0] ?? "").trim().toLowerCase();
    if (language.startsWith("en")) return "en-US";
    if (language.startsWith("es")) return "es-BO";
  }
  return "es-BO";
}

/** Celebration and RSVP pages negotiate their own content language (the host's languages), so the cookie must not leak into them. */
export const OWN_LANGUAGE_PREFIXES = ["/c/", "/rsvp/"] as const;
