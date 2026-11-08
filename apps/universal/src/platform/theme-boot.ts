import { brand, colors } from "@rsvp/design-tokens";
import { THEME_STORAGE_KEY } from "./theme-core";

/**
 * Web document bootstrap, rendered into `app/+html.tsx`. The script runs before the first paint and puts the resolved
 * scheme on `<html>` (`data-theme` and `color-scheme`), so a person who chose dark, or whose system is dark, never sees
 * a light flash while the bundle loads. The CSS paints the page ground from the same tokens as the app.
 */
export const themeBootScript = `(function(){try{var p=null;try{p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}var d=p==="dark"||(p!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme",d?"dark":"light");r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;

export const themeBootCss = `body{background:${colors.light.canvas};color:${colors.light.text};font-family:"Plus Jakarta Sans","Avenir Next","Segoe UI",system-ui,sans-serif}html[data-theme="dark"] body{background:${colors.dark.canvas};color:${colors.dark.text}}::selection{background:${brand.cielo};color:${brand.noche}}`;
