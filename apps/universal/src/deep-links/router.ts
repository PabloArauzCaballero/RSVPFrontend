import { personalLinkPath } from "@rsvp/auth";
import { siteOrigin } from "../platform/site-origin";

export const GUEST_RSVP_ROUTE = "/c/[slug]/rsvp/[token]";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hasControl = (value: string): boolean => Array.from(value).some((character) => character.charCodeAt(0) < 32);
export interface GuestLinkOptions { readonly trustedOrigins?: readonly string[] }

export function validGuestToken(token: string): boolean { return TOKEN.test(token); }
export function validGuestSlug(slug: string): boolean { return slug.length <= 200 && SLUG.test(slug); }
export function guestGiftsPath(slug: string, token: string): string {
  return `/c/${encodeURIComponent(slug)}/regalos/${encodeURIComponent(token)}`;
}

function configuredOrigins(): string[] {
  const origins = [siteOrigin()];
  const domain = process.env.EXPO_PUBLIC_LINK_DOMAIN;
  if (domain && /^[a-z0-9.-]+(?::[0-9]+)?$/i.test(domain)) origins.push(`https://${domain}`);
  return origins;
}

/** The domain scopes a link; only the API can establish which celebration owns its credential. */
export function resolveDeepLink(value: string, options: GuestLinkOptions = {}): string | null {
  if (!value || value.length > 2048 || /[\\\s]/.test(value) || hasControl(value) || value.startsWith("//")) return null;
  try {
    if (/(?:^|\/)(?:\.|%2e){1,2}(?:\/|[?#]|$)/i.test(value)) return null;
    const relative = value.startsWith("/");
    const url = new URL(value, relative ? "https://internal.invalid" : undefined);
    const native = url.protocol === "rsvp:";
    if (url.username || url.password || (native && url.port)) return null;
    if (!relative && !native) {
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
      const origins = (options.trustedOrigins ?? configuredOrigins()).flatMap((origin) => {
        try { return [new URL(origin).origin]; } catch { return []; }
      });
      if (!origins.includes(url.origin)) return null;
    }
    const path = native && url.hostname ? `/${url.hostname}${url.pathname}` : url.pathname;
    const match = /^\/(?:c\/([^/]+)\/)?(rsvp|regalos)\/([^/]+)\/?$/.exec(path);
    if (!match) return null;
    const slug = match[1] ? decodeURIComponent(match[1]) : null;
    const token = decodeURIComponent(match[3] ?? "");
    if (!validGuestToken(token) || (slug !== null && !validGuestSlug(slug))) return null;
    if (!slug) return `/${match[2]}/${token}`;
    return match[2] === "regalos" ? guestGiftsPath(slug, token) : personalLinkPath(slug, token);
  } catch { return null; }
}

/** Malformed guest links get a public recovery screen. Other app routes keep their existing routing. */
export function guestSystemPath(path: string): string {
  const destination = resolveDeepLink(path);
  if (destination) return destination;
  if (!path || path.includes("\\") || hasControl(path) || path.startsWith("//")) return "/invitacion";
  try {
    const internal = path.startsWith("/");
    const url = new URL(path, internal ? "https://internal.invalid" : undefined);
    const native = url.protocol === "rsvp:";
    const pathname = native && url.hostname ? `/${url.hostname}${url.pathname}` : url.pathname;
    if (internal && /^\/c\/[a-z0-9]+(?:-[a-z0-9]+)*\/rsvp\/?$/.test(pathname)) return path;
    if (pathname === "/rsvp/reporte" && (native || internal)) return path;
    if (/^\/(?:c\/[^/]+\/(?:rsvp|regalos)|rsvp|regalos)(?:\/|$)/.test(pathname)) return "/invitacion";
    return internal || native ? path : "/invitacion";
  } catch { return "/invitacion"; }
}
