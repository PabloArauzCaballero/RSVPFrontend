/**
 * Media-store URL check for the advanced stylesheet. DUPLICATED from packages/design-editor/src/custom/html.ts (FE #122, F5): the F5 stack depends on
 * this package, so it cannot be imported here, and moving it would touch that stack. Keep both equal until they are shared (debt, see the issue linked in the PR).
 */
export const MAX_HTML_LENGTH = 20_000;
export const DEFAULT_MEDIA_PREFIXES: readonly string[] = ["/media/public/assets/"];
/** A made-up origin to resolve relative references against: whatever resolves anywhere else escaped the site. */
const PROBE_ORIGIN = "https://invitation.invalid";

/** The URL parser's own reading of `value` against the probe origin, or null when it does not parse. */
function resolveProbe(value: string): URL | null {
  try { return new URL(value, PROBE_ORIGIN); } catch { return null; }
}

/** Percent-decodes until it stops changing (so %252e and %5c are seen for what they become), or null if it never settles or is malformed. */
export function decodeFully(value: string): string | null {
  let current = value;
  for (let round = 0; round < 4; round += 1) {
    let decoded: string;
    try { decoded = decodeURIComponent(current); } catch { return null; }
    if (decoded === current) return current;
    current = decoded;
  }
  return null;
}

/**
 * True when `value` points inside one of the media-store `prefixes`: after decoding every layer of percent-encoding there is no
 * dot segment, backslash, control character or empty segment, and the URL parser agrees the result stays under the prefix.
 */
export function isMediaStoreUrl(value: string, prefixes: readonly string[]): boolean {
  const decoded = decodeFully(value);
  if (decoded === null) return false;
  // eslint-disable-next-line no-control-regex
  if (decoded.includes("..") || decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return false;
  const prefix = prefixes.find((candidate) => value.startsWith(candidate));
  if (prefix === undefined || !decoded.startsWith(prefix) || decoded.slice(prefix.length).includes("//")) return false;
  const resolved = resolveProbe(value);
  const base = resolveProbe(prefix);
  return resolved !== null && base !== null && resolved.href.startsWith(base.href);
}
