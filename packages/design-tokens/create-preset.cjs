// Builds the Tailwind preset from generated/tokens.json (itself generated from src/*.ts).
// Nothing here is hand-copied: change src/colors.ts, run `generate`, and every consumer follows.
const tokens = require('./generated/tokens.json');

/** @param {{ systemDark?: boolean }} options systemDark: also follow prefers-color-scheme (native, Expo web). */
function createPreset({ systemDark = false } = {}) {
  const dark = tokens.dark;
  return {
    // NativeWind (native) cannot parse the attribute-selector form ("@cssInterop set darkMode attribute ..."),
    // and on web it throws for 'media' when an html attribute mutates. Native keeps the plain class strategy;
    // following the system scheme comes from the prefers-color-scheme variables below.
    darkMode: systemDark ? 'class' : ['class', '[data-theme="dark"]'],
    theme: {
      extend: {
        colors: tokens.colors,
        fontFamily: tokens.fontFamily,
        spacing: tokens.spacing,
        borderRadius: tokens.borderRadius,
        boxShadow: tokens.boxShadow,
        fontSize: tokens.fontSize
      }
    },
    plugins: [
      function ({ addBase }) {
        addBase({
          ':root': tokens.light,
          '[data-theme="dark"]': dark,
          ...(systemDark ? { '@media (prefers-color-scheme: dark)': { ':root:not([data-theme="light"])': dark } } : {})
        });
      }
    ]
  };
}

module.exports = { createPreset, tokens };
