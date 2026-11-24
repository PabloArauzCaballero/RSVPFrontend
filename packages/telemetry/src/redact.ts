/**
 * Scrubbing for anything that leaves the device (PF-1): error messages and stacks can carry what a person typed or
 * what an API echoed back, so every string is cleaned before it is queued. The patterns are deliberately broad;
 * losing a little diagnostic detail is the accepted price for never shipping an address, a phone or a credential.
 */

const RULES: readonly (readonly [RegExp, string])[] = [
  // URLs keep scheme, host and path shape; the query and fragment can hold tokens (guest links) and go away.
  [/(https?:\/\/[^\s?#"'<>]+)[?#][^\s"'<>]*/gi, "$1?[redacted]"],
  // Bearer / JWT-looking strings.
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]"],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, "[jwt]"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  // Long opaque tokens (hex or base64url) such as invitation credentials.
  [/\b[A-Za-z0-9_-]{24,}\b/g, "[token]"],
  // Phone numbers and other long digit runs (7+ digits, allowing separators).
  [/\+?\d[\d\s().-]{5,}\d/g, "[number]"]
];

export function redactText(value: string): string {
  return RULES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

/**
 * The route shape without its data: the first segment stays (it names the area: `c`, `p`, `rsvp`, `admin`), every
 * later one becomes `:`. `/c/boda-ana/rsvp/abc` → `/c/:/:/:`. Expo Router segments such as `[slug]` or `(host)` are
 * already patterns and are kept.
 */
export function routeShape(path: string): string {
  const clean = path.split(/[?#]/)[0] ?? "";
  const segments = clean.split("/").filter(Boolean);
  if (!segments.length) return "/";
  return "/" + segments.map((segment, index) => (index === 0 || /^\(.+\)$|^\[.+\]$/.test(segment) ? segment : ":")).join("/");
}
