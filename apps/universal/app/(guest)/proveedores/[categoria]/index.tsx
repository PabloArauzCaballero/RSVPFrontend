import { router, useLocalSearchParams, type Href } from "expo-router";
import { CategoryScreen } from "../../../../src/directory/directory-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B2 · `/proveedores/{categoria}?page=N`. */
export default function DirectoryCategoryRoute() {
  const { categoria, page } = useLocalSearchParams<{ categoria?: string; page?: string }>();
  return <CategoryScreen categorySlug={typeof categoria === "string" ? categoria : ""} {...(typeof page === "string" ? { page } : {})} onNavigate={goTo} />;
}
