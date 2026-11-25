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
export function saveGuestCredential(slug: string, token: string): void {
  try { store()?.setItem(credentialKey(slug), token); } catch { /* Private browsing can make storage read-only; the link fragment remains usable. */ }
}
export function clearGuestCredential(slug: string): void {
  try { store()?.removeItem(credentialKey(slug)); } catch { /* Storage may be unavailable. */ }
}

/** Client-only handoff. The fragment never reaches the server and also works when opening a new tab. */
export const guestGiftPath = (slug: string, token: string, locale?: string): string => `/c/${encodeURIComponent(slug)}/regalos${locale ? `?lang=${encodeURIComponent(locale)}` : ''}#t=${encodeURIComponent(token)}`;

/** Reads `#t=` once (and removes it from the address bar), otherwise the stored credential. */
export function readGuestCredential(slug: string): string | null {
  if (typeof window === "undefined") return null;
  const match = FRAGMENT.exec(window.location.hash);
  if (match?.[1]) {
    saveGuestCredential(slug, match[1]);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    return match[1];
  }
  try { return store()?.getItem(credentialKey(slug)) ?? null; } catch { return null; }
}

/**
 * Whether this tab holds the guest's credential, without reading its value into the page and without touching the address
 * bar (unlike `readGuestCredential`, which consumes the `#t=` fragment). The public celebration only needs the yes/no.
 */
export function hasGuestCredential(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try { return Boolean(store()?.getItem(credentialKey(slug))); } catch { return false; }
}

/**
 * Inline script for the top of `/c/{slug}`: runs while the page is parsed, before any third-party frame (video, map) can load,
 * so a credential that arrived in the fragment (`#t=`, e.g. from the app on the web) is stored and removed from the address bar
 * and the history entry at once. Same rule as `readGuestCredential`; the token is never written anywhere else.
 */
/** `<` as an escape, so a slug can never close the script element or open a comment (`</script>`, `<!--`), as `jsonLdScript` does. */
const escapeForScript = (json: string): string => json.replace(/</g, "\\u003c");

export function earlyCredentialScript(slug: string): string {
  return `(function(){try{var m=/(?:^|[#&])t=([A-Za-z0-9._~+\\/=-]{16,512})/.exec(location.hash);if(!m)return;sessionStorage.setItem(${escapeForScript(JSON.stringify(credentialKey(slug)))},m[1]);history.replaceState(null,"",location.pathname+location.search);}catch(e){}})();`;
}
