/**
 * The guest's link credential for the gift list. It arrives in the URL fragment (`/c/{slug}/regalos#t=…`, which never reaches
 * a server log or a Referer) or from the personal RSVP link, and lives in sessionStorage of this tab only; it is never put in a
 * query key, a cookie or an analytics event.
 */
const PREFIX = "rsvp.guest.credential.";
const FRAGMENT = /(?:^|[#&])t=([A-Za-z0-9._~+/=-]{16,512})/;

function store(): Storage | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
}
export const credentialKey = (slug: string): string => `${PREFIX}${slug}`;
export function saveGuestCredential(slug: string, token: string): void { store()?.setItem(credentialKey(slug), token); }
export function clearGuestCredential(slug: string): void { store()?.removeItem(credentialKey(slug)); }

/** Reads `#t=` once (and removes it from the address bar), otherwise the stored credential. */
export function readGuestCredential(slug: string): string | null {
  if (typeof window === "undefined") return null;
  const match = FRAGMENT.exec(window.location.hash);
  if (match?.[1]) {
    saveGuestCredential(slug, match[1]);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    return match[1];
  }
  return store()?.getItem(credentialKey(slug)) ?? null;
}
