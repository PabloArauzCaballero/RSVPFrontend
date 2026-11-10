import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_SITE_LOCALE, fromAcceptLanguage, isRedirectable, isSupported, OWN_LANGUAGE_PREFIXES, SITE_LOCALE_COOKIE, SITE_LOCALE_HEADER, SITE_PATH_HEADER } from "./lib/locale-negotiation";

/**
 * Interface language for the whole site: an explicit `?lang=` (language switcher) wins and is remembered in a cookie,
 * then the cookie, then the browser's Accept-Language. Pages read it from a request header (see lib/site-locale.ts).
 * Responses vary by language so caches never serve English to a Spanish visitor.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ownLanguage = OWN_LANGUAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const explicit = searchParams.get("lang");
  const cookie = ownLanguage ? undefined : request.cookies.get(SITE_LOCALE_COOKIE)?.value;
  const locale = isSupported(explicit) ? explicit : isSupported(cookie) ? cookie : fromAcceptLanguage(request.headers.get("accept-language"));
  // One address, one language. A visitor with no explicit choice (no ?lang=, no cookie) whose browser asks for English is sent to the address that
  // already declares English (canonical and hreflang say `?lang=en-US`), and the choice is remembered. Without this, `/proveedores` would answer
  // in Spanish to crawlers and in English to an English browser while its hreflang says it is Spanish. Temporary (307) and keyed on Accept-Language
  // via Vary: crawlers send none and keep the clean Spanish address.
  if (!ownLanguage && isRedirectable(request) && !isSupported(explicit) && !isSupported(cookie) && locale !== DEFAULT_SITE_LOCALE) {
    const target = request.nextUrl.clone();
    target.searchParams.set("lang", locale);
    const redirect = NextResponse.redirect(target, 307);
    redirect.cookies.set(SITE_LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    redirect.headers.append("Vary", "Accept-Language, Cookie");
    return redirect;
  }
  const headers = new Headers(request.headers);
  headers.set(SITE_LOCALE_HEADER, locale);
  const kept = new URLSearchParams(searchParams);
  kept.delete("lang");
  headers.set(SITE_PATH_HEADER, `${pathname}${kept.size ? `?${kept.toString()}` : ""}`);
  const response = NextResponse.next({ request: { headers } });
  if (!ownLanguage && isSupported(explicit) && explicit !== cookie) response.cookies.set(SITE_LOCALE_COOKIE, explicit, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  response.headers.append("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = { matcher: ["/((?!_next/|api/|.*\\..*).*)"] };
