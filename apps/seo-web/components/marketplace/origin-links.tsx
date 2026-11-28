"use client";

import { useEffect } from "react";
import { MARKETPLACE_ORIGIN_KEY, parseMarketplaceOrigin } from "@rsvp/query-hooks";

/**
 * On the partner page: when this tab came from the guest marketplace (a fresh, well-formed origin in sessionStorage), the contact links to the
 * redirector `/r/{listingId}` inside `root` say so (`surface=CELEBRATION_SITE`, `celebrationId`), so the lead counts as that tab's. The page itself stays static
 * and indexable; without the origin nothing changes. Only `/r/` links of this site are touched, and only the two parameters are written.
 */
export function OriginLinks({ root = "[data-origin-links]" }: { readonly root?: string }) {
  useEffect(() => {
    let origin: ReturnType<typeof parseMarketplaceOrigin>;
    try { origin = parseMarketplaceOrigin(window.sessionStorage.getItem(MARKETPLACE_ORIGIN_KEY), Date.now()); } catch { return; }
    if (!origin) return;
    document.querySelectorAll<HTMLAnchorElement>(`${root} a[href^="/r/"]`).forEach((anchor) => {
      const url = new URL(anchor.getAttribute("href") ?? "", window.location.origin);
      if (url.origin !== window.location.origin) return;
      url.searchParams.set("surface", "CELEBRATION_SITE");
      url.searchParams.set("celebrationId", origin.celebrationId);
      anchor.setAttribute("href", `${url.pathname}${url.search}`);
    });
  }, [root]);
  return null;
}
