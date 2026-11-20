import { router, useLocalSearchParams, type Href } from "expo-router";
import { CategoryCityScreen } from "../../../../src/directory/directory-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B3 · `/proveedores/{categoria}/{ciudad}?page=N`. */
export default function DirectoryCategoryCityRoute() {
  const { categoria, ciudad, page } = useLocalSearchParams<{ categoria?: string; ciudad?: string; page?: string }>();
  return <CategoryCityScreen categorySlug={typeof categoria === "string" ? categoria : ""} citySlug={typeof ciudad === "string" ? ciudad : ""} {...(typeof page === "string" ? { page } : {})} onNavigate={goTo} />;
}
