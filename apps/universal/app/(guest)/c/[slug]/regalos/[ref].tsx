import { router, useLocalSearchParams, type Href } from "expo-router";
import { GuestGiftsScreen } from "../../../../../src/guest/gifts-screen";
import { giftRoute } from "../../../../../src/guest/gift-route";
import { useGuestLinkRedirect } from "../../../../../src/guest/use-guest-link-redirect";

const goTo = (path: string): void => { router.push(path as Href); };

/**
 * `/c/{slug}/regalos/{ref}`: the same address shape serves two things. A gift id (UUID) is A15, the detail page of the public
 * site. Anything else is the personal-link credential of links already sent (F21-05): A13 keeps it for this session and
 * replaces the address with `/c/{slug}/regalos`, so the credential leaves the address bar, the history and the Referer.
 */
export default function GuestGiftsRefRoute() {
  const { slug, ref } = useLocalSearchParams<{ slug?: string; ref?: string }>();
  const safeSlug = typeof slug === "string" ? slug : "";
  const route = giftRoute(typeof ref === "string" ? ref : "");
  const credential = "token" in route ? route.token : null;
  useGuestLinkRedirect(safeSlug, credential, credential ? "regalos" : null);
  if (credential) return null;
  return <GuestGiftsScreen slug={safeSlug} {...route} onNavigate={goTo} />;
}
