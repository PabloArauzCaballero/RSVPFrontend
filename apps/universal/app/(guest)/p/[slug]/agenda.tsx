import { router, useLocalSearchParams, type Href } from "expo-router";
import { AgendaScreen } from "../../../../src/partner/partner-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B10/B11 · `/p/{slug}/agenda`: free days in the provider's time zone and the date request. */
export default function PartnerAgendaRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <AgendaScreen slug={typeof slug === "string" ? slug : ""} onNavigate={goTo} />;
}
