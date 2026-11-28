"use client";

import { useEffect } from "react";
import { MARKETPLACE_ORIGIN_KEY } from "@rsvp/query-hooks";

/**
 * The guest opened the tab of this celebration: remember it for this tab only (sessionStorage; gone when the tab closes) so the partner page they open
 * next can mark its contact links as coming from the tab. It stores the celebration's own id (public), its event type and the instant, never a guest id, a link or a name.
 */
export function OriginRemember({ celebrationId, eventType }: { readonly celebrationId: string; readonly eventType?: string | undefined }) {
  useEffect(() => {
    try { window.sessionStorage.setItem(MARKETPLACE_ORIGIN_KEY, JSON.stringify({ celebrationId, at: Date.now(), ...(eventType ? { eventType } : {}) })); } catch { /* private mode: the click is simply not attributed */ }
  }, [celebrationId, eventType]);
  return null;
}
