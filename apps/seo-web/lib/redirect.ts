import { apiBaseUrl } from "./api";
import { forwardedFor } from "./client-address";

/**
 * Partner redirector (F27). Every outbound partner link is /r/{listingId}; this module asks Provider Catalog
 * (GET /r/{listingId} through the gateway) to record the lead and give the destination, then the route answers 302.
 * It is never 301: a browser would cache it and later clicks would escape lead counting.
 */

export const REDIRECT_STATUS = 302;
export const DESTINATIONS = ["OFFICIAL_SITE", "LANDING", "WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "PRODUCT_PAGE"] as const;
export const CORRELATION_HEADER = "x-correlation-id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UTM_PREFIX = "utm_";
/**
 * Context the backend validates and stores with the lead (RawLeadContext). `ctx` (R6a) is the signed lead context Gift Lists gives
 * a celebration member: it is forwarded to Provider Catalog unchanged so the member's own click is not billed, and it is never copied
 * into the partner URL (`withAttribution` only carries utm_* and correlationId). Since 3.9.0 the portal's own ctx (PROVIDER_OWNER, PREVIEW) travels the same way.
 * A click always redirects: an empty, oversized or malformed `ctx` is dropped here (an oversized one would be a 422 INVALID_LEAD_CONTEXT), so the click is
 * evaluated as an ordinary visitor's and still redirects. `eventType` (the celebration's type, from the link) is forwarded for the provider's report.
 * `sessionId` is no longer sent (M34): the visitor is the server's hash of address and user agent, never a value the client chooses.
 */
const CONTEXT_KEYS = ["surface", "celebrationId", "guestId", "locale", "country", "city", "eventType"] as const;
/**
 * Provider Catalog (feat/regalos-r6a-leads-v2, server.ts GET /r/:lid) rejects with 422 INVALID_LEAD_CONTEXT only a `ctx` longer than this; any other
 * value it cannot verify is ignored (the click is billed as a visitor's). The same code is shared by sessionId, surface, celebrationId, guestId, country,
 * city and referrer, so a 422 is not evidence of a bad `ctx` and the call is NOT retried: the oversized `ctx` is filtered here, before calling.
 */
const MAX_CTX_LENGTH = 512;
/** A signed token is printable ASCII without spaces; anything else (control characters, spaces) is not one and is not worth a 422. */
const CTX_SHAPE = /^[\x21-\x7e]+$/;

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
  /** Visitor address resolved from the trusted proxy (B1); forwarded so Kong rate-limits each visitor separately. */
  readonly clientAddress?: string | null;
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
  // A23: a link without a (known) destination asks for the listing's primary one, which only Provider Catalog knows
  // (PRODUCT_PAGE of a product, otherwise its first stored destination). Defaulting to OFFICIAL_SITE broke gift links,
  // whose products usually have only a product page.
  const requested = request.searchParams.get("destination");
  const destination = requested !== null && (DESTINATIONS as readonly string[]).includes(requested) ? requested : null;

  const rawCtx = request.searchParams.get("ctx");
  const ctx = rawCtx !== null && rawCtx.length <= MAX_CTX_LENGTH && CTX_SHAPE.test(rawCtx) ? rawCtx : null;

  const upstreamUrl = (withCtx: string | null): URL => {
    const url = new URL(`${apiBaseUrl()}/r/${request.listingId}`);
    if (destination) url.searchParams.set("destination", destination);
    for (const key of CONTEXT_KEYS) {
      const value = request.searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }
    if (withCtx) url.searchParams.set("ctx", withCtx);
    if (!url.searchParams.has("surface")) url.searchParams.set("surface", "PUBLIC_SITE");
    return url;
  };

  const headers: Record<string, string> = { [CORRELATION_HEADER]: correlationId, ...forwardedFor(request.clientAddress) };
  if (request.userAgent) headers["user-agent"] = request.userAgent;
  if (request.referrer) headers["referer"] = request.referrer;

  try {
    // redirect: "manual" so the 302 (and its Location) is read here and never followed server-side.
    const response = await (request.fetchFn ?? fetch)(upstreamUrl(ctx), { method: "GET", headers, redirect: "manual", cache: "no-store" });
    const location = response.headers.get("location");
    if (REDIRECT_STATUSES.has(response.status) && location) return { kind: "redirect", location: withAttribution(location, request.searchParams, correlationId), correlationId };
    return { kind: "failure", ...failureOf(response.status), correlationId };
  } catch {
    return { kind: "failure", reason: "unavailable", status: SERVICE_UNAVAILABLE, correlationId };
  }
}
