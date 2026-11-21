/**
 * The guest's link credential for the gift list, so `/c/{slug}/regalos` works after the personal link was opened once.
 * Native: process memory only (gone when the app is closed), never the keychain, a query key or a log. The web build uses
 * sessionStorage of the tab with the same key as the public site (`gift-credential.web.ts`).
 */
const memory = new Map<string, string>();

export function saveGiftCredential(slug: string, token: string): void { memory.set(slug, token); }
export function readGiftCredential(slug: string): string | null { return memory.get(slug) ?? null; }
export function clearGiftCredential(slug: string): void { memory.delete(slug); }
