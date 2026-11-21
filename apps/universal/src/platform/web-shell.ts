import { createHash } from "node:crypto";
import { defaultLocale, supportedLocales } from "@rsvp/i18n";
import { FONTS_URL } from "./fonts";
import { LOCALE_STORAGE_KEY } from "./locale-key";
import { themeBootCss, themeBootScript } from "./theme-boot";

/**
 * The web document of the single-page export (M12). `web.output: "single"` ignores `app/+html.tsx`; Expo builds the page
 * from `public/index.html` instead (filling `%WEB_TITLE%`). `lang` is written here from `defaultLocale` (es-BO), rather than
 * `web.lang` of app.config.ts, so the default language has one source. Both files in
 * `public/` are generated from this module, so the boot script and the page ground follow the tokens and the stored keys;
 * `test/web-shell.test.ts` fails when they drift and `yarn workspace @rsvp/universal web-shell` rewrites them.
 * Runs in Node (the test), never in the app bundle.
 */

/**
 * Before the first paint: the document language from the person's stored choice, then the browser's languages, with the
 * same rule as `resolveLocale` (exact tag, then same language, then es-BO). Screen readers and the browser's translate
 * offer read `lang` before the bundle loads; `DocumentLanguage` keeps it in step afterwards.
 */
export const languageBootScript = `(function(){try{var s=${JSON.stringify(supportedLocales)},l=${JSON.stringify(defaultLocale)},p=null;try{p=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)})}catch{/* storage unavailable or no navigator: keep the default */}var c=[p].concat(navigator.languages||[navigator.language]);outer:for(var i=0;i<c.length;i++){var v=c[i];if(!v)continue;for(var j=0;j<s.length;j++){if(s[j]===v){l=v;break outer}}for(var k=0;k<s.length;k++){if(s[k].split("-")[0]===v.split("-")[0]){l=s[k];break outer}}}document.documentElement.lang=l}catch{/* storage unavailable or no navigator: keep the default */}})();`;

/** `public/web-boot.js`: an external file, so the CSP keeps `script-src 'self'` without an inline hash. */
export const webBootJs = `${themeBootScript}\n${languageBootScript}\n`;

export function webIndexHtml(): string {
  // The query busts browser caches of the un-hashed file when its content changes.
  const version = createHash("sha256").update(webBootJs).digest("hex").slice(0, 12);
  return `<!DOCTYPE html>
<!-- Generated from apps/universal/src/platform/web-shell.ts (yarn workspace @rsvp/universal web-shell). Do not edit by hand. -->
<html lang="${defaultLocale}">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="color-scheme" content="light dark" />
    <title>%WEB_TITLE%</title>
    <script src="/web-boot.js?v=${version}"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${FONTS_URL}" />
    <style id="theme-boot">${themeBootCss}</style>
    <!-- The react-native-web style reset: https://necolas.github.io/react-native-web/docs/setup/#root-element -->
    <style id="expo-reset">
      html,
      body {
        height: 100%;
      }
      body {
        overflow: hidden;
      }
      #root {
        display: flex;
        height: 100%;
        flex: 1;
      }
    </style>
  </head>

  <body>
    <noscript>DOne necesita JavaScript. · DOne needs JavaScript.</noscript>
    <div id="root"></div>
  </body>
</html>
`;
}
