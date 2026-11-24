"use client";

import { useEffect } from "react";
import { hasGuestCredential } from "../lib/guest-credential";

/**
 * The public celebration is shared and server-rendered, so its reply button starts as «Busca tu enlace personal». A guest who
 * already opened their personal link in this tab holds the credential in sessionStorage; after hydration this island flips the
 * button to «Confirmar asistencia». Both faces are already in the markup and share one box (see `.celebration-cta[data-credential]`),
 * so nothing moves. The destination is `/c/{slug}/rsvp` either way: the credential is only ever tested for presence, never
 * read into the DOM, an attribute, a URL or a log.
 */
export function RsvpCredentialIsland({ slug }: { readonly slug: string }) {
  useEffect(() => {
    const button = document.querySelector<HTMLElement>('a[data-action="rsvp-help"][data-credential]');
    if (!button) return;
    const present = hasGuestCredential(slug);
    button.dataset["credential"] = present ? "present" : "absent";
    for (const face of button.querySelectorAll<HTMLElement>("[data-face]")) {
      const visible = present ? face.dataset["face"] === "confirm" : face.dataset["face"] === "find";
      if (visible) face.removeAttribute("aria-hidden"); else face.setAttribute("aria-hidden", "true");
    }
  }, [slug]);
  return null;
}
