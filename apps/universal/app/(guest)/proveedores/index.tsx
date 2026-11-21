import { router, type Href } from "expo-router";
import { DirectoryHomeScreen } from "../../../src/directory/directory-screens";

const goTo = (path: string): void => { router.push(path as Href); };

/** B1 · `/proveedores`, the same address as the public directory. */
export default function DirectoryHomeRoute() { return <DirectoryHomeScreen onNavigate={goTo} />; }
