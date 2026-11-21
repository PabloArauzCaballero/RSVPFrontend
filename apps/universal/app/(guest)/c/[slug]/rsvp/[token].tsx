import { useEffect } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { saveGiftCredential } from "../../../../../src/guest/gift-credential";

/**
 * F21-04 · personal link https://<domain>/c/{slug}/rsvp/{token} (or rsvp://c/{slug}/rsvp/{token}) inside the app.
 * A13: the credential is kept for this session (memory on native, the tab's sessionStorage on web) and the address
 * becomes `/c/{slug}/rsvp` at once, so it does not stay in the address bar, the history or a Referer.
 */
export default function GuestRsvpRoute() {
  const { slug, token } = useLocalSearchParams<{ slug?: string; token?: string }>();
  const safeSlug = typeof slug === "string" ? slug : "";
  const credential = typeof token === "string" ? token : "";
  useEffect(() => {
    if (!safeSlug) return;
    if (credential) saveGiftCredential(safeSlug, credential);
    router.replace(`/c/${encodeURIComponent(safeSlug)}/rsvp` as Href);
  }, [credential, safeSlug]);
  return null;
}
