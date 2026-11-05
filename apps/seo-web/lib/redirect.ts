import { apiBaseUrl } from "./api";

/**
 * Partner redirector (F27). Every outbound partner link is /r/{listingId}; this module asks Provider Catalog
 * (GET /r/{listingId} through the gateway) to record the lead and give the destination, then the route answers 302.
 * It is never 301: a browser would cache it and later clicks would escape lead counting.
 */

export const REDIRECT_STATUS = 302;
export const DEFAULT_DESTINATION = "OFFICIAL_SITE";
export const DESTINATIONS = ["OFFICIAL_SITE", "LANDING", "WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "PRODUCT_PAGE"] as const;
export const SURFACES = ["PUBLIC_SITE", "SEARCH", "CELEBRATION_SITE", "GIFT_LIST", "EMAIL", "APP", "QUOTE_FORM"] as const;
export const CORRELATION_HEADER = "x-correlation-id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UTM_PREFIX = "utm_";
/** Context the backend validates and stores with the lead (RawLeadContext). */
const CONTEXT_KEYS = ["surface", "celebrationId", "guestId", "locale", "country", "city"] as const;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const UNPROCESSABLE = 422;
const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type RedirectFailure = "invalid" | "not-found" | "unavailable";
export type RedirectOutcome =
  | { readonly kind: "redirect"; readonly location: string; readonly correlationId: string }
  | { readonly kind: "failure"; readonly reason: RedirectFailure; readonly status: number; readonly correlationId: string };

export interface RedirectRequest {
  readonly listingId: string;
  readonly searchParams: URLSearchParams;
  readonly userAgent?: string | null;
  readonly referrer?: string | null;
  readonly correlationId?: string | null;
  readonly sessionId?: string | null;
  readonly fetchFn?: typeof fetch;
}

/** The correlationId of the click: the caller's header, then ?correlationId, then a new one. Malformed values are replaced. */
export function correlationIdOf(header: string | null | undefined, query: string | null): string {
  const candidate = header ?? query ?? "";
  return UUID.test(candidate) ? candidate.toLowerCase() : crypto.randomUUID();
}

/** UTM parameters and correlationId the visitor's link already carries must survive into the final URL. */
export function withAttribution(location: string, incoming: URLSearchParams, correlationId: string): string {
  let target: URL;
  try { target = new URL(location); } catch { return location; }
  if (target.protocol !== "https:" && target.protocol !== "http:") return location;
  for (const [key, value] of incoming) if (key.startsWith(UTM_PREFIX) && !target.searchParams.has(key)) target.searchParams.set(key, value);
  if (!target.searchParams.has("correlationId")) target.searchParams.set("correlationId", correlationId);
  return target.toString();
}

function failureOf(status: number): { readonly reason: RedirectFailure; readonly status: number } {
  if (status === NOT_FOUND) return { reason: "not-found", status: NOT_FOUND };
  if (status === BAD_REQUEST || status === UNPROCESSABLE) return { reason: "invalid", status: BAD_REQUEST };
  return { reason: "unavailable", status: status >= 500 ? SERVICE_UNAVAILABLE : BAD_GATEWAY };
}

export async function resolveRedirect(request: RedirectRequest): Promise<RedirectOutcome> {
  const correlationId = correlationIdOf(request.correlationId, request.searchParams.get("correlationId"));
  if (!UUID.test(request.listingId)) return { kind: "failure", reason: "not-found", status: NOT_FOUND, correlationId };
  const requested = request.searchParams.get("destination") ?? DEFAULT_DESTINATION;
  const destination = (DESTINATIONS as readonly string[]).includes(requested) ? requested : DEFAULT_DESTINATION;

  const upstream = new URL(`${apiBaseUrl()}/r/${request.listingId}`);
  upstream.searchParams.set("destination", destination);
  for (const key of CONTEXT_KEYS) {
    const value = request.searchParams.get(key);
    if (value) upstream.searchParams.set(key, value);
  }
  if (!upstream.searchParams.has("surface")) upstream.searchParams.set("surface", "PUBLIC_SITE");

  const headers: Record<string, string> = { [CORRELATION_HEADER]: correlationId };
  if (request.userAgent) headers["user-agent"] = request.userAgent;
  if (request.referrer) headers["referer"] = request.referrer;
  if (request.sessionId) headers["x-session-id"] = request.sessionId;

  try {
    // redirect: "manual" so the 302 (and its Location) is read here and never followed server-side.
    const response = await (request.fetchFn ?? fetch)(upstream, { method: "GET", headers, redirect: "manual", cache: "no-store" });
    const location = response.headers.get("location");
    if (REDIRECT_STATUSES.has(response.status) && location) return { kind: "redirect", location: withAttribution(location, request.searchParams, correlationId), correlationId };
    return { kind: "failure", ...failureOf(response.status), correlationId };
  } catch {
    return { kind: "failure", reason: "unavailable", status: SERVICE_UNAVAILABLE, correlationId };
  }
}
