/** Edge-safe language negotiation (no i18n runtime): used by middleware.ts and lib/site-locale.ts. */
export type SiteLocale = "es-BO" | "en-US";
export const SITE_LOCALES: readonly SiteLocale[] = ["es-BO", "en-US"];
/** The language of the clean address (what crawlers get). */
export const DEFAULT_SITE_LOCALE: SiteLocale = "es-BO";
/** Request header set by middleware.ts: the interface language of this request. */
export const SITE_LOCALE_HEADER = "x-site-locale";
/** Request header set by middleware.ts: path and query of the request without `?lang=` (for the language switcher). */
export const SITE_PATH_HEADER = "x-site-path";
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

/** The same address with the interface language switched: keeps path, filters and pagination, replaces any `lang`. */
export function withLanguage(path: string, locale: SiteLocale): string {
  const [pathname = "/", query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", locale);
  return `${pathname}?${params.toString()}`;
}

/** Paths that are pages a person reads. The partner redirector (`/r/`) and well-known files are never redirected by language. */
const NOT_PAGES = ["/r/", "/.well-known/"] as const;

/** A plain GET navigation to a page (not a prefetch of data, not the redirector, not a well-known file). */
export function isRedirectable(request: { readonly method: string; readonly nextUrl: { readonly pathname: string } }): boolean {
  return request.method === "GET" && !NOT_PAGES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
}
