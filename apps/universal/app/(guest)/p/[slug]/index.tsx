import { router, useLocalSearchParams, type Href } from "expo-router";
import { PartnerScreen } from "../../../../src/partner/partner-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B5 · `/p/{slug}`, the partner microsite, at the same address as the public site. */
export default function PartnerRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <PartnerScreen slug={typeof slug === "string" ? slug : ""} onNavigate={goTo} />;
}
