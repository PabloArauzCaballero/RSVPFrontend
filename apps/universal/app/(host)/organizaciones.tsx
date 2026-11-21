import { loadHostScreens } from '../../src/host/load';
import { lazyScreen } from '../../src/platform/lazy-screen';
import { useHostRoute } from '../../src/platform/route';

const OrganizationsScreen = lazyScreen(loadHostScreens, (zone) => zone.OrganizationsScreen);

/** Organizaciones: crear una y agregar miembros (POST /organizations, /organizations/{id}/members). */
export default function OrganizationsRoute() { const { onNavigate } = useHostRoute(); return <OrganizationsScreen onNavigate={onNavigate} />; }
