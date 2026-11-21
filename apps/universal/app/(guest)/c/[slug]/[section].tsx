import { router, useLocalSearchParams, type Href } from "expo-router";
import { InvitationScreen } from "../../../../src/guest/invitation-screen";

/** A2–A8 · one section's own page (historia, itinerario, lugares, galeria, dress-code, faq, recomendaciones); `rsvp` and `regalos` are their own routes. */
const goTo = (path: string): void => { router.navigate(path as Href); };

export default function InvitationSectionRoute() {
  const { slug, section } = useLocalSearchParams<{ slug?: string; section?: string }>();
  return <InvitationScreen slug={typeof slug === "string" ? slug : ""} section={typeof section === "string" ? section : ""} onNavigate={goTo} />;
}
