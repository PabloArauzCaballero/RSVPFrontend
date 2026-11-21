import { router, useLocalSearchParams, type Href } from "expo-router";
import { CatalogScreen } from "../../../../../src/partner/partner-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B6 · `/p/{slug}/catalogo`. */
export default function PartnerCatalogRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <CatalogScreen slug={typeof slug === "string" ? slug : ""} onNavigate={goTo} />;
}
