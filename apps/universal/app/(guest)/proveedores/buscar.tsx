import { router, useLocalSearchParams, type Href } from "expo-router";
import { DirectorySearchScreen, type SearchValues } from "../../../src/directory/directory-screens";

const goTo = (path: string): void => { router.push(path as Href); };
const KEYS = ["categoria", "ciudad", "precioMax", "fecha", "verificado", "lat", "lng", "radio", "page"] as const;

/** B4 · `/proveedores/buscar?categoria=&ciudad=&precioMax=&fecha=&verificado=&lat=&lng=&radio=&page=`, the web's parameters. */
export default function DirectorySearchRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const values: SearchValues = Object.fromEntries(KEYS.map((key) => { const value = params[key]; return [key, Array.isArray(value) ? value[0] ?? "" : value ?? ""]; }));
  return <DirectorySearchScreen values={values} onNavigate={goTo} />;
}
