import { router, useLocalSearchParams, type Href } from "expo-router";
import { OfferScreen } from "../../../../../src/partner/partner-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B7 · `/p/{slug}/catalogo/{sku}`: one offer, its fulfillment before any contact. */
export default function PartnerOfferRoute() {
  const { slug, sku } = useLocalSearchParams<{ slug?: string; sku?: string }>();
  return <OfferScreen slug={typeof slug === "string" ? slug : ""} sku={typeof sku === "string" ? sku : ""} onNavigate={goTo} />;
}
