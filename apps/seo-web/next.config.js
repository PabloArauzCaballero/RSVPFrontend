const path = require('node:path');

/**
 * A6 · Security headers for every page. CSP starts report-only: violations appear in the browser console without
 * breaking the site; enforce it once the console is clean in TEST. Next needs inline scripts for hydration.
 */
/**
 * F6 · The only origins an iframe of the invitation may load (P17). Keep it equal to FRAME_HOSTS in
 * packages/celebration-theme/src/media/embed.ts: the test in media/media.test.tsx (frame-src) fails when they differ. The CSP below is still Report-Only, so today `frame-src` reports and does not block: the allowlist of embed.ts (and the server's) is what holds, and this is the third lock only once the CSP is enforced.
 * Privacy-enhanced hosts only
 * (youtube-nocookie, Vimeo with dnt). Nothing else may be framed, and `frame-ancestors 'none'` still forbids framing this site.
 */
const frameHosts = ['www.youtube-nocookie.com', 'player.vimeo.com', 'open.spotify.com', 'w.soundcloud.com', 'www.google.com'];
const frameSrc = `frame-src ${frameHosts.map((host) => `https://${host}`).join(' ')}`;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' https:; connect-src 'self' https:; ${frameSrc}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // M14 · Self-contained server for the multi-stage image (deploy/Dockerfile.seo-web): only the traced files ship.
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // A6 · Do not advertise the framework.
  poweredByHeader: false,
  transpilePackages: ['@rsvp/api-client', '@rsvp/auth', '@rsvp/celebration-theme', '@rsvp/design-tokens', '@rsvp/forms', '@rsvp/i18n', '@rsvp/query-hooks', '@rsvp/ui-web'],
  reactStrictMode: true,
  // L18 · Baked at build time (not read from the running server's environment): only the visual test build opens the dev-only
  // /catalogo (lib/dev-surfaces.ts). The deployed image is built without it, and setting it on a running container changes nothing.
  // L25 · RSVP_VISUAL_NOW (the visual suite's fixed instant) is baked the same way and only honored together with that flag.
  env: { RSVP_VISUAL_TEST_CATALOG: process.env.RSVP_VISUAL_TEST_CATALOG === '1' ? '1' : '', RSVP_VISUAL_NOW: process.env.RSVP_VISUAL_TEST_CATALOG === '1' ? process.env.RSVP_VISUAL_NOW ?? '' : '' },
  // Metadata in <head> for every user agent: WhatsApp, Lighthouse and many crawlers are not in Next's bot list,
  // and streamed metadata (in <body>) would leave them without title, description or Open Graph card.
  htmlLimitedBots: /.*/,
  // Personal RSVP links carry a credential in the path: never cached, never leaked through the Referer header.
  async headers() {
    const privateHeaders = [{ key: 'Cache-Control', value: 'no-store' }, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    // Order matters: for the same key the later rule wins, so credential paths keep `no-referrer`.
    return [{ source: '/:path*', headers: securityHeaders }, { source: '/c/:slug/rsvp/:path*', headers: privateHeaders }, { source: '/c/:slug/rsvp', headers: privateHeaders }, { source: '/rsvp/:path*', headers: privateHeaders }];
  },
  webpack: (config) => {
    // Workspace packages use NodeNext-style "./x.js" imports that point to .ts sources.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};
module.exports = nextConfig;
