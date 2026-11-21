import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { GuestRsvpScreen } from "../../../../../src/guest/rsvp-screen";
import { readGiftCredential } from "../../../../../src/guest/gift-credential";

/**
 * `/c/{slug}/rsvp`: the guest's own RSVP when this session holds their personal-link credential (A13: it arrives here
 * from `/c/{slug}/rsvp/{token}` without the token in the address); otherwise the RSVP of a person without a link.
 */
export default function GuestPublicRsvpRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const safeSlug = typeof slug === "string" ? slug : "";
  const [credential] = useState(() => (safeSlug ? readGiftCredential(safeSlug) : null));
  return <GuestRsvpScreen slug={safeSlug} {...(credential ? { token: credential } : {})} />;
}
