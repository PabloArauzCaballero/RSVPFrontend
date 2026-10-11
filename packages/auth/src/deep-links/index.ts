export interface MagicLink { token: string; url: string; }
export function magicLinkUrl(origin: string, token: string): MagicLink { return { token, url: `${origin.replace(/\/$/, "")}/rsvp/${encodeURIComponent(token)}` }; }
/** Supports the verified HTTPS link and the native `rsvp://rsvp/<token>` fallback. */
export function parseMagicLink(url: string): string | null {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parsed.protocol === "rsvp:" && parsed.hostname === "rsvp" && parts[0]) return decodeURIComponent(parts[0]);
  return parts[0] === "rsvp" && parts[1] ? decodeURIComponent(parts[1]) : null;
}
