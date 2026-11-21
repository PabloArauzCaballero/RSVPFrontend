import { router, useLocalSearchParams, type Href } from "expo-router";
import { InvitationScreen } from "../../../../src/guest/invitation-screen";

/** A1 · the public invitation inside the app: https://<domain>/c/{slug}, the same address as the public site. */
const goTo = (path: string): void => { router.navigate(path as Href); };

export default function InvitationRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <InvitationScreen slug={typeof slug === "string" ? slug : ""} onNavigate={goTo} />;
}
