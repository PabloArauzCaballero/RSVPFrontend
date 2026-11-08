/**
 * Web: the three faces of the minimalist system (Newsreader for titles, Geist for the interface, Geist Mono for codes) come from one
 * stylesheet. `app/+html.tsx` links it in static builds; the single-page export ignores that file, so the stylesheet is also added to
 * the document here (once, by id). `font-display: swap` keeps the text visible while the faces arrive.
 */
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap";
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
