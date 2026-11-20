import { router, useLocalSearchParams, type Href } from "expo-router";
import { QuoteScreen } from "../../../../src/partner/partner-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B8/B9 · `/p/{slug}/cotizar?l={listingId}`: the quote cart, with the offer preselected when it came from its page. */
export default function PartnerQuoteRoute() {
  const { slug, l } = useLocalSearchParams<{ slug?: string; l?: string }>();
  return <QuoteScreen slug={typeof slug === "string" ? slug : ""} {...(typeof l === "string" && l ? { preselected: l } : {})} onNavigate={goTo} />;
}
