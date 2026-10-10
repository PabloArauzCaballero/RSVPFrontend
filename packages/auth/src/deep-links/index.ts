export interface MagicLink { token: string; url: string; }
export function magicLinkUrl(origin: string, token: string): MagicLink { return { token, url: `${origin.replace(/\/$/, "")}/rsvp/${encodeURIComponent(token)}` }; }
export function parseMagicLink(url: string): string | null { const parts = new URL(url).pathname.split("/").filter(Boolean); return parts[0] === "rsvp" && parts[1] ? decodeURIComponent(parts[1]) : null; }
