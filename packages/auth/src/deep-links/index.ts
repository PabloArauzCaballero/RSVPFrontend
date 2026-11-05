export interface MagicLink { token: string; url: string; }

/**
 * THE personal-link format (one helper for web, app, AASA/assetlinks and the parser):
 * `${origin}/c/{slug}/rsvp/{token}`. The slug is public; the token is the only credential.
 */
export const PERSONAL_LINK_SEGMENT = "rsvp";
/** Path patterns the verification files advertise: the canonical link first, the legacy token-only form second. */
export const PERSONAL_LINK_PATHS: readonly string[] = ["/c/*/rsvp/*", "/rsvp/*"];
/** @deprecated Legacy token-only prefix. Kept so links already sent keep opening the app/web fallback. */
export const MAGIC_LINK_PATH = "/rsvp";

const DEFAULT_ORIGIN = "http://localhost:3000";
const trimSlash = (value: string): string => value.replace(/\/$/, "");

/** The public origin of personal links; configurable per environment (never hardcoded in screens). */
export function personalLinkOrigin(environment: Record<string, string | undefined>): string {
  return trimSlash(environment["RSVP_PUBLIC_ORIGIN"] || environment["NEXT_PUBLIC_SITE_URL"] || environment["EXPO_PUBLIC_SITE_URL"] || DEFAULT_ORIGIN);
}

export function personalLinkPath(slug: string, token: string): string {
  return `/c/${encodeURIComponent(slug)}/${PERSONAL_LINK_SEGMENT}/${encodeURIComponent(token)}`;
}

/** Canonical personal link of a guest. */
export function personalLinkUrl(origin: string, slug: string, token: string): MagicLink {
  return { token, url: `${trimSlash(origin)}${personalLinkPath(slug, token)}` };
}

/** @deprecated Token-only form (`/rsvp/{token}`): cannot be resolved without the slug. Use `personalLinkUrl`. */
export function magicLinkUrl(origin: string, token: string): MagicLink { return { token, url: `${trimSlash(origin)}${MAGIC_LINK_PATH}/${encodeURIComponent(token)}` }; }

/** The native custom-scheme form that opens the installed app when no verified domain is configured. */
export function nativeMagicLink(token: string, slug?: string): string {
  return slug ? `rsvp://c/${encodeURIComponent(slug)}/${PERSONAL_LINK_SEGMENT}/${encodeURIComponent(token)}` : `rsvp://rsvp/${encodeURIComponent(token)}`;
}

export interface ParsedPersonalLink { readonly token: string; /** null for the legacy token-only forms. */ readonly slug: string | null; }

const decode = (part: string): string => decodeURIComponent(part);

/**
 * Accepts, from any origin on http(s) or the `rsvp:` scheme: `/c/{slug}/rsvp/{token}` (canonical) and the
 * legacy `/rsvp/{token}` and `rsvp://rsvp/{token}`. Anything else (or a malformed URL) is null.
 */
export function parsePersonalLink(url: string): ParsedPersonalLink | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  const native = parsed.protocol === "rsvp:";
  if (!native && parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  // rsvp://c/{slug}/rsvp/{token}: the "c" is the URL host; rsvp://rsvp/{token}: the host is "rsvp".
  const parts = [...(native ? [parsed.hostname] : []), ...parsed.pathname.split("/")].filter(Boolean);
  try {
    if (parts[0] === "c" && parts[2] === PERSONAL_LINK_SEGMENT && parts[1] && parts[3]) return { slug: decode(parts[1]), token: decode(parts[3]) };
    if (parts[0] === PERSONAL_LINK_SEGMENT && parts[1] && (native ? parsed.hostname === PERSONAL_LINK_SEGMENT : true)) return { slug: null, token: decode(parts[1]) };
    return null;
  } catch { return null; }
}

/** The token of any supported personal link (compatible with every link format issued so far). */
export function parseMagicLink(url: string): string | null { return parsePersonalLink(url)?.token ?? null; }
