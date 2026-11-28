/**
 * P10 · Origins that may frame `/vista-previa` and exchange messages with it. Shared by next.config.js (frame-ancestors) and
 * lib/preview-origins.ts (postMessage allowlist) so the two can never disagree.
 *
 * The primary origin is NEXT_PUBLIC_APP_URL. NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS adds more, for when the same app is served from
 * several domains: an explicit comma-separated list, e.g. "https://dev.doneapp.events". No wildcards: an entry that is not a bare
 * http(s) origin (path, query, credentials, "*") is dropped, never widened.
 */
function bareOrigin(value) {
  const text = String(value ?? '').trim();
  if (!text || text.includes('*')) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) return null;
    return url.origin;
  } catch { return null; }
}

function previewParentOrigins(env = process.env) {
  const origins = [];
  const primary = (() => { try { return new URL(env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:8100').origin; } catch { return null; } })();
  if (primary) origins.push(primary);
  for (const entry of String(env.NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS ?? '').split(',')) {
    const origin = bareOrigin(entry);
    if (origin && !origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

module.exports = { previewParentOrigins, bareOrigin };
