import { router, useLocalSearchParams, type Href } from "expo-router";
import { GuestGiftsScreen } from "../../../../../src/guest/gifts-screen";
import { giftRoute } from "../../../../../src/guest/gift-route";

const goTo = (path: string): void => { router.push(path as Href); };

/**
 * `/c/{slug}/regalos/{ref}`: the same address shape serves two things. A gift id (UUID) is A15, the detail page of the public
 * site; anything else is the personal-link credential the app has always accepted here (F21-05), kept for this session.
 */
export default function GuestGiftsRefRoute() {
  const { slug, ref } = useLocalSearchParams<{ slug?: string; ref?: string }>();
  const route = giftRoute(typeof ref === "string" ? ref : "");
  return <GuestGiftsScreen slug={typeof slug === "string" ? slug : ""} {...route} onNavigate={goTo} />;
}
