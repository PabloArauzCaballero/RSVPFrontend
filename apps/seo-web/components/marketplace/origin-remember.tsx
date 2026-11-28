"use client";

import { useEffect } from "react";
import { MARKETPLACE_ORIGIN_KEY } from "@rsvp/query-hooks";

/**
 * The guest opened the tab of this celebration: remember it for this tab only (sessionStorage; gone when the tab closes) so the partner page they open
 * next can mark its contact links as coming from the tab. It stores the celebration's own id (public) and the instant, never a guest id, a link or a name.
 */
export function OriginRemember({ celebrationId }: { readonly celebrationId: string }) {
  useEffect(() => {
    try { window.sessionStorage.setItem(MARKETPLACE_ORIGIN_KEY, JSON.stringify({ celebrationId, at: Date.now() })); } catch { /* private mode: the click is simply not attributed */ }
  }, [celebrationId]);
  return null;
}
