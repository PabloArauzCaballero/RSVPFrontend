/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@rsvp/api-client', '@rsvp/auth', '@rsvp/celebration-theme', '@rsvp/design-tokens', '@rsvp/forms', '@rsvp/i18n', '@rsvp/ui-web'],
  reactStrictMode: true,
  // Metadata in <head> for every user agent: WhatsApp, Lighthouse and many crawlers are not in Next's bot list,
  // and streamed metadata (in <body>) would leave them without title, description or Open Graph card.
  htmlLimitedBots: /.*/,
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
