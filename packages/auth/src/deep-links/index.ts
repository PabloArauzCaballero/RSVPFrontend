export interface MagicLink { token: string; url: string; }
/** Path prefix shared by the verified HTTPS link, the AASA/assetlinks `paths`, the web fallback page and the app route. */
export const MAGIC_LINK_PATH = "/rsvp";
export function magicLinkUrl(origin: string, token: string): MagicLink { return { token, url: `${origin.replace(/\/$/, "")}${MAGIC_LINK_PATH}/${encodeURIComponent(token)}` }; }
/** The native custom-scheme form that opens the installed app when no verified domain is configured. */
export function nativeMagicLink(token: string): string { return `rsvp://rsvp/${encodeURIComponent(token)}`; }

/** Supports the verified HTTPS link and the native `rsvp://rsvp/<token>` fallback. Anything else (or a malformed URL) is null. */
export function parseMagicLink(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  const parts = parsed.pathname.split("/").filter(Boolean);
  try {
    if (parsed.protocol === "rsvp:" && parsed.hostname === "rsvp" && parts[0]) return decodeURIComponent(parts[0]);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parts[0] === "rsvp" && parts[1] ? decodeURIComponent(parts[1]) : null;
  } catch { return null; }
}
