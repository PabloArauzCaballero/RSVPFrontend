/**
 * Web build: sessionStorage of this tab only, under the same key the public site uses (`apps/seo-web/lib/guest-credential.ts`),
 * so a guest who opened the link on either surface of the same origin keeps access. Storage may be blocked (private mode).
 */
const PREFIX = "rsvp.guest.credential.";

function store(): Storage | null {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}
export function saveGiftCredential(slug: string, token: string): void {
  try { store()?.setItem(`${PREFIX}${slug}`, token); } catch { /* read-only storage: the link itself still works */ }
}
export function readGiftCredential(slug: string): string | null {
  try { return store()?.getItem(`${PREFIX}${slug}`) ?? null; } catch { return null; }
}
export function clearGiftCredential(slug: string): void {
  try { store()?.removeItem(`${PREFIX}${slug}`); } catch { /* storage unavailable */ }
}
