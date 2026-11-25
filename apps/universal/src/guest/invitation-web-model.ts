import { SECTION_PATHS, type SectionId } from "@rsvp/celebration-theme";

/**
 * P10 · The app shows the invitation by loading the public site's own page in a web view. This is the part of that decision
 * that can be tested without a device: which address to load, what to do with every address the page then tries to open, and
 * how the guest's personal credential reaches the page without ever being part of an address.
 */

/** `${origin}/c/{slug}[/{section}]?lang=…`: the page the public site serves, in the language the guest reads the app in. */
export function invitationUrl(origin: string, slug: string, section: SectionId | null, locale: string): string {
  const path = section ? SECTION_PATHS[section] : undefined;
  return `${origin}/c/${encodeURIComponent(slug)}${path ? `/${path}` : ""}?lang=${encodeURIComponent(locale)}`;
}

export type NavigationDecision =
  /** Stay in the web view (the invitation, its sections, its language switch, its assets). */
  | { readonly kind: "allow" }
  /** Hand over to an app screen (the gift list and the reply keep their native flows). */
  | { readonly kind: "app"; readonly path: string }
  /** Leave the app for the system: maps, partners (through the redirector), mail, phone. */
  | { readonly kind: "external"; readonly url: string }
  /** Never loaded: not a web address the invitation links to. */
  | { readonly kind: "block" };

const OPEN_SCHEMES = new Set(["mailto:", "tel:", "sms:"]);

export function decideNavigation(raw: string, context: { readonly origin: string; readonly slug: string }): NavigationDecision {
  let url: URL;
  try { url = new URL(raw); } catch { return { kind: "block" }; }
  if (url.protocol === "about:") return { kind: "allow" };
  if (OPEN_SCHEMES.has(url.protocol)) return { kind: "external", url: url.toString() };
  if (url.protocol !== "https:" && url.protocol !== "http:") return { kind: "block" };
  if (url.origin !== context.origin) return { kind: "external", url: url.toString() };
  const own = `/c/${encodeURIComponent(context.slug)}`;
  const path = url.pathname.replace(/\/+$/, "");
  if (path === `${own}/regalos` || path.startsWith(`${own}/regalos/`)) return { kind: "app", path: `${own}/regalos` };
  if (path === `${own}/rsvp`) return { kind: "app", path: `${own}/rsvp` };
  if (path === own || Object.values(SECTION_PATHS).some((segment) => segment !== undefined && path === `${own}/${segment}`)) return { kind: "allow" };
  // The site's own assets (fonts, images, scripts) are not pages; any other page of the site opens in the browser.
  if (path.startsWith("/_next/") || path.startsWith("/media/")) return { kind: "allow" };
  return { kind: "external", url: url.toString() };
}

/** Storage key the public site reads the credential from (`apps/seo-web/lib/guest-credential.ts`). */
export const credentialStorageKey = (slug: string): string => `rsvp.guest.credential.${slug}`;

/**
 * Runs in the page BEFORE it loads, in the main frame only: puts the guest's credential where the site's own code looks for it
 * (this tab's sessionStorage), so «Confirmar asistencia» shows. The credential is data inside a script the app hands the web
 * view, not part of an address: it is never in the URL, in a Referer or in a log. It only runs when the page is on the site's own origin.
 */
export function credentialScript(origin: string, slug: string, token: string): string {
  return `(function(){try{if(window.location.origin!==${JSON.stringify(origin)})return;window.sessionStorage.setItem(${JSON.stringify(credentialStorageKey(slug))},${JSON.stringify(token)});}catch(e){}})();true;`;
}
