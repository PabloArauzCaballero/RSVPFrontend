import { router, useLocalSearchParams, type Href } from "expo-router";
import { GuestGiftsScreen } from "../../../../../src/guest/gifts-screen";

const goTo = (path: string): void => { router.push(path as Href); };

/** A14 · `/c/{slug}/regalos`, as on the public site: the list opens with the personal link kept for this session, or asks for it. */
export default function GuestGiftsListRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <GuestGiftsScreen slug={typeof slug === "string" ? slug : ""} onNavigate={goTo} />;
}
