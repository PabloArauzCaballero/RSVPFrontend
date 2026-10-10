/** @type {import('tailwindcss').Config} */
module.exports = { content: ['./app/**/*.{ts,tsx}', '../../packages/ui-web/src/**/*.{ts,tsx}'], presets: [require('@rsvp/design-tokens/tailwind-preset')], theme: { extend: {} }, plugins: [] };
