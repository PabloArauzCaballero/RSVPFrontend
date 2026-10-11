/** @type {import('next').NextConfig} */
const nextConfig = { distDir: process.env.NEXT_DIST_DIR ?? '.next', transpilePackages: ['@rsvp/celebration-theme', '@rsvp/design-tokens', '@rsvp/ui-web'], reactStrictMode: true };
module.exports = nextConfig;
