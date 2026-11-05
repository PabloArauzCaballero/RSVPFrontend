/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@rsvp/api-client', '@rsvp/auth', '@rsvp/celebration-theme', '@rsvp/design-tokens', '@rsvp/forms', '@rsvp/i18n', '@rsvp/query-hooks', '@rsvp/ui-web'],
  reactStrictMode: true,
  // Metadata in <head> for every user agent: WhatsApp, Lighthouse and many crawlers are not in Next's bot list,
  // and streamed metadata (in <body>) would leave them without title, description or Open Graph card.
  htmlLimitedBots: /.*/,
  // Personal RSVP links carry a credential in the path: never cached, never leaked through the Referer header.
  async headers() {
    const privateHeaders = [{ key: 'Cache-Control', value: 'no-store' }, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    return [{ source: '/c/:slug/rsvp/:path*', headers: privateHeaders }, { source: '/c/:slug/rsvp', headers: privateHeaders }, { source: '/rsvp/:path*', headers: privateHeaders }];
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
