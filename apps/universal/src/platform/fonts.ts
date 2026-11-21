/**
 * Web: Geist for the interface and Geist Mono for codes come from one stylesheet, linked with its preconnects by `public/index.html`
 * (generated from `web-shell.ts`). This adds it only if the document lacks it (a test document, an embed), once, by id.
 * `font-display: swap` keeps the text visible while the faces arrive.
 */
export const FONTS_URL = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";
const LINK_ID = "rsvp-brand-fonts";

if (typeof document !== "undefined" && !document.getElementById(LINK_ID) && !document.querySelector('link[href*="fonts.googleapis.com/css2?family=Geist"]')) {
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = FONTS_URL;
  document.head.appendChild(link);
}

/** Web and tests: nothing to wait for, the stylesheet above swaps the faces in. */
export function useBrandFonts(): boolean {
  return true;
}
