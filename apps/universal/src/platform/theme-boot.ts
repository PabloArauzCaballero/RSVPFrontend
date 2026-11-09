import { colors, tones } from "@rsvp/design-tokens";
import { THEME_STORAGE_KEY } from "./theme-core";

/**
 * Web document bootstrap, rendered into `app/+html.tsx`. The script runs before the first paint and puts the resolved
 * scheme on `<html>` (`data-theme` and `color-scheme`), so a person who chose dark, or whose system is dark, never sees
 * a light flash while the bundle loads. The CSS paints the page ground from the same tokens as the app.
 */
export const themeBootScript = `(function(){try{var p=null;try{p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}var d=p==="dark"||(p!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme",d?"dark":"light");r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;

export const themeBootCss = `body{background:${colors.light.canvas};color:${colors.light.text};font-family:"Geist","Helvetica Neue","Segoe UI",system-ui,sans-serif}html[data-theme="dark"] body{background:${colors.dark.canvas};color:${colors.dark.text}}::selection{background:${tones.light.blue.bg};color:${tones.light.blue.fg}}html[data-theme="dark"] ::selection{background:${tones.dark.blue.bg};color:${tones.dark.blue.fg}}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;font-feature-settings:"cv11","ss01"}@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}[aria-level="1"],[aria-level="2"]{text-wrap:balance}:focus-visible{outline:2px solid ${colors.light.text};outline-offset:3px;border-radius:8px}html[data-theme="dark"] :focus-visible{outline-color:${colors.dark.text}}*{scrollbar-width:thin;scrollbar-color:rgba(128,128,136,.35) transparent}`;
