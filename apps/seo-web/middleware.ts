import { NextResponse, type NextRequest } from "next/server";
import { fromAcceptLanguage, isSupported, OWN_LANGUAGE_PREFIXES, SITE_LOCALE_COOKIE, SITE_LOCALE_HEADER, SITE_PATH_HEADER } from "./lib/locale-negotiation";

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
